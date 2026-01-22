import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

/**
 * Middleware to verify JWT token
 * Returns user object if valid, null if not
 */
export const verifyAuth = (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        return null;
    }
};

/**
 * Helper to wrap handler with auth check
 */
export const withAuth = (handler) => async (req, res) => {
    // Allow OPTIONS for CORS
    if (req.method === 'OPTIONS') {
        return handler(req, res);
    }

    const user = verifyAuth(req);
    if (!user) {
        const errorResponse = {
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            }
        };
        return res.status(401).json(errorResponse);
    }

    // Attach user to req for the handler
    req.user = user;
    return handler(req, res);
};
