const Joi = require("joi");

const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().max(50).optional().allow("", null)
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  email: Joi.string().email().max(255).optional(),
  phone: Joi.string().max(50).optional().allow("", null)
}).min(1);

module.exports = { createCustomerSchema, updateCustomerSchema };