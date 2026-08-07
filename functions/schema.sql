-- functions/schema.sql
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT,
    price TEXT,
    description TEXT,
    short_description TEXT,
    variants TEXT,
    images TEXT,
    local_img TEXT,
    in_stock INTEGER,
    params TEXT
);

DROP TABLE IF EXISTS blog;
CREATE TABLE blog (
    id TEXT PRIMARY KEY,
    title TEXT,
    slug TEXT,
    image TEXT,
    text TEXT,
    content TEXT,
    date TEXT,
    meta_title TEXT,
    meta_desc TEXT,
    keywords TEXT
);

DROP TABLE IF EXISTS config;
CREATE TABLE config (
    id TEXT PRIMARY KEY,
    data TEXT
);

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    customer TEXT,
    billing TEXT,
    items TEXT,
    shipping_cost REAL,
    shipping_method TEXT,
    payment_method TEXT,
    total REAL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME
);

DROP TABLE IF EXISTS inquiries;
CREATE TABLE inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
