const router = require('express').Router();
const ctrl = require('../controllers/dealController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { dealCreateSchema, dealUpdateSchema, dealStageSchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/pipeline', ctrl.pipeline);
router.get('/:id', ctrl.get);
router.post('/', validate(dealCreateSchema), ctrl.create);
router.put('/:id', validate(dealUpdateSchema), ctrl.update);
router.patch('/:id/stage', validate(dealStageSchema), ctrl.updateStage);
router.delete('/:id', ctrl.remove);

module.exports = router;