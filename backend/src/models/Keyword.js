const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

class Keyword extends Model {
  // Calculate position change
  getPositionChange() {
    if (!this.previous_position || !this.current_position) return 0;
    return this.previous_position - this.current_position;
  }

  // Check if position improved
  hasImproved() {
    return this.getPositionChange() > 0;
  }

  // Update position and save history
  async updatePosition(newPosition) {
    this.previous_position = this.current_position;
    this.current_position = newPosition;
    
    if (newPosition < this.best_position || !this.best_position) {
      this.best_position = newPosition;
    }

    await this.save();

    // Create history entry
    const KeywordHistory = sequelize.models.KeywordHistory;
    if (KeywordHistory) {
      await KeywordHistory.create({
        keyword_id: this.id,
        position: newPosition,
        search_volume: this.search_volume,
        tracked_at: new Date()
      });
    }
  }

  // Get position history
  async getHistory(days = 30) {
    const KeywordHistory = sequelize.models.KeywordHistory;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return KeywordHistory.findAll({
      where: {
        keyword_id: this.id,
        tracked_at: {
          [sequelize.Op.gte]: startDate
        }
      },
      order: [['tracked_at', 'DESC']]
    });
  }

  // Static method to find active keywords for website
  static async findActiveByWebsite(websiteId) {
    return this.findAll({
      where: {
        website_id: websiteId,
        status: 'active'
      },
      order: [['current_position', 'ASC']]
    });
  }

  // Static method to find keywords needing update
  static async findNeedingUpdate(hoursOld = 24) {
    const updateTime = new Date();
    updateTime.setHours(updateTime.getHours() - hoursOld);

    return this.findAll({
      where: {
        status: 'active',
        updated_at: {
          [sequelize.Op.lt]: updateTime
        }
      }
    });
  }
}

Keyword.init({
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
  keyword: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    },
    set(value) {
      this.setDataValue('keyword', value?.toLowerCase().trim());
    }
  },
  target_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  search_volume: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  difficulty: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  current_position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  previous_position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  best_position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'deleted'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Keyword',
  tableName: 'keywords',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['website_id'] },
    { fields: ['status'] },
    { fields: ['keyword'] },
    { fields: ['current_position'] },
    {
      unique: true,
      fields: ['website_id', 'keyword']
    }
  ]
});

// Keyword History Model
class KeywordHistory extends Model {}

KeywordHistory.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  keyword_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'keywords',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  search_volume: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tracked_at: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'KeywordHistory',
  tableName: 'keyword_history',
  timestamps: false,
  indexes: [
    { fields: ['keyword_id', 'tracked_at'] },
    {
      unique: true,
      fields: ['keyword_id', 'tracked_at']
    }
  ]
});

// Define associations
Keyword.associate = (models) => {
  Keyword.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
  
  Keyword.hasMany(models.KeywordHistory, {
    foreignKey: 'keyword_id',
    as: 'history'
  });
};

KeywordHistory.associate = (models) => {
  KeywordHistory.belongsTo(models.Keyword, {
    foreignKey: 'keyword_id',
    as: 'keyword'
  });
};

module.exports = Keyword;