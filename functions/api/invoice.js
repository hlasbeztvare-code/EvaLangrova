import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const token = url.searchParams.get('token'); // Pro zákazníky z e-mailu

    if (!orderId) {
        return new Response('Chybí orderId', { status: 400 });
    }

    // Bezpečnostní ověření (buď admin JWT cookie, nebo platný hash token v URL)
    let isAuthorized = false;
    const expectedToken = await hashData(`${orderId}-${env.JWT_SECRET || 'secret'}`);
    
    if (token === expectedToken) {
        isAuthorized = true;
    } else {
        // Fallback na ověření admin JWT cookie
        const cookieHeader = request.headers.get('Cookie') || '';
        if (cookieHeader.includes('admin_session=')) {
            // (Zde už prošlo _middleware.js, takže admin má přístup)
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return new Response('Přístup odepřen', { status: 403 });
    }

    try {
        // Načtení dat objednávky z D1
        const { results } = await env.DB.prepare('SELECT * FROM orders WHERE order_id = ?').bind(orderId).all();
        if (!results || results.length === 0) {
            return new Response('Objednávka nenalezena', { status: 404 });
        }
        
        const order = results[0];
        
        // Vytvoření PDF
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        // Načtení fontu Roboto (podpora českých znaků)
        const fontBytes = await fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf').then(res => res.arrayBuffer());
        const fontBoldBytes = await fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf').then(res => res.arrayBuffer());
        
        const customFont = await pdfDoc.embedFont(fontBytes);
        const customFontBold = await pdfDoc.embedFont(fontBoldBytes);
        
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { height } = page.getSize();
        
        const drawText = (text, x, y, size = 10, isBold = false) => {
            page.drawText(text, { x, y, size, font: isBold ? customFontBold : customFont, color: rgb(0,0,0) });
        };

        // Hlavička
        drawText('FAKTURA - DAŇOVÝ DOKLAD', 50, height - 50, 16, true);
        drawText(`Číslo faktury: FA-2026-${orderId}`, 50, height - 70, 12);
        
        // Dodavatel vs Odběratel
        drawText('Dodavatel:', 50, height - 110, 11, true);
        drawText('Eva Belšánová Langrová', 50, height - 125, 10);
        drawText('IČO: 05490804', 50, height - 140, 10);
        drawText('Neplátce DPH', 50, height - 155, 10);
        drawText('E-mail: info@fotofiltry.cz', 50, height - 170, 10);
        drawText('Telefon: +420 604 241 924', 50, height - 185, 10);
        
        let cust = {};
        let bill = {};
        let items = [];
        try { cust = JSON.parse(order.customer); } catch(e){}
        try { bill = JSON.parse(order.billing); } catch(e){}
        try { items = JSON.parse(order.items); } catch(e){}

        drawText('Odběratel:', 300, height - 110, 11, true);
        drawText(cust.name || '', 300, height - 125, 10);
        drawText(`${bill.street || ''}`, 300, height - 140, 10);
        drawText(`${bill.zip || ''} ${bill.city || ''}`, 300, height - 155, 10);
        if (bill.ico) drawText(`IČO: ${bill.ico}`, 300, height - 170, 10);
        if (bill.dic) drawText(`DIČ: ${bill.dic}`, 300, height - 185, 10);
        
        const orderDate = new Date(order.created_at).toLocaleDateString('cs-CZ');
        drawText(`Datum vystavení: ${orderDate}`, 50, height - 230, 10);
        drawText(`Datum splatnosti: ${orderDate}`, 50, height - 245, 10);
        drawText(`Způsob úhrady: ${order.payment_method === 'comgate' ? 'Platební kartou' : order.payment_method}`, 50, height - 260, 10);
        
        // Tabulka položek
        let startY = height - 320;
        drawText('Název položky', 50, startY, 10, true);
        drawText('Množství', 350, startY, 10, true);
        drawText('Cena za ks', 420, startY, 10, true);
        drawText('Celkem', 500, startY, 10, true);
        
        startY -= 20;
        page.drawLine({ start: { x: 50, y: startY+10 }, end: { x: 545, y: startY+10 }, thickness: 1 });
        
        items.forEach(item => {
            const nameStr = `${item.name} ${item.variant ? '('+item.variant+')' : ''}`;
            drawText(nameStr, 50, startY, 10);
            drawText(String(item.quantity), 350, startY, 10);
            drawText(`${item.price} Kč`, 420, startY, 10);
            drawText(`${item.price * item.quantity} Kč`, 500, startY, 10);
            startY -= 20;
        });

        if (order.shipping_cost > 0) {
            drawText('Doprava', 50, startY, 10);
            drawText('1', 350, startY, 10);
            drawText(`${order.shipping_cost} Kč`, 420, startY, 10);
            drawText(`${order.shipping_cost} Kč`, 500, startY, 10);
            startY -= 20;
        }
        
        page.drawLine({ start: { x: 50, y: startY+10 }, end: { x: 545, y: startY+10 }, thickness: 1 });
        
        drawText('Celková částka k úhradě:', 300, startY - 20, 12, true);
        drawText(`${order.total} Kč`, 500, startY - 20, 12, true);

        const pdfBytes = await pdfDoc.save();
        
        return new Response(pdfBytes, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Faktura-FA-2026-${orderId}.pdf"`
            }
        });
        
    } catch (err) {
        return new Response('Chyba generování PDF: ' + err.message, { status: 500 });
    }
}

async function hashData(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
