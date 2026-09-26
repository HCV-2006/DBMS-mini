// ============================================
// Products Page
// ============================================
const Products = {
    page: 1,
    limit: 20,
    search: '',
    category: '',
    status: '',

    async load() {
        if (App.user.role === 'admin') {
            App.setTopbarActions(`
                <button class="btn btn-primary" onclick="Products.showForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Add Product
                </button>
            `);
        }
        await this.fetchProducts();
    },

    async fetchProducts() {
        const params = new URLSearchParams({
            page: this.page, limit: this.limit,
            search: this.search, category: this.category, status: this.status
        });

        const [prodData, catData] = await Promise.all([
            App.api(`/api/products?${params}`),
            App.api('/api/categories')
        ]);

        if (!prodData || !prodData.success) {
            App.setContent(`<div class="empty-state" style="padding:3rem 1rem; text-align:center;"><h3>Failed to load products</h3><p class="text-muted">${prodData?.error?.message || 'Please try again.'}</p><button class="btn btn-primary" onclick="Products.fetchProducts()" style="margin-top:1rem;">Retry</button></div>`);
            return;
        }

        const categories = catData.success ? catData.data : [];
        const products = prodData.data;
        const pg = prodData.pagination;

        App.setContent(`
            <div class="toolbar">
                <div class="search-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                    <input type="text" id="productSearch" placeholder="Search products..." value="${this.search}" oninput="Products.onSearch(this.value)">
                </div>
                <select class="filter-select" id="categoryFilter" onchange="Products.onCategoryFilter(this.value)">
                    <option value="">All Categories</option>
                    ${categories.map(c => `<option value="${c.id}" ${this.category == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                <select class="filter-select" id="statusFilter" onchange="Products.onStatusFilter(this.value)">
                    <option value="" ${!this.status ? 'selected' : ''}>All Status</option>
                    <option value="in" ${this.status === 'in' ? 'selected' : ''}>In Stock</option>
                    <option value="low" ${this.status === 'low' ? 'selected' : ''}>Low Stock</option>
                    <option value="out" ${this.status === 'out' ? 'selected' : ''}>Out of Stock</option>
                </select>
            </div>

            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.length === 0 ? `
                                <tr><td colspan="7">
                                    <div class="empty-state">
                                        <h3>No products found</h3>
                                        <p>Try adjusting your search or filters${App.user.role === 'admin' ? ', or add your first product.' : '.'}</p>
                                    </div>
                                </td></tr>
                            ` : products.map(p => `
                                <tr>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:0.75rem;">
                                            ${p.image ? `<img src="${p.image}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">` : `<div style="width:36px;height:36px;border-radius:6px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:600;font-size:0.75rem;">${p.name.charAt(0)}</div>`}
                                            <div><div style="font-weight:500;">${p.name}</div><div class="text-muted text-sm">${p.unit || 'piece'}</div></div>
                                        </div>
                                    </td>
                                    <td><code style="font-size:0.8125rem;color:var(--text-secondary);">${p.sku}</code></td>
                                    <td>${p.category_name || '-'}</td>
                                    <td>${App.formatCurrency(p.price)}</td>
                                    <td style="font-weight:600;">${p.quantity}</td>
                                    <td>${App.stockBadge(p.quantity, p.minimum_stock)}</td>
                                    <td>
                                        <div class="action-btns">
                                            ${App.user.role === 'admin' ? `
                                                <button class="btn btn-sm btn-secondary" onclick="Products.showForm(${p.id})" title="Edit">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="Products.deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Delete">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${pg.totalPages > 1 ? `
                    <div class="pagination" style="padding: 0.75rem 1rem;">
                        <div class="pagination-info">Showing ${((pg.page-1)*pg.limit)+1}–${Math.min(pg.page*pg.limit, pg.total)} of ${pg.total}</div>
                        <div class="pagination-controls">
                            <button onclick="Products.goPage(${pg.page-1})" ${pg.page <= 1 ? 'disabled' : ''}>Prev</button>
                            ${Array.from({length: Math.min(pg.totalPages, 5)}, (_, i) => {
                                const p = i + 1;
                                return `<button class="${p === pg.page ? 'active' : ''}" onclick="Products.goPage(${p})">${p}</button>`;
                            }).join('')}
                            <button onclick="Products.goPage(${pg.page+1})" ${pg.page >= pg.totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `);
    },

    onSearch(val) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this.search = val;
            this.page = 1;
            this.fetchProducts();
        }, 300);
    },

    onCategoryFilter(val) { this.category = val; this.page = 1; this.fetchProducts(); },
    onStatusFilter(val) { this.status = val; this.page = 1; this.fetchProducts(); },
    goPage(p) { this.page = p; this.fetchProducts(); },

    async showForm(id = null) {
        const [catData, supData] = await Promise.all([
            App.api('/api/categories'),
            App.api('/api/suppliers')
        ]);

        let product = null;
        if (id) {
            const resp = await App.api(`/api/products/${id}`);
            if (resp.success) product = resp.data;
        }

        const categories = catData.success ? catData.data : [];
        const suppliers = supData.success ? supData.data : [];

        App.setContent(`
            <div class="form-card">
                <div class="card-header">
                    <h3>${product ? 'Edit Product' : 'Add New Product'}</h3>
                </div>
                <div class="card-body">
                    <form id="productForm" enctype="multipart/form-data">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Product Name <span class="required">*</span></label>
                                <input type="text" name="name" value="${product?.name || ''}" required minlength="2" maxlength="120">
                            </div>
                            <div class="form-group">
                                <label>SKU <span class="required">*</span></label>
                                <input type="text" name="sku" value="${product?.sku || ''}" required ${product ? 'readonly' : ''} style="${product ? 'background:var(--bg-primary);' : ''}">
                            </div>
                            <div class="form-group">
                                <label>Category <span class="required">*</span></label>
                                <select name="category_id" required>
                                    <option value="">Select Category</option>
                                    ${categories.map(c => `<option value="${c.id}" ${product?.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Supplier</label>
                                <select name="supplier_id">
                                    <option value="">No Supplier</option>
                                    ${suppliers.map(s => `<option value="${s.id}" ${product?.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Selling Price <span class="required">*</span></label>
                                <input type="number" name="price" value="${product?.price || ''}" required min="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label>Cost Price</label>
                                <input type="number" name="cost_price" value="${product?.cost_price || ''}" min="0" step="0.01">
                            </div>
                            ${!product ? `
                                <div class="form-group">
                                    <label>Initial Quantity <span class="required">*</span></label>
                                    <input type="number" name="quantity" value="0" required min="0">
                                </div>
                            ` : ''}
                            <div class="form-group">
                                <label>Minimum Stock <span class="required">*</span></label>
                                <input type="number" name="minimum_stock" value="${product?.minimum_stock || 10}" required min="0">
                            </div>
                            <div class="form-group">
                                <label>Unit</label>
                                <select name="unit">
                                    ${['piece','kg','litre','bottle','packet','bag','box','dozen'].map(u =>
                                        `<option value="${u}" ${product?.unit === u ? 'selected' : ''}>${u}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Product Image</label>
                                <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp">
                                ${product?.image ? `<div class="image-preview"><img src="${product.image}"></div>` : ''}
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">${product ? 'Update Product' : 'Add Product'}</button>
                            <button type="button" class="btn btn-secondary" onclick="Products.load()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `);

        document.getElementById('productForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            const url = product ? `/api/products/${product.id}` : '/api/products';
            const method = product ? 'PUT' : 'POST';

            const resp = await App.api(url, { method, body: formData });

            if (resp.success) {
                App.toast(resp.message);
                Products.load();
            } else {
                App.toast(resp.error.message, 'error');
            }
        });
    },

    async deleteProduct(id, name) {
        const confirmed = await App.confirm(
            'Delete Product',
            `Are you sure you want to delete "${name}"? This action cannot be undone.`,
            'Delete',
            'btn btn-danger'
        );

        if (!confirmed) return;

        const resp = await App.api(`/api/products/${id}`, { method: 'DELETE' });
        if (resp.success) {
            App.toast(resp.message);
            this.fetchProducts();
        } else {
            App.toast(resp.error.message, 'error');
        }
    }
};
