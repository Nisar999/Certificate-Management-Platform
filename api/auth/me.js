import { withAuth } from '../utils/auth-middleware';

// Handler for getting current user info
const handler = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // User is attached by middleware
    const user = req.user;

    return res.status(200).json({
        success: true,
        data: {
            user
        }
    });
};

export default withAuth(handler);
