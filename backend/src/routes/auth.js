import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginBody, changePasswordBody } from '../validators/schemas.js';
import * as auth from '../services/authService.js';
import { ok } from '../utils/response.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Try again later.', errorCode: 'RATE_LIMITED' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginBody }), async (req, res) => {
  const { email, password } = req.valid.body;
  ok(res, await auth.login(email, password), 'Signed in');
});

authRouter.get('/me', authenticate, async (req, res) => {
  ok(res, await auth.getUser(req.user.id));
});

authRouter.post('/change-password', authenticate, validate({ body: changePasswordBody }), async (req, res) => {
  await auth.changePassword(req.user.id, req.valid.body.currentPassword, req.valid.body.newPassword);
  ok(res, null, 'Password updated');
});
