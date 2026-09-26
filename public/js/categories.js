// ============================================
// Categories Page
// ============================================
const Categories = {
    async load() {
        if (App.user.role === 'admin') {
            App.setTopbarActions(`
                <button class="btn btn-primary" onclick="Categories.showForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Add Category
                </button>
            `);
        }
        await this.fetchCategories();
    },

    async fetchCategories() {
        const data = await App.api('/api/categories');
        if (!data || !data.success) {
            App.setContent(`<div class="empty-state" style="padding:3rem 1rem; text-align:center;"><h3>Failed to load categories</h3><p class="text-muted">${data?.error?.message || 'Please try again.'}</p><button class="btn btn-primary" onclick="Categories.fetchCategories()" style="margin-top:1rem;">Retry</button></div>`);
            return;
        }

        App.setContent(`
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead><tr><th>Category</th><th>Products</th><th>Created</th>${App.user.role === 'admin' ? '<th>Actions</th>' : ''}</tr></thead>
                        <tbody>
                            ${data.data.length === 0 ? `<tr><td colspan="4"><div class="empty-state"><h3>No categories yet</h3><p>Add your first category to organize products.</p></div></td></tr>` :
                            data.data.map(c => `
                                <tr>
                                    <td style="font-weight:500;">${c.name}</td>
                                    <td>${c.product_count || 0}</td>
                                    <td class="text-muted">${App.formatDate(c.created_at)}</td>
                                    ${App.user.role === 'admin' ? `<td>
                                        <div class="action-btns">
                                            <button class="btn btn-sm btn-secondary" onclick="Categories.showForm(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="Categories.deleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Delete">
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

    showForm(id = null, currentName = '') {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = id ? 'Edit Category' : 'Add Category';
        document.getElementById('confirmMessage').innerHTML = `
            <div class="form-group" style="margin-bottom:0;">
                <label>Category Name <span class="required">*</span></label>
                <input type="text" id="categoryNameInput" value="${currentName}" required minlength="2" placeholder="Enter category name" style="width:100%;padding:0.625rem;border:1px solid var(--border-color);border-radius:var(--radius);font-size:0.875rem;">
            </div>
        `;
        document.getElementById('confirmOk').textContent = id ? 'Update' : 'Create';
        document.getElementById('confirmOk').className = 'btn btn-primary';
        modal.classList.add('active');

        const okBtn = document.getElementById('confirmOk');
        const handler = async () => {
            const name = document.getElementById('categoryNameInput').value.trim();
            if (!name || name.length < 2) { App.toast('Name must be at least 2 characters.', 'error'); return; }

            const url = id ? `/api/categories/${id}` : '/api/categories';
            const method = id ? 'PUT' : 'POST';
            const resp = await App.api(url, { method, body: { name } });

            modal.classList.remove('active');
            okBtn.removeEventListener('click', handler);

            if (resp.success) { App.toast(resp.message); Categories.fetchCategories(); }
            else { App.toast(resp.error.message, 'error'); }
        };
        okBtn.addEventListener('click', handler);
    },

    async deleteCategory(id, name) {
        const confirmed = await App.confirm(
            'Delete Category',
            `Are you sure you want to delete category "${name}"? This action cannot be undone.`,
            'Delete',
            'btn btn-danger'
        );
        if (!confirmed) return;

        const resp = await App.api(`/api/categories/${id}`, { method: 'DELETE' });
        if (resp.success) { App.toast(resp.message); this.fetchCategories(); }
        else { App.toast(resp.error.message, 'error'); }
    }
};
