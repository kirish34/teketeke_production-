const { z } = require('zod');

const validate = (schema, part = 'body') => (req, res, next) => {
  try {
    req[part] = schema.parse(req[part]);
    next();
  } catch (e) {
    const errs = Array.isArray(e?.errors) ? e.errors.map((x) => x.message).join(', ') : 'Invalid input';
    return res.status(400).json({ error: 'bad_request', message: errs });
  }
};

module.exports = { z, validate };

