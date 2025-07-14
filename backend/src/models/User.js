const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../utils/database');

class User extends Model {
  // Instance method to check password
  async validatePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  // Instance method to get safe user data
  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    delete values.google_refresh_token;
    return values;
  }

  // Static method to find by email
  static async findByEmail(email) {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  // Static method to create user with hashed password
  static async createWithPassword(userData) {
    if (userData.password) {
      userData.password_hash = await bcrypt.hash(userData.password, 10);
      delete userData.password;
    }
    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }
    return this.create(userData);
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value?.toLowerCase());
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  google_id: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      len: [2, 255]
    }
  },
  avatar_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'viewer'),
    defaultValue: 'user',
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['google_id'] },
    { fields: ['is_active'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 10);
        delete user.password;
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password_hash = await bcrypt.hash(user.password, 10);
        delete user.password;
      }
    }
  }
});

module.exports = User;