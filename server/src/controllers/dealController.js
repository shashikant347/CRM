const { Deal, Contact, Lead, User, DealStageHistory, Activity, Meeting } = require('../models');
const {
  getRecordScope,
  scopeWhere,
  canAccessRecord,
  canAccessRelatedRecord,
  requireOwnedRecord,
} = require('../utils/recordAccess');

exports.list = async (req, res) => {
  try {
    const { stage } = req.query;
    const scope = await getRecordScope(req.user);
    const where = {
      ...(stage ? { stage } : {}),
      ...(!scope.isAdmin ? scopeWhere(scope, 'deal') : {}),
    };
    const deals = await Deal.findAll({
      where,
      include: [
        { model: Contact, as: 'contact', attributes: ['id', 'name', 'company'] },
        { model: User, as: 'owner', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Grouped by stage - handy for the Kanban pipeline board
exports.pipeline = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const deals = await Deal.findAll({
      where: scope.isAdmin ? {} : scopeWhere(scope, 'deal'),
      include: [{ model: Contact, as: 'contact', attributes: ['id', 'name', 'company'] }],
      order: [['createdAt', 'DESC']],
    });
    const board = Deal.STAGES.reduce((acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    }, {});
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const deal = await Deal.findByPk(req.params.id, {
      include: [{ model: Contact, as: 'contact' }, { model: Lead, as: 'lead' }],
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (!canAccessRecord(scope, 'deal', deal.id)) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    const result = deal.toJSON();
    if (!scope.isAdmin && result.lead && !scope.leadIds.has(result.lead.id)) {
      result.lead = null;
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
      return res.status(403).json({ error: 'You can only create deals for your own contacts' });
    }
    if (req.body.leadId) {
      const linkedLead = await Lead.findByPk(req.body.leadId);
      if (!linkedLead || !await canAccessRelatedRecord(scope, 'lead', linkedLead.id)) {
        return res.status(403).json({ error: 'You can only link deals to your own leads' });
      }
      if (linkedLead.contactId !== req.body.contactId) {
        return res.status(400).json({ error: 'The selected lead and contact do not match' });
      }
    }
    const deal = await Deal.create({ ...req.body, ownerId: req.user.id });
    // Log the starting stage so the timeline always has a first entry.
    await DealStageHistory.create({ dealId: deal.id, fromStage: null, toStage: deal.stage });
    res.status(201).json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { record: deal, error } = await requireOwnedRecord(Deal, req.params.id, req.user, 'Deal');
    if (error) return res.status(error.status).json({ error: error.message });
    if (req.body.contactId) {
      const scope = await getRecordScope(req.user);
      if (!await canAccessRelatedRecord(scope, 'contact', req.body.contactId)) {
        return res.status(403).json({ error: 'You can only link deals to your own contacts' });
      }
    }

    const previousStage = deal.stage;
    await deal.update(req.body);

    if (req.body.stage && req.body.stage !== previousStage) {
      await DealStageHistory.create({ dealId: deal.id, fromStage: previousStage, toStage: deal.stage });
    }

    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Dedicated endpoint for drag-and-drop stage changes on the pipeline board
exports.updateStage = async (req, res) => {
  try {
    const { stage } = req.body;
    if (!Deal.STAGES.includes(stage)) {
      return res.status(400).json({ error: `stage must be one of ${Deal.STAGES.join(', ')}` });
    }
    const { record: deal, error } = await requireOwnedRecord(Deal, req.params.id, req.user, 'Deal');
    if (error) return res.status(error.status).json({ error: error.message });

    const previousStage = deal.stage;
    await deal.update({ stage });

    if (stage !== previousStage) {
      await DealStageHistory.create({ dealId: deal.id, fromStage: previousStage, toStage: stage });
    }

    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { record: deal, error } = await requireOwnedRecord(Deal, req.params.id, req.user, 'Deal');
    if (error) return res.status(error.status).json({ error: error.message });
    await deal.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Full deal history: every stage it has moved through, plus activities and
// meetings logged directly against this deal.
exports.timeline = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: Contact, as: 'contact' },
        { model: Lead, as: 'lead' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'role'] },
      ],
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (!canAccessRecord(scope, 'deal', deal.id)) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    const dealResult = deal.toJSON();
    if (!scope.isAdmin && dealResult.lead && !scope.leadIds.has(dealResult.lead.id)) {
      dealResult.lead = null;
    }

    const [activities, meetings, stageHistory] = await Promise.all([
      Activity.findAll({ where: { relatedType: 'deal', relatedId: deal.id }, order: [['createdAt', 'ASC']] }),
      Meeting.findAll({ where: { relatedType: 'deal', relatedId: deal.id }, order: [['scheduledAt', 'ASC']] }),
      DealStageHistory.findAll({ where: { dealId: deal.id }, order: [['changedAt', 'ASC']] }),
    ]);

    res.json({ deal: dealResult, activities, meetings, stageHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};