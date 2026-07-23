import { SignJWT } from 'jose';
import { verifyAdminPassword } from './_auth.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();

        if (!(await verifyAdminPassword(body.password, env))) {
            return Response.json({ error: 'Nesprávné heslo' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(env.JWT_SECRET || 'super-secret-fallback-key');
        
        const jwt = await new SignJWT({ role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const cookieString = `admin_session=${jwt}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`;

        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookieString
            }
        });
    } catch (err) {
        return Response.json({ error: 'Chyba serveru' }, { status: 500 });
    }
}
