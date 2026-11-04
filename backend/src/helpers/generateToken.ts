import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types';

const tokenTtl = (value: string): SignOptions['expiresIn'] => value as SignOptions['expiresIn'];

export const generateToken = (userId: string, tokenVersion = 0): string =>
  jwt.sign({ id: userId, tokenVersion, tokenType: 'access' }, env.jwt.secret, { expiresIn: tokenTtl(env.jwt.expiresIn), algorithm: 'HS256' });

export const generateRefreshToken = (userId: string, tokenVersion = 0): string =>
  jwt.sign({ id: userId, tokenVersion, tokenType: 'refresh' }, env.jwt.refreshSecret, { expiresIn: tokenTtl(env.jwt.refreshExpiresIn), algorithm: 'HS256' });

const readToken = (token: string, secret: string, expectedType: 'access' | 'refresh'): JwtPayload => {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (!decoded || typeof decoded !== 'object') throw Object.assign(new Error('Invalid token payload'), { name: 'JsonWebTokenError' });
  const payload = decoded as Partial<JwtPayload>;
  if (typeof payload.id !== 'string' || !payload.id || !Number.isInteger(payload.tokenVersion) || payload.tokenType !== expectedType) {
    throw Object.assign(new Error('Invalid token claims'), { name: 'JsonWebTokenError' });
  }
  return payload as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => readToken(token, env.jwt.refreshSecret, 'refresh');
export const verifyToken = (token: string): JwtPayload => readToken(token, env.jwt.secret, 'access');
