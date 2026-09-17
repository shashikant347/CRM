const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING },
  jobTitle: { type: DataTypes.STRING },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'contacts',
});

module.exports = Contact;