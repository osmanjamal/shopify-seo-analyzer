const { createShopifyClient, createGraphQLClient, handleRateLimit } = require('../../config/shopify');
const logger = require('../../utils/logger');
const { Cache, TTL } = require('../../utils/cache');
const { dateHelpers } = require('../../utils/helpers');

class ShopifyOrdersService {
  constructor() {
    this.ordersPerPage = 250;
  }

  // Get orders with filters
  async getOrders(shop, accessToken, options = {}) {
    try {
      const {
        status = 'any',
        financial_status,
        fulfillment_status,
        created_at_min,
        created_at_max,
        limit = 250,
        fields
      } = options;

      const client = createShopifyClient(shop, accessToken);
      let orders = [];
      let pageInfo = null;

      const query = {
        limit,
        status
      };

      if (financial_status) query.financial_status = financial_status;
      if (fulfillment_status) query.fulfillment_status = fulfillment_status;
      if (created_at_min) query.created_at_min = created_at_min;
      if (created_at_max) query.created_at_max = created_at_max;
      if (fields) query.fields = fields;

      do {
        if (pageInfo) query.page_info = pageInfo;

        const response = await handleRateLimit(async () => {
          return client.get({
            path: 'orders',
            query
          });
        });

        orders = orders.concat(response.body.orders);
        pageInfo = response.pageInfo?.nextPage;

      } while (pageInfo && orders.length < 1000); // Limit to 1000 orders max

      return orders;

    } catch (error) {
      logger.error('Get orders error:', error);
      throw error;
    }
  }

  // Get order analytics
  async getOrderAnalytics(shop, accessToken, startDate, endDate) {
    try {
      const cacheKey = `shopify:order-analytics:${shop}:${startDate}:${endDate}`;
      const cached = await Cache.get(cacheKey);
      if (cached) return cached;

      const orders = await this.getOrders(shop, accessToken, {
        created_at_min: startDate,
        created_at_max: endDate,
        status: 'any'
      });

      const analytics = {
        totalOrders: orders.length,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {},
        ordersByDay: {},
        topProducts: {},
        customerAnalytics: {
          uniqueCustomers: new Set(),
          repeatCustomers: new Map(),
          newVsReturning: { new: 0, returning: 0 }
        },
        conversionMetrics: {
          paidOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          refundedOrders: 0
        }
      };

      // Process orders
      for (const order of orders) {
        // Revenue
        const orderTotal = parseFloat(order.total_price || 0);
        analytics.totalRevenue += orderTotal;

        // Status breakdown
        const status = order.financial_status || 'unknown';
        analytics.ordersByStatus[status] = (analytics.ordersByStatus[status] || 0) + 1;

        // Daily breakdown
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (!analytics.ordersByDay[orderDate]) {
          analytics.ordersByDay[orderDate] = {
            orders: 0,
            revenue: 0
          };
        }
        analytics.ordersByDay[orderDate].orders++;
        analytics.ordersByDay[orderDate].revenue += orderTotal;

        // Product analysis
        if (order.line_items) {
          for (const item of order.line_items) {
            const productId = item.product_id;
            if (!analytics.topProducts[productId]) {
              analytics.topProducts[productId] = {
                id: productId,
                title: item.title,
                quantity: 0,
                revenue: 0
              };
            }
            analytics.topProducts[productId].quantity += item.quantity;
            analytics.topProducts[productId].revenue += parseFloat(item.price) * item.quantity;
          }
        }

        // Customer analytics
        if (order.customer) {
          const customerId = order.customer.id;
          analytics.customerAnalytics.uniqueCustomers.add(customerId);
          
          const orderCount = analytics.customerAnalytics.repeatCustomers.get(customerId) || 0;
          analytics.customerAnalytics.repeatCustomers.set(customerId, orderCount + 1);
          
          if (order.customer.orders_count === 1) {
            analytics.customerAnalytics.newVsReturning.new++;
          } else {
            analytics.customerAnalytics.newVsReturning.returning++;
          }
        }

        // Conversion metrics
        switch (order.financial_status) {
          case 'paid':
            analytics.conversionMetrics.paidOrders++;
            break;
          case 'pending':
            analytics.conversionMetrics.pendingOrders++;
            break;
          case 'refunded':
          case 'partially_refunded':
            analytics.conversionMetrics.refundedOrders++;
            break;
        }

        if (order.cancelled_at) {
          analytics.conversionMetrics.cancelledOrders++;
        }
      }

      // Calculate final metrics
      analytics.averageOrderValue = analytics.totalOrders > 0 
        ? analytics.totalRevenue / analytics.totalOrders 
        : 0;

      // Convert sets and maps to numbers
      analytics.customerAnalytics.uniqueCustomers = analytics.customerAnalytics.uniqueCustomers.size;
      analytics.customerAnalytics.repeatPurchaseRate = 
        Array.from(analytics.customerAnalytics.repeatCustomers.values())
          .filter(count => count > 1).length / analytics.customerAnalytics.uniqueCustomers;

      // Sort top products
      analytics.topProducts = Object.values(analytics.topProducts)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      await Cache.set(cacheKey, analytics, TTL.medium);
      return analytics;

    } catch (error) {
      logger.error('Get order analytics error:', error);
      throw error;
    }
  }

  // Get conversion funnel
  async getConversionFunnel(shop, accessToken, startDate, endDate) {
    try {
      const client = createGraphQLClient(shop, accessToken);
      
      const query = `
        query getConversionMetrics($startDate: DateTime!, $endDate: DateTime!) {
          shop {
            analyticsToken
            metrics(
              startDate: $startDate
              endDate: $endDate
            ) {
              sessions
              uniqueVisitors
              addedToCartSessions
              reachedCheckoutSessions
              completedCheckouts
              totalSales
            }
          }
        }
      `;

      const response = await handleRateLimit(async () => {
        return client.query({
          data: {
            query,
            variables: {
              startDate: new Date(startDate).toISOString(),
              endDate: new Date(endDate).toISOString()
            }
          }
        });
      });

      const metrics = response.body.data.shop.metrics;
      
      // Calculate conversion rates
      const funnel = {
        visitors: metrics.uniqueVisitors || 0,
        sessions: metrics.sessions || 0,
        addedToCart: metrics.addedToCartSessions || 0,
        reachedCheckout: metrics.reachedCheckoutSessions || 0,
        completedOrders: metrics.completedCheckouts || 0,
        totalRevenue: metrics.totalSales || 0,
        conversionRates: {
          visitorToCart: 0,
          cartToCheckout: 0,
          checkoutToOrder: 0,
          overallConversion: 0
        }
      };

      // Calculate rates
      if (funnel.visitors > 0) {
        funnel.conversionRates.visitorToCart = (funnel.addedToCart / funnel.visitors) * 100;
        funnel.conversionRates.overallConversion = (funnel.completedOrders / funnel.visitors) * 100;
      }
      
      if (funnel.addedToCart > 0) {
        funnel.conversionRates.cartToCheckout = (funnel.reachedCheckout / funnel.addedToCart) * 100;
      }
      
      if (funnel.reachedCheckout > 0) {
        funnel.conversionRates.checkoutToOrder = (funnel.completedOrders / funnel.reachedCheckout) * 100;
      }

      return funnel;

    } catch (error) {
      logger.error('Get conversion funnel error:', error);
      throw error;
    }
  }

  // Get abandoned checkouts
  async getAbandonedCheckouts(shop, accessToken, options = {}) {
    try {
      const { limit = 250, created_at_min, created_at_max } = options;
      
      const client = createShopifyClient(shop, accessToken);
      
      const query = {
        limit,
        status: 'open'
      };
      
      if (created_at_min) query.created_at_min = created_at_min;
      if (created_at_max) query.created_at_max = created_at_max;

      const response = await handleRateLimit(async () => {
        return client.get({
          path: 'checkouts',
          query
        });
      });

      const checkouts = response.body.checkouts || [];
      
      // Analyze abandoned checkouts
      const analysis = {
        total: checkouts.length,
        totalValue: checkouts.reduce((sum, c) => sum + parseFloat(c.total_price || 0), 0),
        averageValue: 0,
        byStep: {
          contact_information: 0,
          shipping_method: 0,
          payment_method: 0
        },
        topAbandonedProducts: {}
      };

      analysis.averageValue = analysis.total > 0 ? analysis.totalValue / analysis.total : 0;

      // Analyze by step and products
      for (const checkout of checkouts) {
        // Checkout step
        if (checkout.completed_at === null) {
          const step = checkout.buyer_accepts_marketing ? 'payment_method' : 
                      checkout.shipping_line ? 'shipping_method' : 'contact_information';
          analysis.byStep[step]++;
        }

        // Products
        if (checkout.line_items) {
          for (const item of checkout.line_items) {
            const productId = item.product_id;
            if (!analysis.topAbandonedProducts[productId]) {
              analysis.topAbandonedProducts[productId] = {
                id: productId,
                title: item.title,
                abandonedCount: 0,
                abandonedValue: 0
              };
            }
            analysis.topAbandonedProducts[productId].abandonedCount++;
            analysis.topAbandonedProducts[productId].abandonedValue += parseFloat(item.price) * item.quantity;
          }
        }
      }

      // Sort top abandoned products
      analysis.topAbandonedProducts = Object.values(analysis.topAbandonedProducts)
        .sort((a, b) => b.abandonedValue - a.abandonedValue)
        .slice(0, 10);

      return analysis;

    } catch (error) {
      logger.error('Get abandoned checkouts error:', error);
      throw error;
    }
  }

  // Get customer lifetime value
  async getCustomerLifetimeValue(shop, accessToken) {
    try {
      const client = createGraphQLClient(shop, accessToken);
      
      const query = `
        query getCustomerMetrics {
          customers(first: 250, sortKey: TOTAL_SPENT, reverse: true) {
            edges {
              node {
                id
                email
                ordersCount
                totalSpent {
                  amount
                  currencyCode
                }
                averageOrderAmount {
                  amount
                  currencyCode
                }
                createdAt
                lastOrder {
                  createdAt
                }
              }
            }
          }
        }
      `;

      const response = await handleRateLimit(async () => {
        return client.query({
          data: { query }
        });
      });

      const customers = response.body.data.customers.edges.map(edge => edge.node);
      
      // Calculate CLV metrics
      const metrics = {
        totalCustomers: customers.length,
        averageCLV: 0,
        topCustomers: [],
        clvDistribution: {
          under100: 0,
          '100to500': 0,
          '500to1000': 0,
          over1000: 0
        },
        repeatPurchaseRate: 0,
        averageOrdersPerCustomer: 0
      };

      let totalSpent = 0;
      let totalOrders = 0;
      let repeatCustomers = 0;

      for (const customer of customers) {
        const spent = parseFloat(customer.totalSpent.amount);
        totalSpent += spent;
        totalOrders += customer.ordersCount;

        if (customer.ordersCount > 1) {
          repeatCustomers++;
        }

        // CLV distribution
        if (spent < 100) {
          metrics.clvDistribution.under100++;
        } else if (spent < 500) {
          metrics.clvDistribution['100to500']++;
        } else if (spent < 1000) {
          metrics.clvDistribution['500to1000']++;
        } else {
          metrics.clvDistribution.over1000++;
        }
      }

      metrics.averageCLV = metrics.totalCustomers > 0 ? totalSpent / metrics.totalCustomers : 0;
      metrics.repeatPurchaseRate = metrics.totalCustomers > 0 ? (repeatCustomers / metrics.totalCustomers) * 100 : 0;
      metrics.averageOrdersPerCustomer = metrics.totalCustomers > 0 ? totalOrders / metrics.totalCustomers : 0;
      metrics.topCustomers = customers.slice(0, 10).map(c => ({
        email: c.email,
        ordersCount: c.ordersCount,
        totalSpent: parseFloat(c.totalSpent.amount),
        averageOrderValue: parseFloat(c.averageOrderAmount.amount)
      }));

      return metrics;

    } catch (error) {
      logger.error('Get customer lifetime value error:', error);
      throw error;
    }
  }
}

module.exports = new ShopifyOrdersService();