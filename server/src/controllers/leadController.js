const { Lead, Contact, Deal, User, Activity, Meeting, DealStageHistory } = require('../models');
const {
  getRecordScope,
  canAccessRecord,
  canAccessRelatedRecord,
  requireOwnedRecord,
} = require('../utils/recordAccess');

exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    const scope = await getRecordScope(req.user);
    const where = {
      ...(status ? { status } : {}),
      ...(!scope.isAdmin ? { ownerId: req.user.id } : {}),
    };
    const leads = await Lead.findAll({
      where,
      include: [
        { model: Contact, as: 'contact', attributes: ['id', 'name', 'company', 'email'] },
        { model: User, as: 'owner', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const lead = await Lead.findByPk(req.params.id, {
      include: [{ model: Contact, as: 'contact' }, { model: Deal, as: 'deal' }],
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!canAccessRecord(scope, 'lead', lead.id)) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const result = lead.toJSON();
    if (!scope.isAdmin && result.deal && !scope.dealIds.has(result.deal.id)) {
      result.deal = null;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, 'contact', req.body.contactId)) {
      return res.status(403).json({ error: 'You can only create leads for your own contacts' });
    }
    const lead = await Lead.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { record: lead, error } = await requireOwnedRecord(Lead, req.params.id, req.user, 'Lead');
    if (error) return res.status(error.status).json({ error: error.message });
    if (req.body.contactId) {
      const scope = await getRecordScope(req.user);
      if (!await canAccessRelatedRecord(scope, 'contact', req.body.contactId)) {
        return res.status(403).json({ error: 'You can only link leads to your own contacts' });
      }
    }
    await lead.update(req.body);
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Convert a qualified lead into a Deal
exports.convert = async (req, res) => {
  try {
    const { record: lead, error } = await requireOwnedRecord(Lead, req.params.id, req.user, 'Lead');
    if (error) return res.status(error.status).json({ error: error.message });

    const deal = await Deal.create({
      title: lead.title,
      value: lead.estimatedValue || 0,
      stage: 'new',
      contactId: lead.contactId,
      leadId: lead.id,
      ownerId: req.user.id,
    });
    await lead.update({ status: 'converted' });
    res.status(201).json({ lead, deal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { record: lead, error } = await requireOwnedRecord(Lead, req.params.id, req.user, 'Lead');
    if (error) return res.status(error.status).json({ error: error.message });
    await lead.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Full lead history: activities/meetings logged against this lead, plus
// (if it was converted) the resulting deal and every stage it has moved through.
exports.timeline = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: Contact, as: 'contact' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'role'] },
      ],
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!canAccessRecord(scope, 'lead', lead.id)) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const deal = await Deal.findOne({
      where: {
        leadId: lead.id,
        ...(!scope.isAdmin ? { id: [...scope.dealIds] } : {}),
      },
    });

    const [activities, meetings, stageHistory] = await Promise.all([
      Activity.findAll({ where: { relatedType: 'lead', relatedId: lead.id }, order: [['createdAt', 'ASC']] }),
      Meeting.findAll({ where: { relatedType: 'lead', relatedId: lead.id }, order: [['scheduledAt', 'ASC']] }),
      deal
        ? DealStageHistory.findAll({ where: { dealId: deal.id }, order: [['changedAt', 'ASC']] })
        : [],
    ]);

    res.json({ lead, deal, activities, meetings, stageHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};