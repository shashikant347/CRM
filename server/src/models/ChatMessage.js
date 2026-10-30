const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  senderType: { type: DataTypes.ENUM('agent', 'visitor'), allowNull: false },
  senderId: { type: DataTypes.UUID },
  senderName: { type: DataTypes.STRING(100), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'chat_messages',
});

module.exports = ChatMessage;
