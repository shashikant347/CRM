const { Op } = require('sequelize');
const { Contact, Lead, Deal, User } = require('../models');

exports.list = async (req, res) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { company: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};
    const contacts = await Contact.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Lead, as: 'leads' },
        { model: Deal, as: 'deals' },
        { model: User, as: 'owner', attributes: ['id', 'name'] },
      ],
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, ownerId: req.user.id });
    res.status(201).json(contact);
  } catch (err) {z
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    await contact.update(req.body);
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    await contact.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
