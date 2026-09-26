// ============================================
// Sales Page
// ============================================
const Sales = {
    cart: [],
    page: 1,

    async load() {
        App.setTopbarActions(`
            <button class="btn btn-primary" onclick="Sales.showCreateSale()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                New Sale
            </button>
        `);
        await this.fetchSales();
    },

    async fetchSales() {
        const data = await App.api(`/api/sales?page=${this.page}&limit=20`);
        if (!data || !data.success) {
            App.setContent(`<div class="empty-state" style="padding:3rem 1rem; text-align:center;"><h3>Failed to load sales</h3><p class="text-muted">${data?.error?.message || 'Please try again.'}</p><button class="btn btn-primary" onclick="Sales.fetchSales()" style="margin-top:1rem;">Retry</button></div>`);
            return;
        }
        const pg = data.pagination;

        App.setContent(`
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead><tr><th>Sale ID</th><th>Date</th><th>Items</th><th>Total</th><th>Created By</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${data.data.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><h3>No sales yet</h3><p>Create your first sale to start tracking revenue.</p></div></td></tr>` :
                            data.data.map(s => `
                                <tr>
                                    <td><span class="badge badge-primary">#${s.id}</span></td>
                                    <td>${App.formatDateTime(s.created_at)}</td>
                                    <td>${s.item_count}</td>
                                    <td style="font-weight:600;">${App.formatCurrency(s.total_amount)}</td>
                                    <td>${s.created_by_name || '-'}</td>
                                    <td>
                                        <div class="action-btns">
                                            <button class="btn btn-sm btn-secondary" onclick="Sales.viewSale(${s.id})" title="View Details">View</button>
                                            <button class="btn btn-sm btn-danger" onclick="Sales.deleteSale(${s.id})" title="Delete Sale">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${pg.totalPages > 1 ? `
                    <div class="pagination" style="padding:0.75rem 1rem;">
                        <div class="pagination-info">Page ${pg.page} of ${pg.totalPages}</div>
                        <div class="pagination-controls">
                            <button onclick="Sales.page=${pg.page-1};Sales.fetchSales();" ${pg.page <= 1 ? 'disabled' : ''}>Prev</button>
                            <button onclick="Sales.page=${pg.page+1};Sales.fetchSales();" ${pg.page >= pg.totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `);
    },

    async viewSale(id) {
        const data = await App.api(`/api/sales/${id}`);
        if (!data.success) return;
        const sale = data.data;

        App.setContent(`
            <div class="form-card" style="max-width:800px;">
                <div class="card-header">
                    <h3>Sale #${sale.id}</h3>
                    <span class="badge badge-success">Completed</span>
                </div>
                <div class="card-body">
                    <div class="flex-between mb-2">
                        <div><strong>Date:</strong> ${App.formatDateTime(sale.created_at)}</div>
                        <div><strong>Created by:</strong> ${sale.created_by_name}</div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                            <tbody>
                                ${sale.items.map(i => `
                                    <tr>
                                        <td>${i.product_name}</td>
                                        <td><code>${i.sku}</code></td>
                                        <td>${i.quantity}</td>
                                        <td>${App.formatCurrency(i.price)}</td>
                                        <td style="font-weight:600;">${App.formatCurrency(i.subtotal)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr><td colspan="4" style="text-align:right;font-weight:600;padding:0.75rem 1rem;">Total</td>
                                <td style="font-weight:700;font-size:1.125rem;color:var(--primary);padding:0.75rem 1rem;">${App.formatCurrency(sale.total_amount)}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="form-actions" style="border-top:none;margin-top:1rem;display:flex;justify-content:space-between;align-items:center;">
                        <button class="btn btn-secondary" onclick="Sales.load()">← Back to Sales</button>
                        <button class="btn btn-danger" onclick="Sales.deleteSale(${sale.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete Sale
                        </button>
                    </div>
                </div>
            </div>
        `);
    },

    async showCreateSale() {
        this.cart = [];
        const prodData = await App.api('/api/products?limit=100');
        this.products = prodData.success ? prodData.data : [];

        App.setTopbarActions(`
            <button class="btn btn-secondary" onclick="Sales.load()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to Sales
            </button>
        `);

        this.renderCreateSale();
    },

    renderCreateSale() {
        const products = this.products || [];
        const cartTotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);

        App.setContent(`
            <div class="sale-container">
                <div class="form-card" style="max-width:none;">
                    <div class="card-header"><h3>Add Products to Sale</h3></div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Select Product</label>
                                <select id="saleProductSelect">
                                    <option value="">Choose a product...</option>
                                    ${products.filter(p => p.quantity > 0).map(p =>
                                        `<option value="${p.id}" data-price="${p.price}" data-stock="${p.quantity}" data-name="${p.name}">${p.name} (${p.sku}) — Stock: ${p.quantity}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantity</label>
                                <div style="display:flex;gap:0.5rem;">
                                    <input type="number" id="saleQtyInput" min="1" value="1" style="flex:1;">
                                    <button class="btn btn-primary" onclick="Sales.addToCart()">Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="cart-card">
                    <div class="card-header"><h3>Cart (${this.cart.length} items)</h3></div>
                    <div class="cart-items">
                        ${this.cart.length === 0 ? '<div class="empty-state" style="padding:2rem;"><p>No items in cart</p></div>' :
                        this.cart.map((item, idx) => `
                            <div class="cart-item">
                                <div class="cart-item-info">
                                    <h4>${item.name}</h4>
                                    <span>${item.quantity} × ${App.formatCurrency(item.price)}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:0.75rem;">
                                    <div class="cart-item-price">${App.formatCurrency(item.subtotal)}</div>
                                    <button class="cart-item-remove" onclick="Sales.removeFromCart(${idx})" title="Remove item">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="cart-total">
                        <span class="cart-total-label">Total</span>
                        <span class="cart-total-value">${App.formatCurrency(cartTotal)}</span>
                    </div>
                    <div style="padding:0 1.25rem 1.25rem;">
                        <button class="btn btn-success" style="width:100%;" onclick="Sales.completeSale()" ${this.cart.length === 0 ? 'disabled' : ''}>
                            Complete Sale
                        </button>
                    </div>
                </div>
            </div>
        `);
    },

    addToCart() {
        const select = document.getElementById('saleProductSelect');
        const qtyInput = document.getElementById('saleQtyInput');
        if (!select || !select.value) { App.toast('Please select a product.', 'warning'); return; }

        const option = select.options[select.selectedIndex];
        const qty = parseInt(qtyInput.value) || 0;
        const stock = parseInt(option.dataset.stock) || 0;

        if (qty <= 0) { App.toast('Quantity must be greater than zero.', 'error'); return; }
        if (qty > stock) { App.toast(`Insufficient stock. Available: ${stock}`, 'error'); return; }

        // Check if already in cart
        const prodId = parseInt(select.value);
        const existing = this.cart.find(i => i.productId === prodId);
        if (existing) {
            if (existing.quantity + qty > stock) {
                App.toast(`Total would exceed stock. Available: ${stock}, In cart: ${existing.quantity}`, 'error');
                return;
            }
            existing.quantity += qty;
            existing.subtotal = existing.quantity * existing.price;
        } else {
            this.cart.push({
                productId: prodId,
                name: option.dataset.name,
                price: parseFloat(option.dataset.price),
                quantity: qty,
                subtotal: qty * parseFloat(option.dataset.price)
            });
        }

        App.toast(`Added ${option.dataset.name} to cart.`, 'success');

        // Re-render cart UI while preserving items
        this.renderCreateSale();
    },

    removeFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCreateSale();
    },

    async completeSale() {
        if (this.cart.length === 0) return;

        const confirmed = await App.confirm('Confirm Sale', `Complete this sale for ${App.formatCurrency(this.cart.reduce((s, i) => s + i.subtotal, 0))}?`, 'Complete', 'btn btn-success');
        if (!confirmed) return;

        const resp = await App.api('/api/sales', {
            method: 'POST',
            body: {
                items: this.cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
            }
        });

        if (resp.success) {
            App.toast(resp.message);
            this.cart = [];
            this.load();
        } else {
            App.toast(resp.error.message, 'error');
        }
    },

    async deleteSale(id) {
        const confirmed = await App.confirm(
            'Delete Sale',
            `Are you sure you want to delete Sale #${id}? Stock will be restored to inventory and this action cannot be undone.`,
            'Delete',
            'btn btn-danger'
        );
        if (!confirmed) return;

        const resp = await App.api(`/api/sales/${id}`, { method: 'DELETE' });
        if (resp.success) {
            App.toast(resp.message);
            this.load();
        } else {
            App.toast(resp.error.message, 'error');
        }
    }
};
