const { Op } = require('sequelize');
const { Contact, Lead, Deal } = require('../models');

async function getRecordScope(user) {
  if (user.role === 'admin') {
    return { isAdmin: true };
  }

  const [contacts, leads, deals] = await Promise.all([
    Contact.findAll({ where: { ownerId: user.id }, attributes: ['id'] }),
    Lead.findAll({ where: { ownerId: user.id }, attributes: ['id', 'contactId'] }),
    Deal.findAll({ where: { ownerId: user.id }, attributes: ['id', 'contactId'] }),
  ]);

  const contactIds = new Set(contacts.map((contact) => contact.id));
  leads.forEach((lead) => contactIds.add(lead.contactId));
  deals.forEach((deal) => contactIds.add(deal.contactId));

  const leadIds = new Set(leads.map((lead) => lead.id));
  const dealIds = new Set(deals.map((deal) => deal.id));

  if (contactIds.size || leadIds.size) {
    const linkedDeals = await Deal.findAll({
      where: {
        [Op.or]: [
          ...(contactIds.size ? [{ contactId: [...contactIds] }] : []),
          ...(leadIds.size ? [{ leadId: [...leadIds] }] : []),
        ],
      },
      attributes: ['id'],
    });
    linkedDeals.forEach((deal) => dealIds.add(deal.id));
  }

  return { isAdmin: false, contactIds, leadIds, dealIds };
}

function scopeWhere(scope, type) {
  if (scope.isAdmin) return {};
  const ids = scope[`${type}Ids`];
  return ids.size ? { id: [...ids] } : { id: null };
}

function canAccessRecord(scope, type, id) {
  return scope.isAdmin || scope[`${type}Ids`].has(id);
}

async function canAccessRelatedRecord(scope, relatedType, relatedId) {
  if (scope.isAdmin) return true;
  const pluralType = `${relatedType}Ids`;
  return Boolean(scope[pluralType] && scope[pluralType].has(relatedId));
}

async function requireOwnedRecord(Model, id, user, label) {
  const record = await Model.findByPk(id);
  if (!record) return { error: { status: 404, message: `${label} not found` } };
  if (user.role !== 'admin' && record.ownerId !== user.id) {
    return { error: { status: 403, message: `You can only manage your own ${label.toLowerCase()}` } };
  }
  return { record };
}

module.exports = {
  getRecordScope,
  scopeWhere,
  canAccessRecord,
  canAccessRelatedRecord,
  requireOwnedRecord,
};
