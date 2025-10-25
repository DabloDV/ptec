const Joi = require("joi");

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("CONFIRMED", "CANCELED").required()
});

module.exports = { updateStatusSchema };