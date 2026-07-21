import { parseComgateNotification } from './_comgate.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        // Comgate posílá data jako application/x-www-form-urlencoded
        const formData = await request.formData();
        const notification = parseComgateNotification(formData);

        const {
            secret,
            status,
            refId: orderId,
            transId
        } = notification;

        // Ověření zadaného secret s env.COMGATE_SECRET (pokud je nastaven)
        if (env.COMGATE_SECRET && secret && secret !== env.COMGATE_SECRET) {
            console.warn(`Comgate Webhook invalid secret for order ${orderId}`);
            return new Response("code=1&message=Invalid secret", { 
                status: 400, 
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" } 
            });
        }

        if (orderId && env.DB) {
            // Zjištění stávajícího stavu objednávky pro zajistění idempotence
            const existingOrder = await env.DB.prepare("SELECT status FROM orders WHERE order_id = ?")
                .bind(orderId)
                .first();

            // Pokud již je zaplacena, neprovádíme znovu vedlejší efekty (idempotence)
            if (existingOrder && existingOrder.status === 'PAID') {
                return new Response("code=0&message=OK", { 
                    status: 200,
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }
                });
            }

            if (status === 'PAID') {
                await env.DB.prepare("UPDATE orders SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?")
                    .bind(orderId)
                    .run();
                
                console.log(`[Comgate Webhook] Objednávka ${orderId} byla úspěšně zaplacena (transId: ${transId}).`);
            } else if (status === 'CANCELLED') {
                await env.DB.prepare("UPDATE orders SET status = 'CANCELLED' WHERE order_id = ?")
                    .bind(orderId)
                    .run();

                console.log(`[Comgate Webhook] Objednávka ${orderId} byla zrušena (transId: ${transId}).`);
            }
        }
        
        // Comgate vyžaduje odpoveď ve formátu code=0&message=OK
        return new Response("code=0&message=OK", { 
            status: 200,
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }
        });
    } catch (e) {
        console.error("Comgate Webhook Error:", e);
        return new Response(`code=1&message=${encodeURIComponent(e.message)}`, { 
            status: 500,
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" } 
        });
    }
}

