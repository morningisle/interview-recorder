/**
 * @fileoverview 面试稿解析工具 - 从文字稿中识别 Q&A
 * @module utils/parser
 */

/**
 * 从文字稿中提取问题和回答
 * @param {string} text - 面试文字稿
 * @returns {Array<{question: string, answer: string}>} 识别到的 Q&A 列表
 */
export function parseTranscript(text) {
    if (!text || typeof text !== 'string') return [];

    // 统一正则：匹配 Q 或 A 的标识符
    // 支持：问：、Q:、问题1:、答：、A:、回答1: 等，且支持中英文冒号和空格
    const tagRegex = /([Q问]\d*[:：\s]|问题\d*[:：\s])|([A答]\d*[:：\s]|回答\d*[:：\s])/gi;
    
    // 使用正则分割文本，并保留匹配项
    const parts = text.split(tagRegex);
    const results = [];
    let currentQA = null;

    // split 使用捕获组时，返回的数组格式为：
    // [前导文本, Q匹配项, A匹配项, 前导文本, Q匹配项, A匹配项, ...]
    // 这里的 tagRegex 有两个捕获组，所以每组匹配会产生两个位置
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === undefined || part === '') continue;

        // 判断当前部分是 Q 标识、A 标识 还是 内容
        const isQTag = /^[Q问]\d*[:：\s]|^问题\d*[:：\s]/i.test(part);
        const isATag = /^[A答]\d*[:：\s]|^回答\d*[:：\s]/i.test(part);

        if (isQTag) {
            if (currentQA && currentQA.question) {
                results.push(currentQA);
            }
            currentQA = { question: '', answer: '' };
        } else if (isATag) {
            if (!currentQA) currentQA = { question: '未识别问题', answer: '' };
        } else {
            // 这是内容部分
            if (!currentQA) continue; // 还没有开始 Q 就有内容，忽略

            const content = part.trim();
            if (!content) continue;

            if (currentQA.answer === ' ' || currentQA.answer.length > 0) {
                // 如果已经有了 A 标识（或者是初始占位），说明这部分属于回答内容
                if (currentQA.answer === ' ') {
                    currentQA.answer = content;
                } else {
                    currentQA.answer += '\n' + content;
                }
            } else {
                // 如果还没有 A 标识，说明这部分属于问题内容
                currentQA.question += (currentQA.question ? '\n' : '') + content;
            }
        }

        // 特殊处理：如果当前 part 是 A 标识，我们需要标记一下开始记录回答了
        if (isATag && currentQA) {
            // 给 answer 一个初始占位，表示后续内容应归入 answer
            if (!currentQA.answer) currentQA.answer = ' '; 
        }
    }

    // 循环结束后清理占位并添加最后一个
    if (currentQA) {
        if (currentQA.answer === ' ') currentQA.answer = '';
        else currentQA.answer = currentQA.answer.trim();
        
        if (currentQA.question) {
            results.push(currentQA);
        }
    }

    return results;
}

export default {
    parseTranscript
};
