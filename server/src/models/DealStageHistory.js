const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per stage transition. fromStage is null for the very first
// entry created when the deal itself is created.
const DealStageHistory = sequelize.define('DealStageHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fromStage: { type: DataTypes.STRING, allowNull: true },
  toStage: { type: DataTypes.STRING, allowNull: false },
  changedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
}, {
  tableName: 'deal_stage_history',
  updatedAt: false,
});

module.exports = DealStageHistory;