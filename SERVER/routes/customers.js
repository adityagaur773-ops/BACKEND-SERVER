// ==========================
// KAIRA - CUSTOMER ROUTES
// Customer Management (Admin)
// ==========================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');

// ==========================
// @route   GET /api/customers
// @desc    Get all customers (Admin)
// @access  Private/Admin
// ==========================
router.get('/', protect, admin, async (req, res) => {
    try {
        const { search, limit = 50, page = 1 } = req.query;

        let query = { role: 'customer' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const customers = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            customers,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/customers/:id
// @desc    Get single customer with orders (Admin)
// @access  Private/Admin
// ==========================
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const customer = await User.findById(req.params.id)
            .select('-password')
            .populate('addresses');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Get customer orders
        const orders = await Order.find({ user: customer._id })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get customer stats
        const totalOrders = await Order.countDocuments({ user: customer._id });
        const totalSpent = await Order.aggregate([
            { $match: { user: customer._id, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        res.json({
            success: true,
            customer,
            orders,
            stats: {
                totalOrders,
                totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
            }
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/customers/:id
// @desc    Update customer (Admin)
// @access  Private/Admin
// ==========================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { name, phone, isActive } = req.body;

        const customer = await User.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (name) customer.name = name;
        if (phone) customer.phone = phone;
        if (isActive !== undefined) customer.isActive = isActive;

        await customer.save();

        res.json({
            success: true,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                isActive: customer.isActive
            }
        });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/customers/stats
// @desc    Get customer statistics (Admin)
// @access  Private/Admin
// ==========================
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        
        const newCustomersThisMonth = await User.countDocuments({
            role: 'customer',
            createdAt: { $gte: new Date(new Date().setDate(1)) }
        });

        const activeCustomers = await User.countDocuments({ 
            role: 'customer',
            isActive: true 
        });

        const customersWithOrders = await Order.distinct('user');
        const returningCustomers = customersWithOrders.length;

        res.json({
            success: true,
            stats: {
                totalCustomers,
                newCustomersThisMonth,
                activeCustomers,
                returningCustomers
            }
        });
    } catch (error) {
        console.error('Customer stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
