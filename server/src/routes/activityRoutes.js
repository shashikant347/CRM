const router = require('express').Router();
const ctrl = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { activityCreateSchema, activityUpdateSchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/', ctrl.listAll);
router.get('/:relatedType/:relatedId', ctrl.listForEntity);
router.post('/', validate(activityCreateSchema), ctrl.create);
router.put('/:id', validate(activityUpdateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;