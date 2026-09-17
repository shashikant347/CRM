/**
 * Generic Joi validation middleware.
 * Usage: router.post('/', validate(schema), controller.create)
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect all errors, not just the first
      stripUnknown: true,  // drop fields not defined in the schema
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    req.body = value; // use the sanitized/validated body downstream
    next();
  };
}

module.exports = validate;