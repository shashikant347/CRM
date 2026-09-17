const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Activity = sequelize.define('Activity', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('note', 'call', 'email', 'meeting', 'task'), defaultValue: 'note' },
  content: { type: DataTypes.TEXT, allowNull: false },
  dueAt: { type: DataTypes.DATE },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  relatedType: { type: DataTypes.ENUM('contact', 'lead', 'deal'), allowNull: false },
  relatedId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'activities',
});

module.exports = Activity;
