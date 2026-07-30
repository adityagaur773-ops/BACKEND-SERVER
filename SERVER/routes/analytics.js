// ==========================
// KAIRA - ANALYTICS ROUTES
// Dashboard Analytics (Admin)
// Works with LokiJS Database
// ==========================

const express = require('express');
const router = express.Router();
const { logInfo, logError } = require('../logger');

// ==========================
// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (Admin)
// @access  Private/Admin
// ==========================
router.get('/dashboard', async (req, res) => {
    try {
        // Get database collections from app
        const db = req.app.get('db');
        const users = db.getCollection('users');
        const orders = db.getCollection('orders');
        const products = db.getCollection('products');

        if (!users || !orders || !products) {
            return res.status(500).json({
                success: false,
                message: 'Database collections not initialized'
            });
        }

        // ==========================
        // BASIC STATS
        // ==========================
        const allOrders = orders.find();
        const allUsers = users.find();
        const allProducts = products.find();

        // Total Orders
        const totalOrders = allOrders.length;

        // Total Revenue (Paid Orders)
        const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        const totalRevenue = paidOrders.reduce((sum, order) => {
            // Calculate total from order
            const orderTotal = order.total || order.amount || 0;
            return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
        }, 0);

        // Total Customers
        const totalCustomers = allUsers.filter(u => u.role === 'customer' || !u.role).length;

        // Total Products
        const totalProducts = allProducts.length;

        // Pending Orders
        const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'created').length;

        // ==========================
        // MONTHLY SALES (Last 6 months)
        // ==========================
        const monthlySales = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const monthOrders = paidOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= month && orderDate <= monthEnd;
            });
            
            const monthTotal = monthOrders.reduce((sum, o) => {
                const orderTotal = o.total || o.amount || 0;
                return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
            }, 0);
            
            monthlySales.push({
                _id: {
                    month: month.getMonth() + 1,
                    year: month.getFullYear()
                },
                total: monthTotal,
                orders: monthOrders.length,
                label: month.toLocaleString('default', { month: 'short', year: 'numeric' })
            });
        }

        // ==========================
        // TOP PRODUCTS
        // ==========================
        const productSales = {};
        paidOrders.forEach(order => {
            const items = order.items || [];
            items.forEach(item => {
                const key = item.name || item.product || 'Unknown';
                if (!productSales[key]) {
                    productSales[key] = {
                        name: key,
                        totalSold: 0,
                        revenue: 0
                    };
                }
                productSales[key].totalSold += item.quantity || 1;
                productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5);

        // ==========================
        // RECENT ORDERS
        // ==========================
        const recentOrders = allOrders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(order => {
                // Find user for this order
                const user = users.findOne({ $loki: order.userId }) || 
                           users.findOne({ email: order.userEmail });
                return {
                    ...order,
                    user: user ? {
                        name: user.name || 'Guest',
                        email: user.email || 'guest@kaira.com'
                    } : {
                        name: 'Guest',
                        email: order.userEmail || 'guest@kaira.com'
                    }
                };
            });

        // ==========================
        // ORDER STATUS COUNTS
        // ==========================
        const statusCounts = {};
        allOrders.forEach(order => {
            const status = order.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const orderStatusCounts = Object.entries(statusCounts).map(([status, count]) => ({
            _id: status,
            count
        }));

        // ==========================
        // DAILY SALES (Last 30 days)
        // ==========================
        const dailySales = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all paid orders in last 30 days
        const recentPaidOrders = paidOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= thirtyDaysAgo;
        });

        // Group by day
        const dailyMap = {};
        recentPaidOrders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            if (!dailyMap[date]) {
                dailyMap[date] = { total: 0, orders: 0 };
            }
            const orderTotal = order.total || order.amount || 0;
            dailyMap[date].total += typeof orderTotal === 'number' ? orderTotal : 0;
            dailyMap[date].orders += 1;
        });

        // Fill missing days with zeros
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailySales.push({
                _id: dateStr,
                total: dailyMap[dateStr]?.total || 0,
                orders: dailyMap[dateStr]?.orders || 0,
                label: date.toLocaleString('default', { month: 'short', day: 'numeric' })
            });
        }

        // ==========================
        // RESPONSE
        // ==========================
        logInfo('Dashboard analytics fetched successfully', {
            totalOrders,
            totalRevenue,
            totalCustomers,
            totalProducts
        });

        res.json({
            success: true,
            stats: {
                totalOrders,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalCustomers,
                totalProducts,
                pendingOrders
            },
            monthlySales,
            dailySales,
            topProducts,
            recentOrders,
            orderStatusCounts
        });
    } catch (error) {
        logError('Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/sales
// @desc    Get sales chart data (Admin)
// @access  Private/Admin
// ==========================
router.get('/sales', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const db = req.app.get('db');
        const orders = db.getCollection('orders');

        if (!orders) {
            return res.status(500).json({
                success: false,
                message: 'Orders collection not initialized'
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const allOrders = orders.find();
        const paidOrders = allOrders.filter(o => 
            (o.status === 'paid' || o.status === 'completed') &&
            new Date(o.createdAt) >= startDate
        );

        // Group by day
        const dailyMap = {};
        paidOrders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            if (!dailyMap[date]) {
                dailyMap[date] = { total: 0, orders: 0 };
            }
            const orderTotal = order.total || order.amount || 0;
            dailyMap[date].total += typeof orderTotal === 'number' ? orderTotal : 0;
            dailyMap[date].orders += 1;
        });

        // Generate complete date range
        const sales = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            sales.push({
                _id: dateStr,
                total: dailyMap[dateStr]?.total || 0,
                orders: dailyMap[dateStr]?.orders || 0
            });
        }

        res.json({
            success: true,
            sales
        });
    } catch (error) {
        logError('Sales analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/orders-by-status
// @desc    Get order status distribution (Admin)
// @access  Private/Admin
// ==========================
router.get('/orders-by-status', async (req, res) => {
    try {
        const db = req.app.get('db');
        const orders = db.getCollection('orders');

        if (!orders) {
            return res.status(500).json({
                success: false,
                message: 'Orders collection not initialized'
            });
        }

        const allOrders = orders.find();
        const statusCounts = {};

        allOrders.forEach(order => {
            const status = order.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const statusCountsArray = Object.entries(statusCounts).map(([status, count]) => ({
            _id: status,
            count
        }));

        res.json({
            success: true,
            statusCounts: statusCountsArray
        });
    } catch (error) {
        logError('Order status analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/revenue-by-category
// @desc    Get revenue by product category (Admin)
// @access  Private/Admin
// ==========================
router.get('/revenue-by-category', async (req, res) => {
    try {
        const db = req.app.get('db');
        const orders = db.getCollection('orders');
        const products = db.getCollection('products');

        if (!orders || !products) {
            return res.status(500).json({
                success: false,
                message: 'Database collections not initialized'
            });
        }

        const allOrders = orders.find();
        const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        // Build product lookup by name/ID
        const productMap = {};
        products.find().forEach(p => {
            productMap[p.name] = p;
            if (p._id) productMap[p._id] = p;
        });

        // Calculate revenue by category
        const categoryRevenue = {};

        paidOrders.forEach(order => {
            const items = order.items || [];
            items.forEach(item => {
                // Try to find product in database
                let product = null;
                if (item.product && productMap[item.product]) {
                    product = productMap[item.product];
                } else if (productMap[item.name]) {
                    product = productMap[item.name];
                }

                const category = product?.category || 'Uncategorized';
                const revenue = (item.price || 0) * (item.quantity || 1);

                if (!categoryRevenue[category]) {
                    categoryRevenue[category] = 0;
                }
                categoryRevenue[category] += revenue;
            });
        });

        const categoryRevenueArray = Object.entries(categoryRevenue)
            .map(([category, revenue]) => ({
                _id: category,
                revenue: Math.round(revenue * 100) / 100
            }))
            .sort((a, b) => b.revenue - a.revenue);

        res.json({
            success: true,
            categoryRevenue: categoryRevenueArray
        });
    } catch (error) {
        logError('Category revenue error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/customer-insights
// @desc    Get customer analytics (Admin)
// @access  Private/Admin
// ==========================
router.get('/customer-insights', async (req, res) => {
    try {
        const db = req.app.get('db');
        const users = db.getCollection('users');
        const orders = db.getCollection('orders');

        if (!users || !orders) {
            return res.status(500).json({
                success: false,
                message: 'Database collections not initialized'
            });
        }

        const allUsers = users.find();
        const allOrders = orders.find();
        const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'completed');

        // Total customers
        const totalCustomers = allUsers.filter(u => u.role === 'customer' || !u.role).length;

        // New customers this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const newCustomers = allUsers.filter(u => {
            const created = new Date(u.createdAt);
            return created >= monthStart && (u.role === 'customer' || !u.role);
        }).length;

        // Returning customers (have placed more than 1 order)
        const customerOrders = {};
        paidOrders.forEach(order => {
            const userId = order.userId || order.user;
            if (userId) {
                customerOrders[userId] = (customerOrders[userId] || 0) + 1;
            }
        });

        const returningCustomers = Object.values(customerOrders).filter(count => count > 1).length;

        // Average order value
        const totalRevenue = paidOrders.reduce((sum, o) => {
            const orderTotal = o.total || o.amount || 0;
            return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
        }, 0);

        const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

        res.json({
            success: true,
            insights: {
                totalCustomers,
                newCustomers,
                returningCustomers,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                totalOrders: paidOrders.length,
                customerRetentionRate: totalCustomers > 0 
                    ? Math.round((returningCustomers / totalCustomers) * 100) 
                    : 0
            }
        });
    } catch (error) {
        logError('Customer insights error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/inventory
// @desc    Get inventory analytics (Admin)
// @access  Private/Admin
// ==========================
router.get('/inventory', async (req, res) => {
    try {
        const db = req.app.get('db');
        const products = db.getCollection('products');

        if (!products) {
            return res.status(500).json({
                success: false,
                message: 'Products collection not initialized'
            });
        }

        const allProducts = products.find();

        // Total products
        const totalProducts = allProducts.length;

        // Low stock products (stock < 5)
        const lowStock = allProducts.filter(p => (p.stock || 0) < 5).length;

        // Out of stock products
        const outOfStock = allProducts.filter(p => (p.stock || 0) === 0).length;

        // Category breakdown
        const categoryCount = {};
        allProducts.forEach(p => {
            const category = p.category || 'Uncategorized';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        // Average price by category
        const categoryAvgPrice = {};
        allProducts.forEach(p => {
            const category = p.category || 'Uncategorized';
            if (!categoryAvgPrice[category]) {
                categoryAvgPrice[category] = { total: 0, count: 0 };
            }
            categoryAvgPrice[category].total += p.price || 0;
            categoryAvgPrice[category].count += 1;
        });

        const avgPriceByCategory = Object.entries(categoryAvgPrice).map(([category, data]) => ({
            category,
            averagePrice: Math.round((data.total / data.count) * 100) / 100,
            productCount: data.count
        }));

        res.json({
            success: true,
            inventory: {
                totalProducts,
                lowStock,
                outOfStock,
                categories: Object.entries(categoryCount).map(([category, count]) => ({
                    _id: category,
                    count
                })),
                avgPriceByCategory
            }
        });
    } catch (error) {
        logError('Inventory analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/analytics/overview
// @desc    Get quick overview stats (Admin)
// @access  Private/Admin
// ==========================
router.get('/overview', async (req, res) => {
    try {
        const db = req.app.get('db');
        const users = db.getCollection('users');
        const orders = db.getCollection('orders');
        const products = db.getCollection('products');

        if (!users || !orders || !products) {
            return res.status(500).json({
                success: false,
                message: 'Database collections not initialized'
            });
        }

        const allOrders = orders.find();
        const allUsers = users.find();
        const allProducts = products.find();

        // Recent order count (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentOrders = allOrders.filter(o => new Date(o.createdAt) >= weekAgo).length;

        // Revenue this month
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

        // Growth percentage (compared to last month)
        const lastMonthStart = new Date(monthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const lastMonthOrders = allOrders.filter(o => 
            (o.status === 'paid' || o.status === 'completed') &&
            new Date(o.createdAt) >= lastMonthStart &&
            new Date(o.createdAt) < monthStart
        );
        const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => {
            const orderTotal = o.total || o.amount || 0;
            return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
        }, 0);

        const growth = lastMonthRevenue > 0 
            ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
            : monthlyRevenue > 0 ? 100 : 0;

        res.json({
            success: true,
            overview: {
                totalRevenue: Math.round(monthlyRevenue * 100) / 100,
                totalOrders: allOrders.length,
                totalCustomers: allUsers.filter(u => u.role === 'customer' || !u.role).length,
                totalProducts: allProducts.length,
                recentOrders,
                monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
                growth,
                pendingOrders: allOrders.filter(o => o.status === 'pending' || o.status === 'created').length,
                outOfStock: allProducts.filter(p => (p.stock || 0) === 0).length
            }
        });
    } catch (error) {
        logError('Overview analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
