// ============================================
// App Shell — Navigation, Auth, Utilities
// ============================================

const App = {
    currentPage: 'dashboard',
    user: null,
    csrfToken: '',
    currency: '₹',
    settings: {},

    async init() {
        // Check auth
        try {
            const resp = await this.api('/api/auth/me');
            if (!resp.success) throw new Error('Not authenticated');
            this.user = resp.data;
            this.csrfToken = resp.data.csrfToken;
            sessionStorage.setItem('csrfToken', this.csrfToken);
        } catch {
            window.location.href = '/';
            return;
        }

        // Load settings
        try {
            const settingsResp = await this.api('/api/settings');
            if (settingsResp.success) {
                this.settings = settingsResp.data;
                this.currency = this.settings.currency || '₹';
            }
        } catch {}

        // Setup UI
        this.setupUser();
        this.setupNavigation();
        this.setupSidebar();
        this.setupLogout();
        this.setupConfirmModal();

        // Role-based nav visibility
        if (this.user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Load initial page
        this.navigate('dashboard');
    },

    setupUser() {
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl) nameEl.textContent = this.user.name;
        if (roleEl) roleEl.textContent = 'Active User';
        if (avatarEl) avatarEl.textContent = this.user.name.charAt(0).toUpperCase();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigate(page);
            });
        });
    },

    setupSidebar() {
        const hamburger = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarClose');

        const toggle = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        };

        const close = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        if (hamburger) hamburger.addEventListener('click', toggle);
        if (overlay) overlay.addEventListener('click', close);
        if (closeBtn) closeBtn.addEventListener('click', close);
    },

    setupLogout() {
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            try {
                await this.api('/api/auth/logout', { method: 'POST' });
            } catch {}
            sessionStorage.clear();
            window.location.href = '/';
        });
    },

    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const cancelBtn = document.getElementById('confirmCancel');
        const closeBtn = document.getElementById('confirmClose');

        const hide = () => modal.classList.remove('active');
        cancelBtn?.addEventListener('click', hide);
        closeBtn?.addEventListener('click', hide);
    },

    navigate(page) {
        this.currentPage = page;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            products: 'Products',
            categories: 'Categories',
            suppliers: 'Suppliers',
            sales: 'Sales',
            stock: 'Stock Management',
            reports: 'Reports'
        };
        document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

        // Clear topbar actions
        document.getElementById('topbarActions').innerHTML = '';

        // Load page content
        const loaders = {
            dashboard: () => Dashboard.load(),
            products: () => Products.load(),
            categories: () => Categories.load(),
            suppliers: () => Suppliers.load(),
            sales: () => Sales.load(),
            stock: () => Stock.load(),
            reports: () => Reports.load()
        };

        const content = document.getElementById('pageContent');
        content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';

        if (loaders[page]) {
            loaders[page]();
        } else {
            this.navigate('dashboard');
        }
    },

    // ---- API Helper ----
    async api(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken || sessionStorage.getItem('csrfToken') || ''
            },
            credentials: 'same-origin',
            ...options
        };

        // Don't set Content-Type for FormData
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
            config.body = options.body;
        } else if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const resp = await fetch(url, config);
        if (resp.headers.get('content-type')?.includes('text/csv')) {
            return resp;
        }
        return resp.json();
    },

    // ---- Toast Notification ----
    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>'
        };

        toast.innerHTML = `${icons[type] || ''}${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    // ---- Confirm Dialog ----
    confirm(title, message, okText = 'Delete', okClass = 'btn btn-danger') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            const okBtn = document.getElementById('confirmOk');
            okBtn.textContent = okText;
            okBtn.className = okClass;
            modal.classList.add('active');

            const handler = () => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', handler);
                resolve(true);
            };
            okBtn.addEventListener('click', handler);

            // Also resolve false on cancel/close
            const cancelHandler = () => {
                okBtn.removeEventListener('click', handler);
                resolve(false);
            };
            document.getElementById('confirmCancel').addEventListener('click', cancelHandler, { once: true });
            document.getElementById('confirmClose').addEventListener('click', cancelHandler, { once: true });
        });
    },

    // ---- Format Currency ----
    formatCurrency(amount) {
        return `${this.currency}${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    },

    // ---- Parse Date (handles SQLite UTC strings) ----
    parseDate(dateStr) {
        if (!dateStr) return null;
        let str = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
            str = str.replace(' ', 'T') + 'Z';
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(Date.UTC(y, m - 1, d));
        }
        return new Date(str);
    },

    // ---- Format Date (IST) ----
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = this.parseDate(dateStr);
        if (!d || isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // ---- Format Date & Time (IST) ----
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const d = this.parseDate(dateStr);
        if (!d || isNaN(d.getTime())) return '-';
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    },

    // ---- Stock Status Badge ----
    stockBadge(quantity, minimumStock) {
        if (quantity === 0) {
            return '<span class="badge badge-danger"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>Out of Stock</span>';
        }
        if (quantity <= minimumStock) {
            return '<span class="badge badge-warning"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>Low Stock</span>';
        }
        return '<span class="badge badge-success"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>In Stock</span>';
    },

    // ---- Set page content ----
    setContent(html) {
        document.getElementById('pageContent').innerHTML = html;
    },

    // ---- Set topbar action buttons ----
    setTopbarActions(html) {
        document.getElementById('topbarActions').innerHTML = html;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => App.init());
