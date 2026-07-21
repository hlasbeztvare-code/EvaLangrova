export async function onRequest(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM products").all();
        
        // Parse JSON fields back to objects
        const formatted = results.map(row => {
            try {
                if (row.variants && typeof row.variants === 'string') row.variants = JSON.parse(row.variants);
                if (row.images && typeof row.images === 'string') row.images = JSON.parse(row.images);
            } catch(e) {}
            // Boolean map
            row.inStock = row.in_stock === 1;
            row.shortDescription = row.short_description;
            row.image = row.local_img;
            row.localImg = row.local_img;
            return row;
        });

        return new Response(JSON.stringify(formatted), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
