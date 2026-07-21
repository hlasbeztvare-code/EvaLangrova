const fs = require('fs');

const products = JSON.parse(fs.readFileSync('./products.json', 'utf8'));
const blog = JSON.parse(fs.readFileSync('./blog.json', 'utf8'));

let sql = '';

// Seed products
sql += 'DELETE FROM products;\n';
for (const p of products) {
    const images = JSON.stringify(p.images);
    const variants = JSON.stringify(p.variants);
    const inStock = p.inStock ? 1 : 0;
    
    sql += `INSERT INTO products (id, name, price, description, short_description, variants, images, local_img, in_stock) VALUES (` +
        `'${p.id}', ` +
        `'${p.name.replace(/'/g, "''")}', ` +
        `'${p.price.replace(/'/g, "''")}', ` +
        `'${p.description.replace(/'/g, "''")}', ` +
        `'${p.shortDescription.replace(/'/g, "''")}', ` +
        `'${variants.replace(/'/g, "''")}', ` +
        `'${images.replace(/'/g, "''")}', ` +
        `'${p.localImg.replace(/'/g, "''")}', ` +
        `${inStock});\n`;
}

// Seed blog
sql += '\nDELETE FROM blog;\n';
for (const b of blog) {
    sql += `INSERT INTO blog (id, title, slug, image, text, content, date, meta_title, meta_desc, keywords) VALUES (` +
        `'${b.id}', ` +
        `'${b.title.replace(/'/g, "''")}', ` +
        `'${b.slug.replace(/'/g, "''")}', ` +
        `'${b.image.replace(/'/g, "''")}', ` +
        `'${b.text.replace(/'/g, "''")}', ` +
        `'${(b.content||'').replace(/'/g, "''")}', ` +
        `'${b.date.replace(/'/g, "''")}', ` +
        `'${(b.metaTitle||'').replace(/'/g, "''")}', ` +
        `'${(b.metaDesc||'').replace(/'/g, "''")}', ` +
        `'${(b.keywords||'').replace(/'/g, "''")}');\n`;
}

fs.writeFileSync('./seed.sql', sql);
console.log('Created seed.sql');
