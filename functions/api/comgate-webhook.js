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
            // Zjištění stávajícího stavu objednávky pro zajistění idempotence a e-mail zákazníka
            const existingOrder = await env.DB.prepare("SELECT status, customer FROM orders WHERE order_id = ?")
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

                // Vygenerujeme hash pro fakturu
                const msgBuffer = new TextEncoder().encode(`${orderId}-${env.JWT_SECRET || 'secret'}`);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                
                const host = request.headers.get('host') || 'fotofiltry.cz';
                const proto = host.includes('localhost') ? 'http' : 'https';
                const invoiceUrl = `${proto}://${host}/api/invoice?orderId=${orderId}&token=${token}`;

                // Odeslání e-mailu zákazníkovi přes Resend, pokud je k dispozici API klíč
                if (env.RESEND_API_KEY && existingOrder && existingOrder.customer) {
                    try {
                        const cust = JSON.parse(existingOrder.customer);
                        if (cust.email) {
                            const emailHtml = `
                                <h2>Děkujeme za vaši platbu!</h2>
                                <p>Vaše objednávka <strong>${orderId}</strong> byla úspěšně zaplacena.</p>
                                <p>Fakturu si můžete stáhnout zde: <br><a href="${invoiceUrl}">${invoiceUrl}</a></p>
                                <br>
                                <p>S pozdravem,<br>Eva Langrová<br>fotofiltry.cz</p>
                            `;

                            await fetch('https://api.resend.com/emails', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${env.RESEND_API_KEY}`
                                },
                                body: JSON.stringify({
                                    from: 'FotoFiltry.cz <info@fotofiltry.cz>',
                                    to: [cust.email],
                                    subject: `Platba přijata - Objednávka ${orderId}`,
                                    html: emailHtml
                                })
                            });
                            console.log(`E-mail odeslán na ${cust.email}`);
                        }
                    } catch (e) {
                        console.error('Chyba při odesílání e-mailu:', e);
                    }
                }
                
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

