const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' });

// ---------- Auth ----------
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(72).required(),
  role: Joi.string().valid('admin', 'sales_rep'),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

// ---------- Contacts ----------
const contactCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().trim().email().allow('', null),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s()]{6,20}$/).allow('', null)
    .messages({ 'string.pattern.base': 'phone must be a valid phone number' }),
  company: Joi.string().trim().max(150).allow('', null),
  jobTitle: Joi.string().trim().max(150).allow('', null),
  tags: Joi.array().items(Joi.string().trim().max(40)),
  notes: Joi.string().trim().max(5000).allow('', null),
});

const contactUpdateSchema = contactCreateSchema.fork(
  ['name'],
  (schema) => schema.optional()
);

// ---------- Leads ----------
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

const leadCreateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  contactId: uuid.required(),
  source: Joi.string().trim().max(100).allow('', null),
  status: Joi.string().valid(...LEAD_STATUSES),
  estimatedValue: Joi.number().min(0).max(100000000),
});

const leadUpdateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  contactId: uuid,
  source: Joi.string().trim().max(100).allow('', null),
  status: Joi.string().valid(...LEAD_STATUSES),
  estimatedValue: Joi.number().min(0).max(100000000),
}).min(1); // at least one field required on update

// ---------- Deals ----------
const DEAL_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const dealCreateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  contactId: uuid.required(),
  leadId: uuid,
  value: Joi.number().min(0).max(1000000000),
  stage: Joi.string().valid(...DEAL_STAGES),
  expectedCloseDate: Joi.date().iso().allow(null, ''),
  probability: Joi.number().integer().min(0).max(100),
});

const dealUpdateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  contactId: uuid,
  value: Joi.number().min(0).max(1000000000),
  stage: Joi.string().valid(...DEAL_STAGES),
  expectedCloseDate: Joi.date().iso().allow(null, ''),
  probability: Joi.number().integer().min(0).max(100),
}).min(1);

const dealStageSchema = Joi.object({
  stage: Joi.string().valid(...DEAL_STAGES).required(),
});

// ---------- Activities ----------
const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'task'];
const RELATED_TYPES = ['contact', 'lead', 'deal'];

const activityCreateSchema = Joi.object({
  type: Joi.string().valid(...ACTIVITY_TYPES).required(),
  content: Joi.string().trim().min(1).max(3000).required(),
  relatedType: Joi.string().valid(...RELATED_TYPES).required(),
  relatedId: uuid.required(),
  dueAt: Joi.date().iso().allow(null, ''),
  completed: Joi.boolean(),
});

const activityUpdateSchema = Joi.object({
  type: Joi.string().valid(...ACTIVITY_TYPES),
  content: Joi.string().trim().min(1).max(3000),
  dueAt: Joi.date().iso().allow(null, ''),
  completed: Joi.boolean(),
}).min(1);

module.exports = {
  registerSchema,
  loginSchema,
  contactCreateSchema,
  contactUpdateSchema,
  leadCreateSchema,
  leadUpdateSchema,
  dealCreateSchema,
  dealUpdateSchema,
  dealStageSchema,
  activityCreateSchema,
  activityUpdateSchema,
};