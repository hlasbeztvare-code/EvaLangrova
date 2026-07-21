import { createComgatePayment } from './_comgate.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        
        const customer = JSON.stringify(body.customer || {});
        const billing = JSON.stringify(body.billing || {});
        const items = JSON.stringify(body.items || []);
        const total = Number(body.total) || 0;
        const shippingCost = Number(body.shippingCost) || 0;
        const totalAmount = total + shippingCost;
        const paymentMethod = body.paymentMethod || 'card';
        const shippingMethod = body.shippingMethod || '';
        
        const orderId = 'ORD-' + Date.now();
        const customerEmail = body.customer?.email || '';

        // Save order to D1
        if (env.DB) {
            await env.DB.prepare(`
                INSERT INTO orders (order_id, customer, billing, items, shipping_cost, shipping_method, payment_method, total, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            `).bind(orderId, customer, billing, items, shippingCost, shippingMethod, paymentMethod, totalAmount).run();
        }

        // Platba bankovním převodem
        if (paymentMethod === 'transfer') {
            return Response.json({ 
                success: true, 
                redirectUrl: '/success.html?orderId=' + orderId,
                url: '/success.html?orderId=' + orderId,
                orderId 
            });
        }

        // Určení protokolu a domény pro návratové URL
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

        // Vytvoření platby na Comgate
        const comgateRes = await createComgatePayment({
            price: totalAmount,
            curr: 'CZK',
            refId: orderId,
            email: customerEmail,
            label: `Objednávka ${orderId}`,
            method: 'ALL',
            urlPaid: `${baseUrl}/success.html?orderId=${orderId}&payment=success`,
            urlCancelled: `${baseUrl}/checkout.html?status=cancelled&orderId=${orderId}`,
            urlUnpaid: `${baseUrl}/checkout.html?status=unpaid&orderId=${orderId}`
        }, env);

        return Response.json({
            success: true,
            redirectUrl: comgateRes.redirectUrl,
            url: comgateRes.redirectUrl,
            transId: comgateRes.transId,
            orderId
        });

    } catch (e) {
        console.error('Comgate Create Error:', e);
        return Response.json({ error: e.message || 'Chyba při vytváření platby' }, { status: 500 });
    }
}

