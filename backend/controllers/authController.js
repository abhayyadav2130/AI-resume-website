import { body } from 'express-validator';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';

export const registerValidation = [body('name').trim().isLength({ min: 2, max: 80 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters.')];
export const loginValidation = [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()];
const sendAuth = (res, user, status = 200) => res.status(status).json({ success: true, token: signToken(user.id), user });

export async function register(req, res, next) {
  try {
    const exists = await User.exists({ email: req.body.email });
    if (exists) throw new AppError('An account already exists for this email.', 409);
    const user = await User.create(req.body);
    sendAuth(res, user, 201);
  } catch (error) { next(error); }
}
export async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) throw new AppError('Email or password is incorrect.', 401);
    user.password = undefined;
    sendAuth(res, user);
  } catch (error) { next(error); }
}
