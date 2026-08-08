import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError('Validation failed.', 422, errors.array().map(({ path, msg }) => ({ field: path, message: msg }))));
  next();
};
