/**
 * @fileoverview DOM操作工具模块 - 提供DOM查询、创建、事件管理等基础功能
 * @module utils/dom
 */

/**
 * 根据选择器获取单个元素 (兼容 ID 或 CSS 选择器)
 * @param {string} selector - 选择器
 * @returns {HTMLElement|null} 元素对象
 */
export function $(selector) {
    return document.querySelector(selector);
}

/**
 * 根据选择器获取元素
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} [parent=document] - 父元素
 * @returns {HTMLElement|null} 元素对象
 */
export function $$(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * 根据选择器获取所有匹配元素
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} [parent=document] - 父元素
 * @returns {NodeList} 元素列表
 */
export function $$$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * 创建元素
 * @param {string} tag - 标签名
 * @param {Object} [attrs={}] - 属性对象
 * @param {string|HTMLElement|Array} [children] - 子元素或文本
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tag, attrs = {}, children) {
    const element = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key !== 'children') {
            element.setAttribute(key, value);
        }
    });

    if (children) {
        if (typeof children === 'string') {
            element.textContent = children;
        } else if (children instanceof HTMLElement) {
            element.appendChild(children);
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        }
    }

    return element;
}

/**
 * 清空元素内容
 * @param {HTMLElement} element - 目标元素
 */
export function empty(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * 移除元素
 * @param {HTMLElement} element - 目标元素
 */
export function remove(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * 替换元素内容
 * @param {HTMLElement} element - 目标元素
 * @param {string|HTMLElement} content - 新内容
 */
export function html(element, content) {
    if (content instanceof HTMLElement) {
        empty(element);
        element.appendChild(content);
    } else {
        element.innerHTML = content;
    }
}

/**
 * 获取或设置文本内容
 * @param {HTMLElement} element - 目标元素
 * @param {string} [text] - 新文本（可选）
 * @returns {string} 文本内容
 */
export function text(element, text) {
    if (text === undefined) {
        return element.textContent;
    }
    element.textContent = text;
    return text;
}

/**
 * 显示元素
 * @param {HTMLElement} element - 目标元素
 */
export function show(element) {
    element.hidden = false;
}

/**
 * 隐藏元素
 * @param {HTMLElement} element - 目标元素
 */
export function hide(element) {
    element.hidden = true;
}

/**
 * 切换元素显示状态
 * @param {HTMLElement} element - 目标元素
 * @param {boolean} [force] - 强制显示/隐藏
 * @returns {boolean} 当前显示状态
 */
export function toggle(element, force) {
    if (force !== undefined) {
        element.hidden = !force;
        return !!force;
    }
    element.hidden = !element.hidden;
    return !element.hidden;
}

/**
 * 添加类名
 * @param {HTMLElement} element - 目标元素
 * @param {...string} classes - 类名
 */
export function addClass(element, ...classes) {
    element.classList.add(...classes);
}

/**
 * 移除类名
 * @param {HTMLElement} element - 目标元素
 * @param {...string} classes - 类名
 */
export function removeClass(element, ...classes) {
    element.classList.remove(...classes);
}

/**
 * 切换类名
 * @param {HTMLElement} element - 目标元素
 * @param {string} className - 类名
 * @param {boolean} [force] - 强制添加/移除
 * @returns {boolean} 当前状态
 */
export function toggleClass(element, className, force) {
    return element.classList.toggle(className, force);
}

/**
 * 检查元素是否有类名
 * @param {HTMLElement} element - 目标元素
 * @param {string} className - 类名
 * @returns {boolean} 是否有该类名
 */
export function hasClass(element, className) {
    return element.classList.contains(className);
}

/**
 * 绑定事件监听器
 * @param {HTMLElement|NodeList|Array} elements - 元素或元素集合
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object} [options] - 事件选项
 */
export function on(elements, eventType, handler, options) {
    if (!elements) return;
    const els = elements instanceof NodeList || Array.isArray(elements)
        ? elements
        : [elements];

    els.forEach(el => {
        if (el && el.addEventListener) {
            el.addEventListener(eventType, handler, options);
        }
    });
}

/**
 * 解绑事件监听器
 * @param {HTMLElement|NodeList|Array} elements - 元素或元素集合
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object} [options] - 事件选项
 */
export function off(elements, eventType, handler, options) {
    if (!elements) return;
    const els = elements instanceof NodeList || Array.isArray(elements)
        ? elements
        : [elements];

    els.forEach(el => {
        if (el && el.removeEventListener) {
            el.removeEventListener(eventType, handler, options);
        }
    });
}

/**
 * 委托事件处理
 * @param {HTMLElement} parent - 父元素
 * @param {string} selector - 子元素选择器
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object} [options] - 事件选项
 */
export function delegate(parent, selector, eventType, handler, options) {
    if (!parent) return;
    parent.addEventListener(eventType, (event) => {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event, target);
        }
    }, options);
}

/**
 * 防抖函数
 * @param {Function} func - 待防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 待节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}

/**
 * 生成唯一ID
 * @param {string} [prefix='id'] - ID前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
    $,
    $$,
    $$$,
    createElement,
    empty,
    remove,
    html,
    text,
    show,
    hide,
    toggle,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    on,
    off,
    delegate,
    debounce,
    throttle,
    generateId
};
