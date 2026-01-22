import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '../utils/db';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'create_admin_123';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        });
    }

    const { name, email, password, adminCode } = req.body;

    // Simple protection to prevent random people from creating admin accounts
    // In a real app, you might disable public signup entirely
    if (adminCode !== ADMIN_SECRET_CODE) {
        return res.status(403).json({
            success: false,
            error: { message: 'Invalid admin code' }
        });
    }

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            error: { message: 'Please provide all fields' }
        });
    }

    try {
        await dbConnect();

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: { message: 'User already exists' }
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        // Create token
        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Server error', details: error.message }
        });
    }
}
