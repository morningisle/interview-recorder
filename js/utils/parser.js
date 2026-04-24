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

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const results = [];
    let currentQA = null;

    // 常见的识别模式
    const Q_PATTERNS = [/^[Q问]\d*[:：\s]/i, /^问题\d*[:：\s]/i];
    const A_PATTERNS = [/^[A答]\d*[:：\s]/i, /^回答\d*[:：\s]/i];

    lines.forEach(line => {
        const isQ = Q_PATTERNS.some(p => p.test(line));
        const isA = A_PATTERNS.some(p => p.test(line));

        if (isQ) {
            if (currentQA && currentQA.question) {
                results.push(currentQA);
            }
            currentQA = {
                question: line.replace(Q_PATTERNS.find(p => p.test(line)), '').trim(),
                answer: ''
            };
        } else if (isA && currentQA) {
            currentQA.answer = line.replace(A_PATTERNS.find(p => p.test(line)), '').trim();
        } else if (currentQA) {
            // 如果不是明显的 Q/A 开头，追加到当前部分
            if (!currentQA.answer) {
                currentQA.question += '\n' + line;
            } else {
                currentQA.answer += '\n' + line;
            }
        }
    });

    if (currentQA && currentQA.question) {
        results.push(currentQA);
    }

    // 如果没有识别到任何固定模式，尝试按问号分割（简单的启发式算法）
    if (results.length === 0) {
        // TODO: 进一步增强启发式解析
    }

    return results;
}

export default {
    parseTranscript
};
