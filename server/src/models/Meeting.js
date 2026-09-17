const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Meeting = sequelize.define('Meeting', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  notes: { type: DataTypes.TEXT },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 30 },
  location: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'), defaultValue: 'scheduled' },
  relatedType: { type: DataTypes.ENUM('contact', 'lead', 'deal'), allowNull: false },
  relatedId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'meetings',
});

module.exports = Meeting;