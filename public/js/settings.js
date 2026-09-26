// ============================================
// Settings Page
// ============================================
const Settings = {
    async load() {
        if (App.user.role !== 'admin') {
            App.setContent('<div class="empty-state"><h3>Access Denied</h3><p>Only administrators can access settings.</p></div>');
            return;
        }

        const data = await App.api('/api/settings');
        if (!data.success) return;
        const s = data.data;

        App.setContent(`
            <div class="form-card" style="max-width:640px;">
                <div class="card-header"><h3>Application Settings</h3></div>
                <div class="card-body">
                    <form id="settingsForm" class="settings-form">
                        <div class="form-group">
                            <label>Application Name</label>
                            <input type="text" name="app_name" value="${s.app_name || 'Inventory Management System'}">
                        </div>
                        <div class="form-group">
                            <label>Currency Symbol</label>
                            <input type="text" name="currency" value="${s.currency || '₹'}" maxlength="5">
                        </div>
                        <div class="form-group">
                            <label>Currency Code</label>
                            <input type="text" name="currency_code" value="${s.currency_code || 'INR'}" maxlength="5">
                        </div>
                        <div class="form-group">
                            <label>Default Minimum Stock</label>
                            <input type="number" name="default_minimum_stock" value="${s.default_minimum_stock || 10}" min="0">
                        </div>
                        <div class="form-group">
                            <label>Items Per Page</label>
                            <select name="items_per_page">
                                ${[10, 20, 30, 50, 100].map(v => `<option value="${v}" ${(s.items_per_page || '20') == v ? 'selected' : ''}>${v}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Session Timeout (minutes)</label>
                            <input type="number" name="session_timeout" value="${s.session_timeout || 30}" min="5" max="480">
                        </div>
                        <div class="form-actions" style="border-top:none;padding-top:0.5rem;">
                            <button type="submit" class="btn btn-primary">Save Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        `);

        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const body = Object.fromEntries(fd);

            const resp = await App.api('/api/settings', { method: 'PUT', body });
            if (resp.success) {
                App.toast(resp.message);
                // Update local currency
                App.currency = body.currency || '₹';
            } else {
                App.toast(resp.error.message, 'error');
            }
        });
    }
};
