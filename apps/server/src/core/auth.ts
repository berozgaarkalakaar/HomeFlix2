import crypto from 'crypto';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';

export const hashPassword = (password: string): { hash: string, salt: string } => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
};

export const verifyPassword = (password: string, hash: string, salt: string): boolean => {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};
