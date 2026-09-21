import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), AuthController.register);
authRouter.post('/login', validate({ body: loginSchema }), AuthController.login);
authRouter.post('/logout', requireAuth, AuthController.logout);
authRouter.get('/me', requireAuth, AuthController.me);
