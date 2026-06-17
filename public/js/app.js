// // ── Utilidades globales ──────────────────────────────────────────────────

// const API = '/api';

// function getToken() { return localStorage.getItem('wh_token'); }
// function getUser()  { return JSON.parse(localStorage.getItem('wh_user') || 'null'); }
// function isAdmin()  { const u = getUser(); return u && u.role === 'admin'; }

// function requireAuth() {
//     if (!getToken()) { window.location.href = '/'; return false; }
//     return true;
// }

// async function apiFetch(endpoint, options = {}) {
//     const token = getToken();
//     const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
//     if (token) headers['Authorization'] = `Bearer ${token}`;

//     const res = await fetch(API + endpoint, { ...options, headers });

//     if (res.status === 401) {
//         localStorage.clear();
//         window.location.href = '/';
//         return;
//     }

//     const data = await res.json().catch(() => ({}));
//     return { ok: res.ok, status: res.status, data };
// }

// function showAlert(container, message, type = 'error') {
//     const el = document.getElementById(container);
//     if (!el) return;
//     el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
//     setTimeout(() => { el.innerHTML = ''; }, 5000);
// }

// function formatDate(ts) {
//     if (!ts) return '—';
//     return new Date(ts * 1000).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
// }

// function formatPrice(p) {
//     return Number(p).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
// }

// // ── Sidebar ──────────────────────────────────────────────────────────────

// function renderSidebar(active) {
//     const user = getUser();
//     const admin = isAdmin();

//     const nav = [
//         { id: 'dashboard',      label: 'Dashboard',          icon: '📊', href: '/dashboard.html',       always: true  },
//         { id: 'products',       label: 'Productos',           icon: '📦', href: '/products.html',        always: true  },
//         { id: 'sales',          label: 'Ventas',              icon: '🛒', href: '/sales.html',           always: true  },
//         { id: 'users',          label: 'Usuarios',            icon: '👥', href: '/users.html',           admin: true   },
//         { id: 'tokens',         label: 'Integración WP',      icon: '🔑', href: '/tokens.html',          admin: true   },
//         { id: 'import-export',  label: 'Importar / Exportar', icon: '↕',  href: '/import-export.html',   admin: true   },
//         { id: 'settings',       label: 'Configuración',        icon: '⚙',  href: '/settings.html',         admin: true   },
//     ];

//     const items = nav
//         .filter(n => n.always || (n.admin && admin))
//         .map(n => `
//             <a class="nav-item ${active === n.id ? 'active' : ''}" href="${n.href}">
//                 <span class="icon">${n.icon}</span>
//                 <span>${n.label}</span>
//             </a>
//         `).join('');

//     const initials = user ? user.username.slice(0,2).toUpperCase() : '??';

//     return `
//         <div class="sidebar-logo">
//             <h1>TecnoStore</h1>
//             <span>Gestión de Almacén</span>
//         </div>
//         <nav class="sidebar-nav">
//             <div class="nav-section">Menú</div>
//             ${items}
//         </nav>
//         <div class="sidebar-footer">
//             <div class="sidebar-user">
//                 <div class="avatar">${initials}</div>
//                 <div class="user-info">
//                     <div class="username">${user ? user.username : ''}</div>
//                     <div class="role">${user ? user.role : ''}</div>
//                 </div>
//                 <button class="btn-logout" onclick="logout()" title="Cerrar sesión">⏻</button>
//             </div>
//         </div>
//     `;
// }

// function logout() {
//     localStorage.clear();
//     window.location.href = '/';
// }

// // ── Modal helpers ────────────────────────────────────────────────────────

// function openModal(id)  { document.getElementById(id).classList.add('open'); }
// function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// document.addEventListener('keydown', e => {
//     if (e.key === 'Escape') {
//         document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
//     }
// });



// ── Utilidades globales ──────────────────────────────────────────────────

const API = '/api';

function getToken() { return localStorage.getItem('wh_token'); }
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('wh_user') || 'null');
    } catch {
        return null;
    }
}

function isAdmin() {
    const u = getUser();
    return u && u.role === 'admin';
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// ── ESCAPE HTML (CLAVE ANTI XSS) ────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// ── API FETCH SEGURA ─────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API + endpoint, { ...options, headers });

    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/';
        return;
    }

    let data = {};
    try {
        data = await res.json();
    } catch {
        data = { error: 'Invalid JSON response' };
    }

    return {
        ok: res.ok,
        status: res.status,
        data: typeof data === 'object' ? data : { value: data }
    };
}

// ── ALERTA SEGURA ────────────────────────────────────────────────────────
function showAlert(container, message, type = 'error') {
    const el = document.getElementById(container);
    if (!el) return;

    el.innerHTML =
        `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;

    setTimeout(() => {
        el.innerHTML = '';
    }, 5000);
}

// ── FORMATTERS ───────────────────────────────────────────────────────────
function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatPrice(p) {
    const n = Number(p);
    if (isNaN(n)) return '0 €';
    return n.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR'
    });
}

// ── SIDEBAR (SEGURA) ─────────────────────────────────────────────────────
function renderSidebar(active) {
    const user = getUser();
    const admin = isAdmin();

    const nav = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard.html', always: true },
        { id: 'products', label: 'Productos', icon: '📦', href: '/products.html', always: true },
        { id: 'sales', label: 'Ventas', icon: '🛒', href: '/sales.html', always: true },
        { id: 'users', label: 'Usuarios', icon: '👥', href: '/users.html', admin: true },
        { id: 'tokens', label: 'Integración WP', icon: '🔑', href: '/tokens.html', admin: true },
        { id: 'import-export', label: 'Importar / Exportar', icon: '↕', href: '/import-export.html', admin: true },
        { id: 'settings', label: 'Configuración', icon: '⚙', href: '/settings.html', admin: true },
    ];

    const items = nav
        .filter(n => n.always || (n.admin && admin))
        .map(n => `
            <a class="nav-item ${active === n.id ? 'active' : ''}"
               href="${n.href}">
                <span class="icon">${escapeHtml(n.icon)}</span>
                <span>${escapeHtml(n.label)}</span>
            </a>
        `).join('');

    const username = user?.username ? escapeHtml(user.username) : 'Invitado';
    const role = user?.role ? escapeHtml(user.role) : '';
    const initials = user?.username
        ? escapeHtml(user.username.slice(0, 2).toUpperCase())
        : '??';

    return `
        <div class="sidebar-logo">
            <h1>TecnoStore</h1>
            <span>Gestión de Almacén</span>
        </div>

        <nav class="sidebar-nav">
            <div class="nav-section">Menú</div>
            ${items}
        </nav>

        <div class="sidebar-footer">
            <div class="sidebar-user">
                <div class="avatar">${initials}</div>
                <div class="user-info">
                    <div class="username">${username}</div>
                    <div class="role">${role}</div>
                </div>
                <button class="btn-logout" onclick="logout()">⏻</button>
            </div>
        </div>
    `;
}

// ── LOGOUT ───────────────────────────────────────────────────────────────
function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// ── MODALS ───────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open')
            .forEach(m => m.classList.remove('open'));
    }
});
