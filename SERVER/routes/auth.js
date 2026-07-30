// ==========================
// KAIRA - AUTH ROUTES
// Registration, Login, Profile
// Works with LokiJS Database
// ==========================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logInfo, logError } = require('../logger');
const { protect } = require('../middleware/auth');

// ==========================
// HELPER FUNCTIONS
// ==========================

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.$loki, 
            email: user.email, 
            role: user.role || 'customer' 
        },
        process.env.JWT_SECRET || 'kaira_secret_key_2024',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Sanitize user object (remove sensitive data)
 */
const sanitizeUser = (user) => {
    return {
        id: user.$loki,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
        phone: user.phone || '',
        createdAt: user.createdAt
    };
};

// ==========================
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// ==========================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        // Validate email format
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Get database
        const db = req.app.get('db');
        const users = db.getCollection('users');

        if (!users) {
            return res.status(500).json({
                success: false,
                message: 'Database not initialized'
            });
        }

        // Check if user exists
        const existingUser = users.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = {
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || '',
            role: 'customer',
            addresses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };

        const user = users.insert(newUser);
        db.saveDatabase();

        logInfo(`New user registered: ${user.email}`, { userId: user.$loki });

        // Generate JWT
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        logError('Register error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
// ==========================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Get database
        const db = req.app.get('db');
        const users = db.getCollection('users');

        if (!users) {
            return res.status(500).json({
                success: false,
                message: 'Database not initialized'
            });
        }

        // Check if user exists
        const user = users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: 'Account is disabled. Please contact support.'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logInfo(`Failed login attempt for ${user.email}`, { 
                userId: user.$loki,
                ip: req.ip 
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        users.update(user);
        db.saveDatabase();

        logInfo(`User logged in: ${user.email}`, { userId: user.$loki });

        // Generate JWT
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        logError('Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
// ==========================
router.get('/me', protect, async (req, res) => {
    try {
        const db = req.app.get('db');
        const users = db.getCollection('users');

        if (!users) {
            return res.status(500).json({
                success: false,
                message: 'Database not initialized'
            });
        }

        // req.user is set by protect middleware
        const user = users.findOne({ $loki: req.user.id });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: sanitizeUser(user)
        });
    } catch (error) {
        logError('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/auth/update
// @desc    Update user profile
// @access  Private
// ==========================
router.put('/update', protect, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        const db = req.app.get('db');
        const users = db.getCollection('users');

        if (!users) {
            return res.status(500).json({
                success: false,
                message: 'Database not initialized'
            });
        }

        const user = users.findOne({ $loki: req.user.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (name) user.name = name.trim();
        if (phone) user.phone = phone;
        if (address) {
            if (typeof address === 'string') {
                user.address = address;
            } else {
                user.address = address;
            }
        }

        user.updatedAt = new Date().toISOString();
        users.update(user);
        db.saveDatabase();

        logInfo(`User profile updated: ${user.email}`, { userId: user.$loki });

        res.json({
            success: true,
            user: sanitizeUser(user)
        });
    } catch (error) {
        logError('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
// ==========================
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const db = req.app.get('db');
        const users = db.getCollection('users');

        const user = users.findOne({ $loki: req.user.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        user.updatedAt = new Date().toISOString();
        users.update(user);
        db.saveDatabase();

        logInfo(`Password changed for user: ${user.email}`, { userId: user.$loki });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        logError('Change password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   POST /api/auth/logout
// @desc    Logout user (client-side only, but useful for tracking)
// @access  Private
// ==========================
router.post('/logout', protect, async (req, res) => {
    try {
        logInfo(`User logged out: ${req.user.email}`, { userId: req.user.id });
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logError('Logout error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
// ==========================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email'
            });
        }

        const db = req.app.get('db');
        const users = db.getCollection('users');

        const user = users.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If an account exists, a password reset link will be sent'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: user.$loki, email: user.email },
            process.env.JWT_SECRET || 'kaira_secret_key_2024',
            { expiresIn: '1h' }
        );

        // Store reset token in user record
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        users.update(user);
        db.saveDatabase();

        // Send email (implement email sending here)
        // await sendPasswordResetEmail(user, resetToken);

        logInfo(`Password reset requested for: ${user.email}`, { userId: user.$loki });

        res.json({
            success: true,
            message: 'If an account exists, a password reset link will be sent'
        });
    } catch (error) {
        logError('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
// ==========================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide token and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const db = req.app.get('db');
        const users = db.getCollection('users');

        // Find user with valid reset token
        const user = users.findOne({ 
            resetToken: token,
            resetTokenExpiry: { $gt: new Date().toISOString() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.updatedAt = new Date().toISOString();
        users.update(user);
        db.saveDatabase();

        logInfo(`Password reset successfully for: ${user.email}`, { userId: user.$loki });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        logError('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   DELETE /api/auth/delete
// @desc    Delete user account
// @access  Private
// ==========================
router.delete('/delete', protect, async (req, res) => {
    try {
        const db = req.app.get('db');
        const users = db.getCollection('users');

        const user = users.findOne({ $loki: req.user.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if admin - prevent deleting last admin
        if (user.role === 'admin') {
            const admins = users.find({ role: 'admin' });
            if (admins.length <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the only admin account'
                });
            }
        }

        const userEmail = user.email;
        users.remove(user);
        db.saveDatabase();

        logInfo(`User account deleted: ${userEmail}`, { userId: req.user.id });

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        logError('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/auth/verify-token
// @desc    Verify JWT token validity
// @access  Private
// ==========================
router.get('/verify-token', protect, async (req, res) => {
    try {
        res.json({
            success: true,
            valid: true,
            user: req.user
        });
    } catch (error) {
        logError('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
