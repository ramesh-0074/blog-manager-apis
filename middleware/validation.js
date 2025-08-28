// middleware/validation.js
const joi = require("joi");

const validateRegister = (req, res, next) => {
  const schema = joi.object({
    name: joi.string().min(2).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    role: joi.string().valid("user", "admin").default("user")
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateBlog = (req, res, next) => {
  const schema = joi.object({
    title: joi.string().min(5).max(200).required(),
    content: joi.string().min(50).required(),
    slug: joi.string().optional(),
    status: joi.string().valid("draft", "published").default("draft"),
    tags: joi.array().items(joi.string()).optional(),
    excerpt: joi.string().max(300).optional(),
    category: joi.string().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

module.exports = { validateRegister, validateLogin, validateBlog };
