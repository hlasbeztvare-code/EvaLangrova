const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const http = require('https');

// Helper to buffer the raw request body (needed for Stripe signature verification)
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Helper to send HTTP requests using Node.js built-in 'https'
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the payment_intent.succeeded event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata || {};

    const name = metadata.name || 'Zákazník';
    const email = metadata.email;
    const phone = metadata.phone || '';
    const zasilkovnaId = metadata.zasilkovnaId || '';
    const message = metadata.message || '';
    
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
          vat_rate: 0 // Assume 0 or customize as needed
        }));

        // Add shipping line
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
          paid_on: today, // Automatically marks invoice as Paid
          send_by_email: true // Instructs Fakturoid to email the invoice to the customer
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
    } else {
      console.log('Fakturoid credentials missing. Skipping invoicing.');
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
    } else {
      console.log('Twilio credentials or Eva phone missing. Skipping SMS notification.');
    }
  }

  return res.status(200).json({ received: true });
};

// Disable Vercel body parser to get raw body
export const config = {
  api: {
    bodyParser: false
  }
};
