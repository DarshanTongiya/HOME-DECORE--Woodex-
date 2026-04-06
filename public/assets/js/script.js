'use strict';

/* ─── Toast ─────────────────────────────────────────── */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── Helpers ───────────────────────────────────────── */
const addEventOnElem = (elem, type, cb) => {
  if (elem.length) elem.forEach(el => el.addEventListener(type, cb));
  else if (elem) elem.addEventListener(type, cb);
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts
  });
  return res.json();
}

/* ─── State ─────────────────────────────────────────── */
let currentUser = null;
let cartData    = [];

/* ─── DOM refs ──────────────────────────────────────── */
const navbar      = document.querySelector('[data-navbar]');
const navTogglers = document.querySelectorAll('[data-nav-toggler]');
const navLinks    = document.querySelectorAll('[data-nav-link]');
const overlay     = document.querySelector('[data-overlay]');
const header      = document.querySelector('[data-header]');

// Auth
const authModal    = document.getElementById('authModal');
const loginTab     = document.getElementById('loginTab');
const signupTab    = document.getElementById('signupTab');
const loginForm    = document.getElementById('loginForm');
const signupForm   = document.getElementById('signupForm');
const loginError   = document.getElementById('loginError');
const signupError  = document.getElementById('signupError');
const userBtn      = document.getElementById('userBtn');
const authModalClose = document.getElementById('authModalClose');
const sidebarUserName = document.getElementById('sidebarUserName');
const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

// Cart
const cartBtn     = document.getElementById('cartBtn');
const cartDrawer  = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose   = document.getElementById('cartClose');
const cartCount   = document.getElementById('cartCount');
const cartItems   = document.getElementById('cartItems');
const cartFooter  = document.getElementById('cartFooter');
const cartTotal   = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const checkoutBtn  = document.getElementById('checkoutBtn');

/* ─── Navbar toggle ─────────────────────────────────── */
const toggleNavbar = () => {
  navbar.classList.toggle('active');
  overlay.classList.toggle('active');
  document.body.classList.toggle('active');
};
const closeNavbar = () => {
  navbar.classList.remove('active');
  overlay.classList.remove('active');
  document.body.classList.remove('active');
};
addEventOnElem(navTogglers, 'click', toggleNavbar);
addEventOnElem(navLinks, 'click', closeNavbar);
overlay.addEventListener('click', closeNavbar);

/* ─── Header on scroll ──────────────────────────────── */
window.addEventListener('scroll', () => {
  header.classList.toggle('active', window.scrollY > 100);
});

/* ─── Product filter ────────────────────────────────── */
const filterBtns = document.querySelectorAll('[data-filter-btn]');
const filterBox  = document.querySelector('.product-list[data-filter]');
let lastFilterBtn = filterBtns[0];

filterBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    lastFilterBtn.classList.remove('active');
    this.classList.add('active');
    lastFilterBtn = this;
    filterBox.setAttribute('data-filter', this.dataset.filterBtn);
  });
});

/* ─── Auth modal helpers ────────────────────────────── */
function openAuthModal(tab = 'login') {
  authModal.classList.add('open');
  if (tab === 'signup') switchToSignup(); else switchToLogin();
}
function closeAuthModal() {
  authModal.classList.remove('open');
  loginError.textContent  = '';
  signupError.textContent = '';
}
function switchToLogin() {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.style.display  = '';
  signupForm.style.display = 'none';
}
function switchToSignup() {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.style.display = '';
  loginForm.style.display  = 'none';
}

loginTab.addEventListener('click', switchToLogin);
signupTab.addEventListener('click', switchToSignup);
document.getElementById('goSignup').addEventListener('click', switchToSignup);
document.getElementById('goLogin').addEventListener('click', switchToLogin);
authModalClose.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });

/* ─── User button ───────────────────────────────────── */
userBtn.addEventListener('click', () => {
  if (currentUser) {
    // Show a simple dropdown-like confirmation to logout
    if (confirm(`Logged in as ${currentUser.name}\n\nClick OK to logout.`)) {
      doLogout();
    }
  } else {
    openAuthModal('login');
  }
});

/* ─── Auth: update UI after login ───────────────────── */
function setUserUI(user) {
  currentUser = user;
  if (user) {
    userBtn.title = `${user.name} (click to logout)`;
    sidebarUserName.textContent = `👤 ${user.name}`;
    sidebarUserName.style.display = 'block';
    sidebarLogoutBtn.style.display = 'block';
  } else {
    userBtn.title = 'Login / Account';
    sidebarUserName.style.display  = 'none';
    sidebarLogoutBtn.style.display = 'none';
  }
}

/* ─── Login ─────────────────────────────────────────── */
document.getElementById('loginSubmit').addEventListener('click', async () => {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  loginError.textContent = '';
  if (!email || !password) { loginError.textContent = 'Please fill in all fields.'; return; }
  const data = await api('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  });
  if (data.user) {
    setUserUI(data.user);
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}!`);
    await loadCart();
  } else {
    loginError.textContent = data.message || 'Login failed.';
  }
});

/* ─── Signup ─────────────────────────────────────────── */
document.getElementById('signupSubmit').addEventListener('click', async () => {
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  signupError.textContent = '';
  if (!name || !email || !password) { signupError.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { signupError.textContent = 'Password must be at least 6 characters.'; return; }
  const data = await api('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password })
  });
  if (data.user) {
    setUserUI(data.user);
    closeAuthModal();
    showToast(`Account created! Welcome, ${data.user.name}!`);
    await loadCart();
  } else {
    signupError.textContent = data.message || 'Registration failed.';
  }
});

/* ─── Logout ─────────────────────────────────────────── */
async function doLogout() {
  await api('/api/auth/logout', { method: 'POST' });
  setUserUI(null);
  cartData = [];
  renderCart();
  showToast('Logged out successfully.');
}
sidebarLogoutBtn.addEventListener('click', doLogout);

/* ─── Cart drawer ────────────────────────────────────── */
function openCart()  { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); }
cartBtn.addEventListener('click', () => {
  if (!currentUser) { openAuthModal('login'); showToast('Please login to view your cart.'); return; }
  openCart();
});
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

/* ─── Load cart from server ─────────────────────────── */
async function loadCart() {
  if (!currentUser) return;
  const data = await api('/api/cart');
  cartData = data.cart || [];
  renderCart();
}

/* ─── Render cart ────────────────────────────────────── */
function renderCart() {
  const total = cartData.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = cartData.reduce((sum, i) => sum + i.quantity, 0);
  cartCount.textContent = count;

  if (!cartData.length) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <ion-icon name="bag-handle-outline"></ion-icon>
        <p>Your cart is empty</p>
      </div>`;
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = '';
  cartTotal.textContent = `₹${total.toFixed(2)}`;
  cartItems.innerHTML = cartData.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/64x64/f4f4f4/999?text=img'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateQty('${item.productId}', ${item.quantity - 1})">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.productId}', ${item.quantity + 1})">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="updateQty('${item.productId}', 0)" title="Remove">
        <ion-icon name="trash-outline"></ion-icon>
      </button>
    </div>
  `).join('');
}

/* ─── Add to cart ────────────────────────────────────── */
async function addToCart(productId, name, price, image) {
  if (!currentUser) {
    openAuthModal('login');
    showToast('Please login to add items to cart.');
    return;
  }
  const data = await api('/api/cart/add', {
    method: 'POST',
    body: JSON.stringify({ productId, name, price, image })
  });
  cartData = data.cart || [];
  renderCart();
  showToast(`${name} added to cart!`);
}

/* ─── Update quantity ────────────────────────────────── */
async function updateQty(productId, quantity) {
  const data = await api('/api/cart/update', {
    method: 'PUT',
    body: JSON.stringify({ productId, quantity })
  });
  cartData = data.cart || [];
  renderCart();
}

/* ─── Clear cart ─────────────────────────────────────── */
clearCartBtn.addEventListener('click', async () => {
  if (!confirm('Clear all items from cart?')) return;
  const data = await api('/api/cart/clear', { method: 'DELETE' });
  cartData = data.cart || [];
  renderCart();
  showToast('Cart cleared.');
});

/* ─── Checkout (placeholder) ─────────────────────────── */
checkoutBtn.addEventListener('click', () => {
  showToast('Checkout coming soon! 🛒');
});

/* ─── Init: check session ────────────────────────────── */
(async () => {
  const data = await api('/api/auth/me');
  if (data.user) {
    setUserUI(data.user);
    await loadCart();
  }
})();

// expose globally for inline onclick
window.addToCart = addToCart;
window.updateQty = updateQty;
