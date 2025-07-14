const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

class Settings extends Model {
  // Instance method to get safe settings data
  toJSON() {
    const values = { ...this.get() };
    delete values.google_refresh_token;
    delete values.shopify_api_secret;
    return values;
  }

  // Check if email notifications are enabled
  shouldSendEmail() {
    return this.email_notifications === true;
  }

  // Check if Slack notifications are enabled
  shouldSendSlack() {
    return this.slack_notifications === true && !!this.slack_webhook_url;
  }

  // Get analysis time in user's timezone
  getAnalysisTimeInTimezone() {
    // Convert analysis time to user's timezone
    const time = this.daily_analysis_time;
    const timezone = this.timezone || 'UTC';
    // Implementation would depend on timezone library
    return time;
  }

  // Static method to get or create settings for user
  static async getOrCreate(userId) {
    const [settings, created] = await this.findOrCreate({
      where: { user_id: userId },
      defaults: {
        user_id: userId,
        email_notifications: true,
        slack_notifications: false,
        weekly_report: true,
        daily_analysis_time: '09:00:00',
        timezone: 'UTC'
      }
    });

    return settings;
  }

  // Update notification preferences
  async updateNotifications(preferences) {
    const updates = {};
    
    if (preferences.email_notifications !== undefined) {
      updates.email_notifications = preferences.email_notifications;
    }
    
    if (preferences.slack_notifications !== undefined) {
      updates.slack_notifications = preferences.slack_notifications;
    }
    
    if (preferences.slack_webhook_url !== undefined) {
      updates.slack_webhook_url = preferences.slack_webhook_url;
    }
    
    if (preferences.weekly_report !== undefined) {
      updates.weekly_report = preferences.weekly_report;
    }

    return this.update(updates);
  }
}

Settings.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  google_refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shopify_api_key: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shopify_api_secret: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  email_notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  slack_webhook_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  slack_notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  weekly_report: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  daily_analysis_time: {
    type: DataTypes.TIME,
    defaultValue: '09:00:00',
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
    allowNull: false,
    validate: {
      isIn: [[
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Dubai',
        'Asia/Shanghai',
        'Asia/Tokyo',
        'Australia/Sydney',
        // Add more timezones as needed
      ]]
    }
  }
}, {
  sequelize,
  modelName: 'Settings',
  tableName: 'settings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] }
  ]
});

// Alerts Model
class Alert extends Model {
  // Check if alert should trigger
  shouldTrigger(value) {
    const condition = this.condition_value;
    
    switch (this.condition_type) {
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'equals':
        return value === condition.value;
      case 'contains':
        return value.includes(condition.value);
      case 'percentage_change':
        return Math.abs(value - condition.baseline) / condition.baseline * 100 > condition.threshold;
      default:
        return false;
    }
  }

  // Mark alert as triggered
  async markAsTriggered() {
    this.last_triggered_at = new Date();
    return this.save();
  }

  // Static method to find active alerts
  static async findActive(userId, websiteId = null) {
    const where = {
      user_id: userId,
      is_active: true
    };

    if (websiteId) {
      where.website_id = websiteId;
    }

    return this.findAll({ where });
  }
}

Alert.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  website_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'websites',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  alert_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  alert_type: {
    type: DataTypes.ENUM('email', 'slack', 'webhook'),
    allowNull: false
  },
  condition_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [[
        'greater_than',
        'less_than',
        'equals',
        'contains',
        'percentage_change'
      ]]
    }
  },
  condition_value: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  last_triggered_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Alert',
  tableName: 'alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'is_active'] },
    { fields: ['website_id'] },
    { fields: ['alert_type'] }
  ]
});

// Competitors Model
class Competitor extends Model {
  // Get comparison with website
  getComparison(websiteMetrics) {
    return {
      organic_keywords_diff: this.organic_keywords - websiteMetrics.organic_keywords,
      organic_traffic_diff: this.organic_traffic - websiteMetrics.organic_traffic,
      domain_rating_diff: this.domain_rating - websiteMetrics.domain_rating,
      backlinks_diff: this.backlinks - websiteMetrics.backlinks
    };
  }

  // Static method to find top competitors
  static async findTop(websiteId, limit = 5) {
    return this.findAll({
      where: { website_id: websiteId },
      order: [['organic_traffic', 'DESC']],
      limit
    });
  }
}

Competitor.init({
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
  competitor_domain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  organic_keywords: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  organic_traffic: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  domain_rating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  backlinks: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  last_analyzed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Competitor',
  tableName: 'competitors',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['website_id'] },
    {
      unique: true,
      fields: ['website_id', 'competitor_domain']
    }
  ]
});

// Define associations
Settings.associate = (models) => {
  Settings.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

Alert.associate = (models) => {
  Alert.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  Alert.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
};

Competitor.associate = (models) => {
  Competitor.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
};

module.exports = Settings;