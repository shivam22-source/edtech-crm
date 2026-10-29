import jwt from 'jsonwebtoken';

export interface TokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

export function signToken(adminId: string, secret: string, expiresIn: string): { token: string; expiresAt: string } {
  const token = jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: adminId,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
  const { exp } = jwt.decode(token) as TokenClaims;
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Returns the claims, or null when the token is invalid, expired or uses another algorithm. */
export function verifyToken(token: string, secret: string): TokenClaims | null {
  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof claims === 'string' || typeof claims.sub !== 'string') return null;
    return claims as TokenClaims;
  } catch {
    return null;
  }
}
