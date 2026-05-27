const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, phone, zasilkovnaId, message, items } = req.body;

    if (!email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required checkout information (email, items)' });
    }

    // Load products.json securely on the server (Zero Trust Validation)
    const productsPath = path.join(process.cwd(), 'products.json');
    let dbProducts = [];
    try {
      const productsData = fs.readFileSync(productsPath, 'utf8');
      dbProducts = JSON.parse(productsData);
    } catch (err) {
      console.error('Failed to load products.json:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate total price based on server products.json prices
    let totalCzk = 0;
    const itemsSummary = [];

    for (const clientItem of items) {
      const dbProduct = dbProducts.find(p => p.id === clientItem.id);
      if (!dbProduct) {
        return res.status(400).json({ error: `Product not found: ${clientItem.id}` });
      }

      // Parse price from format like "990 Kč"
      const priceVal = parseInt(dbProduct.price.replace(/[^0-9]/g, ''), 10);
      if (isNaN(priceVal)) {
        console.error(`Invalid price format in database for product: ${dbProduct.id}`);
        return res.status(500).json({ error: 'Invalid product price configuration' });
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

    // Add shipping cost (100 CZK)
    const shippingCzk = 100;
    totalCzk += shippingCzk;

    // Convert CZK to smallest unit (cents/haléře, 1 CZK = 100 cents for Stripe)
    const amountInCents = totalCzk * 100;

    // Create Stripe PaymentIntent
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

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      totalAmountCzk: totalCzk,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
