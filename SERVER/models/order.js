const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const OrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        default: () => 'KAIRA-' + Date.now() + '-' + uuidv4().slice(0, 6).toUpperCase()
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        color: String,
        image: String
    }],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    shipping: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    coupon: {
        type: String
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'paypal', 'cod'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentId: {
        type: String
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    },
    shippingAddress: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, default: 'India' }
    },
    trackingNumber: {
        type: String
    },
    trackingUrl: {
        type: String
    },
    notes: {
        type: String
    },
    invoiceNumber: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', OrderSchema);
