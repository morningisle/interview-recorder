/**
 * @fileoverview 验证器模块 - 提供数据验证和XSS防护功能
 * @module utils/validator
 */

/**
 * HTML特殊字符转义表
 * @type {Object.<string, string>}
 */
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * 转义HTML特殊字符，防止XSS攻击
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 * @example
 * escapeHtml('<script>alert("xss")</script>');
 * // 返回: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return String(str).replace(/[&<>"'`=]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * 转义正则表达式特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
export function escapeRegex(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 验证必填字段
 * @param {*} value - 待验证的值
 * @returns {boolean} 是否有效
 */
export function isRequired(value) {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    return true;
}

/**
 * 验证字符串长度范围
 * @param {string} value - 待验证的字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @returns {boolean} 是否有效
 */
export function isLengthInRange(value, min = 0, max = Infinity) {
    if (typeof value !== 'string') {
        return false;
    }
    const len = value.length;
    return len >= min && len <= max;
}

/**
 * 验证公司名称
 * @param {string} company - 公司名称
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validateCompany(company) {
    if (!isRequired(company)) {
        return { valid: false, error: '公司名称不能为空' };
    }
    if (!isLengthInRange(company, 1, 100)) {
        return { valid: false, error: '公司名称长度应在1-100个字符之间' };
    }
    return { valid: true, error: '' };
}

/**
 * 验证职位
 * @param {string} position - 职位名称
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validatePosition(position) {
    if (!isRequired(position)) {
        return { valid: false, error: '职位不能为空' };
    }
    if (!isLengthInRange(position, 1, 100)) {
        return { valid: false, error: '职位长度应在1-100个字符之间' };
    }
    return { valid: true, error: '' };
}

/**
 * 验证日期时间
 * @param {string} dateString - ISO日期字符串
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validateDate(dateString) {
    if (!isRequired(dateString)) {
        return { valid: false, error: '日期不能为空' };
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return { valid: false, error: '日期格式无效' };
    }
    if (date > new Date()) {
        return { valid: false, error: '日期不能是未来时间' };
    }
    return { valid: true, error: '' };
}

/**
 * 验证面试评价星级
 * @param {number} rating - 星级评分
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validateRating(rating) {
    const num = parseInt(rating, 10);
    if (isNaN(num) || num < 1 || num > 5) {
        return { valid: false, error: '评分应在1-5之间' };
    }
    return { valid: true, error: '' };
}

/**
 * 验证面试记录
 * @param {Object} interview - 面试记录对象
 * @returns {{valid: boolean, errors: Object}} 验证结果
 */
export function validateInterview(interview) {
    const errors = {};
    let isValid = true;

    const companyResult = validateCompany(interview.company);
    if (!companyResult.valid) {
        errors.company = companyResult.error;
        isValid = false;
    }

    const positionResult = validatePosition(interview.position);
    if (!positionResult.valid) {
        errors.position = positionResult.error;
        isValid = false;
    }

    if (interview.date) {
        const dateResult = validateDate(interview.date);
        if (!dateResult.valid) {
            errors.date = dateResult.error;
            isValid = false;
        }
    }

    if (interview.evaluation !== undefined) {
        const ratingResult = validateRating(interview.evaluation);
        if (!ratingResult.valid) {
            errors.evaluation = ratingResult.error;
            isValid = false;
        }
    }

    return { valid: isValid, errors };
}

/**
 * 验证题目内容
 * @param {string} content - 题目内容
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validateQuestionContent(content) {
    if (!isRequired(content)) {
        return { valid: false, error: '题目内容不能为空' };
    }
    if (!isLengthInRange(content, 1, 1000)) {
        return { valid: false, error: '题目内容长度应在1-1000个字符之间' };
    }
    return { valid: true, error: '' };
}

/**
 * 验证题目记录
 * @param {Object} question - 题目对象
 * @returns {{valid: boolean, errors: Object}} 验证结果
 */
export function validateQuestion(question) {
    const errors = {};
    let isValid = true;

    const contentResult = validateQuestionContent(question.content);
    if (!contentResult.valid) {
        errors.content = contentResult.error;
        isValid = false;
    }

    if (!isRequired(question.position)) {
        errors.position = '职位不能为空';
        isValid = false;
    }

    if (question.optimizedAnswer) {
        if (!isLengthInRange(question.optimizedAnswer, 0, 5000)) {
            errors.optimizedAnswer = '优化建议长度应在0-5000个字符之间';
            isValid = false;
        }
    }

    return { valid: isValid, errors };
}

/**
 * 验证导入的JSON文件
 * @param {Object} data - 导入的数据对象
 * @returns {{valid: boolean, error: string}} 验证结果
 */
export function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '数据格式无效' };
    }

    if (!Array.isArray(data.interviews)) {
        return { valid: false, error: '缺少interviews数组' };
    }

    if (!Array.isArray(data.questions)) {
        return { valid: false, error: '缺少questions数组' };
    }

    for (const interview of data.interviews) {
        if (typeof interview !== 'object' || interview === null) {
            return { valid: false, error: '面试记录格式无效' };
        }
    }

    for (const question of data.questions) {
        if (typeof question !== 'object' || question === null) {
            return { valid: false, error: '题目格式无效' };
        }
    }

    return { valid: true, error: '' };
}

/**
 * 验证文件大小
 * @param {number} size - 文件大小（字节）
 * @param {number} maxSize - 最大文件大小（字节），默认2MB
 * @returns {boolean} 是否有效
 */
export function validateFileSize(size, maxSize = 2 * 1024 * 1024) {
    return size > 0 && size <= maxSize;
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的MIME类型数组
 * @returns {boolean} 是否有效
 */
export function validateFileType(file, allowedTypes = ['application/json']) {
    return allowedTypes.includes(file.type);
}

export default {
    escapeHtml,
    escapeRegex,
    isRequired,
    isLengthInRange,
    validateCompany,
    validatePosition,
    validateDate,
    validateRating,
    validateInterview,
    validateQuestionContent,
    validateQuestion,
    validateImportData,
    validateFileSize,
    validateFileType
};
