const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    category: {
        type: String,
        required: true,
        enum: ['Fabric Mirrors', 'LED Collection', 'Evergreen', 'Bathroom Collection']
    },
    subcategory: {
        type: String
    },
    images: [{
        type: String
    }],
    colors: [{
        type: String
    }],
    sizes: [{
        type: String
    }],
    material: {
        type: String
    },
    dimensions: {
        type: String
    },
    weight: {
        type: String
    },
    deliveryTime: {
        type: String,
        default: '5-7 business days'
    },
    tags: [{
        type: String
    }],
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    inStock: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    bestSeller: {
        type: Boolean,
        default: false
    },
    new: {
        type: Boolean,
        default: false
    },
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

ProductSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.inStock = this.stock > 0;
    next();
});

module.exports = mongoose.model('Product', ProductSchema);
