const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatConversation = sequelize.define('ChatConversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('team', 'customer'), allowNull: false },
  roomKey: { type: DataTypes.STRING(20), unique: true },
  visitorName: { type: DataTypes.STRING(100) },
  visitorEmail: { type: DataTypes.STRING(254) },
  visitorTokenHash: { type: DataTypes.STRING(64) },
  status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open', allowNull: false },
  lastMessageAt: { type: DataTypes.DATE },
}, {
  tableName: 'chat_conversations',
});

module.exports = ChatConversation;
