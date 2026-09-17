const { Activity, Contact, Lead, Deal } = require('../models');

exports.listAll = async (req, res) => {
  try {
    const { type, completed } = req.query;
    const where = {};
    if (type) where.type = type;
    if (completed !== undefined) where.completed = completed === 'true';

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
    await activity.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};