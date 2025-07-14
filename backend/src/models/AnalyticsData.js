const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

class AnalyticsData extends Model {
  // Calculate organic traffic percentage
  getOrganicPercentage() {
    if (!this.visitors || this.visitors === 0) return 0;
    return ((this.organic_traffic / this.visitors) * 100).toFixed(2);
  }

  // Calculate average pages per session
  getPagesPerSession() {
    if (!this.visitors || this.visitors === 0) return 0;
    return (this.page_views / this.visitors).toFixed(2);
  }

  // Get revenue per visitor
  getRevenuePerVisitor() {
    if (!this.visitors || this.visitors === 0) return 0;
    return (this.revenue / this.visitors).toFixed(2);
  }

  // Static method to get analytics summary
  static async getSummary(websiteId, startDate, endDate) {
    const result = await this.findOne({
      where: {
        website_id: websiteId,
        date: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('visitors')), 'total_visitors'],
        [sequelize.fn('SUM', sequelize.col('page_views')), 'total_page_views'],
        [sequelize.fn('SUM', sequelize.col('organic_traffic')), 'total_organic_traffic'],
        [sequelize.fn('SUM', sequelize.col('revenue')), 'total_revenue'],
        [sequelize.fn('SUM', sequelize.col('transactions')), 'total_transactions'],
        [sequelize.fn('AVG', sequelize.col('bounce_rate')), 'avg_bounce_rate'],
        [sequelize.fn('AVG', sequelize.col('avg_session_duration')), 'avg_session_duration'],
        [sequelize.fn('AVG', sequelize.col('conversion_rate')), 'avg_conversion_rate']
      ],
      raw: true
    });

    return {
      total_visitors: parseInt(result.total_visitors) || 0,
      total_page_views: parseInt(result.total_page_views) || 0,
      total_organic_traffic: parseInt(result.total_organic_traffic) || 0,
      total_revenue: parseFloat(result.total_revenue) || 0,
      total_transactions: parseInt(result.total_transactions) || 0,
      avg_bounce_rate: parseFloat(result.avg_bounce_rate) || 0,
      avg_session_duration: parseInt(result.avg_session_duration) || 0,
      avg_conversion_rate: parseFloat(result.avg_conversion_rate) || 0
    };
  }

  // Static method to compare periods
  static async comparePeriods(websiteId, currentStart, currentEnd, previousStart, previousEnd) {
    const current = await this.getSummary(websiteId, currentStart, currentEnd);
    const previous = await this.getSummary(websiteId, previousStart, previousEnd);

    const comparison = {};
    for (const key in current) {
      const currentValue = current[key];
      const previousValue = previous[key];
      
      let change = 0;
      if (previousValue !== 0) {
        change = ((currentValue - previousValue) / previousValue * 100).toFixed(2);
      }

      comparison[key] = {
        current: currentValue,
        previous: previousValue,
        change: parseFloat(change)
      };
    }

    return comparison;
  }

  // Static method to get daily data
  static async getDailyData(websiteId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findAll({
      where: {
        website_id: websiteId,
        date: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
  }
}

AnalyticsData.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  website_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'websites',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  visitors: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  page_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  bounce_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  avg_session_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  organic_traffic: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  conversion_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  transactions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  sequelize,
  modelName: 'AnalyticsData',
  tableName: 'analytics_data',
  timestamps: false,
  indexes: [
    { fields: ['website_id', 'date'] },
    {
      unique: true,
      fields: ['website_id', 'date']
    }
  ]
});

// Define associations
AnalyticsData.associate = (models) => {
  AnalyticsData.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
};

module.exports = AnalyticsData;