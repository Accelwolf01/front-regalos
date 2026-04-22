import './style.css';

// --- UTILIDADES ---
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- ESTADO GLOBAL ---
let cart = JSON.parse(localStorage.getItem('gift_cart')) || [];
const API_BASE = 'https://back-regalos-jhah.onrender.com/api';

// --- ELEMENTOS DEL DOM ---
const productsGrid = document.getElementById('products-container');
const cartCount = document.getElementById('cart-count');
const cartToggle = document.getElementById('cart-toggle');
const cartModal = document.getElementById('cart-modal');

// Elementos Login
const loginModal = document.getElementById('login-modal');
const loginToggle = document.getElementById('login-toggle');
const closeLogin = document.getElementById('close-login');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginNavItem = document.getElementById('login-nav-item');
const userNavItem = document.getElementById('user-nav-item');
const userNameDisplay = document.getElementById('user-name-display');
const adminLink = document.getElementById('admin-link');
const logoutBtn = document.getElementById('logout-btn');

loginModal.style.display = 'none'; // Asegurar oculto al inicio

// --- LÓGICA DE PRODUCTOS ---
async function loadProducts() {
    let wakeUpTimer = setTimeout(() => {
        productsGrid.innerHTML = `
            <div class="waking-up-container" style="grid-column: 1/-1;">
                <span class="loader"></span>
                <h2>Preparando la tienda...</h2>
                <p>El servidor de Render se está despertando. Esto puede tardar hasta 40 segundos en la primera visita.</p>
                <div style="margin-top: 15px; font-size: 0.8rem; opacity: 0.7;">Por favor, no cierres la página.</div>
            </div>
        `;
    }, 2000);

    try {
        const resp = await fetch(`${API_BASE}/products`);
        clearTimeout(wakeUpTimer);
        
        if (!resp.ok) throw new Error('Error al conectar con el servidor');
        const products = await resp.json();
        
        if (products.length === 0) {
            productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No hay productos disponibles por ahora.</p>`;
            return;
        }

        renderProducts(products);
    } catch (err) {
        clearTimeout(wakeUpTimer);
        console.error(err);
        productsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; background: #fff; border-radius: 20px; box-shadow: var(--shadow);">
                <p>⚠️ No pudimos conectar con el servidor de la tienda.</p>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 10px;">Asegúrate de que el backend esté corriendo en ${API_BASE}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 0.8rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 10px; cursor: pointer;">Reintentar conectar</button>
            </div>
        `;
    }
}

function renderProducts(products) {
    productsGrid.innerHTML = products.map(product => {
        // Manejo de imagen (Base64 o URL)
        const imgSrc = product.images && product.images.length > 0 
            ? (product.images[0].imageBase64.startsWith('data:') ? product.images[0].imageBase64 : `data:image/png;base64,${product.images[0].imageBase64}`)
            : 'https://images.unsplash.com/photo-1549462184-b09ad0a4af67?auto=format&fit=crop&q=80&w=400';

        return `
            <div class="product-card">
                <img src="${imgSrc}" alt="${product.name}" class="product-img">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p style="color: #a4133c; font-size: 0.9rem; margin-bottom: 15px; height: 3rem; overflow: hidden;">${product.description}</p>
                    <div class="product-price">$${product.price.toLocaleString('es-CO')}</div>
                    <button class="add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                        Añadir al Carrito
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Event listeners para botones "Añadir"
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const price = parseFloat(e.target.getAttribute('data-price'));
            addToCart(id, name, price);
        });
    });
}

// --- LÓGICA DE CARRITO ---
function addToCart(id, name, price) {
    const existing = cart.find(item => item.id == id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    updateCart();
    
    // Animación de feedback
    cartCount.style.transform = 'scale(1.5)';
    setTimeout(() => cartCount.style.transform = 'scale(1)', 200);
}

function updateCart() {
    localStorage.setItem('gift_cart', JSON.stringify(cart));
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = totalItems;
    renderCartModal();
}

// --- MODAL DE CARRITO Y PAGO (BOLD) ---
function renderCartModal() {
    // Re-renderizamos siempre la estructura para asegurar que los botones nuevos existan
    cartModal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>Tu Carrito</h2>
            <div style="display:flex; gap: 1rem; align-items: center;">
                <button id="clear-cart-btn" style="background:none; border:none; color:#a4133c; cursor:pointer; font-size:0.8rem; text-decoration:underline; display: ${cart.length > 0 ? 'inline-block' : 'none'}">Vaciar</button>
                <button id="close-cart" style="border: none; background: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
        </div>
        <div id="cart-items-container"></div>
        <div id="checkout-form-container" style="display:none; margin-top: 1rem; border-top: 2px solid #eee; padding-top: 1rem;">
            <h3 style="margin-bottom: 1rem; color: var(--primary);">Datos de Entrega</h3>
            <form id="checkout-form" style="display: flex; flex-direction: column; gap: 0.8rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <input type="text" id="chk-first-name" placeholder="Nombre" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                    <input type="text" id="chk-last-name" placeholder="Apellido" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: 0.5rem;">
                    <select id="chk-doc-type" style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                        <option value="CC">CC</option><option value="CE">CE</option><option value="NIT">NIT</option>
                    </select>
                    <input type="text" id="chk-doc-number" placeholder="Número Documento" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <input type="email" id="chk-email" placeholder="Correo Electrónico" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                <input type="tel" id="chk-phone" placeholder="Teléfono" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                <select id="chk-city" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;"></select>
                <input type="text" id="chk-address" placeholder="Dirección" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <input type="date" id="chk-date" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                    <select id="chk-time" style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                        <option value="Mañana (8am - 12pm)">Mañana</option><option value="Tarde (2pm - 6pm)">Tarde</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <input type="text" id="chk-neighborhood" placeholder="Barrio" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                    <input type="text" id="chk-receiver" placeholder="¿Quién recibe?" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <input type="text" id="chk-sender" placeholder="¿Quién envía? (Tu nombre)" required style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px;">
                <textarea id="chk-message" placeholder="Mensaje para la tarjeta (Opcional)" style="padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px; height: 50px;"></textarea>
                <div id="bold-button-container" style="display:none; margin-top: 1rem;"></div>
                <button type="submit" id="checkout-btn" class="btn-primary" style="width:100%; margin-top: 0.5rem;">Pagar ahora</button>
                <button type="button" id="cancel-checkout-btn" style="background:none; border:none; color:#666; cursor:pointer; font-size:0.9rem; margin-top:5px;">Volver al carrito</button>
            </form>
        </div>
        <div id="cart-total-container" style="margin-top: 1rem; border-top: 2px solid #eee; padding-top: 1rem; display: ${cart.length > 0 ? 'block' : 'none'}">
            <div style="display:flex; justify-content:space-between; font-size: 1.2rem; font-weight:800; margin-bottom:1rem;">
                <span>Total:</span>
                <span id="cart-total-value">$0</span>
            </div>
            <button id="show-checkout-form" class="btn-primary" style="width: 100%;">Finalizar Compra</button>
        </div>
    `;

    const itemsContainer = document.getElementById('cart-items-container');
    const totalValue = document.getElementById('cart-total-value');
    const totalContainer = document.getElementById('cart-total-container');
    const checkoutContainer = document.getElementById('checkout-form-container');
    const clearBtn = document.getElementById('clear-cart-btn');

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<div style="text-align:center; padding:3rem 0;"><p style="font-size:2rem;">🛒</p><p>Tu carrito está vacío</p></div>';
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if(totalValue) totalValue.innerText = `$${total.toLocaleString('es-CO')}`;

    itemsContainer.innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem; border-bottom:1px solid #eee; padding-bottom:0.8rem;">
            <div style="flex:1">
                <div style="font-weight:600; font-size:0.95rem;">${item.name}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:10px; margin-top:5px;">
                    <div style="background:#f0f0f0; border-radius:5px; padding:2px 8px; display:flex; align-items:center; gap:10px;">
                        <button onclick="window.changeQty('${item.id}', -1)" style="border:none; cursor:pointer; background:none; font-weight:bold; padding:0 5px;">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="window.changeQty('${item.id}', 1)" style="border:none; cursor:pointer; background:none; font-weight:bold; padding:0 5px;">+</button>
                    </div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:700; color:var(--primary);">$${(item.price * item.quantity).toLocaleString('es-CO')}</div>
                <button onclick="window.removeFromCart('${item.id}')" style="background:none; border:none; color:#999; cursor:pointer; font-size:0.75rem; margin-top:5px;">Quitar</button>
            </div>
        </div>
    `).join('');

    clearBtn.onclick = () => { if(confirm('¿Vaciar todo el carrito?')) { cart = []; updateCart(); } };
    document.getElementById('close-cart').onclick = () => cartModal.style.display = 'none';
    
    const showCheckoutBtn = document.getElementById('show-checkout-form');
    if(showCheckoutBtn) {
        showCheckoutBtn.onclick = () => {
            checkoutContainer.style.display = 'block';
            totalContainer.style.display = 'none';
            itemsContainer.style.display = 'none';
            clearBtn.style.display = 'none';
            loadCartCities();
        };
    }

    const cancelCheckoutBtn = document.getElementById('cancel-checkout-btn');
    if(cancelCheckoutBtn) cancelCheckoutBtn.onclick = cancelCheckout;

    const checkoutForm = document.getElementById('checkout-form');
    if(checkoutForm) {
        checkoutForm.onsubmit = (e) => {
            e.preventDefault();
            initBoldCheckout();
        };
    }
}

// Exponer funciones al objeto window para que funcionen con inline onclick
window.removeFromCart = function(id) {
    cart = cart.filter(i => i.id != id);
    updateCart();
};

window.changeQty = function(id, delta) {
    const item = cart.find(i => i.id == id);
    if(item) {
        item.quantity += delta;
        if(item.quantity <= 0) {
            cart = cart.filter(i => i.id != id);
        }
        updateCart();
    }
};

function cancelCheckout() {
    document.getElementById('checkout-form-container').style.display = 'none';
    document.getElementById('cart-total-container').style.display = 'block';
    document.getElementById('cart-items-container').style.display = 'block';
    const clearBtn = document.getElementById('clear-cart-btn');
    if(clearBtn && cart.length > 0) clearBtn.style.display = 'inline-block';
}

async function loadCartCities() {
    const citySelect = document.getElementById('chk-city');
    if(citySelect && !citySelect.options.length) {
        try {
            const resp = await fetch(`${API_BASE}/cities`);
            const cities = await resp.json();
            citySelect.innerHTML = '<option value="">Selecciona tu ciudad...</option>' + 
                cities.map(c => `<option value="${c.id}">${c.name} (+$${c.deliveryCost.toLocaleString()})</option>`).join('');
        } catch (e) { console.error('Error cargando ciudades', e); }
    }
}

async function initBoldCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if(!checkoutBtn) return;
    
    checkoutBtn.innerText = 'Preparando pago...';
    checkoutBtn.disabled = true;

    try {
        const orderRequest = {
            firstName: document.getElementById('chk-first-name')?.value || "",
            lastName: document.getElementById('chk-last-name')?.value || "",
            email: document.getElementById('chk-email')?.value || "",
            documentNumber: document.getElementById('chk-doc-number')?.value || "",
            documentType: document.getElementById('chk-doc-type')?.value || "CC",
            phone: document.getElementById('chk-phone')?.value || "",
            deliveryCityId: parseInt(document.getElementById('chk-city')?.value || "0"),
            deliveryAddress: document.getElementById('chk-address')?.value || "",
            deliveryNeighborhood: document.getElementById('chk-neighborhood')?.value || "",
            deliveryInstructions: "", 
            deliveryDate: document.getElementById('chk-date')?.value || "",
            deliveryTimeRange: document.getElementById('chk-time')?.value || "",
            giftSenderName: document.getElementById('chk-sender')?.value || "",
            giftReceiverName: document.getElementById('chk-receiver')?.value || "",
            giftMessage: document.getElementById('chk-message')?.value || "",
            items: cart.map(i => ({ productId: i.id, quantity: i.quantity }))
        };

        localStorage.setItem('pending_order', JSON.stringify(orderRequest));

        const resp = await fetch(`${API_BASE}/orders/init-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRequest)
        });

        if (!resp.ok) {
            const rData = await resp.json();
            throw new Error(rData.error || 'Error al inicializar el pago');
        }
        
        const boldData = await resp.json();
        
        // Guardar el orderId generado en el objeto pendiente para recuperarlo después
        orderRequest.orderId = boldData.orderId;
        localStorage.setItem('pending_order', JSON.stringify(orderRequest));

        if (!boldData.apiKey) {
            throw new Error('La pasarela de pagos no está configurada. Por favor, configura las llaves de Bold en el Panel de Administración.');
        }

        const container = document.getElementById('bold-button-container');
        container.innerHTML = `
            <div style="background: #fff9e6; border: 1px dashed #ffcc00; padding: 10px; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; color: #856404;">
                <p>🚀 <strong>Tip:</strong> Si no ves el botón de Bold, asegúrate de haber configurado tu <strong>API Key</strong> en el Panel de Administración.</p>
            </div>
            <p style="text-align:center; padding:10px; font-size:0.9rem; color:#666;">Cargando pasarela segura...</p>
        `;
        container.style.display = 'block';
        checkoutBtn.style.display = 'none';

        // Inyectar el script de Bold con los parámetros dinámicos
        const boldScript = document.createElement('script');
        boldScript.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
        boldScript.dataset.boldButton = 'dark-L';
        boldScript.dataset.apiKey = boldData.apiKey;
        boldScript.dataset.orderId = boldData.orderId;
        boldScript.dataset.amount = boldData.amount;
        boldScript.dataset.currency = boldData.currency;
        boldScript.dataset.description = 'Pago pedido ' + boldData.orderId;
        boldScript.dataset.integritySignature = boldData.integritySignature;
        boldScript.dataset.renderMode = 'embedded';
        // No enviamos redirectionUrl en localhost porque Bold lo rechaza si tiene puerto
        // Al omitirlo, Bold usará la URL actual por defecto.

        container.appendChild(boldScript);
    } catch (err) {
        console.error(err);
        checkoutBtn.innerText = 'Error al conectar. Reintentar';
        checkoutBtn.disabled = false;
        alert(err.message || 'No se pudo conectar con el sistema de pagos.');
    }
}

// --- EVENTOS GENERALES ---
cartToggle.addEventListener('click', () => {
    cartModal.style.display = cartModal.style.display === 'none' ? 'block' : 'none';
});

// Eventos Login
loginToggle.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'flex';
});

closeLogin.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value || "";
    const password = document.getElementById('login-password')?.value || "";
    
    try {
        const resp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!resp.ok) throw new Error('Credenciales incorrectas');

        const data = await resp.json();
        localStorage.setItem('gift_token', data.token);
        localStorage.setItem('gift_user', JSON.stringify(data));
        
        checkSession();
        loginModal.style.display = 'none';
        loginForm.reset();
        showToast(`Hola ${data.firstName}, es un gusto verte de nuevo.`, 'info');
    } catch (err) {
        loginError.style.display = 'block';
        setTimeout(() => loginError.style.display = 'none', 3000);
    }
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('gift_token');
    localStorage.removeItem('gift_user');
    checkSession();
    location.reload();
});

function checkSession() {
    const user = JSON.parse(localStorage.getItem('gift_user'));
    const token = localStorage.getItem('gift_token');

    if (user && token) {
        loginNavItem.style.display = 'none';
        userNavItem.style.display = 'block';
        userNameDisplay.innerText = user.firstName;
        
        if (user.role === 'SUPER_ADMIN') {
            adminLink.style.display = 'block';
        }
    } else {
        loginNavItem.style.display = 'block';
        userNavItem.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

console.log('>>> URL actual:', window.location.href);
console.log('>>> Pedido pendiente en local:', localStorage.getItem('pending_order'));

// Detectar retorno de pago de Bold (Soporta múltiples formatos de parámetros)
if (window.location.search.includes('tx_id=') || 
    window.location.search.includes('status=') || 
    window.location.search.includes('bold-tx-status=')) {
    console.log('>>> Detectado retorno de Bold, iniciando confirmación...');
    confirmPayment();
}

async function confirmPayment() {
    const params = new URLSearchParams(window.location.search);
    
    // Bold usa diferentes nombres según la versión/entorno
    const boldStatus = params.get('bold-tx-status') || params.get('status');
    const boldId = params.get('bold-tx-id') || params.get('tx_id');
    const urlOrderRef = params.get('bold-order-id');
    
    console.log('>>> Datos de Bold capturados:', { status: boldStatus, tx_id: boldId, ref: urlOrderRef });

    const rawPending = localStorage.getItem('pending_order');
    if (!rawPending) {
        console.error('>>> ERROR: No se encontró el pedido pendiente en localStorage');
        // Si no hay pedido en local, pero tenemos datos de Bold, intentamos alertar
        if (boldStatus === 'approved' || boldStatus === 'success') {
            alert('¡Pago aprobado! Pero ocurrió un error técnico al guardar. Por favor contacta a soporte con tu ID de transacción: ' + (boldId || 'N/A'));
        }
        window.history.replaceState({}, document.title, "/");
        return;
    }

    const pendingOrder = JSON.parse(rawPending);
    const orderRef = urlOrderRef || pendingOrder?.orderId; 
    console.log('>>> Referencia de orden final:', orderRef);

    // Si el pago fue aprobado, procedemos
    if (boldStatus === 'approved' || boldStatus === 'success' || (boldStatus === null && boldId)) {
        try {
            console.log('>>> Enviando confirmación al servidor...');
            const resp = await fetch(`${API_BASE}/orders/confirm?boldTransactionId=${boldId || 'SIM_BOLD_ID'}&orderRef=${orderRef || 'ERR_NO_REF'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingOrder)
            });

            if (resp.ok) {
                const finalOrder = await resp.json();
                console.log('>>> Pedido creado con éxito:', finalOrder);
                alert(`¡Gracias por tu compra! Tu pedido #${finalOrder.id} ha sido registrado. Código de seguimiento: ${finalOrder.trackingCode}`);
                cart = [];
                updateCart();
                localStorage.removeItem('pending_order');
            } else {
                const errorText = await resp.text();
                console.error('>>> Error del servidor:', errorText);
                alert('Hubo un problema al registrar tu pedido: ' + errorText);
            }
        } catch (e) { 
            console.error('>>> Error de conexión:', e);
            alert('Error de conexión al confirmar el pedido. Por favor verifica tu internet.');
        }
    } else {
        console.warn('>>> El pago no fue aprobado o se canceló. Status:', boldStatus);
    }
    window.history.replaceState({}, document.title, "/");
}

// --- CONFIGURACIÓN DE LA TIENDA ---
async function loadStoreSettings() {
    try {
        const resp = await fetch(`${API_BASE}/settings/public`);
        if (!resp.ok) return;
        const settings = await resp.json();
        
        const config = {};
        settings.forEach(s => config[s.configKey] = s.configValue);

        // Actualizar UI
        if (config.store_name) document.querySelectorAll('.logo span').forEach(el => el.innerText = config.store_name);
        
        // Link WhatsApp
        const waLink = document.getElementById('whatsapp-link');
        if (waLink && config.social_whatsapp) {
            waLink.href = `https://wa.me/${config.social_whatsapp.replace(/\+/g, '').replace(/\s/g, '')}?text=Hola! Me interesa un regalo de su tienda.`;
        }

        // Redes Sociales en Footer
        if (config.social_instagram) {
            const el = document.getElementById('footer-instagram');
            if (el) el.href = config.social_instagram;
        }
        if (config.social_facebook) {
            const el = document.getElementById('footer-facebook');
            if (el) {
                el.href = config.social_facebook;
                el.style.display = 'inline'; // Mostrar si existe
            }
        }
        if (config.social_whatsapp) {
            const el = document.getElementById('footer-whatsapp');
            if (el) el.href = `https://wa.me/${config.social_whatsapp.replace(/\+/g, '').replace(/\s/g, '')}`;
        }
    } catch (err) {
        console.warn('No se pudieron cargar los ajustes de la tienda');
    }
}

// --- BANNERS ---
let currentBannerIdx = 0;
let banners = [];

async function loadBanners() {
    try {
        const resp = await fetch(`${API_BASE}/settings/banners`);
        if (!resp.ok) return;
        banners = await resp.json();
        
        if (banners.length > 0) {
            renderBanner(0);
            if (banners.length > 1) {
                setInterval(() => {
                    currentBannerIdx = (currentBannerIdx + 1) % banners.length;
                    renderBanner(currentBannerIdx);
                }, 5000); // 5 segundos por banner
            }
        }
    } catch (err) {
        console.warn('No se pudieron cargar los banners');
    }
}

function renderBanner(idx) {
    const banner = banners[idx];
    const container = document.getElementById('banner-container');
    if (!container || !banner) return;

    container.innerHTML = `
        <section class="hero" style="animation: fadeIn 0.8s ease-out;">
            <div class="hero-content">
                <h1>${banner.title.replace(/<span>/g, '<span>').replace(/<\/span>/g, '</span>')}</h1>
                <p>${banner.subtitle || ''}</p>
                <div class="hero-btns">
                    <a href="#catalogo" class="btn-primary">Ver Catálogo</a>
                </div>
            </div>
            <div class="hero-img">
                <img src="${banner.imageBase64}" alt="${banner.title}" style="width: 100%; max-width: 500px; border-radius: 30px; box-shadow: var(--shadow); height: 400px; object-fit: cover;">
            </div>
        </section>
    `;
}

// --- RASTREO DE PEDIDO ---
const trackModal = document.getElementById('track-modal');
const trackBtn = document.getElementById('track-order-toggle');
const closeTrack = document.getElementById('close-track');
const searchTrackBtn = document.getElementById('search-track-btn');
const trackInput = document.getElementById('tracking-input');
const trackResult = document.getElementById('track-result');

if(trackBtn) trackBtn.onclick = (e) => { e.preventDefault(); trackModal.style.display = 'flex'; };
if(closeTrack) closeTrack.onclick = () => { trackModal.style.display = 'none'; trackResult.style.display = 'none'; };

if(searchTrackBtn) searchTrackBtn.onclick = async () => {
    const code = trackInput?.value?.trim().toUpperCase();
    if(!code) return alert('Por favor ingresa un código.');

    trackResult.innerHTML = '<p style="text-align:center;">Buscando...</p>';
    trackResult.style.display = 'block';

    try {
        const resp = await fetch(`${API_BASE}/orders/track/${code}`);
        if(!resp.ok) throw new Error();
        const order = await resp.json();

        const statusColor = order.orderStatus?.id === 1 ? '#2e7d32' : '#d81b60'; // Ejemplo: Verde si está pagado, Rosa para otros
        const statusBg = order.orderStatus?.id === 1 ? '#e8f5e9' : '#fce4ec';

        trackResult.innerHTML = `
            <div style="text-align:center; margin-bottom:1.5rem;">
                <span style="background:${statusBg}; color:${statusColor}; padding:0.5rem 1.5rem; border-radius:30px; font-weight:800; font-size:1rem; border:1px solid ${statusColor}44;">
                    ● ${order.orderStatus?.name.toUpperCase() || 'PENDIENTE'}
                </span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem;">
                <p><strong>N° Rastreo:</strong><br>${order.trackingCode}</p>
                <p><strong>Fecha Pedido:</strong><br>${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Destinatario:</strong><br>${order.giftReceiverName || order.customer?.firstName}</p>
                <p><strong>Fecha Entrega:</strong><br>${new Date(order.deliveryDate).toLocaleDateString()}</p>
                <p><strong>Rango Horario:</strong><br>${order.deliveryTimeRange}</p>
                <p><strong>Estado Pago:</strong><br><span style="color:#2e7d32; font-weight:600;">✅ ${order.paymentStatus}</span></p>
            </div>
            <div style="margin-top:1.5rem; font-size:0.85rem; color:#666; border-top:1px solid #ddd; padding-top:10px; text-align:center;">
                ¿Dudas? <a href="https://wa.me/${document.getElementById('setting-store_phone')?.value || ''}" target="_blank" style="color:#25d366; font-weight:700; text-decoration:none;">Escríbenos por WhatsApp</a>
            </div>
        `;
    } catch (err) {
        trackResult.innerHTML = '<p style="color:red; text-align:center;">No encontramos ningún pedido con ese código. Verifica e intenta de nuevo.</p>';
    }
};

// --- BOOTSTRAP ---
loadProducts();
loadStoreSettings();
loadBanners();
updateCart();
checkSession();
