const { Op } = require('sequelize');
const { Contact, Lead, Deal, User, Activity, Meeting, DealStageHistory } = require('../models');
const {
  getRecordScope,
  scopeWhere,
  canAccessRecord,
  requireOwnedRecord,
} = require('../utils/recordAccess');

exports.list = async (req, res) => {
  try {
    const { search } = req.query;
    const scope = await getRecordScope(req.user);
    const where = scope.isAdmin ? {} : scopeWhere(scope, 'contact');
    if (search) {
      where[Op.and] = [
        {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { company: { [Op.like]: `%${search}%` } },
          ],
        },
      ];
    }
    const contacts = await Contact.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'role'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Lead, as: 'leads' },
        { model: Deal, as: 'deals' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'role'] },
      ],
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    if (!canAccessRecord(scope, 'contact', contact.id)) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const result = contact.toJSON();
    if (!scope.isAdmin) {
      result.leads = result.leads.filter((lead) => scope.leadIds.has(lead.id));
      result.deals = result.deals.filter((deal) => scope.dealIds.has(deal.id));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { record: contact, error } = await requireOwnedRecord(Contact, req.params.id, req.user, 'Contact');
    if (error) return res.status(error.status).json({ error: error.message });
    await contact.update(req.body);
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { record: contact, error } = await requireOwnedRecord(Contact, req.params.id, req.user, 'Contact');
    if (error) return res.status(error.status).json({ error: error.message });
    await contact.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Full client history: the contact's own leads/deals, every stage change on
// those deals, and every activity/meeting logged against the contact OR
// against any of that contact's leads/deals — merged so nothing is missed.
exports.timeline = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const contact = await Contact.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'role'] }],
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    if (!canAccessRecord(scope, 'contact', contact.id)) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const [leads, deals] = await Promise.all([
      Lead.findAll({
        where: {
          contactId: contact.id,
          ...(!scope.isAdmin ? { id: [...scope.leadIds] } : {}),
        },
        order: [['createdAt', 'ASC']],
      }),
      Deal.findAll({
        where: {
          contactId: contact.id,
          ...(!scope.isAdmin ? { id: [...scope.dealIds] } : {}),
        },
        order: [['createdAt', 'ASC']],
      }),
    ]);

    const leadIds = leads.map((l) => l.id);
    const dealIds = deals.map((d) => d.id);

    const relatedOr = [{ relatedType: 'contact', relatedId: contact.id }];
    if (leadIds.length) relatedOr.push({ relatedType: 'lead', relatedId: leadIds });
    if (dealIds.length) relatedOr.push({ relatedType: 'deal', relatedId: dealIds });

    const [activities, meetings, stageHistory] = await Promise.all([
      Activity.findAll({ where: { [Op.or]: relatedOr }, order: [['createdAt', 'ASC']] }),
      Meeting.findAll({ where: { [Op.or]: relatedOr }, order: [['scheduledAt', 'ASC']] }),
      dealIds.length
        ? DealStageHistory.findAll({ where: { dealId: dealIds }, order: [['changedAt', 'ASC']] })
        : [],
    ]);

    res.json({ contact, leads, deals, activities, meetings, stageHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};