const { Deal, Lead, Contact } = require('../models');
const { Op, fn, col } = require('sequelize');
const { getRecordScope, scopeWhere } = require('../utils/recordAccess');

exports.summary = async (req, res) => {
  try {
    const scope = await getRecordScope(req.user);
    const contactWhere = scope.isAdmin ? {} : scopeWhere(scope, 'contact');
    const leadWhere = scope.isAdmin ? {} : scopeWhere(scope, 'lead');
    const dealWhere = scope.isAdmin ? {} : scopeWhere(scope, 'deal');
    const [contactCount, leadCount, openDeals, wonDeals] = await Promise.all([
      Contact.count({ where: contactWhere }),
      Lead.count({ where: leadWhere }),
      Deal.findAll({ where: { ...dealWhere, stage: { [Op.notIn]: ['won', 'lost'] } } }),
      Deal.findAll({ where: { ...dealWhere, stage: 'won' } }),
    ]);

    const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

    const dealsByStage = await Deal.findAll({
      where: dealWhere,
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
