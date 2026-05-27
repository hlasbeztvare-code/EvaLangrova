const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const http = require('https');

function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Netlify gets headers as case-insensitive or lowecase
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    let rawBody = event.body;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf8');
    }
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object;
    const metadata = paymentIntent.metadata || {};

    const name = metadata.name || 'Zákazník';
    const email = metadata.email;
    const phone = metadata.phone || '';
    const zasilkovnaId = metadata.zasilkovnaId || '';
    
    let items = [];
    try {
      items = JSON.parse(metadata.items || '[]');
    } catch (e) {
      console.error('Failed to parse items from metadata:', e);
    }

    console.log(`Processing successful payment for: ${name} (${email})`);

    // A) INVOICING FLOW (Fakturoid API)
    const fakturoidSubdomain = process.env.FAKTUROID_SUBDOMAIN;
    const fakturoidEmail = process.env.FAKTUROID_EMAIL;
    const fakturoidApiKey = process.env.FAKTUROID_API_KEY;

    if (fakturoidSubdomain && fakturoidEmail && fakturoidApiKey) {
      try {
        const auth = Buffer.from(`${fakturoidEmail}:${fakturoidApiKey}`).toString('base64');
        const invoiceLines = items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPriceCzk,
          vat_rate: 0
        }));

        invoiceLines.push({
          name: 'Doprava (Zásilkovna)',
          quantity: 1,
          unit_price: 100,
          vat_rate: 0
        });

        const today = new Date().toISOString().split('T')[0];

        const fakturoidPayload = JSON.stringify({
          subject_name: name,
          email: email,
          phone: phone,
          payment_method: 'card',
          lines: invoiceLines,
          issued_on: today,
          paid_on: today,
          send_by_email: true
        });

        const fakturoidUrl = `https://app.fakturoid.cz/api/v2/accounts/${fakturoidSubdomain}/invoices.json`;
        const fakturoidOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'EvaLangrova Eshop (info@evalangrova.cz)'
          }
        };

        console.log('Sending invoice request to Fakturoid...');
        const response = await makeRequest(fakturoidUrl, fakturoidOptions, fakturoidPayload);
        console.log(`Fakturoid response status: ${response.statusCode}`, response.body);
      } catch (err) {
        console.error('Fakturoid invoicing failed:', err);
      }
    }

    // B) SMS NOTIFICATION FLOW (Twilio SMS)
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const evaPhone = process.env.EVA_PHONE_NUMBER;

    if (twilioAccountSid && twilioAuthToken && twilioPhone && evaPhone) {
      try {
        const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
        const itemsList = items.map(i => `${i.name} (${i.quantity}x)`).join(', ');
        
        let smsText = `Nova objednavka od ${name} uspesne zaplacena! Filtry: ${itemsList}.`;
        if (zasilkovnaId) {
          smsText += ` Zasilkovna ID: ${zasilkovnaId}.`;
        }

        const postData = `To=${encodeURIComponent(evaPhone)}&From=${encodeURIComponent(twilioPhone)}&Body=${encodeURIComponent(smsText)}`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioOptions = {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        console.log('Sending SMS notification via Twilio...');
        const response = await makeRequest(twilioUrl, twilioOptions, postData);
        console.log(`Twilio response status: ${response.statusCode}`, response.body);
      } catch (err) {
        console.error('Twilio SMS notification failed:', err);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
