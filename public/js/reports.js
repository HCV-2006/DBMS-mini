// ============================================
// Reports Page
// ============================================
const Reports = {
    currentReport: 'inventory',

    async load() {
        App.setContent(`
            <div class="toolbar">
                <button class="btn ${this.currentReport === 'inventory' ? 'btn-primary' : 'btn-secondary'}" onclick="Reports.switchReport('inventory')">Inventory Report</button>
                <button class="btn ${this.currentReport === 'sales' ? 'btn-primary' : 'btn-secondary'}" onclick="Reports.switchReport('sales')">Sales Report</button>
                <button class="btn ${this.currentReport === 'top-products' ? 'btn-primary' : 'btn-secondary'}" onclick="Reports.switchReport('top-products')">Top Products</button>
                <button class="btn ${this.currentReport === 'stock-movements' ? 'btn-primary' : 'btn-secondary'}" onclick="Reports.switchReport('stock-movements')">Stock Movements</button>
            </div>
            <div id="reportContent">
                <div class="loading-spinner"><div class="spinner"></div><p>Loading report...</p></div>
            </div>
        `);

        this.loadReport();
    },

    switchReport(type) {
        this.currentReport = type;
        this.load();
    },

    async loadReport() {
        const container = document.getElementById('reportContent');
        if (!container) return;

        switch (this.currentReport) {
            case 'inventory': return this.loadInventoryReport(container);
            case 'sales': return this.loadSalesReport(container);
            case 'top-products': return this.loadTopProductsReport(container);
            case 'stock-movements': return this.loadStockMovementsReport(container);
        }
    },

    async loadInventoryReport(container) {
        const data = await App.api('/api/reports/inventory');
        if (!data || !data.success) {
            container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p>Failed to load inventory report.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Inventory Report (${data.data.length} products)</h3>
                    <button class="btn btn-sm btn-secondary" onclick="Reports.exportCSV('inventory')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        Export CSV
                    </button>
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Min</th><th>Price</th><th>Cost</th><th>Status</th></tr></thead>
                        <tbody>
                            ${data.data.map(r => `
                                <tr>
                                    <td>${r.name}</td>
                                    <td><code>${r.sku}</code></td>
                                    <td>${r.category || '-'}</td>
                                    <td style="font-weight:600;">${r.current_stock}</td>
                                    <td>${r.minimum_stock}</td>
                                    <td>${App.formatCurrency(r.price)}</td>
                                    <td>${r.cost_price ? App.formatCurrency(r.cost_price) : '-'}</td>
                                    <td>${r.status === 'Out of Stock' ? '<span class="badge badge-danger">Out of Stock</span>' : r.status === 'Low Stock' ? '<span class="badge badge-warning">Low Stock</span>' : '<span class="badge badge-success">In Stock</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async loadSalesReport(container) {
        const data = await App.api('/api/reports/sales');
        if (!data || !data.success) {
            container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p>Failed to load sales report.</p></div>';
            return;
        }

        const totalRevenue = data.data.reduce((s, r) => s + r.total_amount, 0);

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Sales Report (${data.data.length} sales · ${App.formatCurrency(totalRevenue)} total)</h3>
                    <button class="btn btn-sm btn-secondary" onclick="Reports.exportCSV('sales')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        Export CSV
                    </button>
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Sale ID</th><th>Date</th><th>Items</th><th>Total</th><th>Created By</th></tr></thead>
                        <tbody>
                            ${data.data.length === 0 ? '<tr><td colspan="5"><div class="empty-state"><p>No sales data</p></div></td></tr>' :
                            data.data.map(r => `
                                <tr>
                                    <td><span class="badge badge-primary">#${r.sale_id}</span></td>
                                    <td>${App.formatDateTime(r.date)}</td>
                                    <td>${r.items}</td>
                                    <td style="font-weight:600;">${App.formatCurrency(r.total_amount)}</td>
                                    <td>${r.created_by || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async loadTopProductsReport(container) {
        const data = await App.api('/api/reports/top-products?limit=20');
        if (!data || !data.success) {
            container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p>Failed to load top products report.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Top Selling Products</h3>
                    <button class="btn btn-sm btn-secondary" onclick="Reports.exportCSV('top-products')">Export CSV</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                        <tbody>
                            ${data.data.length === 0 ? '<tr><td colspan="5"><div class="empty-state"><p>No sales data yet</p></div></td></tr>' :
                            data.data.map((r, i) => `
                                <tr>
                                    <td><span class="top-product-rank">${i + 1}</span></td>
                                    <td style="font-weight:500;">${r.name}</td>
                                    <td><code>${r.sku}</code></td>
                                    <td style="font-weight:600;">${r.units_sold}</td>
                                    <td>${App.formatCurrency(r.revenue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async loadStockMovementsReport(container) {
        const data = await App.api('/api/reports/stock-movements');
        if (!data || !data.success) {
            container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p>Failed to load stock movements report.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Stock Movement Report (${data.data.length} entries)</h3>
                    <button class="btn btn-sm btn-secondary" onclick="Reports.exportCSV('stock-movements')">Export CSV</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Product</th><th>SKU</th><th>Type</th><th>Change</th><th>Result</th><th>Note</th><th>User</th><th>Date</th></tr></thead>
                        <tbody>
                            ${data.data.map(m => `
                                <tr>
                                    <td>${m.product}</td>
                                    <td><code>${m.sku}</code></td>
                                    <td><span class="movement-type movement-${m.type}">${m.type}</span></td>
                                    <td style="font-weight:600;color:${m.quantity_change > 0 ? 'var(--success)' : 'var(--danger)'}">${m.quantity_change > 0 ? '+' : ''}${m.quantity_change}</td>
                                    <td>${m.quantity_after}</td>
                                    <td class="text-muted text-sm">${m.note || '-'}</td>
                                    <td>${m.user || '-'}</td>
                                    <td class="text-muted">${App.formatDate(m.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async exportCSV(type) {
        const url = `/api/reports/${type}?format=csv`;
        try {
            const resp = await fetch(url, {
                headers: { 'X-CSRF-Token': App.csrfToken },
                credentials: 'same-origin'
            });
            const blob = await resp.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${type}_report.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            App.toast('Report exported successfully.');
        } catch (err) {
            App.toast('Export failed.', 'error');
        }
    }
};
