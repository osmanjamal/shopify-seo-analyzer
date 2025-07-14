const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

class TechnicalIssue extends Model {
  // Get duration since first detected
  getDurationDays() {
    const now = new Date();
    const firstDetected = new Date(this.first_detected_at);
    const diffTime = Math.abs(now - firstDetected);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Mark issue as resolved
  async markAsResolved() {
    this.is_resolved = true;
    this.resolved_at = new Date();
    return this.save();
  }

  // Static method to find unresolved issues
  static async findUnresolved(websiteId) {
    return this.findAll({
      where: {
        website_id: websiteId,
        is_resolved: false
      },
      order: [
        ['severity', 'DESC'],
        ['first_detected_at', 'ASC']
      ]
    });
  }

  // Static method to count issues by severity
  static async countBySeverity(websiteId) {
    const results = await this.findAll({
      where: {
        website_id: websiteId,
        is_resolved: false
      },
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity'],
      raw: true
    });

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    results.forEach(result => {
      counts[result.severity] = parseInt(result.count);
    });

    return counts;
  }

  // Static method to get issues summary
  static async getSummary(websiteId) {
    const [total, resolved, bySeverity, recentlyResolved] = await Promise.all([
      // Total issues
      this.count({ where: { website_id: websiteId } }),
      
      // Resolved issues
      this.count({ where: { website_id: websiteId, is_resolved: true } }),
      
      // Count by severity
      this.countBySeverity(websiteId),
      
      // Recently resolved (last 7 days)
      this.count({
        where: {
          website_id: websiteId,
          is_resolved: true,
          resolved_at: {
            [sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      total,
      resolved,
      unresolved: total - resolved,
      bySeverity,
      recentlyResolved,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0
    };
  }

  // Static method to find recurring issues
  static async findRecurring(websiteId, issueType) {
    return this.findAll({
      where: {
        website_id: websiteId,
        issue_type: issueType
      },
      order: [['first_detected_at', 'DESC']],
      limit: 10
    });
  }
}

TechnicalIssue.init({
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
  page_url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  issue_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [[
        'broken_link',
        'missing_title',
        'missing_description',
        'duplicate_title',
        'duplicate_description',
        'title_too_long',
        'title_too_short',
        'description_too_long',
        'description_too_short',
        'missing_h1',
        'multiple_h1',
        'missing_alt_text',
        'slow_page_speed',
        'mobile_usability',
        'mixed_content',
        'redirect_chain',
        'canonical_issue',
        'sitemap_issue',
        'robots_txt_issue',
        'structured_data_error',
        'other'
      ]]
    }
  },
  issue_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
    allowNull: false
  },
  is_resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  first_detected_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  last_detected_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'TechnicalIssue',
  tableName: 'technical_issues',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['website_id', 'is_resolved'] },
    { fields: ['severity'] },
    { fields: ['issue_type'] },
    { fields: ['page_url'] }
  ]
});

// Page Speed Metrics Model
class PageSpeedMetrics extends Model {
  // Get overall score
  getOverallScore() {
    const scores = [
      this.performance_score,
      this.seo_score,
      this.accessibility_score,
      this.best_practices_score
    ].filter(score => score !== null);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Static method to get latest metrics
  static async getLatest(websiteId, pageUrl) {
    return this.findOne({
      where: {
        website_id: websiteId,
        page_url: pageUrl
      },
      order: [['measured_at', 'DESC']]
    });
  }

  // Static method to get metrics history
  static async getHistory(websiteId, pageUrl, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findAll({
      where: {
        website_id: websiteId,
        page_url: pageUrl,
        measured_at: {
          [sequelize.Op.gte]: startDate
        }
      },
      order: [['measured_at', 'DESC']]
    });
  }
}

PageSpeedMetrics.init({
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
  page_url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  performance_score: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  seo_score: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  accessibility_score: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  best_practices_score: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 100
    }
  },
  first_contentful_paint: {
    type: DataTypes.DECIMAL(8, 2),
    validate: {
      min: 0
    }
  },
  speed_index: {
    type: DataTypes.DECIMAL(8, 2),
    validate: {
      min: 0
    }
  },
  largest_contentful_paint: {
    type: DataTypes.DECIMAL(8, 2),
    validate: {
      min: 0
    }
  },
  time_to_interactive: {
    type: DataTypes.DECIMAL(8, 2),
    validate: {
      min: 0
    }
  },
  total_blocking_time: {
    type: DataTypes.DECIMAL(8, 2),
    validate: {
      min: 0
    }
  },
  cumulative_layout_shift: {
    type: DataTypes.DECIMAL(5, 3),
    validate: {
      min: 0
    }
  },
  measured_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'PageSpeedMetrics',
  tableName: 'page_speed_metrics',
  timestamps: false,
  indexes: [
    { fields: ['website_id', 'measured_at'] },
    { fields: ['page_url'] }
  ]
});

// Define associations
TechnicalIssue.associate = (models) => {
  TechnicalIssue.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
};

PageSpeedMetrics.associate = (models) => {
  PageSpeedMetrics.belongsTo(models.Website, {
    foreignKey: 'website_id',
    as: 'website'
  });
};

module.exports = TechnicalIssue;