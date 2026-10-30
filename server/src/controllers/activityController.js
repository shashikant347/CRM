const { Op } = require('sequelize');
const { Activity, Contact, Lead, Deal } = require('../models');
const {
  getRecordScope,
  canAccessRelatedRecord,
} = require('../utils/recordAccess');

exports.listAll = async (req, res) => {
  try {
    const { type, completed } = req.query;
    const where = {};
    if (type) where.type = type;
    if (completed !== undefined) where.completed = completed === 'true';

    const scope = await getRecordScope(req.user);
    if (!scope.isAdmin) {
      const relatedRecords = [
        ...(scope.contactIds.size ? [{ relatedType: 'contact', relatedId: [...scope.contactIds] }] : []),
        ...(scope.leadIds.size ? [{ relatedType: 'lead', relatedId: [...scope.leadIds] }] : []),
        ...(scope.dealIds.size ? [{ relatedType: 'deal', relatedId: [...scope.dealIds] }] : []),
      ];
      if (!relatedRecords.length) where.id = null;
      else where[Op.or] = relatedRecords;
    }

    const activities = await Activity.findAll({ where, order: [['createdAt', 'DESC']] });

    // Activities link polymorphically (relatedType + relatedId), so we
    // batch-fetch the display name from whichever table each one points to.
    const ids = { contact: new Set(), lead: new Set(), deal: new Set() };
    activities.forEach((a) => ids[a.relatedType]?.add(a.relatedId));

    const [contacts, leads, deals] = await Promise.all([
      Contact.findAll({ where: { id: [...ids.contact] }, attributes: ['id', 'name'] }),
      Lead.findAll({ where: { id: [...ids.lead] }, attributes: ['id', 'title'] }),
      Deal.findAll({ where: { id: [...ids.deal] }, attributes: ['id', 'title'] }),
    ]);

    const nameMap = {};
    contacts.forEach((c) => { nameMap[`contact:${c.id}`] = c.name; });
    leads.forEach((l) => { nameMap[`lead:${l.id}`] = l.title; });
    deals.forEach((d) => { nameMap[`deal:${d.id}`] = d.title; });

    const enriched = activities.map((a) => ({
      ...a.toJSON(),
      relatedLabel: nameMap[`${a.relatedType}:${a.relatedId}`] || 'Unknown',
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listForEntity = async (req, res) => {
  try {
    const { relatedType, relatedId } = req.params;
    if (!['contact', 'lead', 'deal'].includes(relatedType)) {
      return res.status(400).json({ error: 'Invalid activity record type' });
    }
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, relatedType, relatedId)) {
      return res.status(404).json({ error: 'Record not found' });
    }
    const activities = await Activity.findAll({
      where: { relatedType, relatedId },
      order: [['createdAt', 'DESC']],
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, req.body.relatedType, req.body.relatedId)) {
      return res.status(403).json({ error: 'You can only add activities to your own records' });
    }
    const activity = await Activity.create(req.body);
    res.status(201).json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, activity.relatedType, activity.relatedId)) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    await activity.update(req.body);
    res.json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, activity.relatedType, activity.relatedId)) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    await activity.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};