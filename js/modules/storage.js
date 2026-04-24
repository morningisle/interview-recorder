/**
 * @fileoverview 存储模块 - 提供localStorage数据持久化功能
 * @module modules/storage
 */

import { generateId } from '../utils/dom.js';

const STORAGE_KEYS = {
    INTERVIEWS: 'interview_recorder_interviews',
    QUESTIONS: 'interview_recorder_questions',
    CATEGORIES: 'interview_recorder_categories',
    THEME: 'interview_recorder_theme',
    SETTINGS: 'interview_recorder_settings'
};

/**
 * 获取自定义分类列表
 * @returns {Array<string>} 分类名称数组
 */
export function getCategories() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return data ? JSON.parse(data) : ['未分类'];
    } catch (error) {
        return ['未分类'];
    }
}

/**
 * 保存自定义分类列表
 * @param {Array<string>} categories - 分类名称数组
 */
export function saveCategories(categories) {
    const uniqueCategories = [...new Set(categories.filter(c => c.trim().length > 0))];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(uniqueCategories));
}

/**
 * 自动从现有题目中提取并更新分类列表
 */
export function syncCategoriesFromQuestions() {
    const questions = getQuestions();
    const existingCategories = getCategories();
    const questionCategories = questions.map(q => q.category).filter(Boolean);
    const allCategories = [...new Set([...existingCategories, ...questionCategories])];
    saveCategories(allCategories);
}

/**
 * 重命名分类
 * @param {string} oldName - 原名称
 * @param {string} newName - 新名称
 */
export function renameCategory(oldName, newName) {
    if (!newName || oldName === newName) return;
    
    // 1. 更新分类列表
    const categories = getCategories();
    const index = categories.indexOf(oldName);
    if (index !== -1) {
        categories[index] = newName;
        saveCategories(categories);
    }

    // 2. 更新所有关联的题目
    const questions = getQuestions();
    let updated = false;
    questions.forEach(q => {
        if (q.category === oldName) {
            q.category = newName;
            updated = true;
        }
    });
    
    if (updated) {
        saveQuestions(questions);
    }
}

/**
 * 删除分类
 * @param {string} category - 分类名称
 */
export function deleteCategory(category) {
    const categories = getCategories();
    const filtered = categories.filter(c => c !== category);
    saveCategories(filtered);

    // 同步更新题目为“未分类”
    const questions = getQuestions();
    let updated = false;
    questions.forEach(q => {
        if (q.category === category) {
            q.category = '未分类';
            updated = true;
        }
    });
    
    if (updated) {
        saveQuestions(questions);
    }
}

/**
 * 获取面试记录列表
 * @returns {Array} 面试记录数组
 */
export function getInterviews() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.INTERVIEWS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('获取面试记录失败:', error);
        return [];
    }
}

/**
 * 保存面试记录列表
 * @param {Array} interviews - 面试记录数组
 */
export function saveInterviews(interviews) {
    try {
        localStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify(interviews));
    } catch (error) {
        console.error('保存面试记录失败:', error);
        throw new Error('存储空间不足');
    }
}

/**
 * 添加面试记录
 * @param {Object} interview - 面试记录对象
 * @returns {Object} 添加后的面试记录
 */
export function addInterview(interview) {
    const interviews = getInterviews();
    const newInterview = {
        ...interview,
        id: generateId('ivw'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    interviews.unshift(newInterview);
    saveInterviews(interviews);
    return newInterview;
}

/**
 * 更新面试记录
 * @param {string} id - 面试记录ID
 * @param {Object} updates - 更新内容
 * @returns {Object|null} 更新后的面试记录
 */
export function updateInterview(id, updates) {
    const interviews = getInterviews();
    const index = interviews.findIndex(item => item.id === id);
    if (index === -1) {
        return null;
    }
    interviews[index] = {
        ...interviews[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    saveInterviews(interviews);
    return interviews[index];
}

/**
 * 删除面试记录
 * @param {string} id - 面试记录ID
 * @returns {boolean} 是否删除成功
 */
export function deleteInterview(id) {
    const interviews = getInterviews();
    const filtered = interviews.filter(item => item.id !== id);
    if (filtered.length === interviews.length) {
        return false;
    }
    saveInterviews(filtered);
    return true;
}

/**
 * 获取单条面试记录
 * @param {string} id - 面试记录ID
 * @returns {Object|null} 面试记录
 */
export function getInterviewById(id) {
    const interviews = getInterviews();
    return interviews.find(item => item.id === id) || null;
}

/**
 * 获取题库列表
 * @returns {Array} 题库数组
 */
export function getQuestions() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('获取题库失败:', error);
        return [];
    }
}

/**
 * 保存题库列表
 * @param {Array} questions - 题库数组
 */
export function saveQuestions(questions) {
    try {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    } catch (error) {
        console.error('保存题库失败:', error);
        throw new Error('存储空间不足');
    }
}

/**
 * 添加题目
 * @param {Object} question - 题目对象
 * @returns {Object} 添加后的题目
 */
export function addQuestion(question) {
    const questions = getQuestions();
    const newQuestion = {
        ...question,
        id: generateId('q'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    questions.unshift(newQuestion);
    saveQuestions(questions);
    return newQuestion;
}

/**
 * 更新题目
 * @param {string} id - 题目ID
 * @param {Object} updates - 更新内容
 * @returns {Object|null} 更新后的题目
 */
export function updateQuestion(id, updates) {
    const questions = getQuestions();
    const index = questions.findIndex(item => item.id === id);
    if (index === -1) {
        return null;
    }
    questions[index] = {
        ...questions[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    saveQuestions(questions);
    return questions[index];
}

/**
 * 删除题目
 * @param {string} id - 题目ID
 * @returns {boolean} 是否删除成功
 */
export function deleteQuestion(id) {
    const questions = getQuestions();
    const filtered = questions.filter(item => item.id !== id);
    if (filtered.length === questions.length) {
        return false;
    }
    saveQuestions(filtered);
    return true;
}

/**
 * 获取单条题目
 * @param {string} id - 题目ID
 * @returns {Object|null} 题目
 */
export function getQuestionById(id) {
    const questions = getQuestions();
    return questions.find(item => item.id === id) || null;
}

/**
 * 获取主题设置
 * @returns {string} 主题名称 ('light' | 'dark')
 */
export function getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
}

/**
 * 保存主题设置
 * @param {string} theme - 主题名称
 */
export function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

/**
 * 导出所有数据
 * @returns {Object} 导出数据对象
 */
export function exportData() {
    return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        interviews: getInterviews(),
        questions: getQuestions(),
        categories: getCategories()
    };
}

/**
 * 导入数据
 * @param {Object} data - 导入数据对象
 */
export function importData(data) {
    if (data.interviews) {
        saveInterviews(data.interviews);
    }
    if (data.questions) {
        saveQuestions(data.questions);
    }
    if (data.categories || data.tags) {
        saveCategories(data.categories || data.tags);
    }
}

/**
 * 清空所有数据
 */
export function clearAll() {
    localStorage.removeItem(STORAGE_KEYS.INTERVIEWS);
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
}

/**
 * 获取统计数据
 * @returns {Object} 统计数据对象
 */
export function getStatistics() {
    const interviews = getInterviews();
    const questions = getQuestions();

    const total = interviews.length;
    const passed = interviews.filter(i => i.status === 'passed').length;
    const failed = interviews.filter(i => i.status === 'failed').length;
    const pending = interviews.filter(i => i.status === 'pending').length;

    const companyStats = {};
    const positionStats = {};
    const interviewCategoryStats = {};

    interviews.forEach(interview => {
        const company = interview.company || '未知公司';
        const position = interview.position || '未知职位';
        const category = interview.category || 'other';

        if (!companyStats[company]) {
            companyStats[company] = { total: 0, passed: 0 };
        }
        companyStats[company].total++;
        if (interview.status === 'passed') {
            companyStats[company].passed++;
        }

        if (!positionStats[position]) {
            positionStats[position] = { total: 0, passed: 0 };
        }
        positionStats[position].total++;
        if (interview.status === 'passed') {
            positionStats[position].passed++;
        }

        if (!interviewCategoryStats[category]) {
            interviewCategoryStats[category] = { total: 0, passed: 0 };
        }
        interviewCategoryStats[category].total++;
        if (interview.status === 'passed') {
            interviewCategoryStats[category].passed++;
        }
    });

    const categoryStats = {};
    const questionPositionStats = {};
    questions.forEach(q => {
        const cat = q.category || '未分类';
        const pos = q.position || '未知职位';
        
        if (!categoryStats[cat]) {
            categoryStats[cat] = 0;
        }
        categoryStats[cat]++;

        if (!questionPositionStats[pos]) {
            questionPositionStats[pos] = 0;
        }
        questionPositionStats[pos]++;
    });

    const monthlyStats = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyStats[key] = { total: 0, passed: 0 };
    }

    interviews.forEach(interview => {
        if (interview.date) {
            const date = new Date(interview.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyStats[key]) {
                monthlyStats[key].total++;
                if (interview.status === 'passed') {
                    monthlyStats[key].passed++;
                }
            }
        }
    });

    return {
        total,
        passed,
        failed,
        pending,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        questionCount: questions.length,
        companyStats,
        positionStats,
        interviewCategoryStats,
        categoryStats,
        questionPositionStats,
        monthlyStats
    };
}

export default {
    STORAGE_KEYS,
    getInterviews,
    saveInterviews,
    addInterview,
    updateInterview,
    deleteInterview,
    getInterviewById,
    getQuestions,
    saveQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionById,
    getTheme,
    saveTheme,
    exportData,
    importData,
    clearAll,
    getStatistics
};
