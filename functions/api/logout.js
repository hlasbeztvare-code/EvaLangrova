export async function onRequest(context) {
    const cookieString = `admin_session=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0`;

    return new Response(null, {
        status: 302,
        headers: {
            'Location': `${new URL(context.request.url).origin}/login.html`,
            'Set-Cookie': cookieString
        }
    });
}
