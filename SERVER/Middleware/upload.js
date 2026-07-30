// ==========================
// KAIRA - UPLOAD MIDDLEWARE
// Cloudinary with Fallback
// ==========================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads folder
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================
// LOCAL STORAGE (Always works)
// ==========================
const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// ==========================
// TRY CLOUDINARY (Optional)
// ==========================
let cloudinary = null;
let storage = localStorage;

try {
    // Only try to load cloudinary if installed
    cloudinary = require('cloudinary').v2;
    
    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET) {
        
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        // Try to load multer-storage-cloudinary
        try {
            const { CloudinaryStorage } = require('multer-storage-cloudinary');
            storage = new CloudinaryStorage({
                cloudinary: cloudinary,
                params: {
                    folder: 'kaira/products',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                    transformation: [{ width: 800, height: 1000, crop: 'limit' }]
                }
            });
            console.log('✅ Cloudinary storage configured');
        } catch (e) {
            console.log('⚠️ multer-storage-cloudinary not available, using local storage');
        }
    } else {
        console.log('⚠️ Cloudinary env vars not found, using local storage');
    }
} catch (error) {
    console.log('⚠️ Cloudinary not installed, using local storage');
}

// ==========================
// MULTER CONFIG
// ==========================
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 10);

module.exports = {
    cloudinary: cloudinary || {
        config: () => {},
        uploader: {
            destroy: () => Promise.resolve({ result: 'ok' })
        }
    },
    upload,
    uploadSingle,
    uploadMultiple,
    uploadDir
};
