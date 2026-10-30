const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const chatRateLimit = require('../middleware/chatRateLimit');
const {
  customerChatStartSchema,
  chatMessageSchema,
  chatStatusSchema,
} = require('../validators/schemas');

const limitCustomerConversationStarts = chatRateLimit({ limit: 5, windowMs: 15 * 60 * 1000 });
const limitCustomerMessages = chatRateLimit({ limit: 60, windowMs: 10 * 60 * 1000 });

router.post(
  '/customer/conversations',
  limitCustomerConversationStarts,
  validate(customerChatStartSchema),
  ctrl.startCustomerConversation
);
router.get('/customer/conversations/:id/messages', ctrl.listCustomerMessages);
router.post(
  '/customer/conversations/:id/messages',
  limitCustomerMessages,
  validate(chatMessageSchema),
  ctrl.sendCustomerMessage
);

router.use(authenticate);
router.get('/team/messages', ctrl.listTeamMessages);
router.post('/team/messages', validate(chatMessageSchema), ctrl.sendTeamMessage);
router.get('/inbox', ctrl.listInbox);
router.get('/inbox/:id/messages', ctrl.listInboxMessages);
router.post('/inbox/:id/messages', validate(chatMessageSchema), ctrl.sendInboxMessage);
router.patch('/inbox/:id', validate(chatStatusSchema), ctrl.updateInboxStatus);

module.exports = router;
