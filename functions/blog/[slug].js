export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;

    // Přesměrujeme čistě /blog (bez slugu) zpět na index
    if (!slug) {
        return Response.redirect(new URL('/', request.url).toString(), 301);
    }

    let blogPost = null;
    try {
        const { results } = await env.DB.prepare("SELECT * FROM blog WHERE slug = ?").bind(slug).all();
        if (results && results.length > 0) {
            blogPost = results[0];
        }
    } catch (e) {
        console.error("DB Error", e);
    }

    const url = new URL(request.url);
    url.pathname = '/article.html';
    let response = await env.ASSETS.fetch(url);

    if (!blogPost) {
        return new Response('Článek nebyl nalezen', { status: 404 });
    }

    const metaTitle = blogPost.meta_title || `${blogPost.title} — Fotofiltry.cz`;
    const metaDesc = blogPost.meta_desc || '';
    
    // Generování Schema.org Article pro Google Rich Snippets
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": blogPost.image,
        "datePublished": blogPost.date,
        "author": {
            "@type": "Person",
            "name": "Eva"
        }
    };

    class SEOHandler {
        element(el) {
            if (el.tagName === 'title') {
                el.setInnerContent(metaTitle);
            } else if (el.tagName === 'head') {
                el.append(`<meta name="description" content="${metaDesc.replace(/"/g, '&quot;')}">`, { html: true });
                el.append(`<meta name="keywords" content="${(blogPost.keywords || '').replace(/"/g, '&quot;')}">`, { html: true });
                el.append(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`, { html: true });
                
                // Přednačteme data pro JS na klientovi, aby stránka naběhla naprosto instantně bez dalšího API callu
                el.append(`<script>window.PRELOADED_ARTICLE = ${JSON.stringify(blogPost)};</script>`, { html: true });
            }
        }
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1h browser, 24h edge cache

    return new HTMLRewriter()
        .on('title', new SEOHandler())
        .on('head', new SEOHandler())
        .transform(new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
        }));
}
