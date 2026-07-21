/**
 * Comgate Payment Gateway Helper for Cloudflare Pages Functions
 */

const COMGATE_CREATE_URL = 'https://payments.comgate.cz/v1.0/create';

/**
 * Parses application/x-www-form-urlencoded response string from Comgate API
 * e.g. "code=0&message=OK&transId=XXXX&redirectUrl=https%3A%2F%2F..."
 */
export function parseComgateResponse(responseText) {
    const params = new URLSearchParams(responseText);
    const result = {};
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
}

/**
 * Creates a payment via Comgate v1.0 API
 */
export async function createComgatePayment(options, env) {
    const merchant = env.COMGATE_MERCHANT_ID || options.merchant || 'G1058563';
    const secret = env.COMGATE_SECRET || options.secret || 'QoQ2kHqKGO9eulQgl6Owy15FtzfpFY6O';
    const test = (env.COMGATE_TEST !== undefined ? env.COMGATE_TEST : options.test) === 'false' ? 'false' : 'true';

    if (!merchant || !secret) {
        throw new Error('Comgate merchant ID or secret key is missing.');
    }


    // Price in haléře (CZK * 100)
    const priceInCents = Math.round(options.price * 100);

    const formData = new URLSearchParams();
    formData.append('merchant', merchant);
    formData.append('secret', secret);
    formData.append('test', test);
    formData.append('price', priceInCents.toString());
    formData.append('curr', options.curr || 'CZK');
    formData.append('label', options.label || `Objednávka ${options.refId}`);
    formData.append('refId', options.refId);
    formData.append('email', options.email || '');
    formData.append('method', options.method || 'ALL');
    formData.append('prepareOnly', 'true');
    formData.append('url_paid', options.urlPaid);
    formData.append('url_cancelled', options.urlCancelled);
    formData.append('url_unpaid', options.urlUnpaid);

    const response = await fetch(COMGATE_CREATE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    });

    const responseText = await response.text();
    const data = parseComgateResponse(responseText);

    if (data.code !== '0') {
        throw new Error(`Comgate API chyba (${data.code}): ${data.message || 'Neznámá chyba'}`);
    }

    return {
        code: data.code,
        message: data.message,
        transId: data.transId,
        redirectUrl: data.redirectUrl
    };
}

/**
 * Verifies and parses Comgate webhook notification data
 */
export function parseComgateNotification(formData) {
    const notification = {};
    for (const [key, value] of formData.entries()) {
        notification[key] = value;
    }
    return notification;
}
