/**
 * @fileoverview 题库模块 - 管理面试题目的增删改查和渲染
 * @module modules/question
 */

import {
    getQuestions,
    addQuestion as storageAdd,
    updateQuestion as storageUpdate,
    deleteQuestion as storageDelete,
    getQuestionById
} from './storage.js';
import { escapeHtml } from '../utils/validator.js';
import {
    $,
    $$$,
    createElement,
    empty
} from '../utils/dom.js';

const DIFFICULTY_NAMES = {
    'easy': '简单',
    'medium': '中等',
    'hard': '困难'
};

/**
 * 渲染题目卡片
 * @param {Object} question - 题目对象
 * @returns {HTMLElement} 卡片元素
 */
function renderQuestionCard(question) {
    const card = createElement('article', {
        className: 'question-card',
        dataset: { id: question.id }
    });

    card.innerHTML = `
        <div class="question-card__header">
            <input type="checkbox" class="question-select" data-id="${question.id}" style="width: 18px; height: 18px; cursor: pointer; margin-right: 12px; margin-top: 4px;">
            <div class="question-card__content">${escapeHtml(question.content || '')}</div>
        </div>
        <div class="question-card__footer">
            <div class="question-card__tags">
                ${question.company ? `<span class="tag tag--company" style="background: var(--color-bg-hover); color: var(--color-text-secondary); border: 1px solid var(--color-border);">🏢 ${escapeHtml(question.company)}</span>` : ''}
                <span class="tag tag--position" style="background: var(--color-bg-hover); border: 1px solid var(--color-border);">${escapeHtml(question.position || '未指定职位')}</span>
                <span class="tag tag--category">📂 ${escapeHtml(question.category || '未分类')}</span>
                <span class="tag tag--difficulty-${question.difficulty || 'medium'}">
                    ${DIFFICULTY_NAMES[question.difficulty] || '中等'}
                </span>
            </div>
            <div class="question-card__actions">
                <button class="btn btn--secondary btn--small" data-action="view" aria-label="查看">查看</button>
                <button class="btn btn--secondary btn--small" data-action="edit" aria-label="编辑">编辑</button>
                <button class="btn btn--danger btn--small" data-action="delete" aria-label="删除">删除</button>
            </div>
        </div>
    `;

    return card;
}

/**
 * 渲染题库列表
 * @param {Array} questions - 题目数组
 * @param {Object} filters - 筛选条件
 */
export function renderQuestionList(questions, filters = {}) {
    const container = $('#question-list');
    if (!container) return;

    let filtered = [...questions];

    if (filters.company) {
        const companyLower = filters.company.toLowerCase();
        filtered = filtered.filter(q => 
            (q.company || '').toLowerCase().includes(companyLower)
        );
    }

    if (filters.position) {
        const positionLower = filters.position.toLowerCase();
        filtered = filtered.filter(q => 
            (q.position || '').toLowerCase().includes(positionLower)
        );
    }

    if (filters.category) {
        filtered = filtered.filter(q => q.category === filters.category);
    }

    if (filters.difficulty) {
        filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }

    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(q =>
            (q.content || '').toLowerCase().includes(searchLower) ||
            (q.answer || '').toLowerCase().includes(searchLower) ||
            (q.optimizedAnswer || '').toLowerCase().includes(searchLower)
        );
    }

    empty(container);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">📚</div>
                <h3 class="empty-state__title">暂无题目</h3>
                <p class="empty-state__desc">点击"添加题目"按钮创建您的第一个面试题库</p>
            </div>
        `;
        return;
    }

    filtered.forEach(question => {
        const card = renderQuestionCard(question);
        container.appendChild(card);
    });
}

/**
 * 获取表单数据
 * @returns {Object} 表单数据对象
 */
export function getFormData() {
    return {
        content: $('#question-content')?.value.trim() || '',
        company: $('#question-company')?.value.trim() || '',
        position: $('#question-position')?.value.trim() || '',
        category: $('#question-category')?.value.trim() || '未分类',
        difficulty: $('#question-difficulty')?.value || 'medium',
        answer: $('#question-answer')?.value.trim() || '',
        optimizedAnswer: $('#question-optimized-answer')?.value.trim() || ''
    };
}

/**
 * 填充表单数据
 * @param {Object} data - 题目数据
 */
export function fillFormData(data) {
    const setValue = (id, value) => {
        const el = $('#' + id);
        if (el) el.value = value || '';
    };

    setValue('question-id', data.id);
    setValue('question-content', data.content);
    setValue('question-company', data.company);
    setValue('question-position', data.position);
    setValue('question-category', data.category);
    setValue('question-difficulty', data.difficulty);
    setValue('question-answer', data.answer);
    setValue('question-optimized-answer', data.optimizedAnswer);
}

/**
 * 重置表单
 */
export function resetForm() {
    const form = $('#form-question');
    if (form) form.reset();

    const idField = $('#question-id');
    if (idField) idField.value = '';
}

/**
 * 添加题目
 * @param {Object} data - 题目数据
 * @returns {Object} 添加的题目
 */
export function addQuestion(data) {
    return storageAdd(data);
}

/**
 * 更新题目
 * @param {string} id - 题目ID
 * @param {Object} data - 更新数据
 * @returns {Object|null} 更新后的题目
 */
export function updateQuestion(id, data) {
    return storageUpdate(id, data);
}

/**
 * 删除题目
 * @param {string} id - 题目ID
 * @returns {boolean} 是否成功
 */
export function removeQuestion(id) {
    return storageDelete(id);
}

/**
 * 获取题目详情HTML
 * @param {string} id - 题目ID
 * @returns {string} 详情HTML
 */
export function getQuestionDetailHTML(id) {
    const question = getQuestionById(id);
    if (!question) return '<p>题目不存在</p>';

    return `
        <div class="view-detail">
            <div class="view-detail__row">
                <span class="view-detail__label">职位：</span>
                <span class="view-detail__value">${escapeHtml(question.position || '未指定')}</span>
            </div>
            ${question.company ? `
            <div class="view-detail__row">
                <span class="view-detail__label">公司：</span>
                <span class="view-detail__value">${escapeHtml(question.company)}</span>
            </div>
            ` : ''}
            <div class="view-detail__row">
                <span class="view-detail__label">类别：</span>
                <span class="view-detail__value">
                    <span class="tag tag--category">${escapeHtml(question.category || '未分类')}</span>
                </span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">难度：</span>
                <span class="view-detail__value">
                    <span class="tag tag--difficulty-${question.difficulty || 'medium'}">
                        ${DIFFICULTY_NAMES[question.difficulty] || '中等'}
                    </span>
                </span>
            </div>
            <div class="view-detail__section">
                <h4 class="view-detail__section-title">题目内容</h4>
                <p class="view-detail__value" style="white-space: pre-wrap;">${escapeHtml(question.content || '')}</p>
            </div>
            <div class="view-detail__section">
                <h4 class="view-detail__section-title">原始回答</h4>
                <p class="view-detail__value" style="white-space: pre-wrap;">${escapeHtml(question.answer || '未记录')}</p>
            </div>
            <div class="view-detail__section" style="border-left: 4px solid var(--color-success); padding-left: 12px; background: var(--color-bg-hover);">
                <h4 class="view-detail__section-title">✨ 优化后的回答</h4>
                <p class="view-detail__value" style="white-space: pre-wrap;">${escapeHtml(question.optimizedAnswer || '暂无优化回答，点击“编辑”添加')}</p>
            </div>
        </div>
    `;
}

export default {
    renderQuestionList,
    getFormData,
    fillFormData,
    resetForm,
    addQuestion,
    updateQuestion,
    removeQuestion,
    getQuestionDetailHTML
};
