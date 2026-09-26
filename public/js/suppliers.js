// ============================================
// Suppliers Page
// ============================================
const Suppliers = {
    async load() {
        if (App.user.role === 'admin') {
            App.setTopbarActions(`
                <button class="btn btn-primary" onclick="Suppliers.showForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Add Supplier
                </button>
            `);
        }
        await this.fetchSuppliers();
    },

    async fetchSuppliers() {
        const data = await App.api('/api/suppliers');
        if (!data || !data.success) {
            App.setContent(`<div class="empty-state" style="padding:3rem 1rem; text-align:center;"><h3>Failed to load suppliers</h3><p class="text-muted">${data?.error?.message || 'Please try again.'}</p><button class="btn btn-primary" onclick="Suppliers.fetchSuppliers()" style="margin-top:1rem;">Retry</button></div>`);
            return;
        }

        App.setContent(`
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead><tr><th>Supplier</th><th>Phone</th><th>Email</th><th>Products</th>${App.user.role === 'admin' ? '<th>Actions</th>' : ''}</tr></thead>
                        <tbody>
                            ${data.data.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><h3>No suppliers yet</h3><p>Add your first supplier.</p></div></td></tr>` :
                            data.data.map(s => `
                                <tr>
                                    <td>
                                        <div><div style="font-weight:500;">${s.name}</div>${s.address ? `<div class="text-muted text-sm">${s.address}</div>` : ''}</div>
                                    </td>
                                    <td>${s.phone || '-'}</td>
                                    <td>${s.email || '-'}</td>
                                    <td>${s.product_count || 0}</td>
                                    ${App.user.role === 'admin' ? `<td>
                                        <div class="action-btns">
                                            <button class="btn btn-sm btn-secondary" onclick="Suppliers.showForm(${s.id})" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="Suppliers.deleteSupplier(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="Delete">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                            </button>
                                        </div>
                                    </td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `);
    },

    async showForm(id = null) {
        let supplier = null;
        if (id) {
            const resp = await App.api(`/api/suppliers/${id}`);
            if (resp.success) supplier = resp.data;
        }

        App.setContent(`
            <div class="form-card">
                <div class="card-header"><h3>${supplier ? 'Edit Supplier' : 'Add New Supplier'}</h3></div>
                <div class="card-body">
                    <form id="supplierForm">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Supplier Name <span class="required">*</span></label>
                                <input type="text" name="name" value="${supplier?.name || ''}" required minlength="2">
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phone" value="${supplier?.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value="${supplier?.email || ''}">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" name="address" value="${supplier?.address || ''}">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">${supplier ? 'Update Supplier' : 'Add Supplier'}</button>
                            <button type="button" class="btn btn-secondary" onclick="Suppliers.load()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `);

        document.getElementById('supplierForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const body = Object.fromEntries(form);
            const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers';
            const method = supplier ? 'PUT' : 'POST';

            const resp = await App.api(url, { method, body });
            if (resp.success) { App.toast(resp.message); Suppliers.load(); }
            else { App.toast(resp.error.message, 'error'); }
        });
    },

    async deleteSupplier(id, name) {
        const confirmed = await App.confirm(
            'Delete Supplier',
            `Are you sure you want to delete supplier "${name}"? This action cannot be undone.`,
            'Delete',
            'btn btn-danger'
        );
        if (!confirmed) return;

        const resp = await App.api(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (resp.success) { App.toast(resp.message); this.fetchSuppliers(); }
        else { App.toast(resp.error.message, 'error'); }
    }
};
