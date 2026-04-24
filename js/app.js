/**
 * @fileoverview 主应用模块 - 整合所有模块，处理用户交互和界面逻辑
 * @module app
 */

import {
    getInterviews,
    getQuestions,
    getTheme,
    saveTheme,
    exportData,
    importData,
    getStatistics,
    getCategories,
    saveCategories,
    syncCategoriesFromQuestions,
    deleteCategory,
    renameCategory
} from './modules/storage.js';
import {
    escapeHtml,
    validateInterview,
    validateQuestion,
    validateFileType,
    validateImportData,
    validateFileSize
} from './utils/validator.js';
import {
    $,
    $$,
    $$$,
    show,
    hide,
    toggleClass,
    addClass,
    removeClass,
    on,
    delegate,
    debounce
} from './utils/dom.js';
import { Chart, createTrendChartData } from './modules/chart.js';
import { parseTranscript } from './utils/parser.js';
import {
    renderInterviewList,
    getFormData as getInterviewFormData,
    fillFormData as fillInterviewFormData,
    resetForm as resetInterviewForm,
    initStarRating,
    updateStarRating,
    addInterview,
    updateInterview,
    removeInterview,
    getInterviewDetailHTML,
    getWrongQuestions
} from './modules/interview.js';
import {
    renderQuestionList,
    getFormData as getQuestionFormData,
    fillFormData as fillQuestionFormData,
    resetForm as resetQuestionForm,
    addQuestion,
    updateQuestion,
    removeQuestion,
    getQuestionDetailHTML
} from './modules/question.js';

let trendChart = null;
let currentChartType = 'line';

function initTheme() {
    const savedTheme = getTheme();
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        const themeStylesheet = $('#theme-stylesheet');
        if (themeStylesheet) {
            themeStylesheet.disabled = false;
        }
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    saveTheme(isDark ? 'dark' : 'light');

    const themeStylesheet = $('#theme-stylesheet');
    if (themeStylesheet) {
        themeStylesheet.disabled = !isDark;
    }

    if (trendChart) {
        trendChart.updateColors();
    }

    announce(isDark ? '已切换到暗色主题' : '已切换到亮色主题');
}

function initNavigation() {
    const navButtons = $$$('.header__nav-btn');
    const tabPanels = $$$('.tab-panel');

    if (navButtons.length === 0) return;

    navButtons.forEach(btn => {
        on(btn, 'click', () => {
            const tabId = btn.dataset.tab;
            if (!tabId) return;

            navButtons.forEach(b => {
                removeClass(b, 'is-active');
                b.setAttribute('aria-selected', 'false');
            });
            addClass(btn, 'is-active');
            btn.setAttribute('aria-selected', 'true');

            tabPanels.forEach(panel => {
                if (panel.id === `panel-${tabId}`) {
                    addClass(panel, 'is-active');
                    panel.hidden = false;
                } else {
                    removeClass(panel, 'is-active');
                    panel.hidden = true;
                }
            });

            if (tabId === 'analysis') {
                updateAnalysis();
            }
        });
    });
}

function updateCategoryDropdowns() {
    const categories = getCategories();
    
    // 1. 更新筛选下拉框
    const filterSelect = $('#filter-category');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">全部类别</option>' + 
            categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        filterSelect.value = currentValue;
    }

    // 2. 更新批量标注下拉框
    const batchSelect = $('#select-batch-category');
    if (batchSelect) {
        batchSelect.innerHTML = '<option value="">批量修改类别...</option>' + 
            categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    // 3. 更新题目弹窗的 datalist
    const datalist = $('#category-datalist');
    if (datalist) {
        datalist.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join('');
    }
}

function initCategoryManagement() {
    const modal = $('#modal-manage-categories');
    const btnManage = $('#btn-manage-categories');
    const btnClose = $('#btn-close-categories');
    const btnModalClose = $('#modal-categories-close');
    const backdrop = modal?.querySelector('.modal__backdrop');
    const btnAdd = $('#btn-add-category-save');
    const input = $('#new-category-input');
    const listContainer = $('#category-list-manage');

    const renderManageList = () => {
        const categories = getCategories();
        if (listContainer) {
            listContainer.innerHTML = categories.map(cat => `
                <div class="category-manage-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
                    <span class="category-name">${escapeHtml(cat)}</span>
                    <div class="category-actions">
                        <button class="btn btn--secondary btn--small" data-category="${escapeHtml(cat)}" data-action="rename-category" style="margin-right: 4px;">编辑</button>
                        <button class="btn btn--danger btn--small" data-category="${escapeHtml(cat)}" data-action="delete-category">删除</button>
                    </div>
                </div>
            `).join('');
        }
    };

    if (btnManage) {
        on(btnManage, 'click', () => {
            renderManageList();
            modal.hidden = false;
        });
    }

    const closeModal = () => {
        modal.hidden = true;
        updateCategoryDropdowns();
    };

    if (btnClose) on(btnClose, 'click', closeModal);
    if (btnModalClose) on(btnModalClose, 'click', closeModal);
    if (backdrop) on(backdrop, 'click', closeModal);

    if (btnAdd) {
        on(btnAdd, 'click', () => {
            const name = input?.value.trim();
            if (!name) return;
            const categories = getCategories();
            if (categories.includes(name)) {
                showToast('该类别已存在');
                return;
            }
            categories.push(name);
            saveCategories(categories);
            if (input) input.value = '';
            renderManageList();
            showToast('添加成功');
        });
    }

    if (listContainer) {
        on(listContainer, 'click', (e) => {
            const btnDelete = e.target.closest('[data-action="delete-category"]');
            const btnRename = e.target.closest('[data-action="rename-category"]');
            
            if (btnDelete) {
                const cat = btnDelete.dataset.category;
                if (cat === '未分类') {
                    showToast('不能删除默认分类');
                    return;
                }
                if (confirm(`确定要删除类别“${cat}”吗？这将不会删除该类别下的题目，但题目将变为“未分类”。`)) {
                deleteCategory(cat);
                renderManageList();
                showToast('删除成功');
            }
            } else if (btnRename) {
                const oldName = btnRename.dataset.category;
                const newName = prompt(`请输入类别“${oldName}”的新名称：`, oldName);
                
                if (newName && newName.trim() && newName !== oldName) {
                    const categories = getCategories();
                    if (categories.includes(newName.trim())) {
                        showToast('该类别名称已存在');
                        return;
                    }
                    renameCategory(oldName, newName.trim());
                    renderManageList();
                    showToast('类别已重命名');
                }
            }
        });
    }
}

function initInterviewModals() {
    const modal = $('#modal-interview');
    if (!modal) return;

    const form = $('#form-interview');
    const addBtn = $('#btn-add-interview');
    const closeBtn = $('#modal-interview-close');
    const cancelBtn = $('#btn-cancel-interview');
    const backdrop = modal.querySelector('.modal__backdrop');

    const openModal = (interview = null) => {
        if (interview) {
            fillInterviewFormData(interview);
            const title = $('#modal-interview-title');
            if (title) title.textContent = '编辑面试记录';
        } else {
            resetInterviewForm();
            const title = $('#modal-interview-title');
            if (title) title.textContent = '新增面试记录';
        }
        modal.hidden = false;
        const companyInput = $('#interview-company');
        if (companyInput) companyInput.focus();
    };

    const closeModal = () => {
        modal.hidden = true;
        resetInterviewForm();
    };

    const parseBtn = $('#btn-parse-transcript');
    if (parseBtn) {
        on(parseBtn, 'click', () => {
            const transcript = $('#interview-transcript')?.value.trim();
            const position = $('#interview-position')?.value.trim();
            const company = $('#interview-company')?.value.trim();

            if (!transcript) {
                showToast('请先粘贴面试文字稿');
                return;
            }

            if (!position) {
                showToast('请先填写“职位”字段，以便对题目进行自动分类');
                $('#interview-position')?.focus();
                return;
            }

            const qaList = parseTranscript(transcript);
            if (qaList.length === 0) {
                showToast('未能识别出 Q&A，请确保文字稿包含“问/答”或“Q/A”标记');
                return;
            }

            qaList.forEach(qa => {
                addQuestion({
                    content: qa.question,
                    answer: qa.answer,
                    company: company,
                    position: position,
                    category: '未分类', // 默认归入未分类，用户可后续手动分类
                    difficulty: 'medium',
                    optimizedAnswer: ''
                });
            });

            syncCategoriesFromQuestions();
            updateCategoryDropdowns();
            showToast(`成功识别并归纳 ${qaList.length} 道题目到题库（公司：${company || '未填写'}，职位：${position}）`);
            renderQuestionList(getQuestions(), getQuestionFilters());
        });
    }

    if (addBtn) on(addBtn, 'click', () => openModal());
    if (closeBtn) on(closeBtn, 'click', closeModal);
    if (cancelBtn) on(cancelBtn, 'click', closeModal);
    if (backdrop) on(backdrop, 'click', closeModal);

    if (form) {
        on(form, 'submit', (e) => {
            e.preventDefault();
            const data = getInterviewFormData();
            const validation = validateInterview(data);

            if (!validation.valid) {
                showToast('请检查表单填写是否正确');
                return;
            }

            const idField = $('#interview-id');
            const id = idField ? idField.value : '';
            if (id) {
                updateInterview(id, data);
                showToast('面试记录已更新');
            } else {
                addInterview(data);
                showToast('面试记录已添加');
            }

            closeModal();
            renderInterviewList(getInterviews(), getInterviewFilters());
        });
    }

    const list = $('#interview-list');
    if (list) {
        delegate(list, '.interview-card', 'click', (e, target) => {
            const card = target.closest('.interview-card');
            const id = card?.dataset.id;
            const actionBtn = e.target.closest('[data-action]');
            const action = actionBtn?.dataset.action;

            if (!id || !action) return;

            switch (action) {
                case 'view':
                    showInterviewDetail(id);
                    break;
                case 'edit':
                    const interview = getInterviews().find(i => i.id === id);
                    if (interview) openModal(interview);
                    break;
                case 'delete':
                    if (confirm('确定要删除这条面试记录吗？')) {
                        removeInterview(id);
                        showToast('面试记录已删除');
                        renderInterviewList(getInterviews(), getInterviewFilters());
                    }
                    break;
            }
        });
    }

    initStarRating();
}

function showInterviewDetail(id) {
    const modal = $('#modal-view');
    const content = $('#view-content');
    const title = $('#modal-view-title');

    if (!modal || !content) return;

    content.innerHTML = getInterviewDetailHTML(id);
    if (title) title.textContent = '面试详情';
    modal.hidden = false;
}

function initQuestionModals() {
    const modal = $('#modal-question');
    if (!modal) return;

    const form = $('#form-question');
    const addBtn = $('#btn-add-question');
    const closeBtn = $('#modal-question-close');
    const cancelBtn = $('#btn-cancel-question');
    const backdrop = modal.querySelector('.modal__backdrop');

    const openModal = (question = null) => {
        if (question) {
            fillQuestionFormData(question);
            const title = $('#modal-question-title');
            if (title) title.textContent = '编辑题目';
        } else {
            resetQuestionForm();
            const title = $('#modal-question-title');
            if (title) title.textContent = '添加题目';
        }
        modal.hidden = false;
        const contentInput = $('#question-content');
        if (contentInput) contentInput.focus();
    };

    const closeModal = () => {
        modal.hidden = true;
        resetQuestionForm();
    };

    if (addBtn) on(addBtn, 'click', () => openModal());
    if (closeBtn) on(closeBtn, 'click', closeModal);
    if (cancelBtn) on(cancelBtn, 'click', closeModal);
    if (backdrop) on(backdrop, 'click', closeModal);

    if (form) {
        on(form, 'submit', (e) => {
            e.preventDefault();
            const data = getQuestionFormData();
            const validation = validateQuestion(data);

            if (!validation.valid) {
                showToast('请检查表单填写是否正确');
                return;
            }

            const idField = $('#question-id');
            const id = idField ? idField.value : '';
            if (id) {
                updateQuestion(id, data);
                showToast('题目已更新');
            } else {
                addQuestion(data);
                showToast('题目已添加');
            }

            syncCategoriesFromQuestions();
            updateCategoryDropdowns();
            closeModal();
            renderQuestionList(getQuestions(), getQuestionFilters());
        });
    }

    const list = $('#question-list');
    if (list) {
        delegate(list, '.question-card', 'click', (e, target) => {
            const card = target.closest('.question-card');
            const id = card?.dataset.id;
            const actionBtn = e.target.closest('[data-action]');
            const action = actionBtn?.dataset.action;

            if (!id || !action) return;

            switch (action) {
                case 'view':
                    showQuestionDetail(id);
                    break;
                case 'edit':
                    const question = getQuestions().find(q => q.id === id);
                    if (question) openModal(question);
                    break;
                case 'delete':
                    if (confirm('确定要删除这道题目吗？')) {
                        removeQuestion(id);
                        showToast('题目已删除');
                        renderQuestionList(getQuestions(), getQuestionFilters());
                    }
                    break;
            }
        });
    }
}

function initBatchActions() {
    const deleteBtn = $('#btn-batch-delete');
    const batchCategorySelect = $('#select-batch-category');
    const checkAll = $('#check-all-questions');
    const batchArea = $('#batch-actions-area');
    const selectedCountSpan = $('#selected-count');

    if (checkAll) {
        on(checkAll, 'change', (e) => {
            const checkboxes = $$$('.question-select');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateBatchActionsUI();
        });
    }

    delegate($('#question-list'), '.question-select', 'change', () => {
        updateBatchActionsUI();
    });

    if (deleteBtn) {
        on(deleteBtn, 'click', () => {
            const selected = $$$('.question-select:checked');
            if (selected.length === 0) return;

            if (confirm(`确定要删除选中的 ${selected.length} 道题目吗？`)) {
                selected.forEach(cb => {
                    const id = cb.dataset.id;
                    if (id) removeQuestion(id);
                });
                showToast('批量删除成功');
                if (checkAll) checkAll.checked = false;
                syncCategoriesFromQuestions();
                updateCategoryDropdowns();
                renderQuestionList(getQuestions(), getQuestionFilters());
                updateBatchActionsUI();
            }
        });
    }

    if (batchCategorySelect) {
        on(batchCategorySelect, 'change', (e) => {
            const newCategory = e.target.value;
            if (!newCategory) return;

            const selected = $$$('.question-select:checked');
            if (selected.length === 0) {
                showToast('请先选择要修改的题目');
                batchCategorySelect.value = '';
                return;
            }

            if (confirm(`确定将选中的 ${selected.length} 道题目修改为类别“${newCategory}”吗？`)) {
                selected.forEach(cb => {
                    const id = cb.dataset.id;
                    if (id) updateQuestion(id, { category: newCategory });
                });
                showToast('批量修改成功');
                batchCategorySelect.value = '';
                if (checkAll) checkAll.checked = false;
                syncCategoriesFromQuestions();
                updateCategoryDropdowns();
                renderQuestionList(getQuestions(), getQuestionFilters());
                updateBatchActionsUI();
            } else {
                batchCategorySelect.value = '';
            }
        });
    }
}

function updateBatchActionsUI() {
    const batchArea = $('#batch-actions-area');
    const selectedCountSpan = $('#selected-count');
    const selectedCount = $$$('.question-select:checked').length;
    
    if (batchArea) {
        batchArea.hidden = selectedCount === 0;
        // 强制设置 display，因为 css 中 [hidden] 可能会被 display: flex 覆盖
        batchArea.style.display = selectedCount === 0 ? 'none' : 'inline-flex';
    }
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = `已选 ${selectedCount} 项`;
    }

    const checkAll = $('#check-all-questions');
    if (checkAll) {
        const total = $$$('.question-select').length;
        checkAll.checked = total > 0 && selectedCount === total;
    }
}

function showQuestionDetail(id) {
    const modal = $('#modal-view');
    const content = $('#view-content');
    const title = $('#modal-view-title');

    if (!modal || !content) return;

    content.innerHTML = getQuestionDetailHTML(id);
    if (title) title.textContent = '题目详情';
    modal.hidden = false;
}

function initViewModal() {
    const modal = $('#modal-view');
    if (!modal) return;

    const closeBtn = $('#modal-view-close');
    const backdrop = modal.querySelector('.modal__backdrop');

    const closeModal = () => {
        modal.hidden = true;
    };

    if (closeBtn) on(closeBtn, 'click', closeModal);
    if (backdrop) on(backdrop, 'click', closeModal);
}

function getInterviewFilters() {
    return {
        company: $('#filter-company')?.value || '',
        position: $('#filter-position')?.value || '',
        status: $('#filter-status')?.value || ''
    };
}

function getQuestionFilters() {
    return {
        company: $('#filter-q-company')?.value || '',
        position: $('#filter-q-position')?.value || '',
        category: $('#filter-category')?.value || '',
        difficulty: $('#filter-difficulty')?.value || '',
        search: $('#filter-question')?.value || ''
    };
}

function initFilters() {
    const interviewFilters = ['#filter-company', '#filter-position', '#filter-status'];
    interviewFilters.forEach(selector => {
        const el = $(selector);
        if (el) {
            on(el, 'input', debounce(() => {
                renderInterviewList(getInterviews(), getInterviewFilters());
            }, 300));
            on(el, 'change', () => {
                renderInterviewList(getInterviews(), getInterviewFilters());
            });
        }
    });

    on($('#btn-clear-filters'), 'click', () => {
        interviewFilters.forEach(selector => {
            const el = $(selector);
            if (el) el.value = '';
        });
        renderInterviewList(getInterviews(), {});
    });

    const questionFilters = ['#filter-q-company', '#filter-q-position', '#filter-category', '#filter-difficulty', '#filter-question'];
    questionFilters.forEach(selector => {
        const el = $(selector);
        if (el) {
            on(el, 'input', debounce(() => {
                renderQuestionList(getQuestions(), getQuestionFilters());
            }, 300));
            on(el, 'change', () => {
                renderQuestionList(getQuestions(), getQuestionFilters());
            });
        }
    });
}

function updateAnalysis() {
    const stats = getStatistics();

    $('#stat-total').textContent = stats.total;
    $('#stat-passed').textContent = stats.passed;
    $('#stat-rate').textContent = `${stats.passRate}%`;
    $('#stat-questions').textContent = stats.questionCount;

    if (!trendChart) {
        trendChart = new Chart('trend-chart', { type: 'line' });
    }

    const chartData = createTrendChartData(stats.monthlyStats);
    trendChart.setType(currentChartType);
    trendChart.render(chartData);

    renderCompanyStats(stats.companyStats);
    renderPositionStats(stats.positionStats);
}

function renderCompanyStats(companyStats) {
    const container = $('#company-stats');
    if (!container) return;

    const sorted = Object.entries(companyStats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state__desc">暂无数据</p>';
        return;
    }

    const maxTotal = Math.max(...sorted.map(s => s.total), 1);

    container.innerHTML = sorted.map(stat => `
        <div class="stats-item">
            <span class="stats-item__name">${escapeHtml(stat.name)}</span>
            <div class="stats-item__bar">
                <div class="stats-item__bar-fill" style="width: ${(stat.total / maxTotal) * 100}%"></div>
            </div>
            <span class="stats-item__count">${stat.total}次/${stat.passed}通过</span>
        </div>
    `).join('');
}

function renderPositionStats(positionStats) {
    const container = $('#position-stats');
    if (!container) return;

    const sorted = Object.entries(positionStats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="empty-state__desc">暂无数据</p>';
        return;
    }

    const maxTotal = Math.max(...sorted.map(s => s.total), 1);

    container.innerHTML = sorted.map(stat => `
        <div class="stats-item">
            <span class="stats-item__name">${escapeHtml(stat.name)}</span>
            <div class="stats-item__bar">
                <div class="stats-item__bar-fill" style="width: ${(stat.total / maxTotal) * 100}%"></div>
            </div>
            <span class="stats-item__count">${stat.total}次/${stat.passed}通过</span>
        </div>
    `).join('');
}

function initWrongQuestions() {
    on($('#btn-wrong-questions'), 'click', () => {
        const wrongQuestions = getWrongQuestions();
        const container = $('#wrong-questions-list');

        if (wrongQuestions.length === 0) {
            container.innerHTML = '<p class="empty-state__desc">暂无已优化回答的题目</p>';
            return;
        }

        container.innerHTML = wrongQuestions.map(question => `
            <div class="question-card" style="margin-bottom: 12px; border-left: 4px solid var(--color-success);">
                <div class="question-card__header">
                    <div class="question-card__content" style="font-weight: 600;">${escapeHtml(question.content || '')}</div>
                </div>
                <div class="question-card__body" style="margin-top: 10px; padding: 10px; background: var(--color-bg-hover); border-radius: 4px;">
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px;">✨ 优化后的回答：</div>
                    <div style="font-size: 14px; white-space: pre-wrap;">${escapeHtml(question.optimizedAnswer)}</div>
                </div>
                <div class="question-card__footer" style="margin-top: 10px;">
                    <div class="question-card__tags">
                        ${question.company ? `<span class="tag tag--company">${escapeHtml(question.company)}</span>` : ''}
                        <span class="tag tag--category">${escapeHtml(question.category || '未分类')}</span>
                    </div>
                </div>
            </div>
        `).join('');
    });
}

function initChartTabs() {
    const tabs = $$$('.chart-tab');
    tabs.forEach(tab => {
        on(tab, 'click', () => {
            tabs.forEach(t => removeClass(t, 'is-active'));
            addClass(tab, 'is-active');
            currentChartType = tab.dataset.chart;
            if (trendChart) {
                trendChart.setType(currentChartType);
            }
        });
    });
}

function initImportExport() {
    on($('#btn-export'), 'click', () => {
        const data = exportData();
        
        let md = `# 面试记录与复盘报告\n\n`;
        md += `导出时间：${new Date().toLocaleString()}\n\n`;
        
        md += `## 1. 面试记录统计\n\n`;
        const stats = getStatistics();
        md += `- 总面试次数：${stats.total}\n`;
        md += `- 通过次数：${stats.passed}\n`;
        md += `- 通过率：${stats.passRate}%\n\n`;
        
        md += `## 2. 面试记录详情\n\n`;
        data.interviews.forEach((ivw, index) => {
            md += `### ${index + 1}. ${ivw.company} - ${ivw.position}\n`;
            md += `- 时间：${new Date(ivw.date).toLocaleString()}\n`;
            md += `- 轮次：${ivw.round}\n`;
            md += `- 地点：${ivw.location || '-'}\n`;
            md += `- 面试官：${ivw.interviewer || '-'}\n`;
            md += `- 状态：${ivw.status}\n`;
            md += `- 自我评价：${ivw.evaluation}星\n\n`;
        });
        
        md += `## 3. 题库列表\n\n`;
        data.questions.forEach((q, index) => {
            md += `### Q${index + 1}: ${q.content.split('\n')[0]}\n\n`;
            md += `**题目内容：**\n${q.content}\n\n`;
            md += `**原始回答：**\n${q.answer || '无'}\n\n`;
            md += `**优化后的回答：**\n${q.optimizedAnswer || '尚未优化'}\n\n`;
            md += `**分类：** ${q.category} | **难度：** ${q.difficulty}\n\n`;
            md += `---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `面试复盘报告-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('报告已导出为 Markdown');
    });

    on($('#btn-export-json'), 'click', () => {
        const data = exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `面试题库备份-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('数据包已导出，可用于分享或导入');
    });

    const fileInput = $('#file-import');

    on($('#btn-import'), 'click', () => {
        fileInput?.click();
    });

    on(fileInput, 'change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateFileType(file, ['application/json'])) {
            showToast('只支持导入 .json 文件');
            fileInput.value = '';
            return;
        }

        if (!validateFileSize(file)) {
            showToast('文件大小不能超过 2MB');
            fileInput.value = '';
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const validation = validateImportData(data);
            if (!validation.valid) {
                showToast(`导入失败: ${validation.error}`);
                fileInput.value = '';
                return;
            }

            if (confirm('导入将合并现有数据，确定继续吗？')) {
                importData(data);
                showToast('数据导入成功');

                renderInterviewList(getInterviews(), getInterviewFilters());
                renderQuestionList(getQuestions(), getQuestionFilters());
            }
        } catch (error) {
            showToast('文件解析失败，请检查文件格式');
        }

        fileInput.value = '';
    });
}

function initKeyboardShortcuts() {
    on(document, 'keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'k':
                    e.preventDefault();
                    const activeTab = $$('.header__nav-btn.is-active')?.dataset.tab;
                    if (activeTab === 'interview') {
                        $('#btn-add-interview')?.click();
                    } else if (activeTab === 'question') {
                        $('#btn-add-question')?.click();
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    $('#btn-export')?.click();
                    break;
                case 'b':
                    e.preventDefault();
                    $('#btn-export-json')?.click();
                    break;
            }
        }

        if (e.key === 'Escape') {
            const modals = $$$('.modal:not([hidden])');
            modals.forEach(modal => {
                modal.hidden = true;
            });
        }
    });
}

function showToast(message, duration = 3000) {
    const toast = $('#toast');
    if (!toast) return;

    toast.textContent = message;
    toast.hidden = false;

    setTimeout(() => {
        toast.hidden = true;
    }, duration);
}

function announce(message) {
    const announcer = $('#sr-announce');
    if (announcer) {
        announcer.textContent = message;
    }
}

function initLoadingScreen() {
    const screen = $('#loading-screen');
    const bar = $('#loading-bar');
    const text = $('#loading-text');
    let progress = 0;

    const updateProgress = () => {
        progress += Math.random() * 30;
        if (progress > 100) progress = 100;
        
        if (bar) bar.style.width = `${progress}%`;
        
        if (text) {
            const filled = Math.floor(progress / 10);
            const empty = 10 - filled;
            text.textContent = '▓'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(progress)}%`;
        }

        if (progress < 100) {
            setTimeout(updateProgress, 200 + Math.random() * 300);
        } else {
            setTimeout(() => {
                if (screen) {
                    screen.hidden = true;
                    screen.style.display = 'none'; // 确保彻底消失，不遮挡点击
                }
            }, 500);
        }
    };

    updateProgress();
}

function init() {
    console.log('应用正在初始化...');
    initLoadingScreen();
    try {
        initNavigation();
        console.log('导航初始化完成');
        
        initInterviewModals();
        console.log('面试弹窗初始化完成');
        
        initQuestionModals();
        console.log('题库弹窗初始化完成');
        
        initBatchActions();
        initCategoryManagement();
        initViewModal();
        console.log('详情弹窗初始化完成');
        
        initFilters();
        console.log('筛选功能初始化完成');
        
        try {
            const interviews = getInterviews();
            const questions = getQuestions();
            renderInterviewList(interviews, {});
            renderQuestionList(questions, {});
            updateCategoryDropdowns();
            console.log('初始数据渲染完成');
        } catch (e) {
            console.error('数据渲染失败:', e);
        }

        initWrongQuestions();
        initChartTabs();
        initImportExport();
        initKeyboardShortcuts();

        showToast('面试记录与复盘已加载', 2000);
        console.log('应用初始化全部完成');
    } catch (error) {
        console.error('应用初始化过程中发生致命错误:', error);
        alert('应用初始化失败，请检查浏览器控制台错误信息。');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default { init };
