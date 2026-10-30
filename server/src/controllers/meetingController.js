const { Meeting, Contact, Lead, Deal } = require('../models');
const { Op } = require('sequelize');
const {
  getRecordScope,
  canAccessRelatedRecord,
  requireOwnedRecord,
} = require('../utils/recordAccess');

// List all meetings, enriched with the linked record's display name.
// Supports ?upcoming=true to only show future, scheduled meetings.
exports.listAll = async (req, res) => {
  try {
    const { upcoming, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (upcoming === 'true') {
      where.scheduledAt = { [Op.gte]: new Date() };
      where.status = 'scheduled';
    }

    const scope = await getRecordScope(req.user);
    if (!scope.isAdmin) {
      const relatedRecords = [
        ...(scope.contactIds.size ? [{ relatedType: 'contact', relatedId: [...scope.contactIds] }] : []),
        ...(scope.leadIds.size ? [{ relatedType: 'lead', relatedId: [...scope.leadIds] }] : []),
        ...(scope.dealIds.size ? [{ relatedType: 'deal', relatedId: [...scope.dealIds] }] : []),
      ];
      where[Op.and] = [
        {
          [Op.or]: [
            { ownerId: req.user.id },
            ...(relatedRecords.length ? [{ [Op.or]: relatedRecords }] : []),
          ],
        },
      ];
    }

    const meetings = await Meeting.findAll({ where, order: [['scheduledAt', 'ASC']] });

    const ids = { contact: new Set(), lead: new Set(), deal: new Set() };
    meetings.forEach((m) => ids[m.relatedType]?.add(m.relatedId));

    const [contacts, leads, deals] = await Promise.all([
      Contact.findAll({ where: { id: [...ids.contact] }, attributes: ['id', 'name'] }),
      Lead.findAll({ where: { id: [...ids.lead] }, attributes: ['id', 'title'] }),
      Deal.findAll({ where: { id: [...ids.deal] }, attributes: ['id', 'title'] }),
    ]);

    const nameMap = {};
    contacts.forEach((c) => { nameMap[`contact:${c.id}`] = c.name; });
    leads.forEach((l) => { nameMap[`lead:${l.id}`] = l.title; });
    deals.forEach((d) => { nameMap[`deal:${d.id}`] = d.title; });

    const enriched = meetings.map((m) => ({
      ...m.toJSON(),
      relatedLabel: nameMap[`${m.relatedType}:${m.relatedId}`] || 'Unknown',
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
      return res.status(400).json({ error: 'Invalid meeting record type' });
    }
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, relatedType, relatedId)) {
      return res.status(404).json({ error: 'Record not found' });
    }
    const meetings = await Meeting.findAll({
      where: { relatedType, relatedId },
      order: [['scheduledAt', 'ASC']],
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    if (!await canAccessRelatedRecord(scope, req.body.relatedType, req.body.relatedId)) {
      return res.status(403).json({ error: 'You can only schedule meetings for your own records' });
    }
    const meeting = await Meeting.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { record: meeting, error } = await requireOwnedRecord(Meeting, req.params.id, req.user, 'Meeting');
    if (error) return res.status(error.status).json({ error: error.message });
    await meeting.update(req.body);
    res.json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { record: meeting, error } = await requireOwnedRecord(Meeting, req.params.id, req.user, 'Meeting');
    if (error) return res.status(error.status).json({ error: error.message });
    await meeting.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};