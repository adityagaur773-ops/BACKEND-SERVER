// ==========================
// KAIRA - PRODUCT ROUTES
// Complete Product CRUD
// ==========================

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');

// ==========================
// @route   GET /api/products
// @desc    Get all products with filters
// @access  Public
// ==========================
router.get('/', async (req, res) => {
    try {
        const { 
            category, 
            featured, 
            bestSeller, 
            minPrice, 
            maxPrice, 
            search, 
            sort, 
            limit,
            page = 1 
        } = req.query;

        let query = {};

        // Category filter
        if (category) query.category = category;

        // Featured filter
        if (featured === 'true') query.featured = true;
        if (bestSeller === 'true') query.bestSeller = true;

        // Price filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === 'price-low') sortOption = { price: 1 };
        if (sort === 'price-high') sortOption = { price: -1 };
        if (sort === 'rating') sortOption = { rating: -1 };
        if (sort === 'popular') sortOption = { reviews: -1 };
        if (sort === 'newest') sortOption = { createdAt: -1 };

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit) || 20;
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
// ==========================
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   POST /api/products
// @desc    Create a new product
// @access  Private/Admin
// ==========================
router.post('/', protect, admin, uploadMultiple, async (req, res) => {
    try {
        // Get image URLs from Cloudinary
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        // Parse product data
        const productData = {
            ...req.body,
            images: imageUrls,
            createdBy: req.user._id
        };

        // Parse numeric fields
        if (productData.price) productData.price = Number(productData.price);
        if (productData.originalPrice) productData.originalPrice = Number(productData.originalPrice);
        if (productData.stock) productData.stock = Number(productData.stock);
        if (productData.discount) productData.discount = Number(productData.discount);

        // Parse array fields
        if (productData.colors && typeof productData.colors === 'string') {
            productData.colors = productData.colors.split(',').map(c => c.trim());
        }
        if (productData.sizes && typeof productData.sizes === 'string') {
            productData.sizes = productData.sizes.split(',').map(s => s.trim());
        }
        if (productData.tags && typeof productData.tags === 'string') {
            productData.tags = productData.tags.split(',').map(t => t.trim());
        }

        // Parse boolean fields
        if (productData.featured === 'true') productData.featured = true;
        if (productData.bestSeller === 'true') productData.bestSeller = true;
        if (productData.new === 'true') productData.new = true;

        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private/Admin
// ==========================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Parse numeric fields
        if (req.body.price) req.body.price = Number(req.body.price);
        if (req.body.originalPrice) req.body.originalPrice = Number(req.body.originalPrice);
        if (req.body.stock) req.body.stock = Number(req.body.stock);
        if (req.body.discount) req.body.discount = Number(req.body.discount);

        // Parse array fields
        if (req.body.colors && typeof req.body.colors === 'string') {
            req.body.colors = req.body.colors.split(',').map(c => c.trim());
        }
        if (req.body.sizes && typeof req.body.sizes === 'string') {
            req.body.sizes = req.body.sizes.split(',').map(s => s.trim());
        }
        if (req.body.tags && typeof req.body.tags === 'string') {
            req.body.tags = req.body.tags.split(',').map(t => t.trim());
        }

        // Parse boolean fields
        if (req.body.featured === 'true') req.body.featured = true;
        if (req.body.featured === 'false') req.body.featured = false;
        if (req.body.bestSeller === 'true') req.body.bestSeller = true;
        if (req.body.bestSeller === 'false') req.body.bestSeller = false;
        if (req.body.new === 'true') req.body.new = true;
        if (req.body.new === 'false') req.body.new = false;

        product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private/Admin
// ==========================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await product.deleteOne();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==========================
// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private/Admin
// ==========================
router.put('/:id/stock', protect, admin, async (req, res) => {
    try {
        const { stock } = req.body;
        
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock: Number(stock) },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
