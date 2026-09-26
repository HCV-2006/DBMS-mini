// ============================================
// Dashboard Page
// ============================================
const Dashboard = {
    charts: {},

    async load() {
        try {
            const data = await App.api('/api/dashboard');
            if (!data || !data.success) {
                App.setContent(`
                    <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger); margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        <h3>Failed to load dashboard data</h3>
                        <p class="text-muted">${data?.error?.message || 'Please check your connection and reload.'}</p>
                        <button class="btn btn-primary" onclick="Dashboard.load()" style="margin-top:1rem;">Retry</button>
                    </div>
                `);
                return;
            }

            const stats = data.data;

            App.setContent(`
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Total Products</h4>
                        <div class="stat-value">${stats.totalProducts}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Total Stock</h4>
                        <div class="stat-value">${stats.totalStock.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Low Stock</h4>
                        <div class="stat-value">${stats.lowStock}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Out of Stock</h4>
                        <div class="stat-value">${stats.outOfStock}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Today's Sales</h4>
                        <div class="stat-value">${App.formatCurrency(stats.todaySales)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l8.5 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Total Revenue</h4>
                        <div class="stat-value">${App.formatCurrency(stats.totalSales)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Transactions</h4>
                        <div class="stat-value">${stats.totalTransactions}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l8.5 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/></svg>
                    </div>
                    <div class="stat-info">
                        <h4>Today's Transactions</h4>
                        <div class="stat-value">${stats.todayTransactions}</div>
                    </div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card">
                    <div class="card-header">
                        <h3>Sales Overview (7 Days)</h3>
                        <span class="header-badge">Revenue Trend</span>
                    </div>
                    <div class="card-body">
                        <div class="chart-wrapper">
                            <canvas id="salesChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="card-header">
                        <h3>Top Selling Products</h3>
                        <span class="header-badge">By Sales Volume</span>
                    </div>
                    <div class="card-body" style="padding:0;">
                        <div id="topProductsList"></div>
                    </div>
                </div>
                <div class="chart-card" style="grid-column: span 2;">
                    <div class="card-header">
                        <h3>Recent Stock Movements</h3>
                        <span class="header-badge">Live Inventory Ledger</span>
                    </div>
                    <div class="card-body" style="padding:0;">
                        <div id="recentMovements"></div>
                    </div>
                </div>
            </div>
        `);

        this.loadSalesChart();
        this.loadTopProducts();
        this.loadRecentMovements();
    } catch (err) {
        console.error('Dashboard load error:', err);
        App.setContent(`
            <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger); margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <h3>Error loading dashboard</h3>
                <p class="text-muted">${err.message}</p>
                <button class="btn btn-primary" onclick="Dashboard.load()" style="margin-top:1rem;">Retry</button>
            </div>
        `);
    }
},

    async loadSalesChart() {
        const data = await App.api('/api/dashboard/sales?range=week');
        if (!data || !data.success) return;

        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        if (typeof Chart === 'undefined') {
            ctx.parentElement.innerHTML = '<p class="text-muted" style="text-align:center;padding:2.5rem 1rem;">Chart library unavailable.</p>';
            return;
        }

        // Destroy previous chart if exists
        if (this.charts.sales) this.charts.sales.destroy();

        const labels = data.data.map(d => {
            const [y, m, day] = d.date.split('-').map(Number);
            const date = new Date(Date.UTC(y, m - 1, day));
            return date.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' });
        });
        const values = data.data.map(d => d.total);

        this.charts.sales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Sales (₹)',
                    data: values,
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` Sales: ${App.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 11 },
                            callback: (value) => `₹${value.toLocaleString('en-IN')}`
                        },
                        grid: { color: '#f1f5f9' }
                    }
                }
            }
        });
    },

    async loadTopProducts() {
        const data = await App.api('/api/dashboard/top-products?limit=5');
        const container = document.getElementById('topProductsList');
        if (!container || !data.success) return;

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding:3rem 1rem;"><p>No sales recorded yet. Completed sales will rank here automatically.</p></div>';
            return;
        }

        const maxUnits = Math.max(...data.data.map(p => p.total_sold || 0), 1);

        container.innerHTML = data.data.map((p, i) => {
            const percent = Math.min(100, Math.max(12, Math.round((p.total_sold / maxUnits) * 100)));
            return `
                <div class="top-product-item">
                    <div class="top-product-rank rank-${i + 1}">${i + 1}</div>
                    <div class="top-product-info">
                        <div class="top-product-header">
                            <span class="top-product-name" title="${p.name}">
                                ${p.name}
                                ${p.sku ? `<code style="font-size:0.6875rem;font-weight:500;color:var(--text-secondary);background:#f1f5f9;padding:0.1rem 0.35rem;border-radius:4px;margin-left:0.35rem;">${p.sku}</code>` : ''}
                            </span>
                            <span class="top-product-revenue">${App.formatCurrency(p.total_revenue)}</span>
                        </div>
                        <div class="top-product-bar-container">
                            <div class="top-product-bar" style="width: ${percent}%;"></div>
                        </div>
                        <div class="top-product-meta">
                            <span><strong>${p.total_sold}</strong> ${p.total_sold === 1 ? 'unit' : 'units'} sold</span>
                            <span>Avg. ${App.formatCurrency(p.total_sold ? p.total_revenue / p.total_sold : 0)}/unit</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadRecentMovements() {
        const data = await App.api('/api/dashboard/recent-movements?limit=10');
        const container = document.getElementById('recentMovements');
        if (!container || !data.success) return;

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding:3rem 1rem;"><p>No stock movements recorded yet.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="recent-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Action Type</th>
                            <th style="text-align:right;">Quantity Change</th>
                            <th style="text-align:right;">Resulting Stock</th>
                            <th>Reference / Note</th>
                            <th>Recorded By</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(m => `
                            <tr>
                                <td><strong style="color:var(--text-primary);">${m.product_name || 'Product #' + m.product_id}</strong></td>
                                <td><code style="font-size:0.75rem;padding:0.15rem 0.45rem;background:#f1f5f9;border-radius:4px;color:var(--text-secondary);">${m.sku || '—'}</code></td>
                                <td><span class="movement-type movement-${m.type}">${m.type}</span></td>
                                <td style="text-align:right;font-weight:700;color:${m.quantity_change > 0 ? '#16a34a' : '#dc2626'};">
                                    ${m.quantity_change > 0 ? '+' : ''}${m.quantity_change}
                                </td>
                                <td style="text-align:right;font-weight:600;">
                                    ${m.quantity_after} units
                                </td>
                                <td class="text-muted" style="font-size:0.8rem;">
                                    ${m.note || (m.reference_id ? 'Sale #' + m.reference_id : '—')}
                                </td>
                                <td style="color:var(--text-secondary);font-size:0.8125rem;">${m.user_name || 'Administrator'}</td>
                                <td class="text-muted" style="font-size:0.78rem;">${App.formatDateTime(m.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};
