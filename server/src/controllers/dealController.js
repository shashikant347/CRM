const { Deal, Contact, Lead, User } = require('../models');

exports.list = async (req, res) => {
  try {
    const { stage } = req.query;
    const where = stage ? { stage } : {};
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
    const deals = await Deal.findAll({
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
    const deal = await Deal.findByPk(req.params.id, {
      include: [{ model: Contact, as: 'contact' }, { model: Lead, as: 'lead' }],
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const deal = await Deal.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    await deal.update(req.body);
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
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    await deal.update({ stage });
    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    await deal.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
