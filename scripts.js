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

    /* ── 3. OBJEDNÁVKOVÝ / KONTAKTNÍ FORMULÁŘ ── */
    var form = document.getElementById('order-form');
    var feedback = document.getElementById('form-feedback');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var name = document.getElementById('form-name').value;
            var email = document.getElementById('form-email').value;
            var message = document.getElementById('form-message').value;
            var submitBtn = document.getElementById('form-submit');

            // Vizuální lock
            submitBtn.disabled = true;
            submitBtn.textContent = 'Odesílám...';
            feedback.className = 'form-feedback';
            feedback.textContent = '';

            // Simulované odeslání (v reálu by zde byl fetch na API / server / email)
            setTimeout(function() {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Odeslat poptávku';
                
                feedback.className = 'form-feedback success';
                feedback.innerHTML = 'Děkujeme, ' + name + '! Poptávka byla úspěšně odeslána. Brzy se vám ozveme zpět.';
                
                // Vyprázdnit formu a košík
                form.reset();
                cart = [];
                saveCart();
                updateCartUI();
            }, 1200);
        });
    }

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
