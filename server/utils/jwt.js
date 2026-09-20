import jwt from 'jsonwebtoken';
import { serverEnv } from '../config/env.js';
import { HttpError } from './errors.js';

export function signAccessToken(payload, { admin = false } = {}) {
  const expiresIn = admin ? serverEnv.jwtAdminExpiresIn : serverEnv.jwtExpiresIn;
  return jwt.sign(payload, serverEnv.jwtSecret, {
    expiresIn,
    issuer: 'shield-wolf',
  });
}

export function signPasswordResetToken(userId) {
  return jwt.sign({ sub: userId, purpose: 'password_reset' }, serverEnv.jwtSecret, {
    expiresIn: '1h',
    issuer: 'shield-wolf',
  });
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, serverEnv.jwtSecret, { issuer: 'shield-wolf' });
    if (payload.purpose && payload.purpose !== 'access') {
      throw new HttpError(401, 'Invalid token', { code: 'INVALID_TOKEN' });
    }
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Invalid or expired token', { code: 'INVALID_TOKEN' });
  }
}

export function verifyPasswordResetToken(token) {
  try {
    const payload = jwt.verify(token, serverEnv.jwtSecret, { issuer: 'shield-wolf' });
    if (payload.purpose !== 'password_reset') {
      throw new HttpError(400, 'Invalid reset token', { code: 'INVALID_RESET_TOKEN' });
    }
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid or expired reset token', { code: 'INVALID_RESET_TOKEN' });
  }
}
