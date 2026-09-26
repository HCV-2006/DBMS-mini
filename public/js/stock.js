// ============================================
// Stock Management Page
// ============================================
const Stock = {
    async load() {
        const prodData = await App.api('/api/products?limit=200');
        const products = prodData.success ? prodData.data : [];

        App.setContent(`
            <div class="grid-2">
                <!-- Add Stock -->
                <div class="form-card" style="max-width:none;">
                    <div class="card-header">
                        <h3>Add Stock (Restock)</h3>
                    </div>
                    <div class="card-body">
                        <form id="addStockForm">
                            <div class="form-group">
                                <label>Select Product <span class="required">*</span></label>
                                <select name="product_id" required>
                                    <option value="">Choose a product...</option>
                                    ${products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.quantity})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantity to Add <span class="required">*</span></label>
                                <input type="number" name="quantity" required min="1" placeholder="Enter quantity">
                            </div>
                            <div class="form-group">
                                <label>Note (optional)</label>
                                <input type="text" name="note" placeholder="e.g. Supplier invoice #123">
                            </div>
                            <button type="submit" class="btn btn-success">Add Stock</button>
                        </form>
                    </div>
                </div>

                <!-- Adjust Stock -->
                <div class="form-card" style="max-width:none;">
                    <div class="card-header">
                        <h3>Adjust Stock (Correction)</h3>
                    </div>
                    <div class="card-body">
                        <form id="adjustStockForm">
                            <div class="form-group">
                                <label>Select Product <span class="required">*</span></label>
                                <select name="product_id" required>
                                    <option value="">Choose a product...</option>
                                    ${products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.quantity})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Adjustment (+/-) <span class="required">*</span></label>
                                <input type="number" name="quantity" required placeholder="e.g. -2 for damage">
                                <span class="help-text">Use negative for removal, positive for addition</span>
                            </div>
                            <div class="form-group">
                                <label>Reason <span class="required">*</span></label>
                                <input type="text" name="note" required placeholder="e.g. Damaged in transit">
                            </div>
                            <button type="submit" class="btn btn-warning">Record Adjustment</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Low & Out of Stock -->
            <div class="grid-2" style="margin-top:1.5rem;">
                <div class="card">
                    <div class="card-header"><h3>⚠️ Low Stock Products</h3></div>
                    <div class="card-body" style="padding:0;" id="lowStockList"></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>❌ Out of Stock Products</h3></div>
                    <div class="card-body" style="padding:0;" id="outStockList"></div>
                </div>
            </div>

            <!-- Recent Movements -->
            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header"><h3>Recent Stock Movements</h3></div>
                <div class="card-body" style="padding:0;" id="stockMovements"></div>
            </div>
        `);

        // Form handlers
        document.getElementById('addStockForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const resp = await App.api('/api/stock/add', { method: 'POST', body: Object.fromEntries(fd) });
            if (resp.success) { App.toast(resp.message); Stock.load(); }
            else { App.toast(resp.error.message, 'error'); }
        });

        document.getElementById('adjustStockForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const body = Object.fromEntries(fd);
            body.quantity = parseInt(body.quantity);

            const confirmed = await App.confirm('Confirm Adjustment', `Adjust stock by ${body.quantity > 0 ? '+' : ''}${body.quantity}? Reason: ${body.note}`);
            if (!confirmed) return;

            const resp = await App.api('/api/stock/adjust', { method: 'POST', body });
            if (resp.success) { App.toast(resp.message); Stock.load(); }
            else { App.toast(resp.error.message, 'error'); }
        });

        // Load sub-sections
        this.loadLowStock();
        this.loadOutStock();
        this.loadMovements();
    },

    async loadLowStock() {
        const data = await App.api('/api/stock/low');
        const el = document.getElementById('lowStockList');
        if (!el) return;
        if (!data.success || data.data.length === 0) {
            el.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p>No low stock products 👍</p></div>';
            return;
        }
        el.innerHTML = `<table class="recent-table"><thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead><tbody>
            ${data.data.map(p => `<tr><td>${p.name}</td><td style="color:var(--warning);font-weight:600;">${p.quantity}</td><td>${p.minimum_stock}</td></tr>`).join('')}
        </tbody></table>`;
    },

    async loadOutStock() {
        const data = await App.api('/api/stock/out');
        const el = document.getElementById('outStockList');
        if (!el) return;
        if (!data.success || data.data.length === 0) {
            el.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p>All products are in stock 👍</p></div>';
            return;
        }
        el.innerHTML = `<table class="recent-table"><thead><tr><th>Product</th><th>Category</th></tr></thead><tbody>
            ${data.data.map(p => `<tr><td>${p.name}</td><td>${p.category_name || '-'}</td></tr>`).join('')}
        </tbody></table>`;
    },

    async loadMovements() {
        const data = await App.api('/api/stock/movements?limit=10');
        const el = document.getElementById('stockMovements');
        if (!el || !data.success) return;

        if (data.data.length === 0) {
            el.innerHTML = '<div class="empty-state" style="padding:2rem;"><p>No stock movements yet</p></div>';
            return;
        }

        el.innerHTML = `<div class="table-container"><table class="recent-table"><thead><tr><th>Product</th><th>Type</th><th>Change</th><th>Result</th><th>Note</th><th>By</th><th>Date</th></tr></thead><tbody>
            ${data.data.map(m => `
                <tr>
                    <td>${m.product_name || '-'}</td>
                    <td><span class="movement-type movement-${m.type}">${m.type}</span></td>
                    <td style="font-weight:600;color:${m.quantity_change > 0 ? 'var(--success)' : 'var(--danger)'}">${m.quantity_change > 0 ? '+' : ''}${m.quantity_change}</td>
                    <td>${m.quantity_after}</td>
                    <td class="text-muted text-sm">${m.note || '-'}</td>
                    <td>${m.user_name || '-'}</td>
                    <td class="text-muted">${App.formatDate(m.created_at)}</td>
                </tr>
            `).join('')}
        </tbody></table></div>`;
    }
};
