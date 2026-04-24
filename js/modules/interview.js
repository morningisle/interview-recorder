/**
 * @fileoverview 面试记录模块 - 管理面试记录的增删改查和渲染
 * @module modules/interview
 */

import {
    getInterviews,
    getQuestions,
    addInterview as storageAdd,
    updateInterview as storageUpdate,
    deleteInterview as storageDelete,
    getInterviewById
} from './storage.js';
import { escapeHtml } from '../utils/validator.js';
import {
    $,
    $$,
    $$$,
    createElement,
    empty,
    html,
    addClass,
    removeClass,
    on,
    delegate
} from '../utils/dom.js';

const ROUND_NAMES = {
    '1': '一面',
    '2': '二面',
    '3': '三面',
    '4': '四面',
    '5': 'HR面',
    '6': '终面'
};

const STATUS_NAMES = {
    'pending': '待反馈',
    'passed': '通过',
    'failed': '未通过'
};

/**
 * 格式化日期
 * @param {string} dateString - ISO日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 渲染星级评价
 * @param {number} rating - 星级评分
 * @returns {string} 星级HTML
 */
function renderStars(rating) {
    const fullStars = Math.min(5, Math.max(0, parseInt(rating) || 0));
    const emptyStars = 5 - fullStars;
    return '<span class="interview-card__stars">' +
        '★'.repeat(fullStars) +
        '☆'.repeat(emptyStars) +
        '</span>';
}

/**
 * 渲染面试卡片
 * @param {Object} interview - 面试记录
 * @returns {HTMLElement} 卡片元素
 */
function renderInterviewCard(interview) {
    const card = createElement('article', {
        className: 'interview-card',
        dataset: { id: interview.id }
    });

    card.innerHTML = `
        <div class="interview-card__header">
            <div class="interview-card__info">
                <h3 class="interview-card__company">${escapeHtml(interview.company || '未知公司')}</h3>
                <p class="interview-card__position">${escapeHtml(interview.position || '未知职位')}</p>
            </div>
            <span class="interview-card__status interview-card__status--${interview.status || 'pending'}">
                ${STATUS_NAMES[interview.status] || '待反馈'}
            </span>
        </div>
        <div class="interview-card__meta">
            <span class="interview-card__meta-item">
                <span>📅</span> ${ROUND_NAMES[interview.round] || '一面'}
            </span>
            <span class="interview-card__meta-item">
                <span>🕐</span> ${formatDate(interview.date)}
            </span>
            ${interview.location ? `
            <span class="interview-card__meta-item">
                <span>📍</span> ${escapeHtml(interview.location)}
            </span>
            ` : ''}
            ${interview.interviewer ? `
            <span class="interview-card__meta-item">
                <span>👤</span> ${escapeHtml(interview.interviewer)}
            </span>
            ` : ''}
        </div>
        <div class="interview-card__evaluation">
            <span>自我评价：</span>
            ${renderStars(interview.evaluation)}
        </div>
        <div class="interview-card__actions">
            <button class="btn btn--secondary btn--small" data-action="view" aria-label="查看详情">查看</button>
            <button class="btn btn--secondary btn--small" data-action="edit" aria-label="编辑">编辑</button>
            <button class="btn btn--danger btn--small" data-action="delete" aria-label="删除">删除</button>
        </div>
    `;

    return card;
}

/**
 * 渲染面试列表
 * @param {Array} interviews - 面试记录数组
 * @param {Object} filters - 筛选条件
 */
export function renderInterviewList(interviews, filters = {}) {
    const container = $('#interview-list');
    if (!container) return;

    let filtered = [...interviews];

    if (filters.company) {
        const companyFilter = filters.company.toLowerCase();
        filtered = filtered.filter(i =>
            (i.company || '').toLowerCase().includes(companyFilter)
        );
    }

    if (filters.position) {
        const positionFilter = filters.position.toLowerCase();
        filtered = filtered.filter(i =>
            (i.position || '').toLowerCase().includes(positionFilter)
        );
    }

    if (filters.status) {
        filtered = filtered.filter(i => i.status === filters.status);
    }

    empty(container);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">📋</div>
                <h3 class="empty-state__title">暂无面试记录</h3>
                <p class="empty-state__desc">点击"新增记录"按钮添加您的第一条面试记录</p>
            </div>
        `;
        return;
    }

    filtered.forEach(interview => {
        const card = renderInterviewCard(interview);
        container.appendChild(card);
    });
}

/**
 * 获取表单数据
 * @returns {Object} 表单数据对象
 */
export function getFormData() {
    return {
        company: $('#interview-company')?.value.trim() || '',
        position: $('#interview-position')?.value.trim() || '',
        round: $('#interview-round')?.value || '1',
        date: $('#interview-date')?.value || '',
        location: $('#interview-location')?.value.trim() || '',
        interviewer: $('#interview-interviewer')?.value.trim() || '',
        status: $('#interview-status')?.value || 'pending',
        evaluation: parseInt($('#interview-evaluation')?.value) || 3
    };
}

/**
 * 填充表单数据
 * @param {Object} data - 面试记录数据
 */
export function fillFormData(data) {
    const setValue = (id, value) => {
        const el = $('#' + id);
        if (el) el.value = value || '';
    };

    setValue('interview-id', data.id);
    setValue('interview-company', data.company);
    setValue('interview-position', data.position);
    setValue('interview-round', data.round);
    setValue('interview-location', data.location);
    setValue('interview-interviewer', data.interviewer);
    setValue('interview-status', data.status);

    if (data.date) {
        const date = new Date(data.date);
        const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setValue('interview-date', localDatetime);
    }

    if (data.evaluation) {
        setValue('interview-evaluation', data.evaluation);
        updateStarRating(data.evaluation);
    }
}

/**
 * 重置表单
 */
export function resetForm() {
    const form = $('#form-interview');
    if (form) form.reset();

    const idField = $('#interview-id');
    if (idField) idField.value = '';

    const transcriptField = $('#interview-transcript');
    if (transcriptField) transcriptField.value = '';

    setValue('interview-date', '');
    setValue('interview-evaluation', '3');
    updateStarRating(3);
}

function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
}

/**
 * 更新星级评分显示
 * @param {number} rating - 星级评分
 */
export function updateStarRating(rating) {
    const stars = $$$('.star-btn', $('#star-rating'));
    stars.forEach(star => {
        const starValue = parseInt(star.dataset.star);
        if (starValue <= rating) {
            addClass(star, 'active');
        } else {
            removeClass(star, 'active');
        }
    });
}

/**
 * 初始化星级评分组件
 */
export function initStarRating() {
    const container = $('#star-rating');
    if (!container) return;

    const stars = $$$('.star-btn', container);
    const input = $('#interview-evaluation');

    stars.forEach(star => {
        on(star, 'click', () => {
            const rating = parseInt(star.dataset.star);
            if (input) input.value = rating;
            updateStarRating(rating);
        });

        on(star, 'mouseenter', () => {
            const rating = parseInt(star.dataset.star);
            stars.forEach(s => {
                const starValue = parseInt(s.dataset.star);
                if (starValue <= rating) {
                    addClass(s, 'active');
                } else {
                    removeClass(s, 'active');
                }
            });
        });
    });

    on(container, 'mouseleave', () => {
        const currentRating = parseInt(input?.value) || 3;
        updateStarRating(currentRating);
    });
}

/**
 * 添加面试记录
 * @param {Object} data - 面试记录数据
 * @returns {Object} 添加的记录
 */
export function addInterview(data) {
    return storageAdd(data);
}

/**
 * 更新面试记录
 * @param {string} id - 记录ID
 * @param {Object} data - 更新数据
 * @returns {Object|null} 更新后的记录
 */
export function updateInterview(id, data) {
    return storageUpdate(id, data);
}

/**
 * 删除面试记录
 * @param {string} id - 记录ID
 * @returns {boolean} 是否成功
 */
export function removeInterview(id) {
    return storageDelete(id);
}

/**
 * 获取面试记录详情HTML
 * @param {string} id - 记录ID
 * @returns {string} 详情HTML
 */
export function getInterviewDetailHTML(id) {
    const interview = getInterviewById(id);
    if (!interview) return '<p>记录不存在</p>';

    return `
        <div class="view-detail">
            <div class="view-detail__row">
                <span class="view-detail__label">公司：</span>
                <span class="view-detail__value">${escapeHtml(interview.company || '-')}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">职位：</span>
                <span class="view-detail__value">${escapeHtml(interview.position || '-')}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">轮次：</span>
                <span class="view-detail__value">${ROUND_NAMES[interview.round] || '一面'}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">时间：</span>
                <span class="view-detail__value">${formatDate(interview.date)}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">地点：</span>
                <span class="view-detail__value">${escapeHtml(interview.location || '-')}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">面试官：</span>
                <span class="view-detail__value">${escapeHtml(interview.interviewer || '-')}</span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">状态：</span>
                <span class="view-detail__value">
                    <span class="interview-card__status interview-card__status--${interview.status || 'pending'}">
                        ${STATUS_NAMES[interview.status] || '待反馈'}
                    </span>
                </span>
            </div>
            <div class="view-detail__row">
                <span class="view-detail__label">自我评价：</span>
                <span class="view-detail__value">${renderStars(interview.evaluation)}</span>
            </div>
        </div>
    `;
}

/**
 * 获取错题本记录（包含已优化回答的题目）
 * @returns {Array} 题目记录数组
 */
export function getWrongQuestions() {
    const questions = getQuestions();
    return questions.filter(q => q.optimizedAnswer && q.optimizedAnswer.trim().length > 0);
}

export default {
    renderInterviewList,
    getFormData,
    fillFormData,
    resetForm,
    updateStarRating,
    initStarRating,
    addInterview,
    updateInterview,
    removeInterview,
    getInterviewDetailHTML,
    getWrongQuestions
};
