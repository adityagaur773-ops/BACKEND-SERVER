// ==========================
// KAIRA - SEED SCRIPT
// Run once: npm run seed
// Loads the 17 products that used to be hardcoded in js/products.js
// into the real LokiJS database so admin and storefront share one source.
// ==========================

const Loki = require('lokijs');
const path = require('path');

// Ensure we're using the correct database path
const DB_PATH = path.join(__dirname, 'database.json');

const db = new Loki(DB_PATH, {
    autoload: true,
    autosave: true,
    autosaveInterval: 4000,
    persistenceMethod: 'fs'
});

const seedProducts = [
    { 
        name: "Waved Full Length Mirror", 
        category: "Fabric Mirrors", 
        price: 12000, 
        originalPrice: 15999, 
        discount: 25, 
        rating: 4.9, 
        reviews: 128, 
        featured: true, 
        bestSeller: true, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A", "#700C0C", "#2B3A55"], 
        sizes: ["24x36", "30x48", "36x60", "42x72"], 
        images: ["/assets/products/product1.jpg"], 
        description: "Premium handcrafted full-length mirror with elegant waved design.", 
        tags: ["luxury", "handcrafted", "fabric", "full-length"], 
        stock: 15 
    },
    { 
        name: "Luxe Cloud Mirror", 
        category: "Fabric Mirrors", 
        price: 14500, 
        originalPrice: 18999, 
        discount: 24, 
        rating: 4.8, 
        reviews: 95, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A", "#700C0C"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product2.jpg"], 
        description: "Luxurious cloud-inspired mirror design with soft curves.", 
        tags: ["luxury", "cloud", "soft", "elegant"], 
        stock: 10 
    },
    { 
        name: "Waved Flat Top Mirror", 
        category: "Fabric Mirrors", 
        price: 11500, 
        originalPrice: 14999, 
        discount: 23, 
        rating: 4.7, 
        reviews: 67, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A", "#3D5C44"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product3.jpg"], 
        description: "Modern waved design with a flat top silhouette.", 
        tags: ["modern", "waved", "flat-top"], 
        stock: 12 
    },
    { 
        name: "Cloud Reflekt Mirror", 
        category: "Fabric Mirrors", 
        price: 8500, 
        originalPrice: 10999, 
        discount: 23, 
        rating: 4.6, 
        reviews: 52, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#2B3A55", "#000"], 
        sizes: ["18x24", "24x36"], 
        images: ["/assets/products/product4.jpg"], 
        description: "Cloud-inspired reflective mirror with soft curves.", 
        tags: ["cloud", "reflekt", "soft"], 
        stock: 18 
    },
    { 
        name: "Luxury Wavy Trio Mirror", 
        category: "Fabric Mirrors", 
        price: 18999, 
        originalPrice: 24999, 
        discount: 24, 
        rating: 4.9, 
        reviews: 42, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A", "#700C0C"], 
        sizes: ["36x48", "42x60"], 
        images: ["/assets/products/product5.jpg"], 
        description: "Premium triple-waved design with luxurious fabric finish.", 
        tags: ["premium", "wavy", "trio"], 
        stock: 6 
    },
    { 
        name: "New Gen Wavy Mirror", 
        category: "Fabric Mirrors", 
        price: 14500, 
        originalPrice: 17999, 
        discount: 19, 
        rating: 4.7, 
        reviews: 38, 
        featured: true, 
        bestSeller: false, 
        colors: ["#C8A46B", "#6A6A6A", "#3D5C44"], 
        sizes: ["24x36", "30x48", "42x60"], 
        images: ["/assets/products/product6.jpg"], 
        description: "Next-generation wavy design featuring modern curves.", 
        tags: ["new-gen", "wavy", "modern"], 
        stock: 8 
    },
    { 
        name: "Wavy Mirror", 
        category: "Fabric Mirrors", 
        price: 9999, 
        originalPrice: 12999, 
        discount: 23, 
        rating: 4.5, 
        reviews: 56, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A"], 
        sizes: ["18x24", "24x36"], 
        images: ["/assets/products/product7.jpg"], 
        description: "Classic wavy mirror with timeless design.", 
        tags: ["classic", "wavy", "timeless"], 
        stock: 14 
    },
    { 
        name: "Classy Waved Reflekt Mirror", 
        category: "Fabric Mirrors", 
        price: 11999, 
        originalPrice: 14999, 
        discount: 20, 
        rating: 4.8, 
        reviews: 45, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#2B3A55"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product8.jpg"], 
        description: "Elegant waved reflective design with premium fabric.", 
        tags: ["classy", "waved", "reflekt"], 
        stock: 10 
    },
    { 
        name: "Arched Fabric Mirror", 
        category: "Fabric Mirrors", 
        price: 13500, 
        originalPrice: 16999, 
        discount: 21, 
        rating: 4.8, 
        reviews: 34, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#700C0C", "#2B3A55"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product9.jpg"], 
        description: "Elegant arched design with premium fabric upholstery.", 
        tags: ["arched", "fabric", "luxury"], 
        stock: 8 
    },
    { 
        name: "Waved Dual Tone Mirror", 
        category: "Fabric Mirrors", 
        price: 15999, 
        originalPrice: 19999, 
        discount: 20, 
        rating: 4.9, 
        reviews: 29, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#6A6A6A", "#700C0C"], 
        sizes: ["30x48", "36x60"], 
        images: ["/assets/products/product10.jpg"], 
        description: "Stunning dual-tone waved design with contrasting fabric.", 
        tags: ["dual-tone", "waved", "bold"], 
        stock: 7 
    },
    { 
        name: "Capsule LED Mirror", 
        category: "LED Collection", 
        price: 16999, 
        originalPrice: 21999, 
        discount: 23, 
        rating: 4.7, 
        reviews: 28, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#2B3A55"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product11.jpg"], 
        description: "Modern capsule-shaped LED mirror with soft illumination.", 
        tags: ["led", "capsule", "modern"], 
        stock: 10 
    },
    { 
        name: "Rectangle LED Mirror", 
        category: "LED Collection", 
        price: 14999, 
        originalPrice: 18999, 
        discount: 21, 
        rating: 4.6, 
        reviews: 32, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#2B3A55", "#000"], 
        sizes: ["24x36", "30x48", "36x60"], 
        images: ["/assets/products/product12.jpg"], 
        description: "Classic rectangle LED mirror with premium lighting.", 
        tags: ["led", "rectangle", "classic"], 
        stock: 12 
    },
    { 
        name: "Oval Bathroom Mirror", 
        category: "Bathroom Collection", 
        price: 8999, 
        originalPrice: 11999, 
        discount: 25, 
        rating: 4.7, 
        reviews: 48, 
        featured: false, 
        bestSeller: true, 
        colors: ["#EFE5D6", "#2B3A55"], 
        sizes: ["18x24", "24x36"], 
        images: ["/assets/products/product13.jpg"], 
        description: "Elegant oval design crafted for modern bathrooms.", 
        tags: ["oval", "bathroom", "moisture-resistant"], 
        stock: 15 
    },
    { 
        name: "Luxe Bathroom Mirror", 
        category: "Bathroom Collection", 
        price: 12999, 
        originalPrice: 15999, 
        discount: 19, 
        rating: 4.8, 
        reviews: 36, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#C8A46B", "#2B3A55"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product14.jpg"], 
        description: "Premium luxury bathroom mirror with sophisticated design.", 
        tags: ["luxe", "bathroom", "premium"], 
        stock: 10 
    },
    { 
        name: "Classic Bathroom Mirror", 
        category: "Bathroom Collection", 
        price: 7499, 
        originalPrice: 9999, 
        discount: 25, 
        rating: 4.5, 
        reviews: 62, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6"], 
        sizes: ["18x24", "24x36"], 
        images: ["/assets/products/product15.jpg"], 
        description: "Timeless classic bathroom mirror with clean design.", 
        tags: ["classic", "bathroom", "timeless"], 
        stock: 20 
    },
    { 
        name: "Arched Bathroom Mirror", 
        category: "Bathroom Collection", 
        price: 9999, 
        originalPrice: 12999, 
        discount: 23, 
        rating: 4.7, 
        reviews: 42, 
        featured: true, 
        bestSeller: false, 
        colors: ["#EFE5D6", "#2B3A55", "#700C0C"], 
        sizes: ["24x36", "30x48"], 
        images: ["/assets/products/product16.jpg"], 
        description: "Elegant arched design crafted for modern bathrooms.", 
        tags: ["arched", "bathroom", "elegant"], 
        stock: 12 
    },
    { 
        name: "Boxed Bathroom Mirror", 
        category: "Bathroom Collection", 
        price: 6999, 
        originalPrice: 8999, 
        discount: 22, 
        rating: 4.4, 
        reviews: 38, 
        featured: false, 
        bestSeller: false, 
        colors: ["#EFE5D6"], 
        sizes: ["18x24", "24x36"], 
        images: ["/assets/products/product17.jpg"], 
        description: "Simple boxed design with premium finish.", 
        tags: ["boxed", "bathroom", "minimalist"], 
        stock: 18 
    }
];

// Load database and seed products
db.loadDatabase({}, () => {
    console.log('📂 Database loaded successfully');
    
    // Get or create products collection
    let productsCol = db.getCollection('products');
    if (!productsCol) {
        productsCol = db.addCollection('products');
        console.log('📦 Created new "products" collection');
    }

    // Check if products already exist
    const existingCount = productsCol.count();
    if (existingCount > 0) {
        console.log(`⚠️  'products' collection already has ${existingCount} item(s).`);
        console.log('   Options:');
        console.log('   1. Clear collection and reseed (recommended for fresh start)');
        console.log('   2. Keep existing data and skip seeding');
        console.log('\n   To clear and reseed, add this line before insertion:');
        console.log('   productsCol.clear();');
        console.log('\n   Or delete database.json and run this script again.');
        console.log('\n❌ Seeding aborted to prevent duplicates.');
        console.log('   To force a fresh seed, uncomment the clear() line above.');
        process.exit(0);
    }

    // Insert products
    console.log(`🌱 Seeding ${seedProducts.length} products...`);
    
    seedProducts.forEach((p, index) => {
        productsCol.insert({
            ...p,
            id: `prod_${Date.now()}_${index}`,  // Generate unique ID
            subcategory: p.category || '',
            material: '',
            dimensions: '',
            weight: '',
            deliveryTime: '5-7 business days',
            inStock: p.stock > 0,
            new: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    });

    // Save database
    db.saveDatabase((err) => {
        if (err) {
            console.error('❌ Error saving database:', err);
            process.exit(1);
        }
        
        console.log(`✅ Successfully seeded ${seedProducts.length} products into database.json`);
        console.log(`📊 Total products in collection: ${productsCol.count()}`);
        console.log('\n🎉 Seeding complete! Products are now available in the database.');
        console.log('   You can now access products via the API endpoints.');
        console.log('   Example: GET /api/products');
        process.exit(0);
    });
});

// Error handling for database load
db.on('error', (err) => {
    console.error('❌ Database error:', err);
    process.exit(1);
});