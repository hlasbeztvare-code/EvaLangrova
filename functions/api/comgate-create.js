const COMGATE_CREATE_URL = 'https://payments.comgate.cz/v1.0/create';

/**
 * Volá Comgate API.
 *
 * Comgate merchant účet má zapnuté omezení přístupu podle IP adresy.
 * Cloudflare Workers/Pages nemají static outbound IP (běží z tisíců IP
 * adres po celém světě) — přímé volání proto Comgate odmítá chybou 1400
 * "Access from unauthorized location". Dřívější pokus obejít to přímým
 * TCP socketem taky nefunguje — Cloudflare sama takové spojení na
 * HTTPS porty blokuje na úrovni platformy.
 *
 * Řešení: malý relay server (VPS se statickou IP), který tenhle Worker
 * zavolá běžným fetch() a on požadavek přepošle na Comgate ze své pevné
 * IP. Aktivuje se nastavením env proměnných COMGATE_RELAY_URL a
 * COMGATE_RELAY_SECRET — bez nich se (pro test/lokální vývoj) volá
 * Comgate přímo, což ale v produkci skončí stejnou chybou 1400, dokud
 * relay není zapnutý.
 */
async function comgateViaFetch(paramsStr, env) {
    if (env.COMGATE_RELAY_URL) {
        const response = await fetch(env.COMGATE_RELAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-relay-secret': env.COMGATE_RELAY_SECRET || '',
                'x-relay-path': '/v1.0/create'
            },
            body: paramsStr
        });
        return await response.text();
    }

    const response = await fetch(COMGATE_CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: paramsStr
    });
    return await response.text();
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. ENV proměnné striktně z context.env
        const merchantId = (env.COMGATE_MERCHANT_ID || '').trim();
        const secret = (env.COMGATE_SECRET || '').trim();
        const testMode = (env.COMGATE_TEST || '').trim();

        if (!merchantId || !secret) {
            return Response.json({
                error: 'Chybí Comgate ENV: COMGATE_MERCHANT_ID nebo COMGATE_SECRET.',
                debug: {
                    merchantId: merchantId ? 'OK' : 'MISSING',
                    secret: secret ? 'OK' : 'MISSING',
                }
            }, { status: 500 });
        }

        // 2. Parsování těla požadavku
        const body = await request.json();

        const customerEmail = (body.customer?.email || '').trim();
        const total = Number(body.total) || 0;
        const shippingCost = Number(body.shippingCost) || 0;
        const totalAmount = total + shippingCost;
        const paymentMethod = body.paymentMethod || 'card';
        const shippingMethod = body.shippingMethod || '';

        // 3. ID objednávky
        const orderId = 'ORD-' + Date.now();

        // 4. Uložení do D1
        if (env.DB) {
            await env.DB.prepare(`
                INSERT INTO orders (order_id, customer, billing, items, shipping_cost, shipping_method, payment_method, total, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            `).bind(
                orderId,
                JSON.stringify(body.customer || {}),
                JSON.stringify(body.billing || {}),
                JSON.stringify(body.items || []),
                shippingCost,
                shippingMethod,
                paymentMethod,
                totalAmount
            ).run();
        }

        // 5. Platba převodem – nepotřebuje Comgate
        if (paymentMethod === 'transfer') {
            return Response.json({
                success: true,
                redirectUrl: `/success.html?orderId=${orderId}&method=transfer`,
                orderId
            });
        }

        // 6. Návratové URL
        const host = request.headers.get('host') || 'fotofiltry.cz';
        const proto = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${proto}://${host}`;

        // 7. Sestavení URLSearchParams pro Comgate
        const params = new URLSearchParams();
        params.append('merchant', merchantId);
        params.append('secret', secret);
        params.append('test', testMode === 'true' ? 'true' : 'false');
        params.append('price', Math.round(totalAmount * 100).toString());
        params.append('curr', 'CZK');
        params.append('label', `Objednávka ${orderId}`);
        params.append('refId', orderId);
        params.append('email', customerEmail);
        params.append('method', 'ALL');
        params.append('prepareOnly', 'true');
        params.append('url_paid', `${baseUrl}/success.html?orderId=${orderId}&payment=success`);
        params.append('url_cancelled', `${baseUrl}/checkout.html?status=cancelled&orderId=${orderId}`);
        params.append('url_unpaid', `${baseUrl}/checkout.html?status=unpaid&orderId=${orderId}`);

        // 8. Odeslání přes standardní fetch()
        const responseText = await comgateViaFetch(params.toString(), env);
        const parsed = new URLSearchParams(responseText);
        const code = parsed.get('code');
        const message = parsed.get('message');
        const transId = parsed.get('transId');
        const redirectUrl = parsed.get('redirectUrl');

        if (code !== '0') {
            console.error(`Comgate chyba [${code}]: ${message}`, { orderId });
            return Response.json({
                error: `Comgate API chyba (${code}): ${message || 'Neznámá chyba'}`,
                code,
                orderId
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            redirectUrl,
            transId,
            orderId
        });

    } catch (e) {
        console.error('Comgate Create Error:', e);
        return Response.json({
            error: e.message || 'Interní chyba při vytváření platby'
        }, { status: 500 });
    }
}
