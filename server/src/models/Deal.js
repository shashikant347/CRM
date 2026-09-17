const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DEAL_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const Deal = sequelize.define('Deal', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  stage: { type: DataTypes.ENUM(...DEAL_STAGES), defaultValue: 'new' },
  expectedCloseDate: { type: DataTypes.DATEONLY },
  probability: { type: DataTypes.INTEGER, defaultValue: 20 },
    paymentTerms: { type: DataTypes.STRING },
  discountPercent: { type: DataTypes.INTEGER, defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  attachmentUrl: { type: DataTypes.STRING },
}, {
  tableName: 'deals',
});

Deal.STAGES = DEAL_STAGES;

module.exports = Deal;
