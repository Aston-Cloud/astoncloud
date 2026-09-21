import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { updateProfileSchema } from '../auth/auth.schema.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, UsersController.getMe);
usersRouter.patch('/me', requireAuth, validate({ body: updateProfileSchema }), UsersController.updateMe);
