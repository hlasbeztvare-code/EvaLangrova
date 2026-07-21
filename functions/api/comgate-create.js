import { connect } from 'cloudflare:sockets';

/**
 * Volá Comgate API přes přímý TCP/TLS socket (IPv4).
 * Cloudflare Workers fetch() jde přes Cloudflare CDN, která přidává
 * CF-Connecting-IP s naší IPv6 adresou → Comgate blokuje.
 * Přímý socket obejde CDN vrstvu a připojí se přes IPv4.
 */
async function comgateViaSocket(paramsStr) {
    const body = paramsStr;
    const httpRequest = [
        'POST /v1.0/create HTTP/1.1',
        'Host: payments.comgate.cz',
        'Content-Type: application/x-www-form-urlencoded',
        `Content-Length: ${new TextEncoder().encode(body).length}`,
        'Connection: close',
        '',
        body
    ].join('\r\n');

    // Přímé TCP/TLS spojení – DNS payments.comgate.cz → pouze IPv4 (172.66.130.x)
    const socket = connect(
        { hostname: 'payments.comgate.cz', port: 443 },
        { secureTransport: 'on' }
    );

    const writer = socket.writable.getWriter();
    await writer.write(new TextEncoder().encode(httpRequest));
    await writer.close();

    // Čtení odpovědi
    const reader = socket.readable.getReader();
    const chunks = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
    } catch (_) { /* spojení se uzavřelo */ }

    // Sestavení odpovědi
    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const all = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.length; }

    const responseText = new TextDecoder().decode(all);

    // Oddělení HTTP hlaviček od těla
    const sepIdx = responseText.indexOf('\r\n\r\n');
    if (sepIdx === -1) throw new Error('Neplatná HTTP odpověď od Comgate');

    let responseBody = responseText.slice(sepIdx + 4);

    // Pokud je odpověď chunked transfer encoding, parsujeme chunk size
    // (první řádek je hex délka chunku)
    const firstLine = responseBody.split('\r\n')[0];
    if (/^[0-9a-fA-F]+$/.test(firstLine.trim())) {
        // chunked – extrahujeme skutečná data
        const chunkData = responseBody.slice(firstLine.length + 2);
        const endChunk = chunkData.indexOf('\r\n0');
        responseBody = endChunk !== -1 ? chunkData.slice(0, endChunk) : chunkData;
    }

    return responseBody.trim();
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

        // 8. Odeslání přes přímý TCP socket (IPv4) – obejití CF-Connecting-IP blokace
        const responseText = await comgateViaSocket(params.toString());
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
