const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const blogPath = path.join(process.cwd(), 'blog.json');
    let posts = [];
    if (fs.existsSync(blogPath)) {
      posts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
    }
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Blog fetch error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
