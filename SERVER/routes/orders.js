// ==========================
// KAIRA - ORDER ROUTES
// Complete Order Management
// ==========================

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const { sendOrderConfirmation } = require('../utils/email');
const { generateInvoice } = require('../utils/invoice');

// ==========================
// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
// ==========================
router.post('/', protect, async (req, res) => {
    try {
        const {
            items,
            shippingAddress,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            coupon,
            total,
            paymentId,
            razorpayOrderId
        } = req.body;

        // Validate items stock
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.name} not found`
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}`
                });
            }
        }

        // Create order
        const order = await Order.create({
            user: req.user._id,
            items,
            subtotal,
            shipping,
            tax,
            discount,
            coupon,
            total,
            paymentMethod,
            paymentId,
            razorpayOrderId,
            shippingAddress,
            status: 'pending',
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
        });

        // Reduce stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        // Send email notification
        try {
            await sendOrderConfirmation(order, req.user);
        } catch (emailError) {
            console.error('Email error:', emailError);
            // Don't fail order if email fails
        }

        res.status(201).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/orders/my-orders
// @desc    Get current user's orders
// @access  Private
// ==========================
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
// ==========================
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user owns the order or is admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/orders
// @desc    Get all orders (Admin)
// @access  Private/Admin
// ==========================
router.get('/', protect, admin, async (req, res) => {
    try {
        const { status, search, limit = 50, page = 1 } = req.query;

        let query = {};
        if (status) query.status = status;
        
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { 'shippingAddress.name': { $regex: search, $options: 'i' } },
                { 'shippingAddress.email': { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin)
// @access  Private/Admin
// ==========================
router.put('/:id/status', protect, admin, async (req, res) => {
    try {
        const { status, trackingNumber, trackingUrl } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = status;
        order.updatedAt = Date.now();
        if (trackingNumber) order.trackingNumber = trackingNumber;
        if (trackingUrl) order.trackingUrl = trackingUrl;

        await order.save();

        // If order is delivered, send email
        if (status === 'delivered') {
            try {
                await sendOrderConfirmation(order, order.user);
            } catch (emailError) {
                console.error('Delivery email error:', emailError);
            }
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/orders/:id/payment
// @desc    Update payment status
// @access  Private
// ==========================
router.put('/:id/payment', protect, async (req, res) => {
    try {
        const { paymentStatus, paymentId, razorpayPaymentId } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only order owner or admin can update
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        order.paymentStatus = paymentStatus;
        if (paymentId) order.paymentId = paymentId;
        if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
        order.updatedAt = Date.now();

        await order.save();

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/orders/:id/invoice
// @desc    Generate invoice PDF
// @access  Private
// ==========================
router.get('/:id/invoice', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const invoice = await generateInvoice(order);
        
        res.json({
            success: true,
            invoice
        });
    } catch (error) {
        console.error('Invoice generation error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
