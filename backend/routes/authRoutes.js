import { Router } from 'express';
import { login, loginValidation, register, registerValidation } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
const router = Router();
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
export default router;
