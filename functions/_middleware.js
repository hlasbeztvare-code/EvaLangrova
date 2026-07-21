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

  // Jinak propustíme požadavek normálně k zobrazení webu (pro fotofiltry.cz nebo .pages.dev)
  return context.next();
}
