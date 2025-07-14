import React, { useState, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useWebsiteData } from '../../hooks/useWebsiteData';
import Loading from '../Common/Loading';
import { 
  formatNumber, 
  formatPercentage,
  formatCurrency,
  formatPercentageChange 
} from '../../utils/formatters';
import { DATE_RANGES, CHART_COLORS, CHART_PALETTE } from '../../utils/constants';
import { 
  ShoppingCartIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import styles from './Analytics.module.css';

const ConversionFunnel = () => {
  const { showToast, selectedWebsite } = useApp();
  const { analytics, dataLoading } = useData();
  const [view, setView] = useState('funnel'); // funnel, goals, ecommerce
  const [selectedGoal, setSelectedGoal] = useState('all');
  
  // Funnel stages data
  const funnelData = useMemo(() => {
    if (!analytics?.funnel) {
      return {
        stages: [],
        dropoff: []
      };
    }
    
    const stages = [
      {
        name: 'Landing Page',
        icon: UserGroupIcon,
        value: analytics.funnel.sessions || 0,
        percentage: 100
      },
      {
        name: 'Product View',
        icon: ShoppingCartIcon,
        value: analytics.funnel.productViews || 0,
        percentage: analytics.funnel.sessions > 0 
          ? (analytics.funnel.productViews / analytics.funnel.sessions) * 100 
          : 0
      },
      {
        name: 'Add to Cart',
        icon: ShoppingCartIcon,
        value: analytics.funnel.addToCart || 0,
        percentage: analytics.funnel.sessions > 0 
          ? (analytics.funnel.addToCart / analytics.funnel.sessions) * 100 
          : 0
      },
      {
        name: 'Checkout',
        icon: CreditCardIcon,
        value: analytics.funnel.checkout || 0,
        percentage: analytics.funnel.sessions > 0 
          ? (analytics.funnel.checkout / analytics.funnel.sessions) * 100 
          : 0
      },
      {
        name: 'Purchase',
        icon: CheckCircleIcon,
        value: analytics.funnel.purchases || 0,
        percentage: analytics.funnel.sessions > 0 
          ? (analytics.funnel.purchases / analytics.funnel.sessions) * 100 
          : 0
      }
    ];
    
    // Calculate dropoff rates
    const dropoff = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const current = stages[i].value;
      const next = stages[i + 1].value;
      const dropoffRate = current > 0 ? ((current - next) / current) * 100 : 0;
      
      dropoff.push({
        from: stages[i].name,
        to: stages[i + 1].name,
        rate: dropoffRate,
        lost: current - next
      });
    }
    
    return { stages, dropoff };
  }, [analytics]);
  
  // Goals data
  const goalsData = useMemo(() => {
    if (!analytics?.goals) return [];
    
    return analytics.goals.map(goal => ({
      ...goal,
      completionRate: goal.sessions > 0 
        ? (goal.completions / goal.sessions) * 100 
        : 0,
      changeFormatted: formatPercentageChange(goal.change || 0)
    }));
  }, [analytics]);
  
  // E-commerce metrics
  const ecommerceMetrics = useMemo(() => {
    if (!analytics?.ecommerce) {
      return {
        revenue: { value: 0, change: 0 },
        transactions: { value: 0, change: 0 },
        avgOrderValue: { value: 0, change: 0 },
        conversionRate: { value: 0, change: 0 },
        cartAbandonment: { value: 0, change: 0 }
      };
    }
    
    return {
      revenue: {
        value: analytics.ecommerce.revenue || 0,
        change: analytics.ecommerce.revenueChange || 0
      },
      transactions: {
        value: analytics.ecommerce.transactions || 0,
        change: analytics.ecommerce.transactionsChange || 0
      },
      avgOrderValue: {
        value: analytics.ecommerce.avgOrderValue || 0,
        change: analytics.ecommerce.avgOrderValueChange || 0
      },
      conversionRate: {
        value: analytics.ecommerce.conversionRate || 0,
        change: analytics.ecommerce.conversionRateChange || 0
      },
      cartAbandonment: {
        value: analytics.ecommerce.cartAbandonment || 0,
        change: analytics.ecommerce.cartAbandonmentChange || 0
      }
    };
  }, [analytics]);
  
  // Product performance data
  const productPerformance = useMemo(() => {
    if (!analytics?.products) return [];
    
    return analytics.products
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [analytics]);
  
  // Funnel visualization data for chart
  const funnelChartData = {
    labels: funnelData.stages.map(s => s.name),
    datasets: [{
      label: 'Users',
      data: funnelData.stages.map(s => s.value),
      backgroundColor: CHART_COLORS.PRIMARY,
      borderColor: CHART_COLORS.PRIMARY,
      borderWidth: 2
    }]
  };
  
  const funnelChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const stage = funnelData.stages[context.dataIndex];
            return [
              `Users: ${formatNumber(stage.value)}`,
              `Rate: ${stage.percentage.toFixed(1)}%`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCompactNumber(value)
        }
      }
    }
  };
  
  // Goals chart data
  const goalsChartData = {
    labels: goalsData.map(g => g.name),
    datasets: [{
      data: goalsData.map(g => g.completions),
      backgroundColor: CHART_PALETTE,
      borderWidth: 0
    }]
  };
  
  const goalsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const goal = goalsData[context.dataIndex];
            return [
              `${goal.name}: ${formatNumber(goal.completions)}`,
              `Rate: ${goal.completionRate.toFixed(1)}%`
            ];
          }
        }
      }
    }
  };
  
  if (!selectedWebsite) {
    return (
      <div className={styles.noWebsite}>
        <h2>Select a Website</h2>
        <p>Please select a website to view conversion data</p>
      </div>
    );
  }
  
  return (
    <div className={styles.conversionContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Conversion Analysis</h2>
        <div className={styles.viewToggle}>
          <button
            onClick={() => setView('funnel')}
            className={`${styles.viewButton} ${view === 'funnel' ? styles.active : ''}`}
          >
            <FunnelIcon className={styles.viewIcon} />
            Funnel
          </button>
          <button
            onClick={() => setView('goals')}
            className={`${styles.viewButton} ${view === 'goals' ? styles.active : ''}`}
          >
            <CheckCircleIcon className={styles.viewIcon} />
            Goals
          </button>
          <button
            onClick={() => setView('ecommerce')}
            className={`${styles.viewButton} ${view === 'ecommerce' ? styles.active : ''}`}
          >
            <ShoppingCartIcon className={styles.viewIcon} />
            E-commerce
          </button>
        </div>
      </div>
      
      {dataLoading.analytics ? (
        <Loading message="Loading conversion data..." />
      ) : (
        <>
          {/* Funnel View */}
          {view === 'funnel' && (
            <div className={styles.funnelView}>
              {/* Funnel Visualization */}
              <div className={styles.funnelVisualization}>
                {funnelData.stages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isLast = index === funnelData.stages.length - 1;
                  
                  return (
                    <div key={stage.name} className={styles.funnelStage}>
                      <div 
                        className={styles.stageBar}
                        style={{ 
                          width: `${100 - (index * 15)}%`,
                          backgroundColor: `${CHART_COLORS.PRIMARY}${Math.round(255 * (1 - index * 0.2)).toString(16)}`
                        }}
                      >
                        <div className={styles.stageContent}>
                          <Icon className={styles.stageIcon} />
                          <div className={styles.stageInfo}>
                            <h4>{stage.name}</h4>
                            <div className={styles.stageMetrics}>
                              <span className={styles.stageValue}>
                                {formatNumber(stage.value)} users
                              </span>
                              <span className={styles.stagePercentage}>
                                {stage.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {!isLast && (
                        <div className={styles.dropoffInfo}>
                          <div className={styles.dropoffArrow}>↓</div>
                          <div className={styles.dropoffMetrics}>
                            <span className={styles.dropoffRate}>
                              -{funnelData.dropoff[index].rate.toFixed(1)}%
                            </span>
                            <span className={styles.dropoffCount}>
                              {formatNumber(funnelData.dropoff[index].lost)} lost
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Funnel Chart */}
              <div className={styles.funnelChart}>
                <h3>Conversion Funnel Chart</h3>
                <div className={styles.chartContainer} style={{ height: '300px' }}>
                  <Bar data={funnelChartData} options={funnelChartOptions} />
                </div>
              </div>
              
              {/* Dropoff Analysis */}
              <div className={styles.dropoffAnalysis}>
                <h3>Dropoff Analysis</h3>
                <div className={styles.dropoffTable}>
                  {funnelData.dropoff.map((dropoff, index) => (
                    <div key={index} className={styles.dropoffRow}>
                      <div className={styles.dropoffStages}>
                        <span>{dropoff.from}</span>
                        <span className={styles.dropoffArrowSmall}>→</span>
                        <span>{dropoff.to}</span>
                      </div>
                      <div className={styles.dropoffStats}>
                        <span className={styles.dropoffPercent}>
                          {dropoff.rate.toFixed(1)}% dropoff
                        </span>
                        <span className={styles.dropoffUsers}>
                          {formatNumber(dropoff.lost)} users
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Goals View */}
          {view === 'goals' && (
            <div className={styles.goalsView}>
              {/* Goals Overview */}
              <div className={styles.goalsOverview}>
                <div className={styles.totalGoals}>
                  <h3>Total Goal Completions</h3>
                  <div className={styles.totalGoalsValue}>
                    {formatNumber(goalsData.reduce((sum, g) => sum + g.completions, 0))}
                  </div>
                </div>
                
                <div className={styles.goalsChart}>
                  <h3>Goal Distribution</h3>
                  <div className={styles.chartContainer} style={{ height: '250px' }}>
                    {goalsData.length > 0 ? (
                      <Doughnut data={goalsChartData} options={goalsChartOptions} />
                    ) : (
                      <div className={styles.noData}>No goals configured</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Goals List */}
              <div className={styles.goalsList}>
                <h3>Goal Performance</h3>
                {goalsData.length === 0 ? (
                  <div className={styles.emptyGoals}>
                    <CheckCircleIcon className={styles.emptyIcon} />
                    <p>No goals have been configured yet</p>
                  </div>
                ) : (
                  <div className={styles.goalsTable}>
                    {goalsData.map((goal, index) => (
                      <div key={index} className={styles.goalRow}>
                        <div className={styles.goalInfo}>
                          <h4>{goal.name}</h4>
                          <p>{goal.type}</p>
                        </div>
                        <div className={styles.goalMetrics}>
                          <div className={styles.goalMetric}>
                            <span className={styles.metricLabel}>Completions</span>
                            <span className={styles.metricValue}>
                              {formatNumber(goal.completions)}
                            </span>
                          </div>
                          <div className={styles.goalMetric}>
                            <span className={styles.metricLabel}>Completion Rate</span>
                            <span className={styles.metricValue}>
                              {goal.completionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className={styles.goalMetric}>
                            <span className={styles.metricLabel}>Value</span>
                            <span className={styles.metricValue}>
                              {formatCurrency(goal.value || 0)}
                            </span>
                          </div>
                          <div className={styles.goalMetric}>
                            <span className={styles.metricLabel}>Change</span>
                            <div className={`${styles.metricChange} ${styles[goal.changeFormatted.color]}`}>
                              {goal.changeFormatted.isPositive ? (
                                <ArrowTrendingUpIcon className={styles.changeIcon} />
                              ) : goal.changeFormatted.isNegative ? (
                                <ArrowTrendingDownIcon className={styles.changeIcon} />
                              ) : null}
                              <span>{goal.changeFormatted.text}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* E-commerce View */}
          {view === 'ecommerce' && (
            <div className={styles.ecommerceView}>
              {/* E-commerce Metrics */}
              <div className={styles.ecommerceMetrics}>
                {Object.entries(ecommerceMetrics).map(([key, data]) => {
                  const changeData = formatPercentageChange(data.change);
                  let formattedValue;
                  let icon = CurrencyDollarIcon;
                  
                  switch (key) {
                    case 'revenue':
                      formattedValue = formatCurrency(data.value);
                      break;
                    case 'avgOrderValue':
                      formattedValue = formatCurrency(data.value);
                      break;
                    case 'transactions':
                      formattedValue = formatNumber(data.value);
                      icon = ShoppingCartIcon;
                      break;
                    case 'conversionRate':
                    case 'cartAbandonment':
                      formattedValue = `${data.value.toFixed(2)}%`;
                      icon = key === 'conversionRate' ? CheckCircleIcon : XCircleIcon;
                      break;
                    default:
                      formattedValue = formatNumber(data.value);
                  }
                  
                  const Icon = icon;
                  
                  return (
                    <div key={key} className={styles.ecommerceMetric}>
                      <div className={styles.metricHeader}>
                        <Icon className={styles.metricIcon} />
                        <span className={styles.metricLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                      <div className={styles.metricValue}>{formattedValue}</div>
                      {data.change !== 0 && (
                        <div className={`${styles.metricChange} ${styles[changeData.color]}`}>
                          {changeData.isPositive ? (
                            <ArrowTrendingUpIcon className={styles.changeIcon} />
                          ) : changeData.isNegative ? (
                            <ArrowTrendingDownIcon className={styles.changeIcon} />
                          ) : null}
                          <span>{changeData.text}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Product Performance */}
              <div className={styles.productPerformance}>
                <h3>Top Performing Products</h3>
                <div className={styles.productsTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.productColumn}>Product</div>
                    <div className={styles.dataColumn}>Revenue</div>
                    <div className={styles.dataColumn}>Quantity</div>
                    <div className={styles.dataColumn}>Conversion Rate</div>
                  </div>
                  {productPerformance.map((product, index) => (
                    <div key={index} className={styles.tableRow}>
                      <div className={styles.productColumn}>
                        <span className={styles.productName}>{product.name}</span>
                        <span className={styles.productSku}>SKU: {product.sku}</span>
                      </div>
                      <div className={styles.dataColumn}>
                        <span className={styles.dataValue}>
                          {formatCurrency(product.revenue)}
                        </span>
                        <div className={styles.dataBar}>
                          <div 
                            className={styles.dataBarFill}
                            style={{ 
                              width: `${(product.revenue / productPerformance[0].revenue) * 100}%`,
                              backgroundColor: CHART_COLORS.SUCCESS
                            }}
                          />
                        </div>
                      </div>
                      <div className={styles.dataColumn}>
                        {formatNumber(product.quantity)}
                      </div>
                      <div className={styles.dataColumn}>
                        <span className={styles.conversionRate}>
                          {product.conversionRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Cart Abandonment Insights */}
              <div className={styles.abandonmentInsights}>
                <h3>Cart Abandonment Insights</h3>
                <div className={styles.abandonmentStats}>
                  <div className={styles.abandonmentRate}>
                    <XCircleIcon className={styles.abandonmentIcon} />
                    <div>
                      <h4>{ecommerceMetrics.cartAbandonment.value.toFixed(1)}%</h4>
                      <p>Cart Abandonment Rate</p>
                    </div>
                  </div>
                  <div className={styles.abandonmentDetails}>
                    <div className={styles.abandonmentItem}>
                      <span>Lost Revenue</span>
                      <span className={styles.lostRevenue}>
                        {formatCurrency(analytics?.ecommerce?.lostRevenue || 0)}
                      </span>
                    </div>
                    <div className={styles.abandonmentItem}>
                      <span>Abandoned Carts</span>
                      <span>{formatNumber(analytics?.ecommerce?.abandonedCarts || 0)}</span>
                    </div>
                    <div className={styles.abandonmentItem}>
                      <span>Avg. Abandoned Value</span>
                      <span>{formatCurrency(analytics?.ecommerce?.avgAbandonedValue || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConversionFunnel;