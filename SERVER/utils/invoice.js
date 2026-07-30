// ==========================
// KAIRA - INVOICE UTILITY
// Generate Invoice PDF
// ==========================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

// ==========================
// HELPER FUNCTIONS
// ==========================

/**
 * Format currency in Indian Rupees
 */
const formatCurrency = (amount) => {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

/**
 * Format date for invoice
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Generate Invoice Number
 */
const generateInvoiceNumber = (orderId) => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `KAI-${year}-${orderId.slice(-6)}-${random}`;
};

// ==========================
// GENERATE INVOICE PDF (Buffer)
// ==========================
const generateInvoicePDF = async (order) => {
    return new Promise((resolve, reject) => {
        try {
            if (!order) {
                throw new Error('Order data is required');
            }

            // Generate invoice number
            const invoiceNumber = generateInvoiceNumber(order.orderId);
            
            // Calculate total if not present
            const total = order.total || (order.subtotal || 0) + (order.shipping || 0) - (order.discount || 0);

            // Create a new PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Invoice - ${invoiceNumber}`,
                    Author: 'KAIRA Living',
                    Subject: 'Order Invoice',
                    Keywords: 'Invoice, KAIRA, Order'
                }
            });

            // Buffer to store PDF
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // ==========================
            // HEADER
            // ==========================
            // Logo/Header
            doc.fontSize(28)
               .font('Helvetica-Bold')
               .fillColor('#700C0C')
               .text('KAIRA', 50, 50, { align: 'left' });
            
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#5b4c45')
               .text('Luxury Handcrafted Mirrors', 50, 80, { align: 'left' });

            // Invoice title
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor('#700C0C')
               .text('INVOICE', 50, 120, { align: 'left' });

            // Invoice details (right side)
            const invoiceY = 50;
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#333333');
            
            const rightX = 400;
            doc.text(`Invoice #: ${invoiceNumber}`, rightX, invoiceY);
            doc.text(`Order #: ${order.orderId}`, rightX, invoiceY + 20);
            doc.text(`Date: ${formatDate(order.createdAt)}`, rightX, invoiceY + 40);
            doc.text(`Status: ${order.status ? order.status.toUpperCase() : 'PAID'}`, rightX, invoiceY + 60);

            // Divider
            doc.moveTo(50, 150)
               .lineTo(550, 150)
               .strokeColor('#DDDDDD')
               .lineWidth(1)
               .stroke();

            // ==========================
            // BILLING & SHIPPING INFO
            // ==========================
            const infoY = 170;
            
            // Billing Address
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#700C0C')
               .text('Billing Address:', 50, infoY);

            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#333333');
            
            const address = order.shippingAddress || {};
            doc.text(address.name || 'Customer', 50, infoY + 20);
            doc.text(address.street || 'Address not provided', 50, infoY + 36);
            const cityState = [address.city, address.state].filter(Boolean).join(', ');
            doc.text(cityState || '', 50, infoY + 52);
            doc.text(address.pincode || '', 50, infoY + 68);
            doc.text(address.country || 'India', 50, infoY + 84);
            doc.text(`Phone: ${address.phone || 'N/A'}`, 50, infoY + 100);
            doc.text(`Email: ${address.email || 'N/A'}`, 50, infoY + 116);

            // Shipping Address
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#700C0C')
               .text('Shipping Address:', 300, infoY);

            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#333333');
            
            const shippingAddress = order.shippingAddress || {};
            doc.text(shippingAddress.name || 'Customer', 300, infoY + 20);
            doc.text(shippingAddress.street || 'Address not provided', 300, infoY + 36);
            const shipCityState = [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ');
            doc.text(shipCityState || '', 300, infoY + 52);
            doc.text(shippingAddress.pincode || '', 300, infoY + 68);
            doc.text(shippingAddress.country || 'India', 300, infoY + 84);
            doc.text(`Phone: ${shippingAddress.phone || 'N/A'}`, 300, infoY + 100);

            // ==========================
            // ORDER ITEMS TABLE
            // ==========================
            const tableY = 320;
            
            // Table Header
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#FFFFFF')
               .rect(50, tableY, 500, 25)
               .fillColor('#700C0C')
               .fill();

            // Table Header Text
            doc.fillColor('#FFFFFF');
            doc.text('Item', 60, tableY + 6);
            doc.text('Qty', 300, tableY + 6, { width: 50, align: 'center' });
            doc.text('Price', 370, tableY + 6, { width: 70, align: 'right' });
            doc.text('Total', 460, tableY + 6, { width: 70, align: 'right' });

            // Table Rows
            let y = tableY + 30;
            const items = order.items || [];
            
            doc.fillColor('#333333');
            doc.font('Helvetica');
            doc.fontSize(9);

            items.forEach((item, index) => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                
                // Alternating row colors
                if (index % 2 === 0) {
                    doc.rect(50, y - 4, 500, 22)
                       .fillColor('#F9F6F0')
                       .fill();
                    doc.fillColor('#333333');
                }

                // Item name (truncate if too long)
                const name = item.name || 'Product';
                const displayName = name.length > 30 ? name.substring(0, 27) + '...' : name;
                doc.text(displayName, 60, y);
                doc.text(item.quantity || 1, 300, y, { width: 50, align: 'center' });
                doc.text(formatCurrency(item.price || 0), 370, y, { width: 70, align: 'right' });
                doc.text(formatCurrency(itemTotal), 460, y, { width: 70, align: 'right' });
                
                y += 24;
            });

            // Table Footer - Totals
            const totalY = Math.max(y + 20, 500);
            
            // Divider
            doc.moveTo(350, totalY)
               .lineTo(550, totalY)
               .strokeColor('#DDDDDD')
               .lineWidth(1)
               .stroke();

            let currentY = totalY + 10;
            
            // Subtotal
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#333333');
            doc.text('Subtotal', 380, currentY);
            doc.text(formatCurrency(order.subtotal || 0), 460, currentY, { width: 70, align: 'right' });
            currentY += 20;

            // Shipping
            if (order.shipping > 0) {
                doc.text('Shipping', 380, currentY);
                doc.text(formatCurrency(order.shipping), 460, currentY, { width: 70, align: 'right' });
                currentY += 20;
            }

            // Discount
            if (order.discount > 0) {
                doc.fillColor('#2e7d32');
                doc.text('Discount', 380, currentY);
                doc.text('-' + formatCurrency(order.discount), 460, currentY, { width: 70, align: 'right' });
                doc.fillColor('#333333');
                currentY += 20;
            }

            // Tax (if present)
            if (order.tax && order.tax > 0) {
                doc.text('Tax (GST)', 380, currentY);
                doc.text(formatCurrency(order.tax), 460, currentY, { width: 70, align: 'right' });
                currentY += 20;
            }

            // Total
            currentY += 5;
            doc.moveTo(350, currentY - 2)
               .lineTo(550, currentY - 2)
               .strokeColor('#700C0C')
               .lineWidth(2)
               .stroke();

            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#700C0C');
            doc.text('Total', 380, currentY + 2);
            doc.text(formatCurrency(total), 460, currentY + 2, { width: 70, align: 'right' });

            // ==========================
            // FOOTER
            // ==========================
            const footerY = Math.max(currentY + 60, 700);
            
            // Payment Method
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#333333');
            doc.text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 50, footerY);
            doc.text(`Payment ID: ${order.paymentId || 'N/A'}`, 50, footerY + 16);

            // Thank You Message
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#700C0C')
               .text('Thank You for Your Order!', 50, footerY + 50, { 
                   align: 'center', 
                   width: 500 
               });

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#5b4c45')
               .text('For any queries, contact us at support@kaira.com', 50, footerY + 72, { 
                   align: 'center', 
                   width: 500 
               });

            doc.text('Visit us at: www.kairaliving.com', 50, footerY + 90, { 
                align: 'center', 
                width: 500 
            });

            // Terms
            doc.fontSize(8)
               .fillColor('#999999')
               .text('This is a system-generated invoice. Please retain for your records.', 50, footerY + 120, {
                   align: 'center',
                   width: 500
               });

            // ==========================
            // FINALIZE
            // ==========================
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

// ==========================
// SAVE INVOICE TO FILE
// ==========================
const saveInvoiceToFile = async (order, outputPath) => {
    try {
        const pdfBuffer = await generateInvoicePDF(order);
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`✅ Invoice saved to: ${outputPath}`);
        
        return {
            success: true,
            path: outputPath,
            size: pdfBuffer.length
        };
    } catch (error) {
        console.error('❌ Failed to save invoice:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

// ==========================
// GENERATE INVOICE DATA (JSON)
// ==========================
const generateInvoiceData = (order) => {
    try {
        if (!order) {
            throw new Error('Order data is required');
        }

        const invoiceNumber = generateInvoiceNumber(order.orderId);
        const total = order.total || (order.subtotal || 0) + (order.shipping || 0) - (order.discount || 0);

        const invoice = {
            invoiceNumber: invoiceNumber,
            orderId: order.orderId,
            date: formatDate(order.createdAt),
            customer: {
                name: order.shippingAddress?.name || 'Customer',
                email: order.shippingAddress?.email || '',
                phone: order.shippingAddress?.phone || '',
                address: [
                    order.shippingAddress?.street,
                    order.shippingAddress?.city,
                    order.shippingAddress?.state,
                    order.shippingAddress?.pincode,
                    order.shippingAddress?.country || 'India'
                ].filter(Boolean).join(', ')
            },
            items: (order.items || []).map(item => ({
                name: item.name || 'Product',
                quantity: item.quantity || 1,
                price: item.price || 0,
                total: (item.price || 0) * (item.quantity || 1)
            })),
            subtotal: order.subtotal || 0,
            shipping: order.shipping || 0,
            tax: order.tax || 0,
            discount: order.discount || 0,
            total: total,
            status: order.status || 'PAID',
            paymentMethod: order.paymentMethod || 'N/A',
            paymentId: order.paymentId || 'N/A',
            currency: 'INR'
        };

        return invoice;
    } catch (error) {
        console.error('❌ Invoice data generation error:', error.message);
        return null;
    }
};

// ==========================
// GENERATE HTML INVOICE (for email)
// ==========================
const generateInvoiceHTML = (order) => {
    try {
        if (!order) {
            throw new Error('Order data is required');
        }

        const invoiceNumber = generateInvoiceNumber(order.orderId);
        const total = order.total || (order.subtotal || 0) + (order.shipping || 0) - (order.discount || 0);
        
        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price || 0)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
            </tr>
        `).join('');

        return `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #fff;">
                <div style="border-bottom: 2px solid #700C0C; padding-bottom: 20px;">
                    <h1 style="color: #700C0C; font-size: 28px; margin: 0;">KAIRA</h1>
                    <p style="color: #5b4c45; margin: 4px 0 0;">Luxury Handcrafted Mirrors</p>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                    <div>
                        <h2 style="color: #700C0C; font-size: 20px; margin: 0;">INVOICE</h2>
                        <p style="margin: 4px 0; font-size: 12px;">Invoice #: ${invoiceNumber}</p>
                        <p style="margin: 4px 0; font-size: 12px;">Order #: ${order.orderId}</p>
                        <p style="margin: 4px 0; font-size: 12px;">Date: ${formatDate(order.createdAt)}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${(order.status || 'PAID').toUpperCase()}</p>
                    </div>
                </div>

                <div style="background: #F9F6F0; padding: 15px; border-radius: 8px; margin: 20px 0; display: flex; justify-content: space-between;">
                    <div>
                        <h3 style="color: #700C0C; font-size: 14px; margin: 0 0 8px;">Billing Address</h3>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.name || 'Customer'}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.street || ''}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.pincode || ''}</p>
                    </div>
                    <div>
                        <h3 style="color: #700C0C; font-size: 14px; margin: 0 0 8px;">Shipping Address</h3>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.name || 'Customer'}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.street || ''}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')}</p>
                        <p style="margin: 2px 0; font-size: 12px;">${order.shippingAddress?.pincode || ''}</p>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #700C0C; color: white;">
                            <th style="padding: 10px; text-align: left;">Item</th>
                            <th style="padding: 10px; text-align: center;">Qty</th>
                            <th style="padding: 10px; text-align: right;">Price</th>
                            <th style="padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="border-top: 2px solid #eee; padding-top: 15px; text-align: right;">
                    <p style="margin: 4px 0; font-size: 12px;">Subtotal: ${formatCurrency(order.subtotal || 0)}</p>
                    ${order.shipping > 0 ? `<p style="margin: 4px 0; font-size: 12px;">Shipping: ${formatCurrency(order.shipping)}</p>` : ''}
                    ${order.discount > 0 ? `<p style="margin: 4px 0; font-size: 12px; color: #2e7d32;">Discount: -${formatCurrency(order.discount)}</p>` : ''}
                    <p style="margin: 8px 0 0; font-size: 20px; font-weight: bold; color: #700C0C;">Total: ${formatCurrency(total)}</p>
                </div>

                <div style="border-top: 2px solid #700C0C; margin-top: 20px; padding-top: 20px; text-align: center;">
                    <p style="color: #5b4c45; font-size: 14px;">Thank you for your order!</p>
                    <p style="color: #999; font-size: 11px;">For any queries, contact us at support@kaira.com</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ HTML invoice generation error:', error.message);
        return null;
    }
};

// ==========================
// EXPORTS
// ==========================
module.exports = {
    generateInvoicePDF,
    saveInvoiceToFile,
    generateInvoiceData,
    generateInvoiceHTML,
    generateInvoiceNumber,
    formatCurrency,
    formatDate
};