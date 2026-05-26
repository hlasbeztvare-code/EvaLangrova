/* ==========================================================================
   L-CODE DYNAMICS — MASTER ENGINE v8.0 (PRODUCTION)
   Fotofiltry.cz | Shoptet Headless Overlay System
   Revize: 2026-05-26

   ARCHITEKTURA:
   ┌─ grabLogo()          → robustní multi-selektor s 5 fallbacky
   ├─ grabBanner()        → carousel / hero / og:image fallback
   ├─ grabAboutText()     → welcome / description / generic content
   ├─ grabProducts()      → Shoptet 3.x + 4.x selektory
   ├─ grabBlogContent()   → news / posts / index-content / text fallback
   ├─ buildHeader()       → statická navigace
   ├─ buildBanner()       → hero sekce s overlay
   ├─ buildGrid()         → asymetrický split (o nás | produkty)
   ├─ buildStream()       → blog proud
   ├─ buildFooter()       → legislativní patička (dynamický rok)
   └─ injectPureLayer()   → orchestrátor, guard, hydratace
   ========================================================================== */

(function () {
    'use strict';

    /* ── KONFIGURACE ─────────────────────────────────────────────────────── */
    var CONFIG = {
        shopName: 'fotofiltry.cz',
        maxProducts: 3,
        /* Navigační položky — slug musí odpovídat Shoptet kategoriím */
        navItems: [
            { label: 'PRISM', href: '/prism/' },
            { label: 'FOG', href: '/fog/' },
            { label: 'HALO', href: '/halo/' },
            { label: 'STAR', href: '/star/' },
            { label: 'KONTAKTY', href: '/kontakty/' },
            { label: 'O NÁS', href: '/o-nas/' }
        ],
        /* Legislativní patička — dynamicky generovány */
        footerColumns: [
            {
                title: 'NÁKUPNÍ PORADCE',
                links: [
                    { label: 'JAK NAKUPOVAT', href: '/jak-nakupovat/' },
                    { label: 'MOŽNOSTI PLATBY', href: '/moznosti-platby/' },
                    { label: 'DOPRAVA', href: '/doprava/' }
                ]
            },
            {
                title: 'PRÁVNÍ INFORMACE',
                links: [
                    { label: 'OBCHODNÍ PODMÍNKY', href: '/obchodni-podminky/' },
                    { label: 'OCHRANA ÚDAJŮ (GDPR)', href: '/ochrana-osobnich-udaju/' },
                    { label: 'ODSTOUPENÍ', href: '/odstoupeni-od-smlouvy/' },
                    { label: 'REKLAMAČNÍ ŘÁD', href: '/reklamace/' }
                ]
            },
            {
                title: 'ZÁKAZNICKÝ SERVIS',
                links: [
                    { label: 'KONTAKT', href: '/kontakty/' },
                    { label: 'O NÁS', href: '/o-nas/' },
                    { label: 'FAQ', href: '/faq/' }
                ]
            }
        ],
        /* Statické produkty pro úvodní stranu — zamezí nutnosti stahovat produkty AJAXem */
        homepageProducts: [
            {
                name: 'PRISM FILTER',
                price: '990 Kč',
                imgSrc: 'https://cdn.myshoptet.com/usr/780725.myshoptet.com/user/documents/upload/prism.jpg',
                href: '/prism/'
            },
            {
                name: 'FOG FILTER',
                price: '990 Kč',
                imgSrc: 'https://cdn.myshoptet.com/usr/780725.myshoptet.com/user/documents/upload/fog.jpg',
                href: '/fog/'
            },
            {
                name: 'HALO FILTER',
                price: '990 Kč',
                imgSrc: 'https://cdn.myshoptet.com/usr/780725.myshoptet.com/user/documents/upload/halo.jpg',
                href: '/halo/'
            }
        ],
        /* Shoptet selektory — seřazeny od nejpřesnějšího po generický.
           Pole umožňuje přidávat nové selektory bez přepisování logiky. */
        selectors: {
            logo: [
                /* Shoptet Samba (template-14) specifické */
                '.site-name a img',
                '.site-name img',
                /* Standardní Shoptet selektory */
                '[data-shoptet="logo"] img',
                '.header-logo img',
                '.logo-wrapper img',
                '#logo img',
                '.logo img',
                'a[itemprop="url"] img[itemprop="logo"]',
                '[itemprop="logo"]',
                'header img[alt*="logo" i]',
                'header img[src*="logo" i]'
            ],
            banner: [
                '[data-shoptet="slider"] img',
                '.shoptet-slider img:first-child',
                '.carousel-inner .item.active img',
                '.carousel-inner img:first-child',
                '.banner-wrapper img',
                '.hero-image img',
                '[data-type="banner"] img'
            ],
            aboutText: [
                '#content .welcome-text',
                '#content .description-content',
                '[data-shoptet="description"]',
                '.index-description',
                '.homepage-text',
                '.custom-footer-text'
            ],
            products: [
                /* Shoptet Samba (template-14) — skutečná struktura ze živého DOMu */
                /* Na homepage jsou v #content, na kategorii v #products */
                '#products .product',
                '#content .products .product',
                '#content .product',
                '#content #products .product',
                /* Fallback generové */
                '[data-shoptet="products"] .product',
                '.products-page .product',
                '[data-testid="productCards"] .product',
                '[data-testid="productItem"]'
            ],
            productName: [
                /* Samba: <a class="name"><span data-micro="name"> */
                '[data-micro="name"]',
                'a.name span',
                'a.name',
                '[data-testid="productCardName"]',
                '[itemprop="name"]',
                '.product-name',
                '.name span',
                '.name',
                'h3',
                'h2'
            ],
            productPrice: [
                /* Samba: <div class="price price-final"> */
                '.price.price-final',
                '.price-final',
                '[data-testid="productCardPrice"]',
                '[itemprop="price"]',
                '.price-standard',
                '.product-price',
                '.price'
            ],
            productImg: [
                /* Samba používá lazy-load: reálná URL je v data-src, NE v src! */
                /* Grabber musí číst data-src nebo data-micro-image */
                'img[data-micro-image]',
                'img[data-src]',
                'img[itemprop="image"]',
                '.product-image img',
                'img:first-child'
            ],
            productLink: [
                /* Samba: href je na <a class="image"> nebo <a data-micro="url"> */
                'a[data-micro="url"]',
                'a.image[href]',
                'a[itemprop="url"]',
                'a.product-link',
                'a[href]:first-child',
                'a'
            ],
            blog: [
                '[data-shoptet="news"]',
                '.news-wrapper',
                '.posts-list',
                '.latest-posts',
                '#content .index-content',
                '.blog-posts',
                '.articles-list'
            ]
        },
        /* Fallback cesty — standardní Shoptet upload struktura */
        fallbacks: {
            logo: '/user/documents/upload/logo.png',
            banner: '/user/documents/upload/banner.jpg',
            aboutText: '<p>JSME KREATIVNÍ STUDIO SPECIALIZUJÍCÍ SE NA PRÉMIOVÉ OPTICKÉ FILTRY PRO MODERNÍ TVŮRCE.</p>',
            blogText: '<p>NEJNOVĚJŠÍ ČLÁNKY A EDITORIÁLY ZE STUDIA SE AUTOMATICKY ZOBRAZÍ ZDE, JAKMILE JE KLIENTKA NAPÍŠE V ADMINISTRACI SHOPTETU.</p>'
        }
    };

    /* ── POMOCNÉ FUNKCE ──────────────────────────────────────────────────── */

    /**
     * Bezpečný querySelector — vyzkouší pole selektorů, vrátí první shodu.
     * Nikdy nevyhodí exception ani při špatném selektoru.
     * @param {string[]} selectors
     * @param {Element} [context=document]
     * @returns {Element|null}
     */
    function queryFirst(selectors, context) {
        var ctx = context || document;
        for (var i = 0; i < selectors.length; i++) {
            try {
                var el = ctx.querySelector(selectors[i]);
                if (el) return el;
            } catch (e) { /* ignoruj nevalidní selektor */ }
        }
        return null;
    }

    /**
     * Bezpečný querySelectorAll — vrátí Array (ne NodeList).
     * @param {string[]} selectors
     * @param {Element} [context=document]
     * @returns {Element[]}
     */
    function queryAll(selectors, context) {
        var ctx = context || document;
        for (var i = 0; i < selectors.length; i++) {
            try {
                var els = ctx.querySelectorAll(selectors[i]);
                if (els && els.length > 0) return Array.prototype.slice.call(els);
            } catch (e) { /* ignoruj */ }
        }
        return [];
    }

    /**
     * Zkrátí text na maxChars znaků, zachová celá slova.
     * @param {string} text
     * @param {number} maxChars
     * @returns {string}
     */
    function truncate(text, maxChars) {
        if (!text || text.length <= maxChars) return text;
        return text.substring(0, maxChars).replace(/\s\S+$/, '') + '…';
    }

    /**
     * Bezpečně extrahuje textContent z elementu.
     * @param {Element|null} el
     * @returns {string}
     */
    function safeText(el) {
        return el ? (el.innerText || el.textContent || '').trim() : '';
    }

    /**
     * Escapuje HTML — zabraňuje XSS při vkládání dat z DOMu.
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str || ''));
        return d.innerHTML;
    }

    /* ── GRABBER FUNKCE ──────────────────────────────────────────────────── */

    /**
     * Extrahuje URL loga z Shoptet DOM.
     * Pořadí: multi-selektor img → og:image/twitter:image s "logo" v URL → fallback.
     * @returns {string} absolutní nebo relativní URL
     */
    function grabLogo() {
        var imgEl = queryFirst(CONFIG.selectors.logo);
        if (imgEl) {
            var src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src');
            if (src) return src;
        }
        /* Fallback: Open Graph / Twitter meta */
        var metaSelectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]'
        ];
        for (var i = 0; i < metaSelectors.length; i++) {
            var meta = document.querySelector(metaSelectors[i]);
            if (meta) {
                var content = meta.getAttribute('content') || '';
                if (content.toLowerCase().indexOf('logo') !== -1) return content;
            }
        }
        return CONFIG.fallbacks.logo;
    }

    /**
     * Extrahuje URL hlavního banneru.
     * Zkouší slider/carousel/hero selektory, pak og:image bez "logo" podmínky.
     * @returns {string}
     */
    function grabBanner() {
        var imgEl = queryFirst(CONFIG.selectors.banner);
        if (imgEl) {
            var src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src');
            if (src && src.indexOf('data:image') === -1) return src;
        }
        /* Fallback: první og:image (může být bannér) */
        var ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) {
            var content = ogImg.getAttribute('content') || '';
            if (content) return content;
        }
        return CONFIG.fallbacks.banner;
    }

    /**
     * Extrahuje "O nás" text z úvodní stránky.
     * @returns {string} innerHTML
     */
    function grabAboutText() {
        var el = queryFirst(CONFIG.selectors.aboutText);
        if (el && el.innerHTML.trim()) return el.innerHTML;
        return CONFIG.fallbacks.aboutText;
    }

    /**
     * Extrahuje produkty z Shoptet DOMu.
     * Vrátí pole objektů {name, price, imgSrc, href}.
     * Omezeno na CONFIG.maxProducts.
     * @returns {Array<{name:string, price:string, imgSrc:string, href:string}>}
     */
    function grabProducts() {
        var productEls = queryAll(CONFIG.selectors.products);
        var results = [];

        for (var i = 0; i < productEls.length && results.length < CONFIG.maxProducts; i++) {
            var p = productEls[i];

            var nameEl = queryFirst(CONFIG.selectors.productName, p);
            var priceEl = queryFirst(CONFIG.selectors.productPrice, p);
            var imgEl = queryFirst(CONFIG.selectors.productImg, p);
            var linkEl = queryFirst(CONFIG.selectors.productLink, p);

            var name = truncate(safeText(nameEl) || 'FOTOFILTR', 40);
            var price = safeText(priceEl) || '';
            var imgSrc = '';
            if (imgEl) {
                /* Samba lazy-load: reálná URL je v data-micro-image nebo data-src.
                   src obsahuje SVG placeholder (začíná "data:image/svg") — ignorujeme. */
                var rawSrc = imgEl.getAttribute('data-micro-image')
                    || imgEl.getAttribute('data-src')
                    || imgEl.getAttribute('data-lazy-src')
                    || imgEl.getAttribute('src')
                    || '';
                /* Filtruj SVG placeholdery */
                imgSrc = (rawSrc.indexOf('data:image/svg') === -1) ? rawSrc : '';
            }
            var href = linkEl ? (linkEl.getAttribute('href') || '#') : '#';

            results.push({
                name: escapeHtml(name),
                price: escapeHtml(price),
                imgSrc: imgSrc,
                href: href
            });
        }

        return results;
    }

    /**
     * Extrahuje obsah blogu / novinek.
     * @returns {string} innerHTML nebo fallback text
     */
    function grabBlogContent() {
        var el = queryFirst(CONFIG.selectors.blog);
        if (el && el.innerHTML.trim().length > 20) return el.innerHTML;

        /* Fallback — vezme první odstavce v #content (vyjma karet produktů) */
        try {
            var fallbackEl = document.querySelector('#content p:not(.name):not(.price):not(.product-name)');
            if (fallbackEl && fallbackEl.parentNode && fallbackEl.parentNode.innerHTML.trim().length > 20) {
                return fallbackEl.parentNode.innerHTML;
            }
        } catch (e) { }

        return CONFIG.fallbacks.blogText;
    }

    /* ── BUILDER FUNKCE ──────────────────────────────────────────────────── */

    /**
     * Sestaví HTML navigační hlavičky.
     * @param {string} logoSrc
     * @returns {string} HTML string
     */
    function buildHeader(logoSrc) {
        var navLinks = CONFIG.navItems.map(function (item) {
            return '<a href="' + item.href + '">' + item.label + '</a>';
        }).join('');

        return '<header class="header-premium" role="banner">'
            + '<a href="/" aria-label="Domů — ' + escapeHtml(CONFIG.shopName) + '">'
            + '<img src="' + logoSrc + '" class="h-premium-logo-img" alt="' + escapeHtml(CONFIG.shopName) + '" loading="eager">'
            + '</a>'
            + '<nav class="nav-main-gallery" aria-label="Hlavní navigace">'
            + '<div class="header-links-gallery">' + navLinks + '</div>'
            + '</nav>'
            + '</header>';
    }

    /**
     * Sestaví HTML hero banneru.
     * @param {string} bannerSrc
     * @returns {string} HTML string
     */
    function buildBanner(bannerSrc) {
        return '<section class="custom-banner-container" aria-label="Hero sekce">'
            + '<img src="' + bannerSrc + '" class="custom-banner-img" alt="Prémiové fotografické filtry" loading="eager">'
            + '<div class="banner-premium-overlay">'
            + '<h3>PREMIUM FILTERS</h3>'
            + '<p>Filmový look a nekompromisní optická kvalita pro moderní tvůrce.</p>'
            + '<a href="/prism/" class="premium-cta-btn">PROHLÉDNOUT KOLEKCE</a>'
            + '</div>'
            + '</section>';
    }

    /**
     * Sestaví HTML asymetrického gridu (placeholder pro produkty se doplní later).
     * @param {string} aboutHtml
     * @returns {string} HTML string
     */
    function buildGrid(aboutHtml) {
        return '<div class="custom-main-split-grid">'
            + '<aside class="grid-about-side">'
            + '<h2>O NÁS</h2>'
            + '<div class="grid-about-side-content">' + aboutHtml + '</div>'
            + '</aside>'
            + '<div class="grid-products-side" id="p-cards-dest" aria-label="Produkty"></div>'
            + '</div>';
    }

    /**
     * Sestaví HTML produktové karty.
     * FIX: Třídy přejmenovány z .name/.price na .card-name/.card-price
     *      aby nedošlo ke kolizi se Shoptet selektory na stránce.
     * @param {{name:string, price:string, imgSrc:string, href:string}} product
     * @returns {string} HTML string
     */
    function buildProductCard(product) {
        var imgHtml = product.imgSrc
            ? '<div class="img-wrap"><img src="' + product.imgSrc + '" alt="' + product.name + '" loading="lazy"></div>'
            : '<div class="img-wrap" aria-hidden="true"></div>';

        var priceHtml = product.price
            ? '<div class="card-price">' + product.price + '</div>'
            : '';

        return '<a href="' + product.href + '" class="premium-product-card">'
            + imgHtml
            + '<div class="card-name">' + product.name + '</div>'
            + priceHtml
            + '</a>';
    }

    /**
     * Sestaví HTML blog streamu.
     * @param {string} blogHtml
     * @returns {string} HTML string
     */
    function buildStream(blogHtml) {
        return '<section class="custom-flowing-stream-block" aria-label="Studio Journal">'
            + '<h2 class="stream-title">STUDIO JOURNAL</h2>'
            + '<div class="stream-content-area">' + blogHtml + '</div>'
            + '</section>';
    }

    /**
     * Sestaví HTML legislativní patičky.
     * Rok je dynamicky generován z Date objektu.
     * @returns {string} HTML string
     */
    function buildFooter() {
        var year = new Date().getFullYear();

        var columnsHtml = CONFIG.footerColumns.map(function (col) {
            var linksHtml = col.links.map(function (link) {
                return '<li><a href="' + link.href + '">' + escapeHtml(link.label) + '</a></li>';
            }).join('');
            return '<div class="f-legal-column">'
                + '<h4>' + escapeHtml(col.title) + '</h4>'
                + '<ul>' + linksHtml + '</ul>'
                + '</div>';
        }).join('');

        return '<div class="footer-premium" role="contentinfo">'
            + '<div class="f-logo" aria-label="' + escapeHtml(CONFIG.shopName) + '">' + escapeHtml(CONFIG.shopName) + '</div>'
            + '<div class="f-grid-legal">' + columnsHtml + '</div>'
            + '<div class="f-cp">© ' + year + ' ' + escapeHtml(CONFIG.shopName.toUpperCase()) + '. VŠECHNA PRÁVA VYHRAZENA. PROVOZOVATEL DODRŽUJE LEGISLATIVU ČR A EU (GDPR).</div>'
            + '</div>';
    }

    /* ── HLAVNÍ ORCHESTRÁTOR ─────────────────────────────────────────────── */

    /**
     * injectPureLayer — guard + sestavení + injekce celé vrstvy.
     * Voláno okamžitě po DOMContentLoaded a pak opět s prodlevou
     * pro případ lazy-load produktů ze Shoptetu.
     */
    function injectPureLayer() {
        /* Guard — zabrání dvojité injekci */
        if (document.getElementById('premium-monolit')) return;

        /* ─ Grab dat z Shoptet DOMu ─ */
        var logoSrc = grabLogo();
        var bannerSrc = grabBanner();
        var aboutHtml = grabAboutText();
        var blogHtml = grabBlogContent();
        var isHomepage = window.location.pathname === '/';

        /* ─ Sestavení master wrapperu ─ */
        var master = document.createElement('div');
        master.id = 'premium-monolit';
        master.className = 'main-premium-wrapper';

        /* ─ Header (všechny stránky) ─ */
        master.insertAdjacentHTML('beforeend', buildHeader(logoSrc));

        /* ─ Homepage-only sekce ─ */
        if (isHomepage) {
            master.insertAdjacentHTML('beforeend', buildBanner(bannerSrc));
            master.insertAdjacentHTML('beforeend', buildGrid(aboutHtml));
            master.insertAdjacentHTML('beforeend', buildStream(blogHtml));
        }

        /* ─ Homepage: footer uvnitř masteru (vše je v jednom wrapperu) ─ */
        if (isHomepage) {
            master.insertAdjacentHTML('beforeend', buildFooter());
        }

        /* ─ Injekce masteru (header + případný obsah) na začátek body ─ */
        document.body.insertBefore(master, document.body.firstChild);

        /* ─ Podstránky: footer na KONEC body, za Shoptet #content ─
           Důvod: master je na začátku body, Shoptet obsah je za ním.
           Footer musí být až za Shoptet obsahem, ne hned za headerem. */
        if (!isHomepage) {
            document.body.insertAdjacentHTML('beforeend', buildFooter());
        }

        /* ─ Reveal body (odstraní flash prevenci z CSS) ─ */
        document.body.classList.add('monolit-ready');
    }

    /**
     * renderHomepageProducts — Vykreslí statické produkty z konfigurace na úvodní straně.
     */
    function renderHomepageProducts() {
        if (window.location.pathname !== '/') return;

        var dest = document.getElementById('p-cards-dest');
        if (!dest) return;

        dest.innerHTML = '';
        var fragment = document.createDocumentFragment();
        
        CONFIG.homepageProducts.forEach(function (product) {
            var temp = document.createElement('div');
            temp.innerHTML = buildProductCard(product);
            while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
            }
        });
        
        dest.appendChild(fragment);
    }

    /* ── INICIALIZACE ─────────────────────────────────────────────────────── */
    function init() {
        /* Krok 1: Okamžitá injekce celé struktury (header, grid, stream, footer) */
        injectPureLayer();

        /* Krok 2: Vykreslení statických produktů na homepage */
        renderHomepageProducts();
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

}());