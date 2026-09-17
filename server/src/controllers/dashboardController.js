const { Deal, Lead, Contact } = require('../models');
const { Op, fn, col } = require('sequelize');

exports.summary = async (req, res) => {
  try {
    const [contactCount, leadCount, openDeals, wonDeals] = await Promise.all([
      Contact.count(),
      Lead.count(),
      Deal.findAll({ where: { stage: { [Op.notIn]: ['won', 'lost'] } } }),
      Deal.findAll({ where: { stage: 'won' } }),
    ]);

    const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

    const dealsByStage = await Deal.findAll({
      attributes: ['stage', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('value')), 'value']],
      group: ['stage'],
    });

    res.json({
      contactCount,
      leadCount,
      openDealCount: openDeals.length,
      wonDealCount: wonDeals.length,
      pipelineValue,
      wonValue,
      dealsByStage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
