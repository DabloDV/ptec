const Joi = require("joi");

const orderItemSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  qty: Joi.number().integer().min(1).required()
});

const createOrderSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  items: Joi.array().items(orderItemSchema).min(1).required()
});

module.exports = { createOrderSchema };