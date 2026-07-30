// ==========================
// KAIRA - ENVIRONMENT VALIDATOR
// ==========================

const requiredEnvVars = [
    'PORT',
    'JWT_SECRET',
    'NODE_ENV'
];

const optionalEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'FRONTEND_URL'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n📌 Please add them to your .env file');
        process.exit(1);
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
        console.warn('⚠️ JWT_SECRET is too weak (min 16 characters)');
        console.warn('   Generate a strong key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }

    console.log('✅ Environment variables validated');
}

module.exports = { validateEnv, requiredEnvVars, optionalEnvVars };