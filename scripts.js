/* ==========================================================================
   FOTOFILTRY.CZ — STANDALONE ENGINE v1.0
   Logic: Shopping Cart, Interactive Canvas Prism Animation, Form Submissions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    /* ── 1. DYNAMICKÝ ROK V PATIČCE ── */
    var yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    /* ── 2. STATE KOŠÍKU ── */
    var cart = [];
    var cartCounter = document.getElementById('cart-counter');
    var cartDrawer = document.getElementById('cart-drawer');
    var cartOverlay = document.getElementById('cart-overlay');
    var cartTrigger = document.getElementById('cart-trigger');
    var cartClose = document.getElementById('cart-close');
    var cartItemsContainer = document.getElementById('cart-items-container');
    var cartTotalPrice = document.getElementById('cart-total-price');
    var checkoutBtn = document.getElementById('cart-checkout');

    // Načtení z localStorage
    try {
        var savedCart = localStorage.getItem('fotofiltry_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCartUI();
        }
    } catch(e) {
        console.error('Nelze načíst košík:', e);
    }

    // Otevření / zavření košíku
    function toggleCart(open) {
        if (open) {
            cartDrawer.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden'; // block scroll
        } else {
            cartDrawer.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    cartTrigger.addEventListener('click', function() { toggleCart(true); });
    cartClose.addEventListener('click', function() { toggleCart(false); });
    cartOverlay.addEventListener('click', function() { toggleCart(false); });

    // Přidání do košíku (Event Delegation)
    document.body.addEventListener('click', function(e) {
        var btn = e.target.closest('.add-to-cart-btn');
        if (!btn) return;
        
        var id = btn.getAttribute('data-id');
        if (!id) return; // Prevent empty clicks
        
        var name = btn.getAttribute('data-name') || 'Fotofiltr';
        var rawPrice = btn.getAttribute('data-price') || '990';
        var price = parseInt(String(rawPrice).replace(/[^0-9]/g, ''), 10) || 990;
        var img = btn.getAttribute('data-img') || 'images/kaleidoscope.png';
        var variant = btn.getAttribute('data-variant') || '';


        if (variant) {
            name = name + ' (' + variant + ')';
            id = id + '_' + variant;
        }

        var qtyToAdd = 1;
        if (btn.id === 'detail-add-to-cart') {
            var qtyInput = document.getElementById('detail-quantity');
            if (qtyInput) {
                qtyToAdd = parseInt(qtyInput.value, 10) || 1;
            }
        }

        // Hledání duplicity
        var existingItem = cart.find(function(item) { return item.id === id; });
        if (existingItem) {
            existingItem.quantity += qtyToAdd;
        } else {
            cart.push({
                id: id,
                name: name,
                price: price,
                img: img,
                quantity: qtyToAdd,
                variant: variant
            });
        }

        // Uložení a UI update
        saveCart();
        updateCartUI();
        toggleCart(true); // Otevřít po přidání
    });

    function saveCart() {
        try {
            localStorage.setItem('fotofiltry_cart', JSON.stringify(cart));
        } catch(e) {
            console.error('Nelze uložit košík:', e);
        }
    }

    function updateCartUI() {
        // Počítadlo v hlavičce
        var totalItems = cart.reduce(function(acc, item) { return acc + item.quantity; }, 0);
        cartCounter.textContent = totalItems;
        if(cartTrigger) cartTrigger.setAttribute('aria-label', `Nákupní košík, ${totalItems} položek`);

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-empty-message">Košík je prázdný.</p>';
            cartTotalPrice.textContent = '0 Kč';
            return;
        }

        // Vykreslení položek
        cartItemsContainer.innerHTML = '';
        var totalSum = 0;

        cart.forEach(function(item) {
            var itemTotal = item.price * item.quantity;
            totalSum += itemTotal;

            var itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = 
                '<img src="' + item.img + '" alt="' + item.name + '" class="cart-item-img" onerror="this.src=\'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=80&q=80\'">' +
                '<div class="cart-item-details">' +
                    '<h4>' + item.name + '</h4>' +
                    '<p>' + item.quantity + '× ' + item.price + ' Kč</p>' +
                '</div>' +
                '<button class="cart-item-remove" data-id="' + item.id + '">×</button>';
            
            // Tlačítko smazat
            itemEl.querySelector('.cart-item-remove').addEventListener('click', function() {
                removeItem(item.id);
            });

            cartItemsContainer.appendChild(itemEl);
        });

        cartTotalPrice.textContent = totalSum.toLocaleString() + ' Kč';
    }

    function removeItem(id) {
        cart = cart.filter(function(item) { return item.id !== id; });
        saveCart();
        updateCartUI();
    }

    // Checkout button kliknutí
    checkoutBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('Košík je prázdný.');
            return;
        }
        window.location.href = 'checkout.html';
    });

    // ── ZVÝRAZNĚNÍ POSLEDNÍHO SLOVA V NADPISECH ──
    const headingSelectors = 'h1, h2, .section-title, .product-name, .about-title, .contact-title, .stream-title';
    document.querySelectorAll(headingSelectors).forEach(heading => {
        // Zpracováváme pouze pokud neobsahuje složité HTML a má alespoň dvě slova
        if (heading.children.length === 0 && heading.textContent.trim().includes(' ')) {
            const words = heading.textContent.trim().split(' ');
            const lastWord = words.pop();
            heading.innerHTML = words.join(' ') + ' <span style="color: var(--color-accent);">' + lastWord + '</span>';
        }
    });

    // ── SCROLL ANIMACE (POSTUPNÉ VYKRESLOVÁNÍ) ──
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Přidání tříd k elementům    // Kaskádové aplikace třídy
    document.querySelectorAll('.product-card').forEach((el, i) => {
        el.classList.add('reveal-fade-up');
        el.style.transitionDelay = `${(i % 3) * 0.15}s`; // Kaskádový efekt v gridu
        scrollObserver.observe(el);
    });
    
    document.querySelectorAll('.contact-form-block').forEach(el => {
        el.classList.add('reveal-fade-left');
        scrollObserver.observe(el);
    });

    // --- DYNAMICKÁ APLIKACE ANIMACÍ NA VŠECHNY PRVKY (na žádost uživatele) ---
    // Texty zleva/zprava, obrázky zdola
    const elementsLeft = document.querySelectorAll('h1, h2, h3, .section-title, .about-title, .hero-title');
    const elementsRight = document.querySelectorAll('p, .about-text, .hero-subtitle, .document-content');
    const elementsUp = document.querySelectorAll('img, .footer-col, .product-image-wrap, .form-group, .cta-button');
    
    function observeElements(elements, animationClass) {
        elements.forEach((el, i) => {
            if (!el.closest('.main-header') && !el.closest('.cart-drawer') && !el.closest('.checkout-page') && !el.closest('#checkout-items-container') && !el.classList.contains('summary-item-img') && !el.classList.contains('reveal-fade-up') && !el.classList.contains('reveal-fade-left') && !el.classList.contains('reveal-fade-right')) {
                el.classList.add(animationClass);
                el.style.transitionDelay = `${(i % 5) * 0.1}s`; 
                scrollObserver.observe(el);
            }
        });

    }

    observeElements(elementsLeft, 'reveal-fade-left');
    observeElements(elementsRight, 'reveal-fade-right');
    observeElements(elementsUp, 'reveal-fade-up');

    document.querySelectorAll('.story-image-container, .contact-info-block').forEach(el => {
        el.classList.add('reveal-fade-right');
        scrollObserver.observe(el);
    });
    
    document.querySelectorAll('.contact-form-block').forEach(el => {
        el.classList.add('reveal-fade-left');
        scrollObserver.observe(el);
    });

    // Zpracování produktů a blogů (pokud existují kontejnery)
    const journalGrid = document.getElementById('journal-grid');
    if (journalGrid) {
        fetch('/api/blog')
            .then(res => res.json())
            .then(blogs => {
                journalGrid.innerHTML = '';
                blogs.forEach((blog, index) => {
                    const article = document.createElement('article');
                    article.className = 'journal-card reveal-fade-up';
                    article.style.transitionDelay = `${(index % 2) * 0.2}s`;
                    article.innerHTML = `
                        <div class="journal-img-wrap">
                            <a href="/journal" style="display:block;">
                                <img src="${blog.image}" alt="${blog.title}" class="journal-img">
                            </a>
                        </div>
                        <div class="journal-content">
                            <span class="journal-meta">${blog.date}</span>
                            <h3 class="journal-card-title">${blog.title}</h3>
                            <p class="journal-excerpt">${blog.text}</p>
                            <a href="/journal" class="read-more-link">Číst dále →</a>
                        </div>
                    `;
                    journalGrid.appendChild(article);
                    scrollObserver.observe(article);
                });
            })
            .catch(err => console.error("Error loading blogs:", err));
    } else {
        // Fallback pro existující journal-cards na jiných stránkách
        document.querySelectorAll('.journal-card').forEach((el, i) => {
            el.classList.add('reveal-fade-up');
            el.style.transitionDelay = `${(i % 2) * 0.2}s`;
            scrollObserver.observe(el);
        });
    }

    // ── COOKIES BANNER LOGIKA ──
    function initCookies() {
        if (!localStorage.getItem('cookies_accepted')) {
            const banner = document.createElement('div');
            banner.className = 'cookies-banner';
            banner.innerHTML = `
                <div class="cookies-text">
                    Tento web používá soubory cookies k zajištění nejlepšího uživatelského zážitku, personalizaci obsahu a analýze návštěvnosti. 
                    Pokračováním v prohlížení souhlasíte s jejich používáním. 
                    <a href="podpis.html">Více informací</a>.
                </div>
                <div class="cookies-buttons">
                    <button class="cookies-btn cookies-decline" id="btn-cookies-decline">Odmítnout</button>
                    <button class="cookies-btn cookies-accept" id="btn-cookies-accept">Rozumím a přijímám</button>
                </div>
            `;
            document.body.appendChild(banner);

            // Zobrazit plynule
            setTimeout(() => {
                banner.classList.add('show');
            }, 500);

            document.getElementById('btn-cookies-accept').addEventListener('click', () => {
                localStorage.setItem('cookies_accepted', 'true');
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 500);
            });

            document.getElementById('btn-cookies-decline').addEventListener('click', () => {
                localStorage.setItem('cookies_accepted', 'false');
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 500);
            });
        }
    }
    initCookies();

    /* ── 3. KONTAKTNÍ FORMULÁŘ ── */
    var contactForm = document.getElementById('contact-form');
    var feedback = document.getElementById('form-feedback');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var name = document.getElementById('form-name').value;
            var email = document.getElementById('form-email').value;
            var message = document.getElementById('form-message').value;
            var submitBtn = document.getElementById('form-submit');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Odesílám...';
            feedback.className = 'form-feedback';
            feedback.textContent = '';

            // Jednoduché odeslání zprávy (např. přes formspree nebo vlastní webhook)
            // Prozatím simulujeme úspěch
            setTimeout(function() {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Odeslat poptávku';
                feedback.className = 'form-feedback success';
                feedback.style.color = 'var(--color-accent)';
                feedback.textContent = 'Děkujeme, ' + name + '! Vaše zpráva byla úspěšně odeslána.';
                contactForm.reset();
            }, 1000);
        });
    }

    /* ── 3.5 DYNAMICKÉ NAČÍTÁNÍ PRODUKTŮ A BLOGU Z DATABÁZE ── */
    function loadProductsData() {
        fetch('/api/products')
            .then(function(res) { return res.json(); })
            .then(function(products) {
                var urlParams = new URLSearchParams(window.location.search);
                var productId = urlParams.get('id');

                // Detail produktu (product.html nebo /product)
                var detailContent = document.getElementById('product-detail-content');
                if (detailContent) {
                    var notFound = document.getElementById('product-not-found');
                    
                    var product = products.find(function(p) { return p.id === productId; });
                    
                    if (product) {
                        detailContent.style.display = 'block';
                        document.title = product.name + ' — Fotofiltry.cz';
                        var titleWords = product.name.trim().split(' ');
                        if (titleWords.length > 1) {
                            var lastWord = titleWords.pop();
                            document.getElementById('detail-title').innerHTML = titleWords.join(' ') + ' <span style="color: var(--color-accent);">' + lastWord + '</span>';
                        } else {
                            document.getElementById('detail-title').textContent = product.name;
                        }
                        
                        document.getElementById('detail-price').textContent = product.price;
                        document.getElementById('detail-description').innerHTML = product.description;
                        
                        var mainImg = document.getElementById('detail-main-img');
                        mainImg.src = product.localImg;
                        
                        // Miniatury
                        var thumbsContainer = document.getElementById('detail-thumbnails');
                        if (product.images && product.images.length > 1) {
                            product.images.forEach(function(imgSrc) {
                                var thumb = document.createElement('img');
                                thumb.src = imgSrc;
                                thumb.style.width = '60px';
                                thumb.style.height = '60px';
                                thumb.style.objectFit = 'cover';
                                thumb.style.borderRadius = '4px';
                                thumb.style.cursor = 'pointer';
                                thumb.style.border = '2px solid transparent';
                                
                                thumb.addEventListener('click', function() {
                                    mainImg.src = imgSrc;
                                });
                                thumbsContainer.appendChild(thumb);
                            });
                        }
                        
                        // Varianty
                        var variantSelect = document.getElementById('detail-variant-select');
                        if (product.variants && product.variants.length > 0) {
                            variantSelect.innerHTML = ''; // Vyčistit staré hardcoded optiony
                            product.variants.forEach(function(v) {
                                var opt = document.createElement('option');
                                opt.value = v;
                                opt.textContent = v;
                                variantSelect.appendChild(opt);
                            });
                            variantSelect.parentElement.style.display = 'block';
                        } else {
                            variantSelect.parentElement.style.display = 'none';
                        }
                        
                        // Tlačítko přidání
                        var addBtn = document.getElementById('detail-add-to-cart');
                        var priceVal = parseInt(product.price.replace(/[^0-9]/g, ''), 10) || 990;
                        
                        addBtn.setAttribute('data-id', product.id);
                        addBtn.setAttribute('data-name', product.name);
                        addBtn.setAttribute('data-price', priceVal);
                        addBtn.setAttribute('data-img', product.localImg);
                        if (product.variants && product.variants.length > 0) {
                            addBtn.setAttribute('data-variant', product.variants[0]);
                        }
                        
                        variantSelect.addEventListener('change', function(e) {
                            addBtn.setAttribute('data-variant', e.target.value);
                        });
                        
                        if (product.inStock === false) {
                            addBtn.disabled = true;
                            addBtn.textContent = 'Vyprodáno';
                            addBtn.style.background = '#22222a';
                            addBtn.style.color = '#8e8e9f';
                            addBtn.style.cursor = 'not-allowed';
                        }

                        // Technické parametry (pole label/value, editovatelné v adminu)
                        var paramsContainer = document.querySelector('.product-params-container');
                        var paramsTable = document.querySelector('.params-table');
                        if (paramsTable) {
                            var params = product.params || [];
                            if (params.length > 0) {
                                paramsTable.innerHTML = params.map(function(row) {
                                    return '<tr><td class="param-label"></td><td class="param-value"></td></tr>';
                                }).join('');
                                var trs = paramsTable.querySelectorAll('tr');
                                params.forEach(function(row, i) {
                                    trs[i].querySelector('.param-label').textContent = row.label || '';
                                    trs[i].querySelector('.param-value').textContent = row.value || '';
                                });
                                if (paramsContainer) paramsContainer.style.display = '';
                            } else if (paramsContainer) {
                                paramsContainer.style.display = 'none';
                            }
                        }

                    } else {
                        notFound.style.display = 'block';
                    }
                } else {
                    // Hlavní stránka
                    products.forEach(function(p) {
                        var card = null;
                        if (p.id === 'kaleidoscope') card = document.getElementById('card-kaleidoscope');
                        else if (p.id === 'fog') card = document.getElementById('card-fog');
                        else if (p.id === 'halo') card = document.getElementById('card-halo');

                        if (card) {
                            // 1. Nastavení ceny
                            var priceEl = card.querySelector('.product-price');
                            if (priceEl) priceEl.textContent = p.price;

                            // 2. Vstříknutí ZKRÁCENÉHO popisu (na hlavní straně)
                            var descEl = card.querySelector('.product-desc');
                            if (descEl && p.shortDescription) {
                                descEl.innerHTML = p.shortDescription;
                            }

                            // 3. Hlavní fotka
                            var imgEl = card.querySelector('.product-img');
                            if (imgEl && p.localImg) imgEl.src = p.localImg;
                            
                            // 3.5 Název produktu
                            var nameEl = card.querySelector('.product-name');
                            if (nameEl && p.name) nameEl.textContent = p.name;

                            // 4. Update tlačítka detailu
                            var viewBtn = card.querySelector('.view-detail-btn');
                            if (p.inStock === false && viewBtn) {
                                viewBtn.textContent = 'Vyprodáno';
                                viewBtn.style.pointerEvents = 'none';
                                viewBtn.style.background = '#22222a';
                                viewBtn.style.color = '#8e8e9f';
                            }
                        }
                    });
                }
            })
            .catch(function(err) {
                console.error('Failed to load products.json:', err);
            });
    }

    // Packeta Widget v6 picker
    var zasilkovnaBtn = document.getElementById('zasilkovna-trigger');
    if (zasilkovnaBtn) {
        zasilkovnaBtn.addEventListener('click', function() {
            var apiKey = 'a90886c33e8b0a9c'; // Demo key or project apiKey
            Packeta.Widget.pick(apiKey, function(point) {
                if (point) {
                    document.getElementById('form-zasilkovna-id').value = point.id;
                    document.getElementById('form-zasilkovna').value = point.name + ', ' + point.street + ', ' + point.city;
                    document.getElementById('zasilkovna-info').textContent = 'Vybráno: ' + point.name + ' (' + point.street + ')';
                }
            }, {
                country: 'cz',
                language: 'cs'
            });
        });
    }

    // Run loaders
    loadProductsData();
    // Odstraněn duplicitní loadBlogPosts(), protože je už na řádku 211 pro journal-grid.

    function loadContentData() {
        fetch('/api/content')
            .then(function(res) { 
                if(!res.ok) throw new Error('No content data');
                return res.json(); 
            })
            .then(function(data) {
                var fields = [
                    'heroTitle', 'heroSubtitle', 'productsTitle', 'productsSubtitle',
                    'aboutLabel', 'aboutTitle', 'aboutText', 'journalTitle', 'journalSubtitle',
                    'contactTitle', 'contactDesc', 'contactAddress', 'contactEmail',
                    'heroBtn1', 'heroBtn2', 'contactPhone', 'footerTagline'
                ];
                
                fields.forEach(function(field) {
                    var el = document.getElementById('content-' + field);
                    if (el && data[field]) {
                        el.innerHTML = data[field];
                    }
                });

                var hrefFields = ['heroBtn1', 'heroBtn2', 'socialInsta', 'socialVimeo'];
                hrefFields.forEach(function(field) {
                    var el = document.getElementById('href-' + field);
                    if (el && data[field + 'Url']) {
                        el.href = data[field + 'Url'];
                    }
                });

                if (data['aboutImage']) {
                    var imgEl = document.getElementById('src-aboutImage');
                    if (imgEl) {
                        imgEl.src = data['aboutImage'];
                    }
                }

                // Reviews
                var defaultReviews = [
                    { author: 'Tereza K.', stars: 5, text: 'Halo filtr mi úplně změnil noční fotky, ten měkký odlesk kolem světel je přesně to, co jsem hledala.' },
                    { author: 'Martin S.', stars: 5, text: 'Fog filtr používám na skoro každém svatebním focení, dodá to filmovou atmosféru rovnou z foťáku.' },
                    { author: 'Jana P.', stars: 4, text: 'Kvalita skla je znát na první pohled, objednávku jsem měla doma za dva dny.' },
                    { author: 'Ondřej V.', stars: 5, text: 'Kaleidoskop je skvělá zábava na kreativní portréty, klienti jsou z výsledků nadšení.' },
                    { author: 'Lucie H.', stars: 5, text: 'Objednávala jsem přes eshop, komunikace i doručení naprosto bez problémů, filtry sedí přesně na závit.' },
                    { author: 'Petr N.', stars: 4, text: 'Prism filtr dodává záběrům originální nádech, používám ho hlavně na hudební videa.' }
                ];
                var reviewsToRender = (data['reviews'] && Array.isArray(data['reviews']) && data['reviews'].length > 0)
                    ? data['reviews']
                    : defaultReviews;
                {
                    var reviewsGrid = document.getElementById('reviews-grid');
                    if (reviewsGrid) {
                        reviewsGrid.innerHTML = '';
                        reviewsToRender.forEach(function(r) {
                            var starsHtml = '';
                            for (var i = 0; i < (parseInt(r.stars) || 5); i++) starsHtml += '★';
                            reviewsGrid.innerHTML += `
                                <div class="review-card glass-card">
                                    <div class="stars">${starsHtml}</div>
                                    <p class="review-text">"${r.text}"</p>
                                    <p class="review-author">— ${r.author}</p>
                                </div>
                            `;
                        });
                    }
                }

                // Cookie Banner Logic
                if (!localStorage.getItem('cookie_consent')) {
                    var cookieText = data['cookieText'] || 'Tento web používá k poskytování služeb a analýze návštěvnosti soubory cookie. Používáním tohoto webu s tím souhlasíte.';
                    var cookieButton = data['cookieButton'] || 'Rozumím';
                    var cookieLink = data['cookieLink'] || 'Zásady ochrany';
                    
                    var banner = document.createElement('div');
                    banner.id = 'cookie-banner';
                    banner.innerHTML = `
                        <div id="cookie-text">${cookieText}</div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button id="cookie-accept">${cookieButton}</button>
                            <a href="ochrana-soukromi.html" id="cookie-link" style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); text-decoration: none; padding: 10px;">${cookieLink}</a>
                        </div>
                    `;
                    document.body.appendChild(banner);
                    
                    // Trigger reflow for transition
                    void banner.offsetWidth;
                    banner.classList.add('show');

                    document.getElementById('cookie-accept').addEventListener('click', function() {
                        localStorage.setItem('cookie_consent', 'true');
                        banner.classList.remove('show');
                        banner.classList.add('hide');
                        setTimeout(() => banner.remove(), 600);
                    });
                }
            })
            .catch(function(err) {
                console.log('Using default static content.', err);
            });
    }
    
    loadContentData();

    /* ── 4. INTERAKTIVNÍ CANVAS PRISM ANIMACE ── */
    var canvas = document.getElementById('prism-canvas');
    if (canvas) {
        var ctx = canvas.getContext('2d');
        var mouse = { x: canvas.width / 2, y: canvas.height / 2, active: false };

        // Nastavení reálného rozlišení pro retina displeje
        function resizeCanvas() {
            var rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * (window.devicePixelRatio || 1);
            canvas.height = rect.height * (window.devicePixelRatio || 1);
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Trackování myši
        canvas.addEventListener('mousemove', function(e) {
            var rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
            mouse.y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
            mouse.active = true;
        });

        canvas.addEventListener('mouseleave', function() {
            mouse.active = false;
        });

        // Paprsky světla
        var particles = [];
        var numParticles = 40;

        for (var i = 0; i < numParticles; i++) {
            particles.push({
                x: 0,
                y: Math.random() * canvas.height,
                speed: 1.5 + Math.random() * 2,
                size: 1 + Math.random() * 1.5,
                angle: (Math.random() - 0.5) * 0.1
            });
        }

        // Kreslení scény
        function drawScene() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            var w = canvas.width;
            var h = canvas.height;
            var centerX = w / 2;
            var centerY = h / 2;
            var scale = w / 400; // měřítko podle velikosti canvasu

            // Výchozí bod pro světelný paprsek
            var lightSourceX = mouse.active ? mouse.x : centerX - 180 * scale;
            var lightSourceY = mouse.active ? mouse.y : centerY - 60 * scale;

            // 1. Nakreslit skleněný trojúhelník (Prism)
            var p1 = { x: centerX, y: centerY - 90 * scale };
            var p2 = { x: centerX - 90 * scale, y: centerY + 70 * scale };
            var p3 = { x: centerX + 90 * scale, y: centerY + 70 * scale };

            // Skleněné pozadí prismu
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            
            var prismGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            prismGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
            prismGrad.addColorStop(1, 'rgba(214, 140, 63, 0.05)');
            ctx.fillStyle = prismGrad;
            ctx.fill();

            // 2. Kreslení světelných paprsků a refrakce
            // Vstupní bílé světlo
            ctx.beginPath();
            ctx.moveTo(lightSourceX, lightSourceY);
            ctx.lineTo(centerX - 30 * scale, centerY - 10 * scale);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3 * scale;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
            ctx.stroke();
            ctx.shadowBlur = 0; // reset

            // Rozklad světla na spektrum za trojúhelníkem (refrakce)
            var colors = [
                'rgba(230, 80, 80, 0.65)',   // Červená
                'rgba(240, 160, 80, 0.65)',  // Oranžová
                'rgba(240, 240, 80, 0.65)',  // Žlutá
                'rgba(80, 200, 120, 0.65)',  // Zelená
                'rgba(80, 160, 240, 0.65)',  // Modrá
                'rgba(160, 80, 240, 0.65)'   // Fialová
            ];

            colors.forEach(function(color, index) {
                var offset = (index - 2.5) * 12 * scale;
                ctx.beginPath();
                ctx.moveTo(centerX - 30 * scale, centerY - 10 * scale);
                ctx.lineTo(centerX + 60 * scale, centerY + 20 * scale + offset * 0.3);
                ctx.lineTo(w, centerY + 40 * scale + offset * 2.5);
                ctx.strokeStyle = color;
                ctx.lineWidth = 4 * scale;
                ctx.stroke();
            });

            // Vykreslit obrysy prismy (skleněný lesk)
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();

            // Světelné body v rozích
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 3 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Animování a kreslení prachových částic ve světle
            particles.forEach(function(p) {
                p.x += p.speed;
                p.y += Math.sin(p.x * 0.02) * 0.5 + p.angle;

                if (p.x > w) {
                    p.x = 0;
                    p.y = Math.random() * h;
                }

                // Vykreslit částici
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                
                // Částice svítí víc v oblasti spektra
                if (p.x > centerX) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                }
                ctx.fill();
            });

            requestAnimationFrame(drawScene);
        }

        drawScene();
    }
});


// ── SCROLL TO TOP BTN ──
document.addEventListener('DOMContentLoaded', () => {
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });
        scrollTopBtn.addEventListener('click', () => {
            if (window.lenis) {
                window.lenis.scrollTo(0, { duration: 1.2 });
            } else {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }
});

/* --- 3D INTERACTIVE LENS LOGIC --- */
document.addEventListener('DOMContentLoaded', function() {
    const lens = document.querySelector('.glass-prism-container');
    const heroVisual = document.querySelector('.hero-visual');
    
    if(lens && heroVisual) {
        // 1. 3D Tilt Effect on Mouse Move
        heroVisual.addEventListener('mousemove', function(e) {
            // Stop the CSS float animation so JS can take over
            lens.style.animation = 'none';
            
            const rect = heroVisual.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            const y = e.clientY - rect.top;  // y position within the element.
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -15; // Max 15 deg tilt
            const rotateY = ((x - centerX) / centerX) * 15;
            
            lens.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        
        // Reset tilt on mouse leave
        heroVisual.addEventListener('mouseleave', function() {
            lens.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
            // Re-apply the float animation after a short delay
            setTimeout(() => {
                lens.style.animation = 'floatHero 6s ease-in-out infinite';
            }, 300);
        });
        
        // 2. Click to scroll to products (Fulfills the business function)
        lens.addEventListener('click', function() {
            const productsSection = document.getElementById('kolekce');
            if(productsSection) {
                if (window.lenis) {
                    window.lenis.scrollTo(productsSection, { offset: -50, duration: 1.2 });
                } else {
                    productsSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }
});

/* --- OPTICAL FOCUS ANIMATION OBSERVER --- */
document.addEventListener('DOMContentLoaded', function() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, .section-header h2');
    
    const focusObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add a tiny delay based on index for a cascade effect if multiple headings are visible
                setTimeout(() => {
                    entry.target.classList.add('lens-focus-visible');
                }, 100);
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });
    
    headings.forEach(heading => {
        // Prevent animating headings that are inside the cart or small utility areas to avoid weirdness
        if(!heading.closest('.cart-drawer') && !heading.closest('.product-params-container')) {
            focusObserver.observe(heading);
        } else {
            // Instantly show utility headings
            heading.style.opacity = '1';
            heading.style.filter = 'blur(0)';
            heading.style.transform = 'none';
            heading.style.transition = 'none';
        }
    });
});

/* --- MOBILE MENU TOGGLE --- */
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuTrigger = document.getElementById('mobile-menu-trigger');
    const mainNav = document.getElementById('main-navigation');
    
    const iconHamburger = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
    const iconClose = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    
    if (mobileMenuTrigger && mainNav) {
        mobileMenuTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            mainNav.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            if (mainNav.classList.contains('active')) {
                mobileMenuTrigger.innerHTML = iconClose;
            } else {
                mobileMenuTrigger.innerHTML = iconHamburger;
            }
        });
        
        // Close menu when clicking a link
        const navLinks = mainNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                document.body.classList.remove('menu-open');
                mobileMenuTrigger.innerHTML = '&#9776;';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (mainNav.classList.contains('active') && !mainNav.contains(e.target) && e.target !== mobileMenuTrigger) {
                mainNav.classList.remove('active');
                document.body.classList.remove('menu-open');
                mobileMenuTrigger.innerHTML = '&#9776;';
            }
        });
    }
});

/* --- LENIS SMOOTH SCROLL (DESKTOP ONLY) --- */
document.addEventListener('DOMContentLoaded', function() {
    if (window.matchMedia('(min-width: 768px)').matches) {
        const lenisScript = document.createElement('script');
        lenisScript.src = "https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.min.js";
        lenisScript.defer = true;
        lenisScript.onload = () => {
            window.lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
                direction: 'vertical',
                gestureDirection: 'vertical',
                smooth: true,
                smoothTouch: false,
            });

            function raf(time) {
                window.lenis.raf(time);
                requestAnimationFrame(raf);
            }

            requestAnimationFrame(raf);
        };
        document.head.appendChild(lenisScript);
    }
});
