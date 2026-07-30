// ==========================
// KAIRA - EMAIL UTILITY
// Send Emails via Nodemailer
// ==========================

const nodemailer = require('nodemailer');
require('dotenv').config();

// ==========================
// VALIDATE EMAIL CONFIGURATION
// ==========================
const validateEmailConfig = () => {
    const required = ['EMAIL_USER', 'EMAIL_PASS'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn('⚠️ Email configuration incomplete. Missing:', missing.join(', '));
        console.warn('   Email features will be disabled.');
        return false;
    }
    
    if (!process.env.EMAIL_USER.includes('@gmail.com')) {
        console.warn('⚠️ Email_USER should be a Gmail address for Gmail service.');
    }
    
    return true;
};

const isEmailConfigured = validateEmailConfig();

// ==========================
// CREATE TRANSPORTER (Only if configured)
// ==========================
let transporter = null;

if (isEmailConfigured) {
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Add these for better reliability
            tls: {
                rejectUnauthorized: false
            },
            // Add timeout
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000
        });

        // Verify connection
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email transporter verification failed:', error.message);
                console.log('   Please check your EMAIL_USER and EMAIL_PASS in .env');
                console.log('   For Gmail, you need an App Password, not your regular password.');
                console.log('   Generate one at: https://myaccount.google.com/apppasswords');
            } else {
                console.log('✅ Email transporter ready!');
            }
        });
    } catch (error) {
        console.error('❌ Failed to create email transporter:', error.message);
        transporter = null;
    }
}

// ==========================
// SEND ORDER CONFIRMATION EMAIL
// ==========================
const sendOrderConfirmation = async (order, user) => {
    // Check if email is configured
    if (!transporter) {
        console.warn('⚠️ Email not configured. Skipping order confirmation email.');
        return { success: false, error: 'Email not configured' };
    }

    try {
        // Validate required fields
        if (!order || !user || !user.email) {
            throw new Error('Missing required order or user data');
        }

        // Calculate total if not present
        const total = order.total || (order.subtotal || 0) + (order.shipping || 0) - (order.discount || 0);

        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price || 0).toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
            </tr>
        `).join('');

        // Get frontend URL with fallback
        const frontendUrl = process.env.FRONTEND_URL || 'https://kairaliving.vercel.app';

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F4EFE7; border-radius: 12px;">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="font-family: 'Fraunces', serif; color: #700C0C; letter-spacing: 4px; font-size: 32px; margin: 0;">KAIRA</h1>
                    <p style="color: #5b4c45; font-size: 16px; margin: 4px 0 0;">Luxury Handcrafted Mirrors</p>
                </div>

                <div style="background: white; padding: 24px; border-radius: 12px;">
                    <h2 style="color: #700C0C; font-size: 22px; margin-bottom: 8px;">Thank You for Your Order! 🎉</h2>
                    <p style="color: #5b4c45; font-size: 14px; margin: 4px 0;">Hi ${user.name || 'Customer'},</p>
                    <p style="color: #5b4c45; font-size: 14px; margin: 4px 0;">Your order has been placed successfully. Here are your order details:</p>

                    <div style="background: #F4EFE7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId || 'N/A'}</p>
                        <p style="margin: 4px 0;"><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
                        <p style="margin: 4px 0;"><strong>Total:</strong> ₹${total.toLocaleString()}</p>
                        <p style="margin: 4px 0;"><strong>Payment:</strong> ${order.paymentMethod || 'Pending'}</p>
                        <p style="margin: 4px 0;"><strong>Status:</strong> ${order.status || 'Processing'}</p>
                    </div>

                    ${order.items && order.items.length > 0 ? `
                    <h3 style="font-size: 16px; color: #700C0C; margin: 16px 0 8px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #F4EFE7;">
                                <th style="padding: 8px; text-align: left;">Product</th>
                                <th style="padding: 8px; text-align: center;">Qty</th>
                                <th style="padding: 8px; text-align: right;">Price</th>
                                <th style="padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    ` : ''}

                    <div style="border-top: 2px solid #eee; margin: 16px 0; padding-top: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0;">
                            <span>Subtotal</span>
                            <span>₹${(order.subtotal || 0).toLocaleString()}</span>
                        </div>
                        ${order.shipping > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0;">
                            <span>Shipping</span>
                            <span>₹${order.shipping.toLocaleString()}</span>
                        </div>` : ''}
                        ${order.discount > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #2e7d32;">
                            <span>Discount</span>
                            <span>-₹${order.discount.toLocaleString()}</span>
                        </div>` : ''}
                        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; padding: 8px 0; border-top: 2px solid #eee; margin-top: 4px;">
                            <span>Total</span>
                            <span style="color: #700C0C;">₹${total.toLocaleString()}</span>
                        </div>
                    </div>

                    ${order.shippingAddress && order.shippingAddress.name ? `
                    <h3 style="font-size: 16px; color: #700C0C; margin: 16px 0 8px;">Shipping Address</h3>
                    <div style="background: #F9F6F0; padding: 12px 16px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                        <p style="margin: 0;"><strong>${order.shippingAddress.name}</strong></p>
                        ${order.shippingAddress.street ? `<p style="margin: 0;">${order.shippingAddress.street}</p>` : ''}
                        ${order.shippingAddress.city ? `<p style="margin: 0;">${order.shippingAddress.city}${order.shippingAddress.state ? ', ' + order.shippingAddress.state : ''}${order.shippingAddress.pincode ? ' - ' + order.shippingAddress.pincode : ''}</p>` : ''}
                        ${order.shippingAddress.country ? `<p style="margin: 0;">${order.shippingAddress.country}</p>` : ''}
                        ${order.shippingAddress.phone ? `<p style="margin: 4px 0 0;">📞 ${order.shippingAddress.phone}</p>` : ''}
                    </div>
                    ` : ''}

                    <div style="margin-top: 20px; text-align: center;">
                        <a href="${frontendUrl}/orders/${order._id || order.orderId}" style="background: #700C0C; color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; display: inline-block;">Track Your Order</a>
                    </div>
                </div>

                <div style="text-align: center; padding: 20px 0; color: #5b4c45; font-size: 12px;">
                    <p style="margin: 2px 0;">Thank you for choosing KAIRA!</p>
                    <p style="margin: 2px 0;">For any questions, contact us at support@kaira.com</p>
                    <div style="margin-top: 8px;">
                        <a href="#" style="color: #5b4c45; margin: 0 8px; text-decoration: none;">Instagram</a>
                        <a href="#" style="color: #5b4c45; margin: 0 8px; text-decoration: none;">Facebook</a>
                        <a href="#" style="color: #5b4c45; margin: 0 8px; text-decoration: none;">Pinterest</a>
                    </div>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"KAIRA" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Order Confirmation - KAIRA #${order.orderId || 'N/A'}`,
            html: html,
            // Add text version as fallback
            text: `Thank you for your order! Order ID: ${order.orderId}. Total: ₹${total}`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Order confirmation email sent to ${user.email}`);
        console.log(`   Message ID: ${info.messageId}`);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return { success: false, error: error.message };
    }
};

// ==========================
// SEND WELCOME EMAIL
// ==========================
const sendWelcomeEmail = async (user) => {
    // Check if email is configured
    if (!transporter) {
        console.warn('⚠️ Email not configured. Skipping welcome email.');
        return { success: false, error: 'Email not configured' };
    }

    try {
        if (!user || !user.email) {
            throw new Error('Missing user data');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://kairaliving.vercel.app';

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F4EFE7; border-radius: 12px;">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="font-family: 'Fraunces', serif; color: #700C0C; letter-spacing: 4px; font-size: 32px; margin: 0;">KAIRA</h1>
                    <p style="color: #5b4c45; font-size: 16px; margin: 4px 0 0;">Luxury Handcrafted Mirrors</p>
                </div>
                <div style="background: white; padding: 24px; border-radius: 12px;">
                    <h2 style="color: #700C0C; font-size: 22px; margin: 0 0 8px;">Welcome to KAIRA, ${user.name || 'Customer'}! ✨</h2>
                    <p style="color: #5b4c45; font-size: 14px; line-height: 1.6; margin: 4px 0;">
                        We're thrilled to have you join the KAIRA family. You now have access to our curated collection of luxury handcrafted mirrors.
                    </p>
                    <div style="background: #F4EFE7; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
                        <p style="color: #5b4c45; font-size: 14px; margin: 0;">✨ Use code <strong style="color: #700C0C; font-size: 18px;">KAIRA10</strong> for 10% off your first purchase!</p>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${frontendUrl}" style="background: #700C0C; color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; display: inline-block;">Shop Now</a>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px 0; color: #5b4c45; font-size: 12px;">
                    <p style="margin: 2px 0;">Welcome to the world of luxury interiors.</p>
                    <p style="margin: 2px 0;">Follow us on social media for inspiration!</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"KAIRA" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to KAIRA! ✨',
            html: html,
            text: `Welcome to KAIRA! Use code KAIRA10 for 10% off your first purchase.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${user.email}`);
        console.log(`   Message ID: ${info.messageId}`);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Welcome email error:', error.message);
        return { success: false, error: error.message };
    }
};

// ==========================
// SEND PASSWORD RESET EMAIL
// ==========================
const sendPasswordResetEmail = async (user, resetToken) => {
    // Check if email is configured
    if (!transporter) {
        console.warn('⚠️ Email not configured. Skipping password reset email.');
        return { success: false, error: 'Email not configured' };
    }

    try {
        if (!user || !user.email || !resetToken) {
            throw new Error('Missing required data');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://kairaliving.vercel.app';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F4EFE7; border-radius: 12px;">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="font-family: 'Fraunces', serif; color: #700C0C; letter-spacing: 4px; font-size: 32px; margin: 0;">KAIRA</h1>
                </div>
                <div style="background: white; padding: 24px; border-radius: 12px;">
                    <h2 style="color: #700C0C; font-size: 22px; margin: 0 0 8px;">Reset Your Password</h2>
                    <p style="color: #5b4c45; font-size: 14px; line-height: 1.6;">
                        Hi ${user.name || 'Customer'},
                    </p>
                    <p style="color: #5b4c45; font-size: 14px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to set a new password:
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resetLink}" style="background: #700C0C; color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #5b4c45; font-size: 12px; line-height: 1.6;">
                        This link will expire in 1 hour. If you didn't request this, please ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        Or copy and paste this link into your browser:<br>
                        <span style="color: #700C0C; word-break: break-all;">${resetLink}</span>
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"KAIRA" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Reset Your KAIRA Password',
            html: html,
            text: `Reset your password: ${resetLink}`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${user.email}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Password reset email error:', error.message);
        return { success: false, error: error.message };
    }
};

// ==========================
// TEST EMAIL CONFIGURATION
// ==========================
const testEmailConfig = async () => {
    if (!transporter) {
        console.log('❌ Email not configured. Please set EMAIL_USER and EMAIL_PASS in .env');
        return false;
    }

    try {
        const testResult = await transporter.verify();
        console.log('✅ Email configuration is valid!');
        return true;
    } catch (error) {
        console.error('❌ Email configuration invalid:', error.message);
        console.log('   For Gmail, make sure:');
        console.log('   1. EMAIL_USER is a valid Gmail address');
        console.log('   2. EMAIL_PASS is an App Password (not your regular password)');
        console.log('   3. Generate App Password: https://myaccount.google.com/apppasswords');
        return false;
    }
};

// ==========================
// EXPORTS
// ==========================
module.exports = {
    sendOrderConfirmation,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    testEmailConfig,
    isEmailConfigured,
    transporter // Export for testing
};
