// ============================================
// PENNYPAL – PERSONAL FINANCE MANAGER
// Full bug-fix & feature-complete rewrite
// ============================================

class FinanceManager {
    constructor() {
        this.transactions = [];
        this.goals = [];
        this.budgets = {
            food:           800,
            transportation: 400,
            entertainment:  300,
            shopping:       500,
            utilities:      1200,
            healthcare:     300,
            education:      200,
            other:          200
        };
        this.deleteItem = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupTheme();
        this.setupEventListeners();
        this.render();
    }

    // ============================================
    // STORAGE
    // ============================================
    saveToStorage() {
        try {
            localStorage.setItem('financeData', JSON.stringify({
                transactions: this.transactions,
                goals:        this.goals,
                budgets:      this.budgets
            }));
        } catch (e) {
            this.showNotification('Could not save data – storage may be full.', 'error');
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem('financeData');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            this.transactions = parsed.transactions || [];
            this.goals        = parsed.goals        || [];
            // Merge stored budgets with defaults so new categories always appear
            this.budgets = Object.assign({}, this.budgets, parsed.budgets || {});
        } catch (e) {
            console.warn('Could not load saved data:', e);
        }
    }

    // ============================================
    // THEME
    // ============================================
    setupTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        this._applyTheme(theme);

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem('theme')) {
                    this._applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    _applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            this._setThemeIcon('☀️');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            this._setThemeIcon('🌙');
        }
    }

    _setThemeIcon(icon) {
        const el = document.querySelector('.theme-toggle-icon');
        if (el) el.textContent = icon;
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    showNotification(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span>
                           <span class="toast-msg">${this._escapeHtml(message)}</span>
                           <button class="toast-close" aria-label="Dismiss">✕</button>`;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this._dismissToast(toast);
        });

        container.appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('toast-visible'));

        // Auto-dismiss after 3.5 s
        setTimeout(() => this._dismissToast(toast), 3500);
    }

    _dismissToast(toast) {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 300);
    }

    // ============================================
    // HTML ESCAPE (XSS prevention)
    // ============================================
    _escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ============================================
    // UNIQUE ID  (collision-safe)
    // ============================================
    _uid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    // ============================================
    // DATE HELPERS  (timezone-safe)
    // ============================================

    // Parse a YYYY-MM-DD string as LOCAL midnight (not UTC)
    _parseLocalDate(dateStr) {
        if (!dateStr) return new Date(NaN);
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    // Return today's date as YYYY-MM-DD in local time
    getTodayDate() {
        const t = new Date();
        const y = t.getFullYear();
        const m = String(t.getMonth() + 1).padStart(2, '0');
        const d = String(t.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Friendly display: "Today", "Yesterday", or "Apr 5"
    formatDate(dateStr) {
        const date      = this._parseLocalDate(dateStr);
        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime())     return 'Today';
        if (date.getTime() === yesterday.getTime()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Days until deadline (0 if passed)
    getDaysUntilDeadline(deadlineStr) {
        const today    = new Date(); today.setHours(0, 0, 0, 0);
        const deadline = this._parseLocalDate(deadlineStr); deadline.setHours(0, 0, 0, 0);
        const diff     = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return Math.max(diff, 0);
    }

    // Is dateStr within the last 30 days (inclusive of today)?
    _isLast30Days(dateStr) {
        const date  = this._parseLocalDate(dateStr); date.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const ago30 = new Date(today); ago30.setDate(today.getDate() - 29); // 29 days back = 30-day window
        return date >= ago30 && date <= today;
    }

    // Is dateStr within the last N days?
    _isLastNDays(dateStr, n) {
        const date  = this._parseLocalDate(dateStr); date.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const ago   = new Date(today); ago.setDate(today.getDate() - (n - 1));
        return date >= ago && date <= today;
    }

    // ============================================
    // CURRENCY FORMATTER
    // ============================================
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style:    'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // ============================================
    // CATEGORY HELPERS
    // ============================================
    _categoryIcons() {
        return {
            food:           '🍽️',
            transportation: '🚗',
            entertainment:  '🎬',
            shopping:       '🛍️',
            utilities:      '💡',
            healthcare:     '🏥',
            education:      '📚',
            savings:        '🏦',
            other:          '📌',
            income:         '📈'
        };
    }

    _categoryNames() {
        return {
            food:           'Food & Dining',
            transportation: 'Transportation',
            entertainment:  'Entertainment',
            shopping:       'Shopping',
            utilities:      'Bills & Utilities',
            healthcare:     'Healthcare',
            education:      'Education',
            savings:        'Goal Savings',
            income:         'Income',
            other:          'Other'
        };
    }

    getCategoryName(cat) {
        return this._categoryNames()[cat] || cat;
    }

    // ============================================
    // PRE-COMPUTE SPENDING MAP  (O(n) not O(n²))
    // ============================================
    _buildSpendingMap(filterFn) {
        const map = {};
        for (const t of this.transactions) {
            if (t.type !== 'expense') continue;
            if (t.goalSaving) continue;           // savings are not a budget category
            if (filterFn && !filterFn(t)) continue;
            map[t.category] = (map[t.category] || 0) + t.amount;
        }
        return map;
    }

    // ============================================
    // VALIDATION HELPERS
    // ============================================
    _showFieldError(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
    }
    _clearFieldErrors(...ids) {
        ids.forEach(id => this._showFieldError(id, ''));
    }

    _validateAmount(val, errorId) {
        const n = parseFloat(val);
        if (isNaN(n) || n <= 0) {
            this._showFieldError(errorId, 'Please enter an amount greater than $0.00');
            return null;
        }
        // Round to 2 decimal places
        return Math.round(n * 100) / 100;
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Theme
        document.getElementById('themeToggle').addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            this._applyTheme(isDark ? 'light' : 'dark');
        });

        // Open modals
        document.getElementById('addTransactionBtn').addEventListener('click', () => this.openTransactionModal());
        document.getElementById('addGoalBtn').addEventListener('click',         () => this.openGoalModal());
        document.getElementById('editBudgetsBtn').addEventListener('click',     () => this.openEditBudgetsModal());

        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', e => { e.preventDefault(); this.addTransaction(); });
        document.getElementById('closeTransactionModal').addEventListener('click',  () => this.closeModal('transactionModal'));
        document.getElementById('cancelTransactionBtn').addEventListener('click',   () => this.closeModal('transactionModal'));

        // Transaction type → show/hide category
        document.querySelectorAll('input[name="type"]').forEach(r =>
            r.addEventListener('change', e => {
                document.getElementById('categorySection').style.display =
                    e.target.value === 'income' ? 'none' : 'block';
            })
        );

        // Edit transaction form
        document.getElementById('editTransactionForm').addEventListener('submit', e => { e.preventDefault(); this.updateTransaction(); });
        document.getElementById('closeEditTransactionModal').addEventListener('click', () => this.closeModal('editTransactionModal'));
        document.getElementById('cancelEditTransactionBtn').addEventListener('click',  () => this.closeModal('editTransactionModal'));

        document.querySelectorAll('input[name="editType"]').forEach(r =>
            r.addEventListener('change', e => {
                document.getElementById('editCategorySection').style.display =
                    e.target.value === 'income' ? 'none' : 'block';
            })
        );

        // Goal form
        document.getElementById('goalForm').addEventListener('submit', e => { e.preventDefault(); this.addGoal(); });
        document.getElementById('closeGoalModal').addEventListener('click',  () => this.closeModal('goalModal'));
        document.getElementById('cancelGoalBtn').addEventListener('click',   () => this.closeModal('goalModal'));

        // Edit goal form
        document.getElementById('editGoalForm').addEventListener('submit', e => { e.preventDefault(); this.updateGoal(); });
        document.getElementById('closeEditGoalModal').addEventListener('click', () => this.closeModal('editGoalModal'));
        document.getElementById('cancelEditGoalBtn').addEventListener('click',  () => this.closeModal('editGoalModal'));

        // Edit budgets form
        document.getElementById('editBudgetsForm').addEventListener('submit', e => { e.preventDefault(); this.saveBudgets(); });
        document.getElementById('closeEditBudgetsModal').addEventListener('click', () => this.closeModal('editBudgetsModal'));
        document.getElementById('cancelEditBudgetsBtn').addEventListener('click',  () => this.closeModal('editBudgetsModal'));

        // Delete modal
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.executeDelete());
        document.getElementById('closeDeleteModal').addEventListener('click',  () => this.closeModal('deleteConfirmModal'));
        document.getElementById('cancelDeleteBtn').addEventListener('click',   () => this.closeModal('deleteConfirmModal'));

        // Filter
        document.getElementById('transactionFilter').addEventListener('change', () => this.renderTransactions());

        // Close on overlay click
        document.querySelectorAll('.modal').forEach(modal =>
            modal.addEventListener('click', e => {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    this.closeModal(modal.id);
                }
            })
        );

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                document.getElementById('themeToggle').click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openTransactionModal();
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => this.closeModal(m.id));
            }
        });
    }

    // ============================================
    // MODAL MANAGEMENT
    // ============================================
    openModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.add('active'); m.removeAttribute('aria-hidden'); }
    }

    closeModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.remove('active'); m.setAttribute('aria-hidden', 'true'); }
    }

    openTransactionModal() {
        // Manually reset without using form.reset() to avoid race condition
        const today = this.getTodayDate();
        document.querySelector('input[name="type"][value="expense"]').checked = true;
        document.querySelector('input[name="category"][value="food"]').checked = true;
        document.getElementById('amount').value      = '';
        document.getElementById('description').value = '';
        document.getElementById('date').value        = today;
        document.getElementById('notes').value       = '';
        document.getElementById('categorySection').style.display = 'block';
        this._clearFieldErrors('amountError', 'dateError');
        this.openModal('transactionModal');
        // Focus first interactive element
        setTimeout(() => document.getElementById('amount').focus(), 100);
    }

    openGoalModal() {
        document.getElementById('goalName').value      = '';
        document.getElementById('targetAmount').value  = '';
        document.getElementById('currentAmount').value = '0';
        document.getElementById('deadline').value      = '';
        document.getElementById('goalCategory').value  = '';
        this._clearFieldErrors('goalNameError','targetAmountError','currentAmountError','deadlineError','goalCategoryError');
        this.openModal('goalModal');
        setTimeout(() => document.getElementById('goalName').focus(), 100);
    }

    openEditTransactionModal(id) {
        const t = this.transactions.find(tx => tx.id === id);
        if (!t) return;

        document.getElementById('editTransactionId').value = id;
        document.querySelector(`input[name="editType"][value="${t.type}"]`).checked = true;

        const catSection = document.getElementById('editCategorySection');
        if (t.type === 'income') {
            catSection.style.display = 'none';
        } else {
            catSection.style.display = 'block';
            const catRadio = document.querySelector(`input[name="editCategory"][value="${t.category}"]`);
            if (catRadio) catRadio.checked = true;
        }

        document.getElementById('editAmount').value      = t.amount;
        document.getElementById('editDescription').value = t.description || '';
        document.getElementById('editDate').value        = t.date;
        document.getElementById('editNotes').value       = t.notes || '';
        this._clearFieldErrors('editAmountError', 'editDateError');
        this.openModal('editTransactionModal');
    }

    openEditGoalModal(id) {
        const g = this.goals.find(goal => goal.id === id);
        if (!g) return;

        document.getElementById('editGoalId').value            = id;
        document.getElementById('editGoalName').value          = g.name;
        document.getElementById('editTargetAmount').value      = g.targetAmount;
        document.getElementById('editCurrentAmount').value     = g.currentAmount;
        document.getElementById('editDeadline').value          = g.deadline;
        document.getElementById('editGoalCategory').value      = g.category;
        this._clearFieldErrors('editGoalNameError','editTargetAmountError','editDeadlineError','editGoalCategoryError');
        this.openModal('editGoalModal');
    }

    openEditBudgetsModal() {
        const icons = this._categoryIcons();
        const names = this._categoryNames();
        let html = '';
        for (const [cat, amount] of Object.entries(this.budgets)) {
            html += `
              <div class="budget-edit-row">
                <label class="budget-edit-label" for="budget_${cat}">
                  <span class="budget-edit-icon">${icons[cat] || '📌'}</span>
                  ${this._escapeHtml(names[cat] || cat)}
                </label>
                <div class="amount-input-wrapper budget-edit-input">
                  <span class="amount-currency">$</span>
                  <input type="number" id="budget_${cat}" name="budget_${cat}"
                         min="0" step="1" value="${amount}" class="amount-input"
                         data-category="${cat}">
                </div>
              </div>`;
        }
        document.getElementById('budgetEditGrid').innerHTML = html;
        this.openModal('editBudgetsModal');
    }

    openDeleteConfirmation(itemType, id) {
        this.deleteItem = { type: itemType, id };
        const msgEl = document.getElementById('deleteMessage');
        if (itemType === 'transaction') {
            const t = this.transactions.find(tx => tx.id === id);
            msgEl.textContent = `Delete the transaction "${t?.description || 'Untitled'}"?`;
        } else if (itemType === 'goal') {
            const g = this.goals.find(goal => goal.id === id);
            msgEl.textContent = `Delete the goal "${g?.name || 'Unnamed'}"?`;
        }
        this.openModal('deleteConfirmModal');
    }

    // ============================================
    // TRANSACTION CRUD
    // ============================================
    addTransaction() {
        this._clearFieldErrors('amountError', 'dateError');
        const form     = document.getElementById('transactionForm');
        const formData = new FormData(form);

        const amount = this._validateAmount(formData.get('amount'), 'amountError');
        if (amount === null) return;

        const date = formData.get('date');
        if (!date) { this._showFieldError('dateError', 'Please select a date.'); return; }

        const type     = formData.get('type');
        const category = type === 'income' ? 'income' : (formData.get('category') || 'other');

        const transaction = {
            id:          this._uid(),
            type,
            category,
            description: (formData.get('description') || '').trim(),
            amount,
            date,
            notes:       (formData.get('notes') || '').trim(),
            createdAt:   new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.render();
        this.closeModal('transactionModal');
        this.showNotification(`Transaction added: ${this.formatCurrency(amount)}`, 'success');
    }

    updateTransaction() {
        this._clearFieldErrors('editAmountError', 'editDateError');
        const id       = document.getElementById('editTransactionId').value;
        const formData = new FormData(document.getElementById('editTransactionForm'));

        const amount = this._validateAmount(formData.get('editAmount'), 'editAmountError');
        if (amount === null) return;

        const date = formData.get('editDate');
        if (!date) { this._showFieldError('editDateError', 'Please select a date.'); return; }

        const idx = this.transactions.findIndex(t => t.id === id);
        if (idx === -1) { this.showNotification('Transaction not found.', 'error'); return; }

        const type     = formData.get('editType');
        const category = type === 'income' ? 'income' : (formData.get('editCategory') || 'other');

        this.transactions[idx] = {
            ...this.transactions[idx],
            type,
            category,
            description: (formData.get('editDescription') || '').trim(),
            amount,
            date,
            notes:       (formData.get('editNotes') || '').trim()
        };

        this.saveToStorage();
        this.render();
        this.closeModal('editTransactionModal');
        this.showNotification('Transaction updated successfully.', 'success');
    }

    deleteTransaction(id) {
        const tx = this.transactions.find(t => t.id === id);

        // If this was a goal-saving transaction, reverse the goal's saved amount
        if (tx && tx.goalSaving && tx.goalId) {
            const goal = this.goals.find(g => g.id === tx.goalId);
            if (goal) {
                goal.currentAmount = Math.round(
                    Math.max(goal.currentAmount - tx.amount, 0) * 100
                ) / 100;
                this.showNotification(
                    `Reversed ${this.formatCurrency(tx.amount)} from "${goal.name}".`,
                    'warning'
                );
            }
        }

        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage();
        this.render();
    }

    // ============================================
    // GOAL CRUD
    // ============================================
    addGoal() {
        this._clearFieldErrors('goalNameError','targetAmountError','currentAmountError','deadlineError','goalCategoryError');
        const formData = new FormData(document.getElementById('goalForm'));

        const name = (formData.get('goalName') || '').trim();
        if (!name) { this._showFieldError('goalNameError', 'Please enter a goal name.'); return; }

        const targetAmount = this._validateAmount(formData.get('targetAmount'), 'targetAmountError');
        if (targetAmount === null) return;

        const currentRaw    = parseFloat(formData.get('currentAmount')) || 0;
        const currentAmount = Math.min(Math.max(Math.round(currentRaw * 100) / 100, 0), targetAmount);

        const deadline = formData.get('deadline');
        if (!deadline) { this._showFieldError('deadlineError', 'Please select a target date.'); return; }

        const category = formData.get('goalCategory');
        if (!category) { this._showFieldError('goalCategoryError', 'Please select a category.'); return; }

        this.goals.push({
            id: this._uid(),
            name,
            targetAmount,
            currentAmount,
            deadline,
            category,
            createdAt: new Date().toISOString()
        });

        this.saveToStorage();
        this.render();
        this.closeModal('goalModal');
        this.showNotification(`Goal "${name}" created!`, 'success');
    }

    updateGoal() {
        const id       = document.getElementById('editGoalId').value;
        const formData = new FormData(document.getElementById('editGoalForm'));
        let   hasError = false;

        const name = (formData.get('editGoalName') || '').trim();
        if (!name) {
            this._showFieldError('editGoalNameError', 'Please enter a goal name.');
            hasError = true;
        } else {
            this._showFieldError('editGoalNameError', '');
        }

        const targetRaw    = parseFloat(formData.get('editTargetAmount'));
        const targetAmount = isNaN(targetRaw) || targetRaw <= 0 ? null : Math.round(targetRaw * 100) / 100;
        if (targetAmount === null) {
            this._showFieldError('editTargetAmountError', 'Please enter an amount greater than $0.00');
            hasError = true;
        } else {
            this._showFieldError('editTargetAmountError', '');
        }

        const deadline = formData.get('editDeadline');
        if (!deadline) {
            this._showFieldError('editDeadlineError', 'Please select a target date.');
            hasError = true;
        } else {
            this._showFieldError('editDeadlineError', '');
        }

        const category = formData.get('editGoalCategory');
        if (!category) {
            this._showFieldError('editGoalCategoryError', 'Please select a category.');
            hasError = true;
        } else {
            this._showFieldError('editGoalCategoryError', '');
        }

        if (hasError) return;

        const currentRaw    = Math.round(parseFloat(formData.get('editCurrentAmount')) * 100) / 100 || 0;
        const currentAmount = Math.min(Math.max(currentRaw, 0), targetAmount);

        const idx = this.goals.findIndex(g => g.id === id);
        if (idx === -1) { this.showNotification('Goal not found.', 'error'); return; }

        this.goals[idx] = { ...this.goals[idx], name, targetAmount, currentAmount, deadline, category };
        this.saveToStorage();
        this.render();
        this.closeModal('editGoalModal');
        this.showNotification('Goal updated successfully.', 'success');
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.saveToStorage();
        this.render();
    }

    updateGoalAmount(goalId, amount) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;

        const remaining = Math.round((goal.targetAmount - goal.currentAmount) * 100) / 100;
        const add       = Math.round(Math.min(amount, remaining) * 100) / 100;
        if (add <= 0) return;

        // 1. Update the goal's saved amount
        goal.currentAmount = Math.round((goal.currentAmount + add) * 100) / 100;

        // 2. Create a real expense transaction so it shows in history and reduces balance
        const savingTx = {
            id:          this._uid(),
            type:        'expense',
            category:    'savings',
            goalSaving:  true,                          // flag — not a budget category
            goalId:      goal.id,
            goalName:    goal.name,
            description: `Saved for: ${goal.name}`,
            amount:      add,
            date:        this.getTodayDate(),
            notes:       `Goal contribution — ${goal.name}`,
            createdAt:   new Date().toISOString()
        };
        this.transactions.unshift(savingTx);

        this.saveToStorage();
        this.render();

        if (goal.currentAmount >= goal.targetAmount) {
            this.showNotification(`🎉 Goal "${goal.name}" is now complete!`, 'success');
        } else {
            const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            this.showNotification(
                `${this.formatCurrency(add)} saved toward "${goal.name}" — ${pct}% complete.`,
                'info'
            );
        }
    }

    // ============================================
    // BUDGET CRUD
    // ============================================
    saveBudgets() {
        const inputs = document.querySelectorAll('#budgetEditGrid input[data-category]');
        let changed = false;
        inputs.forEach(input => {
            const cat = input.dataset.category;
            const val = Math.max(0, Math.round(parseFloat(input.value) || 0));
            if (this.budgets[cat] !== val) {
                this.budgets[cat] = val;
                changed = true;
            }
        });
        this.saveToStorage();
        this.render();
        this.closeModal('editBudgetsModal');
        this.showNotification(changed ? 'Budget limits updated.' : 'No changes to save.', changed ? 'success' : 'info');
    }

    // ============================================
    // UNIFIED DELETE
    // ============================================
    executeDelete() {
        if (!this.deleteItem) return;
        const { type, id } = this.deleteItem;
        if (type === 'transaction') {
            this.deleteTransaction(id);
            this.showNotification('Transaction deleted.', 'info');
        } else if (type === 'goal') {
            this.deleteGoal(id);
            this.showNotification('Goal deleted.', 'info');
        }
        this.deleteItem = null;
        this.closeModal('deleteConfirmModal');
    }

    // ============================================
    // RENDER COORDINATOR
    // ============================================
    render() {
        this.updateOverviewCards();
        this.renderNetSavings();
        this.renderBudgetOverview();
        this.renderSpendingChart();
        this.renderTransactions();
        this.renderGoals();
    }

    // ============================================
    // OVERVIEW CARDS
    // ============================================
    updateOverviewCards() {
        // --- All-time balance ---
        let totalBalance = 0;
        for (const t of this.transactions) {
            totalBalance += t.type === 'income' ? t.amount : -t.amount;
        }
        totalBalance = Math.round(totalBalance * 100) / 100;

        // --- Last 30 days income & expenses ---
        let income30   = 0;
        let expenses30 = 0;
        for (const t of this.transactions) {
            if (!this._isLast30Days(t.date)) continue;
            if (t.type === 'income')   income30   += t.amount;
            if (t.type === 'expense')  expenses30 += t.amount;
        }
        income30   = Math.round(income30   * 100) / 100;
        expenses30 = Math.round(expenses30 * 100) / 100;

        // --- Budget used (last 30 days) ---
        const spending30 = this._buildSpendingMap(t => this._isLast30Days(t.date));
        let budgetUsed  = 0;
        let totalBudget = 0;
        for (const [cat, limit] of Object.entries(this.budgets)) {
            totalBudget += limit;
            budgetUsed  += Math.min(spending30[cat] || 0, limit * 2); // cap at 2× for display
        }
        budgetUsed  = Math.round(budgetUsed  * 100) / 100;
        totalBudget = Math.round(totalBudget * 100) / 100;

        // Recalculate without cap for actual used
        let actualUsed = 0;
        for (const cat of Object.keys(this.budgets)) {
            actualUsed += spending30[cat] || 0;
        }
        actualUsed = Math.round(actualUsed * 100) / 100;

        const budgetPct = totalBudget > 0 ? Math.round((actualUsed / totalBudget) * 100) : 0;

        // DOM updates
        const balanceEl = document.getElementById('totalBalance');
        balanceEl.textContent = this.formatCurrency(totalBalance);
        balanceEl.className   = `overview-card-value ${totalBalance >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('monthlyIncome').textContent   = this.formatCurrency(income30);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(expenses30);

        const pctEl = document.getElementById('budgetPercentage');
        pctEl.textContent = `${budgetPct}%`;
        pctEl.className   = `overview-card-value ${budgetPct >= 100 ? 'negative' : budgetPct >= 80 ? 'warning-text' : 'neutral'}`;

        document.getElementById('budgetDetail').textContent =
            `${this.formatCurrency(actualUsed)} of ${this.formatCurrency(totalBudget)}`;
    }

    // ============================================
    // NET SAVINGS BAR
    // ============================================
    renderNetSavings() {
        let income30   = 0;
        let expenses30 = 0;
        for (const t of this.transactions) {
            if (!this._isLast30Days(t.date)) continue;
            if (t.type === 'income')  income30   += t.amount;
            if (t.type === 'expense') expenses30 += t.amount;
        }
        income30   = Math.round(income30   * 100) / 100;
        expenses30 = Math.round(expenses30 * 100) / 100;

        const net         = Math.round((income30 - expenses30) * 100) / 100;
        const savingsRate = income30 > 0 ? Math.round((net / income30) * 100) : 0;
        const barWidth    = income30 > 0 ? Math.min(Math.max((net / income30) * 100, 0), 100) : 0;

        const amountEl = document.getElementById('netSavingsAmount');
        const barEl    = document.getElementById('netSavingsBar');
        const labelEl  = document.getElementById('netSavingsLabel');
        const statusEl = document.getElementById('netSavingsStatus');

        if (!amountEl) return;

        amountEl.textContent = this.formatCurrency(net);
        amountEl.className   = `net-savings-amount ${net >= 0 ? 'positive' : 'negative'}`;

        barEl.style.width    = `${barWidth}%`;
        barEl.className      = `progress-fill ${net >= 0 ? 'success' : 'danger'}`;

        labelEl.textContent  = `Savings rate: ${savingsRate}%`;

        if (income30 === 0) {
            statusEl.textContent = 'No income recorded';
            statusEl.className   = 'net-status neutral';
        } else if (net >= 0) {
            statusEl.textContent = net === 0 ? 'Break-even' : '↑ Saving';
            statusEl.className   = 'net-status positive';
        } else {
            statusEl.textContent = '↓ Overspending';
            statusEl.className   = 'net-status negative';
        }
    }

    // ============================================
    // BUDGET OVERVIEW
    // ============================================
    renderBudgetOverview() {
        const container  = document.getElementById('budgetContainer');
        const icons      = this._categoryIcons();
        const names      = this._categoryNames();
        const spending30 = this._buildSpendingMap(t => this._isLast30Days(t.date));

        let html = '';
        for (const [cat, budget] of Object.entries(this.budgets)) {
            const spent      = Math.round((spending30[cat] || 0) * 100) / 100;
            const pct        = budget > 0 ? (spent / budget) * 100 : 0;
            const remaining  = Math.max(budget - spent, 0);
            const over       = Math.max(spent - budget, 0);
            const status     = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'on-track';
            const fillClass  = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
            const statusText = pct >= 100 ? 'Over Budget' : pct >= 80 ? 'Near Limit' : 'On Track';

            html += `
              <div class="budget-item">
                <div class="budget-header">
                  <div class="budget-category">
                    <span class="budget-icon">${icons[cat] || '📌'}</span>
                    <span class="budget-name">${this._escapeHtml(names[cat] || cat)}</span>
                  </div>
                  <div class="budget-amount">
                    <div class="budget-amount-value">${this.formatCurrency(spent)} / ${this.formatCurrency(budget)}</div>
                    <div class="budget-status ${status}">${statusText}</div>
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${fillClass}" style="width:${Math.min(pct, 100).toFixed(1)}%"></div>
                </div>
                <div class="budget-footer">
                  <span>${pct.toFixed(0)}% used</span>
                  <span>${pct >= 100
                    ? `<span class="over-text">+${this.formatCurrency(over)} over</span>`
                    : `${this.formatCurrency(remaining)} left`}</span>
                </div>
              </div>`;
        }

        container.innerHTML = html ||
            `<div class="empty-state"><div class="empty-state-icon">📊</div>
             <div class="empty-state-title">No Budget Data</div></div>`;
    }

    // ============================================
    // SPENDING CHART (7 days)
    // ============================================
    renderSpendingChart() {
        const container = document.getElementById('spendingChart');
        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const dayNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

        const days    = [];
        const amounts = [];
        const dateStrs= [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            dateStrs.push(ds);
            days.push(i === 0 ? 'Today' : dayNames[d.getDay()]);
        }

        // Build a date → spend map once (exclude goal savings — they're not "spending")
        const spendByDate = {};
        for (const t of this.transactions) {
            if (t.type !== 'expense') continue;
            if (t.goalSaving) continue;
            spendByDate[t.date] = Math.round(((spendByDate[t.date] || 0) + t.amount) * 100) / 100;
        }
        for (const ds of dateStrs) {
            amounts.push(spendByDate[ds] || 0);
        }

        const total7d   = amounts.reduce((s, a) => s + a, 0);
        const maxVal    = Math.max(...amounts);
        const hasData   = maxVal > 0;

        // Update chart total label
        const totalLabel = document.getElementById('chartTotalLabel');
        if (totalLabel) {
            totalLabel.textContent = hasData
                ? `7-day total: ${this.formatCurrency(total7d)}`
                : '';
        }

        if (!hasData) {
            container.innerHTML = `
              <div class="empty-state" style="height:260px">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-title">No spending in the last 7 days</div>
                <div class="empty-state-subtitle">Add expense transactions to see your chart</div>
              </div>`;
            return;
        }

        // Y-axis scale: round up to a nice number
        const niceMax = this._niceNumber(maxVal);

        let html = `
          <div class="chart-y-labels">
            <span>${this.formatCurrency(niceMax)}</span>
            <span>${this.formatCurrency(niceMax * 0.75)}</span>
            <span>${this.formatCurrency(niceMax * 0.5)}</span>
            <span>${this.formatCurrency(niceMax * 0.25)}</span>
            <span>$0</span>
          </div>
          <div class="chart-inner">
            <div class="chart-grid">
              <div class="chart-grid-line"></div>
              <div class="chart-grid-line"></div>
              <div class="chart-grid-line"></div>
              <div class="chart-grid-line"></div>
            </div>
            <div class="chart-bars">`;

        amounts.forEach((amount, i) => {
            const heightPct  = (amount / niceMax) * 100;
            const isToday    = i === 6;
            const colorClass = amount === 0 ? 'bar-zero'
                             : amount > niceMax * 0.75 ? 'bar-high'
                             : amount > niceMax * 0.4  ? 'bar-mid'
                             : 'bar-low';
            html += `
              <div class="chart-bar-wrapper ${isToday ? 'bar-today' : ''}">
                <div class="chart-bar-tooltip">${this.formatCurrency(amount)}</div>
                <div class="chart-bar ${colorClass}" style="height:${heightPct.toFixed(1)}%"
                     title="${days[i]}: ${this.formatCurrency(amount)}"></div>
                <span class="chart-label">${days[i]}</span>
              </div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    // Round up to a clean chart ceiling
    _niceNumber(val) {
        if (val <= 0) return 100;
        const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
        const steps     = [1, 2, 2.5, 5, 10];
        for (const s of steps) {
            const candidate = Math.ceil(val / (magnitude * s)) * magnitude * s;
            if (candidate >= val) return candidate;
        }
        return Math.ceil(val / magnitude) * magnitude;
    }

    // ============================================
    // TRANSACTIONS LIST
    // ============================================
    renderTransactions() {
        const container = document.getElementById('transactionList');
        const filter    = document.getElementById('transactionFilter').value;
        const icons     = this._categoryIcons();

        const filtered = filter === 'all'
            ? [...this.transactions]
            : filter === 'savings'
            ? this.transactions.filter(t => t.goalSaving === true)
            : filter === 'expense'
            ? this.transactions.filter(t => t.type === 'expense' && !t.goalSaving)
            : this.transactions.filter(t => t.type === filter);

        if (filtered.length === 0) {
            container.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">No Transactions${filter !== 'all' ? ' for this filter' : ' Yet'}</div>
                <div class="empty-state-subtitle">${filter !== 'all' ? 'Try a different filter' : 'Start by adding your first transaction'}</div>
              </div>`;
            return;
        }

        // Sort: newest date first, then by createdAt for same-day
        filtered.sort((a, b) => {
            const dateDiff = b.date.localeCompare(a.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        let html = '';
        for (const t of filtered) {
            const icon        = icons[t.category] || '📌';
            const description = t.description || 'Untitled Transaction';
            const sign        = t.type === 'income' ? '+' : '−';
            const amtClass    = t.type === 'income' ? 'income' : 'expense';
            const catName     = this.getCategoryName(t.category);
            const dateStr     = this.formatDate(t.date);
            const notesHtml   = t.notes
                ? `<div class="transaction-notes">${this._escapeHtml(t.notes)}</div>`
                : '';

            // Goal-saving transactions get a special badge and no edit button
            const savingBadge = t.goalSaving
                ? `<span class="saving-badge">🏦 Goal Saving</span>`
                : '';

            const editBtn = t.goalSaving
                ? `<button class="transaction-action-btn" disabled title="Auto-generated — edit via goal" style="opacity:.35;cursor:default">✏️</button>`
                : `<button class="transaction-action-btn edit-btn"
                           data-id="${this._escapeHtml(t.id)}"
                           title="Edit transaction"
                           aria-label="Edit transaction">✏️</button>`;

            html += `
              <div class="transaction-item${t.goalSaving ? ' transaction-saving' : ''}">
                <div class="transaction-icon-wrap">${icon}</div>
                <div class="transaction-info">
                  <div class="transaction-description">
                    ${this._escapeHtml(description)}${savingBadge}
                  </div>
                  <div class="transaction-category">${this._escapeHtml(catName)}</div>
                  ${notesHtml}
                </div>
                <div class="transaction-meta">
                  <div>
                    <div class="transaction-amount ${amtClass}">${sign}${this.formatCurrency(t.amount)}</div>
                    <div class="transaction-date">${dateStr}</div>
                  </div>
                  <div class="transaction-actions">
                    ${editBtn}
                    <button class="transaction-action-btn delete-btn"
                            data-id="${this._escapeHtml(t.id)}"
                            title="Delete transaction"
                            aria-label="Delete transaction">🗑️</button>
                  </div>
                </div>
              </div>`;
        }

        container.innerHTML = html;

        // Attach events via delegation (no inline onclick)
        container.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => this.openEditTransactionModal(btn.dataset.id))
        );
        container.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => this.openDeleteConfirmation('transaction', btn.dataset.id))
        );
    }

    // ============================================
    // GOALS LIST
    // ============================================
    renderGoals() {
        const container = document.getElementById('goalsContainer');
        const catEmojis = {
            emergency: '🚨', vacation: '✈️', car: '🚗',
            home: '🏠', education: '📚', retirement: '🏖️', other: '📌'
        };

        if (this.goals.length === 0) {
            container.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">No Goals Yet</div>
                <div class="empty-state-subtitle">Create your first financial goal</div>
              </div>`;
            return;
        }

        let html = '';
        for (const g of this.goals) {
            const pct      = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            const isComplete = g.currentAmount >= g.targetAmount;
            const daysLeft = this.getDaysUntilDeadline(g.deadline);
            const emoji    = catEmojis[g.category] || '🎯';
            const remaining = Math.round((g.targetAmount - g.currentAmount) * 100) / 100;

            // Dynamic quick-add: preset percentages + free-form custom input
            let quickAddHtml = '';
            if (!isComplete) {
                const r = remaining;
                const presets = [
                    { label: '10%', val: Math.round(r * 0.10 * 100) / 100 },
                    { label: '25%', val: Math.round(r * 0.25 * 100) / 100 },
                    { label: '50%', val: Math.round(r * 0.50 * 100) / 100 },
                    { label: 'All', val: r }
                ].filter(a => a.val >= 0.01);

                quickAddHtml = `
                <div class="goal-contribute">
                  <div class="goal-contribute-presets">
                    ${presets.map(a =>
                        `<button class="btn btn-outline btn-small goal-button"
                                 data-goal-id="${this._escapeHtml(g.id)}"
                                 data-amount="${a.val}"
                                 title="Add ${this.formatCurrency(a.val)}">
                           +${a.label}
                         </button>`
                    ).join('')}
                  </div>
                  <div class="goal-custom-input">
                    <div class="goal-amount-input-wrap">
                      <span class="goal-amount-currency">$</span>
                      <input type="number"
                             class="goal-custom-amount"
                             data-goal-id="${this._escapeHtml(g.id)}"
                             min="0.01" step="0.01"
                             placeholder="Custom amount"
                             aria-label="Custom contribution amount">
                      <button class="goal-add-custom-btn"
                              data-goal-id="${this._escapeHtml(g.id)}"
                              title="Add custom amount">Add</button>
                    </div>
                    <span class="goal-custom-error" id="goalError_${this._escapeHtml(g.id)}"></span>
                  </div>
                </div>`;
            }

            // Days remaining color
            const deadlineClass = daysLeft === 0 ? 'deadline-urgent'
                                : daysLeft <= 7  ? 'deadline-soon'
                                : 'deadline-ok';

            html += `
              <div class="goal-item">
                <div class="goal-header">
                  <div>
                    <div class="goal-title">${emoji} ${this._escapeHtml(g.name)}</div>
                    <div class="goal-deadline ${deadlineClass}">
                      ${daysLeft === 0 ? '⚠️ Deadline today!' : `📅 ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                    </div>
                  </div>
                  <div class="goal-amount">
                    <div>${this.formatCurrency(g.currentAmount)} <span class="goal-of">of</span> ${this.formatCurrency(g.targetAmount)}</div>
                    <div class="goal-percentage">${pct.toFixed(1)}% complete</div>
                    ${!isComplete ? `<div class="goal-remaining">${this.formatCurrency(remaining)} to go</div>` : ''}
                  </div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${isComplete ? 'success' : pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'danger'}"
                       style="width:${Math.min(pct, 100).toFixed(1)}%"></div>
                </div>
                ${isComplete
                  ? `<div class="goal-complete">✅ Goal Complete! Well done!</div>`
                  : quickAddHtml}
                <div class="goal-actions">
                  <button class="goal-action-btn edit"
                          data-goal-id="${this._escapeHtml(g.id)}"
                          aria-label="Edit goal">✏️ Edit</button>
                  <button class="goal-action-btn delete"
                          data-goal-id="${this._escapeHtml(g.id)}"
                          aria-label="Delete goal">🗑️ Delete</button>
                </div>
              </div>`;
        }

        container.innerHTML = html;

        // Attach events via delegation
        container.querySelectorAll('.goal-button').forEach(btn =>
            btn.addEventListener('click', () =>
                this.updateGoalAmount(btn.dataset.goalId, parseFloat(btn.dataset.amount))
            )
        );
        container.querySelectorAll('.goal-add-custom-btn').forEach(btn =>
            btn.addEventListener('click', () => {
                const goalId = btn.dataset.goalId;
                const input  = container.querySelector(`.goal-custom-amount[data-goal-id="${goalId}"]`);
                const errEl  = document.getElementById(`goalError_${goalId}`);
                const val    = parseFloat(input.value);
                if (isNaN(val) || val <= 0) {
                    if (errEl) { errEl.textContent = 'Enter an amount greater than $0.00'; errEl.style.display = 'block'; }
                    input.focus();
                    return;
                }
                if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
                input.value = '';
                this.updateGoalAmount(goalId, Math.round(val * 100) / 100);
            })
        );
        // Allow pressing Enter inside the custom input
        container.querySelectorAll('.goal-custom-amount').forEach(input =>
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const btn = container.querySelector(`.goal-add-custom-btn[data-goal-id="${input.dataset.goalId}"]`);
                    if (btn) btn.click();
                }
            })
        );
        container.querySelectorAll('.goal-action-btn.edit').forEach(btn =>
            btn.addEventListener('click', () => this.openEditGoalModal(btn.dataset.goalId))
        );
        container.querySelectorAll('.goal-action-btn.delete').forEach(btn =>
            btn.addEventListener('click', () => this.openDeleteConfirmation('goal', btn.dataset.goalId))
        );
    }
}

// ============================================
// BOOT
// ============================================
let financeManager;
document.addEventListener('DOMContentLoaded', () => {
    financeManager = new FinanceManager();
});
