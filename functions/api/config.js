export async function onRequest(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM config").all();
        
        let configObj = {};
        for (const row of results) {
            try {
                configObj[row.id] = JSON.parse(row.data);
            } catch(e) {
                configObj[row.id] = row.data;
            }
        }

        return new Response(JSON.stringify(configObj), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
