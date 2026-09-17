const sequelize = require('../config/db');
const User = require('./User');
const Contact = require('./Contact');
const Lead = require('./Lead');
const Deal = require('./Deal');
const Activity = require('./Activity');
const Meeting = require('./Meeting');

// --- Associations ---

// User owns contacts/leads/deals (assigned rep)
User.hasMany(Contact, { foreignKey: 'ownerId', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Lead, { foreignKey: 'ownerId', as: 'leads' });
Lead.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Deal, { foreignKey: 'ownerId', as: 'deals' });
Deal.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Meeting, { foreignKey: 'ownerId', as: 'meetings' });
Meeting.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Contact <-> Lead <-> Deal chain
Contact.hasMany(Lead, { foreignKey: 'contactId', as: 'leads', onDelete: 'CASCADE' });
Lead.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

Contact.hasMany(Deal, { foreignKey: 'contactId', as: 'deals', onDelete: 'CASCADE' });
Deal.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

Lead.hasOne(Deal, { foreignKey: 'leadId', as: 'deal' });
Deal.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

module.exports = { sequelize, User, Contact, Lead, Deal, Activity, Meeting };