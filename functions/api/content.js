export async function onRequest(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT data FROM config WHERE id = 'siteContent'").all();
        let data = {};
        if (results && results.length > 0) {
            try { data = JSON.parse(results[0].data); } catch(e) {}
        }
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
