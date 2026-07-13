exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { customer, billing, items, shippingCost, paymentMethod } = body;

        let total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        total += shippingCost || 0;

        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const amountCents = total * 100;

        console.log(`[ORDER CREATED] ID: ${orderId}, Total: ${total} CZK, Method: ${paymentMethod}`);

        // Handle Bank Transfer directly without Comgate
        if (paymentMethod === 'transfer') {
            console.log(`[BANK TRANSFER] Triggering webhook async for email invoice...`);
            const webhookUrl = `http://${event.headers.host}/.netlify/functions/comgate-webhook`;
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID', orderId, orderData: body })
            }).catch(e => console.log('Mock webhook trigger error', e));

            return {
                statusCode: 200,
                body: JSON.stringify({ url: '/success.html?method=transfer&orderId=' + orderId })
            };
        }

        // COMGATE API INTEGRATION
        const COMGATE_MERCHANT = process.env.COMGATE_MERCHANT;
        const COMGATE_SECRET = process.env.COMGATE_SECRET;
        const COMGATE_TEST = process.env.COMGATE_TEST === 'true'; // Set to true in env for testing

        if (COMGATE_MERCHANT && COMGATE_SECRET) {
            const formData = new URLSearchParams();
            formData.append('merchant', COMGATE_MERCHANT);
            formData.append('test', COMGATE_TEST ? 'true' : 'false');
            formData.append('country', 'CZ');
            formData.append('price', amountCents);
            formData.append('curr', 'CZK');
            formData.append('label', `Objednávka ${orderId}`);
            formData.append('refId', orderId);
            formData.append('email', customer.email);
            formData.append('method', 'ALL');
            formData.append('secret', COMGATE_SECRET);
            
            // Reálný požadavek na Comgate API
            const response = await fetch('https://payments.comgate.cz/v1.0/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            
            const responseText = await response.text();
            const params = new URLSearchParams(responseText);
            
            if (params.get('code') === '0') {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ url: params.get('redirect'), transactionId: params.get('transId') })
                };
            } else {
                console.error(`[COMGATE ERROR] Code: ${params.get('code')}, Message: ${params.get('message')}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Chyba při komunikaci s platební bránou: ' + params.get('message') })
                };
            }
        }

        // FALLBACK: MOCK PAYMENT GATEWAY
        console.warn('[COMGATE API] Missing credentials. Falling back to success simulator.');
        const mockUrl = `/success.html?orderId=${orderId}&amount=${total}&method=card`;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ url: mockUrl, transactionId: 'MOCK-TRANS-123' })
        };

    } catch (error) {
        console.error('Error creating Comgate payment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Nastala chyba při zpracování platby.' })
        };
    }
};
