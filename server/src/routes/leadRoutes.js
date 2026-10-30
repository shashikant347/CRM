const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const importCtrl = require('../controllers/leadImportController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { leadCreateSchema, leadUpdateSchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/import/assignees', requireAdmin, importCtrl.listAssignees);
router.post('/import', requireAdmin, importCtrl.importLeads);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.get('/:id/timeline', ctrl.timeline);
router.post('/', validate(leadCreateSchema), ctrl.create);
router.put('/:id', validate(leadUpdateSchema), ctrl.update);
router.post('/:id/convert', ctrl.convert);
router.delete('/:id', ctrl.remove);

module.exports = router;