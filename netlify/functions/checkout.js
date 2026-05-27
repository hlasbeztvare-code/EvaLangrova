const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, phone, zasilkovnaId, message, items } = body;

    if (!email || !items || !Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required checkout information (email, items)' })
      };
    }

    // Load products.json securely on the server
    const productsPath = path.join(process.cwd(), 'products.json');
    let dbProducts = [];
    try {
      const productsData = fs.readFileSync(productsPath, 'utf8');
      dbProducts = JSON.parse(productsData);
    } catch (err) {
      console.error('Failed to load products.json:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database error' }) };
    }

    let totalCzk = 0;
    const itemsSummary = [];

    for (const clientItem of items) {
      const dbProduct = dbProducts.find(p => p.id === clientItem.id);
      if (!dbProduct) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Product not found: ${clientItem.id}` }) };
      }

      const priceVal = parseInt(dbProduct.price.replace(/[^0-9]/g, ''), 10);
      if (isNaN(priceVal)) {
        console.error(`Invalid price format in database for product: ${dbProduct.id}`);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid product price configuration' }) };
      }

      const qty = parseInt(clientItem.quantity, 10) || 1;
      totalCzk += priceVal * qty;
      
      itemsSummary.push({
        id: dbProduct.id,
        name: dbProduct.name,
        quantity: qty,
        unitPriceCzk: priceVal
      });
    }

    const shippingCzk = 100;
    totalCzk += shippingCzk;

    const amountInCents = totalCzk * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'czk',
      receipt_email: email,
      metadata: {
        name: name || '',
        email: email || '',
        phone: phone || '',
        zasilkovnaId: zasilkovnaId || '',
        message: message || '',
        items: JSON.stringify(itemsSummary)
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        totalAmountCzk: totalCzk,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
      })
    };

  } catch (error) {
    console.error('Checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
