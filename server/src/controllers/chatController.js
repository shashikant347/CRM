const crypto = require('crypto');
const { sequelize, ChatConversation, ChatMessage } = require('../models');

const messageLimit = 100;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hasValidVisitorToken(conversation, token) {
  if (!token || !conversation.visitorTokenHash) return false;
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(conversation.visitorTokenHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function getRecentMessages(conversationId) {
  const messages = await ChatMessage.findAll({
    where: { conversationId },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: messageLimit,
  });
  return messages.reverse();
}

async function appendMessage(conversation, { senderType, senderId, senderName, body }) {
  return sequelize.transaction(async (transaction) => {
    const message = await ChatMessage.create({
      conversationId: conversation.id,
      senderType,
      senderId,
      senderName,
      body,
    }, { transaction });
    await conversation.update({ lastMessageAt: message.createdAt }, { transaction });
    return message;
  });
}

async function requireVisitorConversation(req, res) {
  const conversation = await ChatConversation.findOne({
    where: { id: req.params.id, type: 'customer' },
  });
  if (!conversation || !hasValidVisitorToken(conversation, req.get('X-Chat-Token'))) {
    res.status(401).json({ error: 'This chat session is invalid or has expired' });
    return null;
  }
  return conversation;
}

exports.startCustomerConversation = async (req, res, next) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const conversation = await sequelize.transaction(async (transaction) => {
      const created = await ChatConversation.create({
        type: 'customer',
        visitorName: req.body.name,
        visitorEmail: req.body.email || null,
        visitorTokenHash: hashToken(token),
      }, { transaction });
      const message = await ChatMessage.create({
        conversationId: created.id,
        senderType: 'visitor',
        senderName: req.body.name,
        body: req.body.message,
      }, { transaction });
      await created.update({ lastMessageAt: message.createdAt }, { transaction });
      return { conversation: created, message };
    });

    res.status(201).json({
      conversation: {
        id: conversation.conversation.id,
        visitorName: conversation.conversation.visitorName,
        status: conversation.conversation.status,
        lastMessageAt: conversation.conversation.lastMessageAt,
      },
      token,
      messages: [conversation.message],
    });
  } catch (err) {
    next(err);
  }
};

exports.listCustomerMessages = async (req, res, next) => {
  try {
    const conversation = await requireVisitorConversation(req, res);
    if (!conversation) return;
    res.json({
      conversation: {
        id: conversation.id,
        visitorName: conversation.visitorName,
        status: conversation.status,
      },
      messages: await getRecentMessages(conversation.id),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendCustomerMessage = async (req, res, next) => {
  try {
    const conversation = await requireVisitorConversation(req, res);
    if (!conversation) return;
    if (conversation.status === 'closed') {
      return res.status(409).json({ error: 'This conversation is closed. Start a new chat to continue.' });
    }

    const message = await appendMessage(conversation, {
      senderType: 'visitor',
      senderName: conversation.visitorName,
      body: req.body.message,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

exports.listTeamMessages = async (req, res, next) => {
  try {
    const [conversation] = await ChatConversation.findOrCreate({
      where: { type: 'team', roomKey: 'team' },
      defaults: { type: 'team', roomKey: 'team' },
    });
    res.json({
      conversationId: conversation.id,
      messages: await getRecentMessages(conversation.id),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendTeamMessage = async (req, res, next) => {
  try {
    const [conversation] = await ChatConversation.findOrCreate({
      where: { type: 'team', roomKey: 'team' },
      defaults: { type: 'team', roomKey: 'team' },
    });
    const message = await appendMessage(conversation, {
      senderType: 'agent',
      senderId: req.user.id,
      senderName: req.user.name,
      body: req.body.message,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

exports.listInbox = async (req, res, next) => {
  try {
    const where = { type: 'customer' };
    if (req.query.status === 'open' || req.query.status === 'closed') {
      where.status = req.query.status;
    }
    const conversations = await ChatConversation.findAll({
      where,
      attributes: ['id', 'visitorName', 'visitorEmail', 'status', 'lastMessageAt', 'createdAt'],
      order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(conversations);
  } catch (err) {
    next(err);
  }
};

exports.listInboxMessages = async (req, res, next) => {
  try {
    const conversation = await ChatConversation.findOne({
      where: { id: req.params.id, type: 'customer' },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json({
      conversation: {
        id: conversation.id,
        visitorName: conversation.visitorName,
        visitorEmail: conversation.visitorEmail,
        status: conversation.status,
      },
      messages: await getRecentMessages(conversation.id),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendInboxMessage = async (req, res, next) => {
  try {
    const conversation = await ChatConversation.findOne({
      where: { id: req.params.id, type: 'customer' },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (conversation.status === 'closed') {
      return res.status(409).json({ error: 'Reopen this conversation before replying' });
    }
    const message = await appendMessage(conversation, {
      senderType: 'agent',
      senderId: req.user.id,
      senderName: req.user.name,
      body: req.body.message,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

exports.updateInboxStatus = async (req, res, next) => {
  try {
    const conversation = await ChatConversation.findOne({
      where: { id: req.params.id, type: 'customer' },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    await conversation.update({ status: req.body.status });
    res.json({
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt,
    });
  } catch (err) {
    next(err);
  }
};
