const PDFDocument = require('pdfkit');

exports.generateInvoicePDF = async (orderData) => {
    return new Promise((resolve, reject) => {
        try {
            const path = require('path');
            const fs = require('fs');

            const doc = new PDFDocument({ margin: 50 });
            let buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Logo
            const logoPath = path.join(process.cwd(), 'images', 'logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { height: 40 });
            }

            // Header
            doc.fontSize(20).text('Faktura', { align: 'right' });
            doc.fontSize(10).text(`Číslo objednávky: ${orderData.orderId}`, { align: 'right' });
            doc.text(`Datum vystavení: ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'right' });
            doc.moveDown(2);

            // Dodavatel & Odběratel
            doc.fontSize(12).text('Dodavatel:', 50, doc.y);
            doc.text('Odběratel:', 300, doc.y);
            doc.moveDown(0.5);

            doc.fontSize(10);
            doc.text('Fotofiltry.cz', 50, doc.y);
            doc.text('Eva Langrová', 50, doc.y);
            doc.text('IČO: 12345678', 50, doc.y);
            
            doc.text(orderData.customer.name, 300, doc.y - 40); // align height manually
            doc.text(orderData.billing.street, 300, doc.y);
            doc.text(`${orderData.billing.zip} ${orderData.billing.city}`, 300, doc.y);
            doc.text(orderData.customer.email, 300, doc.y);

            doc.moveDown(3);

            // Items table
            doc.fontSize(12).text('Položky', 50, doc.y, { underline: true });
            doc.moveDown(1);
            
            let total = 0;
            doc.fontSize(10);

            orderData.items.forEach(item => {
                const lineTotal = item.price * item.quantity;
                total += lineTotal;
                doc.text(`${item.name} (${item.quantity}x)`, 50, doc.y, { continued: true });
                doc.text(`${lineTotal} Kč`, 400, doc.y, { align: 'right' });
            });

            // Shipping
            if (orderData.shippingCost !== undefined) {
                total += orderData.shippingCost;
                doc.text(`Doprava (${orderData.shippingMethod})`, 50, doc.y, { continued: true });
                doc.text(`${orderData.shippingCost} Kč`, 400, doc.y, { align: 'right' });
            }

            doc.moveDown(2);
            doc.fontSize(14).text(`Celkem k úhradě: ${total} Kč`, { align: 'right' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
