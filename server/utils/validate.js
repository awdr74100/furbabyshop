import Joi from 'joi';

export const signUpValidate = (body) => {
  return Joi.object({
    username: Joi.string().alphanum().min(6).max(14).required(),
    email: Joi.string().email().required(),
    password: Joi.string().alphanum().min(6).max(14).required(),
  }).validateAsync(body);
};

export const signInValidate = (body) => {
  return Joi.object({
    usernameOrEmail: Joi.string().required(),
    password: Joi.string().alphanum().min(6).max(14).required(),
  }).validateAsync(body);
};

export const uploadValidate = (files) => {
  return Joi.array().min(1).required().validateAsync(files);
};
