const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

class Website extends Model {
  // Instance method to get safe website data
  toJSON() {
    const values = { ...this.get() };
    delete values.shopify_access_token;
    return values;
  }

  // Static method to find active websites
  static async findActiveByUser(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });
  }

  // Instance method to check if website needs verification
  needsVerification() {
    return !this.is_verified || !this.google_site_id;
  }

  // Instance method to get analytics data
  async getAnalyticsData(startDate, endDate) {
    const AnalyticsData = require('./AnalyticsData');
    return AnalyticsData.findAll({
      where: {
        website_id: this.id,
        date: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'DESC']]
    });
  }

  // Instance method to get active keywords
  async getActiveKeywords() {
    const Keyword = require('./Keyword');
    return Keyword.findAll({
      where: {
        website_id: this.id,
        status: 'active'
      },
      order: [['created_at', 'DESC']]
    });
  }
}

Website.init({
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
  domain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidDomain(value) {
        const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(?:\/.*)?$/;
        if (!domainRegex.test(value)) {
          throw new Error('Invalid domain format');
        }
      }
    },
    set(value) {
      // Clean domain - remove protocol and www
      let domain = value.toLowerCase().trim();
      domain = domain.replace(/^https?:\/\//, '');
      domain = domain.replace(/^www\./, '');
      domain = domain.replace(/\/$/, '');
      this.setDataValue('domain', domain);
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  shopify_store_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  shopify_access_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  google_site_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  google_view_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Website',
  tableName: 'websites',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['domain'] },
    { fields: ['is_active'] },
    { fields: ['shopify_store_id'] },
    {
      unique: true,
      fields: ['user_id', 'domain']
    }
  ]
});

// Define associations
Website.associate = (models) => {
  Website.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  Website.hasMany(models.Keyword, {
    foreignKey: 'website_id',
    as: 'keywords'
  });
  
  Website.hasMany(models.AnalyticsData, {
    foreignKey: 'website_id',
    as: 'analytics'
  });
  
  Website.hasMany(models.TechnicalIssue, {
    foreignKey: 'website_id',
    as: 'technicalIssues'
  });
};

module.exports = Website;