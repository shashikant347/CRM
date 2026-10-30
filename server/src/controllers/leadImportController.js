const Joi = require('joi');
const { sequelize, User, Contact, Lead } = require('../models');

const rowSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().trim().email().allow('', null),
  phone: Joi.string().trim().max(40).allow('', null),
  company: Joi.string().trim().max(150).allow('', null),
  leadTitle: Joi.string().trim().min(2).max(200).required(),
  source: Joi.string().trim().max(100).allow('', null),
  estimatedValue: Joi.number().min(0).max(100000000).allow('', null),
  salesEmail: Joi.string().trim().email().required(),
}).unknown(false);

function cleanRow(row) {
  const estimatedValue = row.estimatedValue === '' || row.estimatedValue == null
    ? 0
    : Number(String(row.estimatedValue).replace(/[₹,$\s]/g, ''));
  return {
    customerName: row.customerName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    leadTitle: row.leadTitle,
    source: row.source,
    estimatedValue,
    salesEmail: typeof row.salesEmail === 'string' ? row.salesEmail.trim().toLowerCase() : row.salesEmail,
  };
}

exports.listAssignees = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { role: 'sales_rep' },
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.importLeads = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.rows) || req.body.rows.length === 0) {
      return res.status(400).json({ error: 'The spreadsheet must contain at least one data row.' });
    }
    if (req.body.rows.length > 500) {
      return res.status(400).json({ error: 'Upload a maximum of 500 lead rows at a time.' });
    }

    const users = await User.findAll({
      where: { role: 'sales_rep' },
      attributes: ['id', 'name', 'email'],
    });
    const repsByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
    const results = [];

    for (let index = 0; index < req.body.rows.length; index += 1) {
      const rowNumber = index + 2;
      const inputRow = req.body.rows[index];
      const candidate = inputRow && typeof inputRow === 'object' && !Array.isArray(inputRow)
        ? cleanRow(inputRow)
        : inputRow;
      const { error, value } = rowSchema.validate(candidate, {
        abortEarly: false,
        convert: true,
        stripUnknown: true,
      });
      if (error) {
        results.push({
          row: rowNumber,
          status: 'error',
          message: error.details.map((detail) => detail.message).join('; '),
        });
        continue;
      }

      const assignee = repsByEmail.get(value.salesEmail.toLowerCase());
      if (!assignee) {
        results.push({
          row: rowNumber,
          status: 'error',
          message: `No sales rep found for email "${value.salesEmail}".`,
        });
        continue;
      }

      try {
        const lead = await sequelize.transaction(async (transaction) => {
          let contact;
          if (value.email) {
            const matches = await Contact.findAll({
              where: { email: value.email },
              transaction,
            });
            contact = matches.find((item) => item.ownerId === assignee.id)
              || matches.find((item) => !item.ownerId);

            if (!contact && matches.length) {
              const owner = await User.findByPk(matches[0].ownerId, {
                attributes: ['name'],
                transaction,
              });
              throw new Error(
                `Contact email is already assigned to ${owner?.name || 'another user'}; assign this lead to that rep or use a different email.`
              );
            }

            if (contact && !contact.ownerId) {
              await contact.update({ ownerId: assignee.id }, { transaction });
            }
          }

          if (!contact) {
            contact = await Contact.create({
              name: value.customerName,
              email: value.email || null,
              phone: value.phone || null,
              company: value.company || null,
              ownerId: assignee.id,
            }, { transaction });
          }

          return Lead.create({
            title: value.leadTitle,
            source: value.source || null,
            estimatedValue: value.estimatedValue || 0,
            contactId: contact.id,
            ownerId: assignee.id,
          }, { transaction });
        });

        results.push({
          row: rowNumber,
          status: 'imported',
          leadId: lead.id,
          salesEmail: assignee.email,
        });
      } catch (err) {
        results.push({ row: rowNumber, status: 'error', message: err.message });
      }
    }

    const imported = results.filter((result) => result.status === 'imported').length;
    res.status(201).json({
      imported,
      failed: results.length - imported,
      results,
    });
  } catch (err) {
    next(err);
  }
};
