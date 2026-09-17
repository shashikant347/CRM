const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { contactCreateSchema, contactUpdateSchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', validate(contactCreateSchema), ctrl.create);
router.put('/:id', validate(contactUpdateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;