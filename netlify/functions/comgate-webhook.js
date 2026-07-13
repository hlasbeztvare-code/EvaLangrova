const { generateInvoicePDF } = require('./utils/pdfGenerator');
const { sendInvoiceEmail } = require('./utils/emailSender');
const { sendTelegramNotification } = require('./utils/telegramNotifier');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        let body;
        
        // Comgate normálně posílá urlencoded data s formátem transId=...&status=PAID...
        // Ale v našem demu můžeme dostat i JSON.
        if (event.headers['content-type'] && event.headers['content-type'].includes('application/json')) {
            body = JSON.parse(event.body);
        } else {
            // Parse urlencoded (Comgate standard)
            const params = new URLSearchParams(event.body);
            body = Object.fromEntries(params.entries());
        }

        const { status, orderId, orderData } = body;

        console.log(`Webhook triggered for order: ${orderId}, status: ${status}`);

        if (status === 'PAID') {
            console.log(`Generuji PDF fakturu pro objednávku ${orderId}`);
            
            // Reálně bychom v tuto chvíli vytáhli orderData z databáze (podle orderId).
            // Pro toto demo se spolehneme, že orderData dorazí v payloadu nebo je máme nasimulované.
            const mockOrderData = orderData || {
                orderId: orderId || 'TEST-ORDER',
                customer: { name: 'Test Zákazník', email: 'test@example.com' },
                billing: { street: 'Ulice 1', city: 'Praha', zip: '10000' },
                items: [{ name: 'Testovací produkt', price: 990, quantity: 1 }],
                shippingCost: 89,
                shippingMethod: 'Zásilkovna'
            };

            mockOrderData.orderId = mockOrderData.orderId || orderId;

            const pdfBuffer = await generateInvoicePDF(mockOrderData);
            
            console.log(`Odesílám e-mail zákazníkovi...`);
            await sendInvoiceEmail(mockOrderData, pdfBuffer);

            // TODO: Zde se objednávka v DB označí jako ZAPLACENÁ.

            // Odeslání notifikace na Telegram
            console.log(`Odesílám notifikaci na Telegram...`);
            await sendTelegramNotification(mockOrderData);

            return {
                statusCode: 200,
                body: 'OK'
            };
        }

        return {
            statusCode: 200,
            body: 'OK - but not paid'
        };

    } catch (error) {
        console.error('Webhook error:', error);
        return { statusCode: 500, body: 'Webhook handling failed' };
    }
};
