const router = require('express').Router();
const ctrl = require('../controllers/meetingController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { meetingCreateSchema, meetingUpdateSchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/', ctrl.listAll);
router.get('/:relatedType/:relatedId', ctrl.listForEntity);
router.post('/', validate(meetingCreateSchema), ctrl.create);
router.put('/:id', validate(meetingUpdateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;