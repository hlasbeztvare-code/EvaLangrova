const fs = require('fs');
const path = require('path');

// Simple helper to check admin authorization
function isAuthorized(req) {
  const authHeader = req.headers.authorization || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'eva123';
  return authHeader === `Bearer ${expectedPassword}`;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  // 1. PUBLIC: Admin Login
  if (req.method === 'POST' && action === 'login') {
    const { password } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD || 'eva123';

    if (password === expectedPassword) {
      return res.status(200).json({ success: true, token: expectedPassword });
    } else {
      return res.status(401).json({ error: 'Nesprávné heslo' });
    }
  }

  // Check authorization for all other actions
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: 'Neautorizováno' });
  }

  // 2. AUTHORIZED: Get admin status or info
  if (req.method === 'GET' && action === 'status') {
    return res.status(200).json({ status: 'authenticated' });
  }

  // 3. AUTHORIZED: Update product in products.json
  if (req.method === 'POST' && action === 'update-product') {
    try {
      const { id, price, inStock, description, image } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Chybí ID produktu' });
      }

      const productsPath = path.join(process.cwd(), 'products.json');
      const productsData = fs.readFileSync(productsPath, 'utf8');
      const products = JSON.parse(productsData);

      const productIndex = products.findIndex(p => p.id === id);
      if (productIndex === -1) {
        return res.status(404).json({ error: 'Produkt nenalezen' });
      }

      // Update fields safely
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
      return res.status(200).json({ success: true, products });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Nepodařilo se aktualizovat produkt' });
    }
  }

  // 4. AUTHORIZED: Save post (create or update) to blog.json
  if (req.method === 'POST' && action === 'save-post') {
    try {
      const { id, title, image, text } = req.body || {};

      if (!title || !text) {
        return res.status(400).json({ error: 'Chybí povinné údaje článku (nadpis, obsah)' });
      }

      const blogPath = path.join(process.cwd(), 'blog.json');
      let blogPosts = [];
      if (fs.existsSync(blogPath)) {
        blogPosts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
      }

      // Helper to generate url_slug from title
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove Czech diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const today = new Date();
      const formattedDate = `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;

      if (id) {
        // Edit existing post
        const postIndex = blogPosts.findIndex(p => p.id === id);
        if (postIndex === -1) {
          return res.status(404).json({ error: 'Článek nenalezen' });
        }
        blogPosts[postIndex] = {
          ...blogPosts[postIndex],
          title,
          slug,
          image: image || blogPosts[postIndex].image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
          text
        };
      } else {
        // Create new post
        const newPost = {
          id: Date.now().toString(),
          title,
          slug,
          date: `BLOG • ${formattedDate}`,
          image: image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
          text
        };
        blogPosts.unshift(newPost); // Add to beginning
      }

      fs.writeFileSync(blogPath, JSON.stringify(blogPosts, null, 4), 'utf8');
      return res.status(200).json({ success: true, posts: blogPosts });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Nepodařilo se uložit článek' });
    }
  }

  // 5. AUTHORIZED: Delete blog post
  if (req.method === 'POST' && action === 'delete-post') {
    try {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Chybí ID článku' });
      }

      const blogPath = path.join(process.cwd(), 'blog.json');
      if (fs.existsSync(blogPath)) {
        let blogPosts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
        blogPosts = blogPosts.filter(p => p.id !== id);
        fs.writeFileSync(blogPath, JSON.stringify(blogPosts, null, 4), 'utf8');
        return res.status(200).json({ success: true, posts: blogPosts });
      }
      return res.status(404).json({ error: 'Soubor s články neexistuje' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Nepodařilo se smazat článek' });
    }
  }

  // 6. AUTHORIZED: Bypass disk write and return Base64 Data URL directly
  if (req.method === 'POST' && action === 'upload-image') {
    try {
      const { filename, fileData } = req.body || {};

      if (!filename || !fileData) {
        return res.status(400).json({ error: 'Chybí název souboru nebo data' });
      }

      // Check file extension
      const ext = path.extname(filename).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        return res.status(400).json({ error: 'Nepodporovaný formát obrázku' });
      }

      // Return the Base64 Data URL directly as the imageUrl to bypass local filesystem storage
      return res.status(200).json({
        success: true,
        imageUrl: fileData
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Nepodařilo se nahrát obrázek' });
    }
  }

  return res.status(400).json({ error: 'Neplatná akce' });
};
