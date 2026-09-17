const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  source: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM(...LEAD_STATUSES), defaultValue: 'new' },
  estimatedValue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, {
  tableName: 'leads',
});

Lead.STATUSES = LEAD_STATUSES;

module.exports = Lead;
