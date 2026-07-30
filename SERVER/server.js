const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Loki = require('lokijs');
const path = require('path');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'kaira_secret_key_2024';

// ==========================
// ✅ CORS CONFIGURATION
// ==========================
const allowedOrigins = [
   ,
   "https://backend-server-4-p7h3.onrender.com",
    'https://kairaliving.vercel.app',
   
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('❌ CORS blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================
// ✅ SERVE ADMIN FOLDER - FIXED
// ==========================
// Try multiple possible locations for admin folder
const possibleAdminPaths = [
    path.join(__dirname, 'admin'),
    path.join(__dirname, '../admin'),
    path.join(__dirname, '../../admin'),
    path.join(process.cwd(), 'admin')
];

let adminPath = null;
for (const p of possibleAdminPaths) {
    const fs = require('fs');
    if (fs.existsSync(p)) {
        adminPath = p;
        break;
    }
}

if (adminPath) {
    app.use('/admin', express.static(adminPath));
    console.log('✅ Admin folder served from:', adminPath);
    
    // Also serve index.html at /admin
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(adminPath, 'index.html'));
    });
} else {
    console.warn('⚠️ Admin folder not found!');
    app.get('/admin', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>KAIRA Admin</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #0d0d0d; color: white;">
                <h1 style="color: #B08D57;">KAIRA Admin Panel</h1>
                <p>Admin folder not found. Please ensure admin folder exists.</p>
                <p style="color: #666;">Current directory: ${__dirname}</p>
            </body>
            </html>
        `);
    });
}

// ==========================
// ✅ LOGGING MIDDLEWARE
// ==========================
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.originalUrl}`);
    next();
});

// ==========================
// ✅ ROOT ROUTE
// ==========================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to KAIRA Backend API 🚀',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            orders: '/api/orders',
            products: '/api/products',
            analytics: '/api/analytics',
            payment: '/api/create-order',
            admin: '/admin'
        },
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// ==========================
// ✅ API ROOT
// ==========================
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'KAIRA API v1.0',
        routes: {
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                profile: 'GET /api/auth/me',
                verify: 'GET /api/auth/verify-token'
            },
            orders: {
                create: 'POST /api/create-order',
                all: 'GET /api/orders',
                detail: 'GET /api/orders/:orderId',
                status: 'GET /api/order-status/:orderId'
            },
            payment: {
                create: 'POST /api/create-order',
                verify: 'POST /api/verify-payment'
            },
            products: {
                all: 'GET /api/products',
                detail: 'GET /api/products/:id'
            },
            analytics: {
                overview: 'GET /api/analytics/overview'
            },
            admin: {
                panel: '/admin'
            },
            system: {
                health: 'GET /health',
                testCors: 'GET /api/test-cors'
            }
        }
    });
});

// ==========================
// ✅ RAZORPAY INITIALIZE
// ==========================
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TISttRIM2woSMu',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'TNOLrJ89rCiDsHwtDDkatuvX'
});

// ==========================
// ✅ DATABASE
// ==========================
const dbPath = path.join(__dirname, 'database.json');
const db = new Loki(dbPath, {
    autoload: true,
    autosave: true,
    autosaveInterval: 4000
});

const users = db.getCollection('users') || db.addCollection('users');
const orders = db.getCollection('orders') || db.addCollection('orders');
const products = db.getCollection('products') || db.addCollection('products');

console.log('✅ Database initialized');

app.set('db', db);

// ==========================
// ✅ CREATE ADMIN USER
// ==========================
async function createAdmin() {
    const existing = users.findOne({ email: process.env.ADMIN_EMAIL || 'admin@kaira.com' });
    if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', salt);
        users.insert({
            name: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@kaira.com',
            password: hash,
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        db.saveDatabase();
        console.log('✅ Admin user created');
    }
}

// ==========================
// ✅ AUTH ROUTES
// ==========================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.$loki, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.$loki,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================
// ✅ VERIFY TOKEN
// ==========================
app.get('/api/auth/verify-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({
            success: true,
            valid: true,
            user: decoded
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

// ==========================
// ✅ CREATE ORDER
// ==========================
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, items, shippingAddress, paymentMethod, subtotal, shipping, discount, coupon, notes } = req.body;
        
        const orderAmount = Math.round(amount * 100);
        
        const options = {
            amount: orderAmount,
            currency: currency,
            receipt: receipt || 'order_' + Date.now(),
            payment_capture: 1
        };
        
        const order = await razorpay.orders.create(options);
        
        orders.insert({
            orderId: order.id,
            amount: orderAmount,
            currency: currency,
            status: 'created',
            receipt: order.receipt,
            items: items || [],
            shippingAddress: shippingAddress || {},
            paymentMethod: paymentMethod || 'pending',
            subtotal: subtotal || 0,
            shipping: shipping || 0,
            discount: discount || 0,
            coupon: coupon || null,
            notes: notes || '',
            createdAt: new Date().toISOString()
        });
        db.saveDatabase();
        
        console.log('✅ Order Created:', order.id);
        
        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            }
        });
        
    } catch (error) {
        console.error('❌ Order Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ VERIFY PAYMENT
// ==========================
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        
        const crypto = require('crypto');
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'TNOLrJ89rCiDsHwtDDkatuvX')
            .update(orderId + '|' + paymentId)
            .digest('hex');
        
        if (generatedSignature === signature) {
            const order = orders.findOne({ orderId: orderId });
            if (order) {
                order.status = 'paid';
                order.paymentId = paymentId;
                order.updatedAt = new Date().toISOString();
                db.saveDatabase();
            }
            
            res.json({ 
                success: true, 
                message: 'Payment verified successfully' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Invalid signature' 
            });
        }
        
    } catch (error) {
        console.error('❌ Verification Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ GET ALL ORDERS
// ==========================
app.get('/api/orders', async (req, res) => {
    try {
        const allOrders = orders.find();
        res.json({
            success: true,
            orders: allOrders
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ GET SINGLE ORDER
// ==========================
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = orders.findOne({ orderId: orderId });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }
        
        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('❌ Order Detail Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ GET ORDER STATUS
// ==========================
app.get('/api/order-status/:orderId', async (req, res) => {
    try {
        const order = orders.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }
        
        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ GET PRODUCTS
// ==========================
app.get('/api/products', async (req, res) => {
    try {
        const allProducts = products.find();
        res.json({
            success: true,
            products: allProducts
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ GET SINGLE PRODUCT
// ==========================
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = products.findOne({ $loki: parseInt(req.params.id) });
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.json({
            success: true,
            product: product
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ==========================
// ✅ ANALYTICS - OVERVIEW
// ==========================
app.get('/api/analytics/overview', async (req, res) => {
    try {
        const allOrders = orders.find();
        const allUsers = users.find();
        const allProducts = products.find();

        const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        const totalRevenue = paidOrders.reduce((sum, o) => {
            const orderTotal = o.total || o.amount || 0;
            return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
        }, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        const monthOrders = allOrders.filter(o => 
            (o.status === 'paid' || o.status === 'completed') &&
            new Date(o.createdAt) >= monthStart
        );
        const monthlyRevenue = monthOrders.reduce((sum, o) => {
            const orderTotal = o.total || o.amount || 0;
            return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
        }, 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentOrders = allOrders.filter(o => new Date(o.createdAt) >= weekAgo).length;

        res.json({
            success: true,
            overview: {
                totalOrders: allOrders.length,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalCustomers: allUsers.filter(u => u.role === 'customer' || !u.role).length,
                totalProducts: allProducts.length,
                recentOrders,
                monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
                pendingOrders: allOrders.filter(o => o.status === 'pending' || o.status === 'created').length,
                outOfStock: allProducts.filter(p => (p.stock || 0) === 0).length,
                growth: 0
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================
// ✅ CORS TEST
// ==========================
app.get('/api/test-cors', (req, res) => {
    res.json({
        success: true,
        message: 'CORS is working correctly!',
        origin: req.headers.origin || 'No origin',
        timestamp: new Date().toISOString()
    });
});

// ==========================
// ✅ HEALTH
// ==========================
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==========================
// ✅ 404 HANDLER
// ==========================
app.use((req, res) => {
    console.log('❌ 404 Not Found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        suggestion: 'Check /api for available routes'
    });
});

// ==========================
// ✅ ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================
// ✅ START SERVER
// ==========================
app.listen(PORT, async () => {
    await createAdmin();
    console.log('='.repeat(60));
    console.log('🚀 KAIRA Backend Running');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Backend URL: https://backend-server-2.onrender.com`);
    console.log(`💚 Health: https://backend-server-2.onrender.com/health`);
    console.log(`🏠 Root: https://backend-server-2.onrender.com/`);
    console.log(`📚 API Docs: https://backend-server-2.onrender.com/api`);
    console.log(`🖥️ Admin Panel: https://backend-server-2.onrender.com/admin`);
    console.log('='.repeat(60));
    console.log('\n🔑 Admin Login:');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@kaira.com'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('\n💰 Razorpay TEST Mode Active:');
    console.log('   🧪 TEST MODE - No real money will be deducted!');
    console.log('   💳 Test Card: 4111 1111 1111 1111');
    console.log('   🔢 OTP: 1221');
    console.log('='.repeat(60));
});

module.exports = app;