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

    // Přidání do košíku
    document.querySelectorAll('.add-to-cart-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            var name = this.getAttribute('data-name');
            var price = parseInt(this.getAttribute('data-price'), 10);
            var img = this.getAttribute('data-img');

            // Hledání duplicity
            var existingItem = cart.find(function(item) { return item.id === id; });
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: id,
                    name: name,
                    price: price,
                    img: img,
                    quantity: 1
                });
            }

            // Uložení a UI update
            saveCart();
            updateCartUI();
            toggleCart(true); // Otevřít po přidání
        });
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
        var itemsText = cart.map(function(item) {
            return item.name + ' (' + item.quantity + 'x)';
        }).join(', ');
        
        // Sjednotit s objednávkovým formulářem
        var contactSection = document.getElementById('kontakt');
        if (contactSection) {
            toggleCart(false);
            contactSection.scrollIntoView({ behavior: 'smooth' });
            
            var msgInput = document.getElementById('form-message');
            if (msgInput) {
                msgInput.value = 'Mám zájem o rychlou objednávku těchto filtrů: ' + itemsText + '. Prosím o zaslání platebních údajů.';
                msgInput.focus();
            }
        }
    });

    // Load Stripe.js dynamically
    var stripeScript = document.createElement('script');
    stripeScript.src = 'https://js.stripe.com/v3/';
    document.head.appendChild(stripeScript);

    /* ── 3. OBJEDNÁVKOVÝ / KONTAKTNÍ FORMULÁŘ (STRIPE PLATBA) ── */
    var form = document.getElementById('order-form');
    var feedback = document.getElementById('form-feedback');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var name = document.getElementById('form-name').value;
            var email = document.getElementById('form-email').value;
            var message = document.getElementById('form-message').value;
            var submitBtn = document.getElementById('form-submit');

            if (cart.length === 0) {
                feedback.className = 'form-feedback';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = 'Košík je prázdný. Přidejte prosím zboží do košíku.';
                return;
            }

            // Lock submit button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Připravuji platbu...';
            feedback.className = 'form-feedback';
            feedback.textContent = '';

            var checkoutItems = cart.map(function(item) {
                return { id: item.id, quantity: item.quantity };
            });

            // Call serverless checkout API
            fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    message: message,
                    items: checkoutItems
                })
            })
            .then(function(res) {
                if (!res.ok) {
                    return res.json().then(function(err) { throw new Error(err.error || 'Checkout API error'); });
                }
                return res.json();
            })
            .then(function(data) {
                if (!window.Stripe) {
                    throw new Error('Knihovna Stripe se nenačetla. Zkuste to prosím znovu.');
                }

                var stripe = Stripe(data.publishableKey);
                var elements = stripe.elements();

                // Build a premium minimalist card payment modal overlay
                var modal = document.createElement('div');
                modal.id = 'stripe-payment-modal';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.background = 'rgba(0, 0, 0, 0.85)';
                modal.style.backdropFilter = 'blur(8px)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '9999';
                modal.style.fontFamily = "'Outfit', sans-serif";

                modal.innerHTML = 
                    '<div style="background:#121216; border:1px solid #22222a; border-radius:12px; padding:30px; width:100%; max-width:420px; box-shadow:0 20px 40px rgba(0,0,0,0.5); color:#f3f3f6; position:relative;">' +
                        '<button id="stripe-modal-close" style="position:absolute; top:20px; right:20px; background:none; border:none; color:#8e8e9f; font-size:1.5rem; cursor:pointer; line-height:1;">×</button>' +
                        '<h3 style="margin:0 0 10px 0; font-size:1.4rem; font-weight:700; color:#f3f3f6;">Dokončení platby</h3>' +
                        '<p style="margin:0 0 20px 0; font-size:0.9rem; color:#8e8e9f;">Celková částka: <strong style="color:#d68c3f;">' + data.totalAmountCzk + ' Kč</strong> (včetně poštovného 100 Kč)</p>' +
                        '<form id="stripe-card-form">' +
                            '<div style="margin-bottom:20px; text-align:left;">' +
                                '<label style="display:block; font-size:0.8rem; color:#8e8e9f; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Platební karta</label>' +
                                '<div id="stripe-card-element" style="background:#1a1a22; border:1px solid #22222a; border-radius:6px; padding:12px 16px;"></div>' +
                                '<div id="stripe-card-errors" role="alert" style="color:#e65050; font-size:0.85rem; margin-top:8px;"></div>' +
                            '</div>' +
                            '<button type="submit" id="stripe-submit-payment" style="width:100%; background:#d68c3f; color:#000; border:none; border-radius:6px; padding:14px; font-weight:600; font-size:0.95rem; cursor:pointer; transition:all 0.2s ease;">Zaplatit a dokončit</button>' +
                        '</form>' +
                    '</div>';

                document.body.appendChild(modal);

                var style = {
                    base: {
                        color: '#f3f3f6',
                        fontFamily: "'Outfit', sans-serif",
                        fontSmoothing: 'antialiased',
                        fontSize: '16px',
                        '::placeholder': {
                            color: '#8e8e9f'
                        }
                    },
                    invalid: {
                        color: '#e65050',
                        iconColor: '#e65050'
                    }
                };

                var cardElement = elements.create('card', { style: style, hidePostalCode: true });
                cardElement.mount('#stripe-card-element');

                // Close Modal
                document.getElementById('stripe-modal-close').addEventListener('click', function() {
                    document.body.removeChild(modal);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Odeslat poptávku';
                });

                // Form submit within modal
                var cardForm = document.getElementById('stripe-card-form');
                cardForm.addEventListener('submit', function(ev) {
                    ev.preventDefault();
                    var payBtn = document.getElementById('stripe-submit-payment');
                    payBtn.disabled = true;
                    payBtn.textContent = 'Zpracovávám platbu...';

                    stripe.confirmCardPayment(data.clientSecret, {
                        payment_method: {
                            card: cardElement,
                            billing_details: {
                                name: name,
                                email: email
                            }
                        }
                    })
                    .then(function(result) {
                        if (result.error) {
                            document.getElementById('stripe-card-errors').textContent = result.error.message;
                            payBtn.disabled = false;
                            payBtn.textContent = 'Zaplatit a dokončit';
                        } else {
                            if (result.paymentIntent.status === 'succeeded') {
                                document.body.removeChild(modal);
                                submitBtn.disabled = false;
                                submitBtn.textContent = 'Odeslat poptávku';
                                
                                feedback.className = 'form-feedback success';
                                feedback.innerHTML = 'Děkujeme, ' + name + '! Objednávka byla úspěšně zaplacena. Potvrzení a fakturu obdržíte e-mailem.';
                                
                                // Clear cart
                                form.reset();
                                cart = [];
                                saveCart();
                                updateCartUI();
                            }
                        }
                    });
                });
            })
            .catch(function(err) {
                console.error(err);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Odeslat poptávku';
                feedback.className = 'form-feedback';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = 'Nastala chyba při přípravě platby: ' + err.message;
            });
        });
    }

    /* ── 3.5 DYNAMICKÉ NAČÍTÁNÍ PRODUKTŮ A BLOGU Z DATABÁZE ── */
    function loadProductsData() {
        fetch('/products.json')
            .then(function(res) { return res.json(); })
            .then(function(products) {
                products.forEach(function(p) {
                    var card = null;
                    if (p.id === 'kaleidoscope') card = document.getElementById('card-prism');
                    else if (p.id === 'fog') card = document.getElementById('card-fog');
                    else if (p.id === 'halo') card = document.getElementById('card-halo');

                    if (card) {
                        // Update price
                        var priceEl = card.querySelector('.product-price');
                        if (priceEl) priceEl.textContent = p.price;

                        // Update description
                        var descEl = card.querySelector('.product-desc');
                        if (descEl) descEl.textContent = p.description;

                        // Update image
                        var imgEl = card.querySelector('.product-img');
                        if (imgEl && p.localImg) imgEl.src = p.localImg;

                        // Update button attributes
                        var btn = card.querySelector('.add-to-cart-btn');
                        if (btn) {
                            var priceVal = parseInt(p.price.replace(/[^0-9]/g, ''), 10) || 990;
                            btn.setAttribute('data-price', priceVal);
                            if (p.localImg) btn.setAttribute('data-img', p.localImg);
                            
                            // Check Stock
                            if (p.inStock === false) {
                                btn.disabled = true;
                                btn.textContent = 'Vyprodáno';
                                btn.style.background = '#22222a';
                                btn.style.color = '#8e8e9f';
                                btn.style.cursor = 'not-allowed';
                            } else {
                                btn.disabled = false;
                                btn.textContent = 'Do košíku';
                                btn.style.background = '';
                                btn.style.color = '';
                                btn.style.cursor = '';
                            }
                        }
                    }
                });
            })
            .catch(function(err) {
                console.error('Failed to load products.json:', err);
            });
    }

    function loadBlogPosts() {
        var grid = document.querySelector('.journal-grid');
        if (!grid) return;

        fetch('/api/blog')
            .then(function(res) { return res.json(); })
            .then(function(posts) {
                if (!posts || posts.length === 0) return;
                
                grid.innerHTML = '';
                posts.forEach(function(post) {
                    var card = document.createElement('article');
                    card.className = 'journal-card';
                    card.id = 'article-' + post.id;
                    card.innerHTML = 
                        '<div class="journal-img-wrap">' +
                            '<img src="' + post.image + '" alt="' + post.title + '" class="journal-img" onerror="this.src=\'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80\'">' +
                        '</div>' +
                        '<div class="journal-content">' +
                            '<span class="journal-meta">' + post.date + '</span>' +
                            '<h3 class="journal-card-title">' + post.title + '</h3>' +
                            '<p class="journal-excerpt">' + post.text + '</p>' +
                            '<a href="#" class="read-more-link">Číst dále →</a>' +
                        '</div>';
                    grid.appendChild(card);
                });
            })
            .catch(function(err) {
                console.error('Failed to load blog posts:', err);
            });
    }

    // Run loaders
    loadProductsData();
    loadBlogPosts();

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
