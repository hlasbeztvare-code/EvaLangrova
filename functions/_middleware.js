import { jwtVerify } from 'jose';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  // Seznam aliasových domén k přesměrování
  const redirectDomains = [
    'fotofiltr.cz',
    'kreativnifiltry.cz',
    'kreativnifiltr.cz',
    'kreativni-filtry.cz',
    'kreativni-filtr.cz',
    'www.fotofiltr.cz',
    'www.kreativnifiltry.cz',
    'www.kreativnifiltr.cz',
    'www.kreativni-filtry.cz',
    'www.kreativni-filtr.cz',
    'www.fotofiltry.cz' // Přesměrování i z www.fotofiltry.cz na čistou fotofiltry.cz pro lepší SEO
  ];

  // Pokud uživatel přijde přes alias doménu, přesměrujeme na hlavní (Status 301 - trvalé SEO přesměrování)
  if (redirectDomains.includes(hostname)) {
    return Response.redirect(`https://fotofiltry.cz${url.pathname}${url.search}`, 301);
  }

  // --- Zabezpečení Administrace (JWT) ---
  const isAdminPage = url.pathname === '/admin' || url.pathname === '/admin.html' || url.pathname.startsWith('/admin/');
  const isAdminApi = url.pathname.startsWith('/api/admin');
  
  if (isAdminPage || isAdminApi) {
    const cookieHeader = context.request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    const token = match ? match[1] : null;

    let isAuthenticated = false;
    
    // Pro starší Bearer token auth z API (pokud by bylo potřeba, ale chceme striktně cookie)
    const authHeader = context.request.headers.get('Authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const secret = new TextEncoder().encode(context.env.JWT_SECRET || 'super-secret-fallback-key');
        await jwtVerify(token, secret);
        isAuthenticated = true;
      } catch (err) {
        console.log("JWT Verify error:", err.message);
      }
    } else if (bearerToken && bearerToken === (context.env.ADMIN_PASSWORD || 'eva123')) {
        // Fallback pro starší API calls z JS klienta, pokud ještě nebyl přepsán, ale my ho přepíšeme
        isAuthenticated = true;
    }

    if (!isAuthenticated) {
      if (isAdminPage) {
        return Response.redirect(`${url.origin}/login.html`, 302);
      } else {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // Jinak propustíme požadavek normálně k zobrazení webu (pro fotofiltry.cz nebo .pages.dev)
  return context.next();
}
