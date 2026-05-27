const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const blogPath = path.join(process.cwd(), 'blog.json');
    let posts = [];
    if (fs.existsSync(blogPath)) {
      posts = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(posts)
    };
  } catch (error) {
    console.error('Blog fetch error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
