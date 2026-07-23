import { verifyAdminPassword, hashPassword } from './_auth.js';

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' }});
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (request.method === 'POST' && action === 'login') {
        const body = await request.json();
        if (await verifyAdminPassword(body.password, env)) {
            return Response.json({ success: true, token: body.password });
        }
        return Response.json({ error: 'Nesprávné heslo' }, { status: 401 });
    }

    if (request.method === 'POST' && action === 'change-password') {
        const body = await request.json();
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            return Response.json({ error: 'Vyplňte současné i nové heslo' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return Response.json({ error: 'Nové heslo musí mít alespoň 6 znaků' }, { status: 400 });
        }
        if (!(await verifyAdminPassword(currentPassword, env))) {
            return Response.json({ error: 'Současné heslo není správně' }, { status: 401 });
        }
        const passwordHash = await hashPassword(newPassword);
        await env.DB.prepare("INSERT INTO config (id, data) VALUES ('adminAuth', ?1) ON CONFLICT(id) DO UPDATE SET data = ?1")
            .bind(JSON.stringify({ passwordHash }))
            .run();
        return Response.json({ success: true });
    }


    if (request.method === 'GET' && action === 'status') {
        return Response.json({ status: 'authenticated' });
    }

    if (request.method === 'POST' && action === 'save-content') {
        const body = await request.json();
        
        const { results } = await env.DB.prepare("SELECT data FROM config WHERE id = 'siteContent'").all();
        let existing = {};
        if (results && results.length > 0) {
            try { existing = JSON.parse(results[0].data); } catch(e) {}
        }
        const newContent = { ...existing, ...body };
        
        await env.DB.prepare("INSERT INTO config (id, data) VALUES ('siteContent', ?1) ON CONFLICT(id) DO UPDATE SET data = ?1")
            .bind(JSON.stringify(newContent))
            .run();
            
        return Response.json({ success: true, content: newContent });
    }

    if (request.method === 'POST' && action === 'update-product') {
        const body = await request.json();
        const id = body.id;
        if (!id) return Response.json({ error: 'Chybí ID' }, { status: 400 });

        const setClause = [];
        const params = [];
        let paramIndex = 1;

        if (body.name !== undefined) { setClause.push(`name = ?${paramIndex++}`); params.push(body.name); }
        if (body.shortDescription !== undefined) { setClause.push(`short_description = ?${paramIndex++}`); params.push(body.shortDescription); }
        if (body.variants !== undefined) { setClause.push(`variants = ?${paramIndex++}`); params.push(JSON.stringify(body.variants)); }
        if (body.images !== undefined) { setClause.push(`images = ?${paramIndex++}`); params.push(JSON.stringify(body.images)); }
        if (body.price !== undefined) { setClause.push(`price = ?${paramIndex++}`); params.push(body.price + ' Kč'); }
        if (body.inStock !== undefined) { setClause.push(`in_stock = ?${paramIndex++}`); params.push(body.inStock ? 1 : 0); }
        if (body.description !== undefined) { setClause.push(`description = ?${paramIndex++}`); params.push(body.description); }
        if (body.image) { setClause.push(`local_img = ?${paramIndex++}`); params.push(body.image); }

        if (setClause.length > 0) {
            params.push(id);
            await env.DB.prepare(`UPDATE products SET ${setClause.join(', ')} WHERE id = ?${paramIndex}`)
                .bind(...params)
                .run();
        }
        return Response.json({ success: true });
    }

    if (request.method === 'POST' && action === 'add-product') {
        const body = await request.json();
        const name = body.name || 'Nový produkt';
        const id = 'p_' + Date.now();
        const price = (body.price !== undefined ? body.price : 990) + ' Kč';
        const variants = JSON.stringify(body.variants || []);
        const images = JSON.stringify(body.images || []);

        await env.DB.prepare(
            `INSERT INTO products (id, name, price, description, short_description, variants, images, local_img, in_stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id,
            name,
            price,
            body.description || '',
            body.shortDescription || '',
            variants,
            images,
            body.image || '',
            1
        ).run();

        return Response.json({ success: true, id });
    }

    if (request.method === 'POST' && action === 'delete-product') {
        const body = await request.json();
        if (!body.id) return Response.json({ error: 'Chybí ID' }, { status: 400 });
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(body.id).run();
        return Response.json({ success: true });
    }

    if (request.method === 'GET' && action === 'get-inquiries') {
        const { results } = await env.DB.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all();
        return Response.json(results || []);
    }

    if (request.method === 'POST' && action === 'delete-inquiry') {
        const body = await request.json();
        if (!body.id) return Response.json({ error: 'Chybí ID' }, { status: 400 });
        await env.DB.prepare("DELETE FROM inquiries WHERE id = ?").bind(body.id).run();
        return Response.json({ success: true });
    }

    if (request.method === 'POST' && action === 'save-post') {
        const body = await request.json();
        const id = body.id;
        const title = body.title || '';
        const text = body.text || '';
        const content = body.content || '';
        let image = body.image || '';

        if (!title || !text) return Response.json({ error: 'Chybí povinné údaje' }, { status: 400 });

        let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const date = 'BLOG • ' + new Date().toLocaleDateString('cs-CZ');

        if (id) {
            if (image) {
                await env.DB.prepare("UPDATE blog SET title = ?, slug = ?, text = ?, content = ?, image = ? WHERE id = ?")
                    .bind(title, slug, text, content, image, id).run();
            } else {
                await env.DB.prepare("UPDATE blog SET title = ?, slug = ?, text = ?, content = ? WHERE id = ?")
                    .bind(title, slug, text, content, id).run();
            }
        } else {
            const newId = String(Date.now());
            if (!image) image = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80';
            await env.DB.prepare("INSERT INTO blog (id, title, slug, image, text, content, date) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(newId, title, slug, image, text, content, date).run();
        }
        return Response.json({ success: true });
    }

    if (request.method === 'POST' && action === 'delete-post') {
        const body = await request.json();
        if (!body.id) return Response.json({ error: 'Chybí ID' }, { status: 400 });
        await env.DB.prepare("DELETE FROM blog WHERE id = ?").bind(body.id).run();
        return Response.json({ success: true });
    }

    if (request.method === 'POST' && action === 'upload-image') {
        const body = await request.json();
        // Na Cloudflare nemáme filesystém pro uploads. Pro jednoduchost vrátíme Base64 zpět,
        // frontend ho uloží přímo do D1 textových sloupců.
        return Response.json({ success: true, imageUrl: body.fileData });
    }

    if (request.method === 'GET' && action === 'get-orders') {
        const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
        return Response.json(results || []);
    }

    if (request.method === 'POST' && action === 'update-order-status') {
        const body = await request.json();
        if (!body.orderId || !body.status) {
            return Response.json({ error: 'Chybí ID nebo stav' }, { status: 400 });
        }
        await env.DB.prepare("UPDATE orders SET status = ? WHERE order_id = ?")
            .bind(body.status, body.orderId)
            .run();
        return Response.json({ success: true });
    }

    return Response.json({ error: 'Neplatná akce' }, { status: 400 });
}
