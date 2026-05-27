const fs = require('fs');
const path = require('path');

function isAuthorized(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'eva123';
  return authHeader === `Bearer ${expectedPassword}`;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { action } = event.queryStringParameters || {};

  // 1. PUBLIC: Admin Login
  if (event.httpMethod === 'POST' && action === 'login') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { password } = body;
      const expectedPassword = process.env.ADMIN_PASSWORD || 'eva123';

      if (password === expectedPassword) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, token: expectedPassword }) };
      } else {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Nesprávné heslo' }) };
      }
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Neplatný požadavek' }) };
    }
  }

  // Check authorization for all other actions
  if (!isAuthorized(event)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Neautorizováno' }) };
  }

  // 2. AUTHORIZED: Status check
  if (event.httpMethod === 'GET' && action === 'status') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'authenticated' }) };
  }

  // 3. AUTHORIZED: Update product in products.json
  if (event.httpMethod === 'POST' && action === 'update-product') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id, price, inStock, description, image } = body;

      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí ID produktu' }) };
      }

      const productsPath = path.join(process.cwd(), 'products.json');
      const productsData = fs.readFileSync(productsPath, 'utf8');
      const products = JSON.parse(productsData);

      const productIndex = products.findIndex(p => p.id === id);
      if (productIndex === -1) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Produkt nenalezen' }) };
      }

      if (price !== undefined) {
        products[productIndex].price = `${price} Kč`;
      }
      if (inStock !== undefined) {
        products[productIndex].inStock = !!inStock;
      }
      if (description !== undefined) {
        products[productIndex].description = description;
      }
      if (image !== undefined && image !== '') {
        products[productIndex].localImg = image;
      }

      fs.writeFileSync(productsPath, JSON.stringify(products, null, 4), 'utf8');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, products }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Nepodařilo se aktualizovat produkt' }) };
    }
  }

  // 4. AUTHORIZED: Save post (create or update) to blog.json
  if (event.httpMethod === 'POST' && action === 'save-post') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id, title, image, text } = body;

      if (!title || !text) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí povinné údaje článku (nadpis, obsah)' }) };
      }

      const blogPath = path.join(process.cwd(), 'blog.json');
      let blogPosts = [];
      if (fs.existsSync(blogPath)) {
        blogPosts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
      }

      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const today = new Date();
      const formattedDate = `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;

      if (id) {
        const postIndex = blogPosts.findIndex(p => p.id === id);
        if (postIndex === -1) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Článek nenalezen' }) };
        }
        blogPosts[postIndex] = {
          ...blogPosts[postIndex],
          title,
          slug,
          image: image || blogPosts[postIndex].image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
          text
        };
      } else {
        const newPost = {
          id: Date.now().toString(),
          title,
          slug,
          date: `BLOG • ${formattedDate}`,
          image: image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
          text
        };
        blogPosts.unshift(newPost);
      }

      fs.writeFileSync(blogPath, JSON.stringify(blogPosts, null, 4), 'utf8');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, posts: blogPosts }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Nepodařilo se uložit článek' }) };
    }
  }

  // 5. AUTHORIZED: Delete blog post
  if (event.httpMethod === 'POST' && action === 'delete-post') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí ID článku' }) };
      }

      const blogPath = path.join(process.cwd(), 'blog.json');
      if (fs.existsSync(blogPath)) {
        let blogPosts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
        blogPosts = blogPosts.filter(p => p.id !== id);
        fs.writeFileSync(blogPath, JSON.stringify(blogPosts, null, 4), 'utf8');
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, posts: blogPosts }) };
      }
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Soubor s články neexistuje' }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Nepodařilo se smazat článek' }) };
    }
  }

  // 6. AUTHORIZED: Bypass disk write and return Base64 Data URL directly
  if (event.httpMethod === 'POST' && action === 'upload-image') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { filename, fileData } = body;

      if (!filename || !fileData) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí název souboru nebo data' }) };
      }

      const ext = path.extname(filename).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nepodporovaný formát obrázku' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: fileData
        })
      };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Nepodařilo se nahrát obrázek' }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Neplatná akce' }) };
};
