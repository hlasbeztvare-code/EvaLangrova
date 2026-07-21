export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        
        // Save to D1
        await env.DB.prepare("INSERT INTO inquiries (name, email, phone, message) VALUES (?, ?, ?, ?)")
            .bind(body.name || '', body.email || '', body.phone || '', body.message || '').run();

        // Send email via Resend if configured
        if (env.RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Eshop <onboarding@resend.dev>',
                    to: 'info@evalangrova.cz',
                    subject: `Nový dotaz z webu od: ${body.name}`,
                    text: `Máte nový dotaz z webu:\n\nJméno: ${body.name}\nE-mail: ${body.email}\nTelefon: ${body.phone}\n\nZpráva:\n${body.message}`
                })
            });
        }

        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
