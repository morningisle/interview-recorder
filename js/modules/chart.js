/**
 * @fileoverview 图表模块 - 使用Canvas绘制面试趋势图表
 * @module modules/chart
 */

/**
 * 获取主题相关的颜色
 * @returns {Object} 颜色配置
 */
function getColors() {
    const isDark = document.body.classList.contains('dark');
    return {
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? '#334155' : '#e2e8f0',
        primary: '#2563eb',
        primaryLight: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
        success: '#10b981',
        background: isDark ? '#1e293b' : '#ffffff'
    };
}

/**
 * 绘制折线图
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Array} data - 数据点数组
 * @param {Object} config - 配置对象
 */
function drawLineChart(ctx, data, config) {
    const colors = getColors();
    const { width, height, padding, labels, datasets } = config;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    const maxValue = Math.max(
        ...datasets.flatMap(ds => ds.data),
        1
    );
    const minValue = 0;
    const valueRange = maxValue - minValue;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = Math.round(maxValue - (valueRange / gridLines) * i);
        ctx.fillStyle = colors.text;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString() + '次', padding.left - 8, y + 4);
    }

    ctx.textAlign = 'center';
    const labelStep = Math.ceil(labels.length / 12);
    labels.forEach((label, index) => {
        if (index % labelStep === 0) {
            const x = padding.left + (chartWidth / (labels.length - 1)) * index;
            ctx.fillStyle = colors.text;
            ctx.fillText(label, x, height - padding.bottom + 20);
        }
    });

    datasets.forEach((dataset, dsIndex) => {
        const points = dataset.data.map((value, index) => ({
            x: padding.left + (chartWidth / (labels.length - 1)) * index,
            y: padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
        }));

        if (config.showArea) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            points.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fillStyle = dataset.fillColor || colors.primaryLight;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.strokeStyle = dataset.color || colors.primary;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();

        if (config.showPoints) {
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = dataset.color || colors.primary;
                ctx.fill();
                ctx.strokeStyle = colors.background;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
    });

    if (config.legend && datasets.length > 1) {
        const legendY = 20;
        let legendX = padding.left;
        datasets.forEach(dataset => {
            ctx.fillStyle = dataset.color || colors.primary;
            ctx.fillRect(legendX, legendY, 12, 12);
            ctx.fillStyle = colors.text;
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.label, legendX + 18, legendY + 10);
            legendX += ctx.measureText(dataset.label).width + 40;
        });
    }
}

/**
 * 绘制柱状图
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Array} data - 数据点数组
 * @param {Object} config - 配置对象
 */
function drawBarChart(ctx, data, config) {
    const colors = getColors();
    const { width, height, padding, labels, datasets } = config;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    const maxValue = Math.max(
        ...datasets.flatMap(ds => ds.data),
        1
    );
    const minValue = 0;
    const valueRange = maxValue - minValue;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = Math.round(maxValue - (valueRange / gridLines) * i);
        ctx.fillStyle = colors.text;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString() + '次', padding.left - 8, y + 4);
    }

    ctx.textAlign = 'center';
    const barGroupWidth = chartWidth / labels.length;
    const barWidth = (barGroupWidth * 0.7) / datasets.length;
    const barGap = barGroupWidth * 0.15;

    labels.forEach((label, index) => {
        const groupX = padding.left + barGroupWidth * index + barGap;

        datasets.forEach((dataset, dsIndex) => {
            const value = dataset.data[index];
            const barHeight = ((value - minValue) / valueRange) * chartHeight;
            const x = groupX + barWidth * dsIndex;
            const y = padding.top + chartHeight - barHeight;

            ctx.fillStyle = dataset.color || colors.primary;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - 4, barHeight, [4, 4, 0, 0]);
            ctx.fill();
        });

        const labelX = groupX + (barWidth * datasets.length) / 2;
        ctx.fillStyle = colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.save();
        ctx.translate(labelX, height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });

    if (config.legend && datasets.length > 1) {
        const legendY = 20;
        let legendX = padding.left;
        datasets.forEach(dataset => {
            ctx.fillStyle = dataset.color || colors.primary;
            ctx.fillRect(legendX, legendY, 12, 12);
            ctx.fillStyle = colors.text;
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.label, legendX + 18, legendY + 10);
            legendX += ctx.measureText(dataset.label).width + 40;
        });
    }
}

/**
 * 图表类 - 管理Canvas图表的绘制和更新
 */
export class Chart {
    /**
     * 创建图表实例
     * @param {string|HTMLCanvasElement} canvas - Canvas元素或ID
     * @param {Object} [options={}] - 配置选项
     */
    constructor(canvas, options = {}) {
        this.canvas = typeof canvas === 'string'
            ? document.getElementById(canvas)
            : canvas;
        this.ctx = this.canvas.getContext('2d');
        this.options = {
            type: 'line',
            showArea: true,
            showPoints: true,
            showLegend: true,
            ...options
        };
        this.data = null;
        this.labels = [];
        this.datasets = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 调整Canvas尺寸
     */
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        if (this.data) {
            this.render(this.data);
        }
    }

    /**
     * 设置图表数据
     * @param {Object} data - 图表数据
     * @param {Array} data.labels - 标签数组
     * @param {Array} data.datasets - 数据集数组
     */
    setData(data) {
        this.labels = data.labels || [];
        this.datasets = data.datasets || [];
        this.data = data;
    }

    /**
     * 渲染图表
     * @param {Object} data - 图表数据
     */
    render(data) {
        if (data) {
            this.setData(data);
        }

        const padding = {
            top: 40,
            right: 20,
            bottom: 50,
            left: 50
        };

        const config = {
            width: this.width,
            height: this.height,
            padding,
            labels: this.labels,
            datasets: this.datasets,
            showArea: this.options.showArea,
            showPoints: this.options.showPoints,
            showLegend: this.options.showLegend,
            type: this.options.type
        };

        if (this.options.type === 'bar') {
            drawBarChart(this.ctx, this.data, config);
        } else {
            drawLineChart(this.ctx, this.data, config);
        }
    }

    /**
     * 更新图表类型
     * @param {string} type - 图表类型 ('line' | 'bar')
     */
    setType(type) {
        this.options.type = type;
        this.render();
    }

    /**
     * 更新颜色配置（主题切换时调用）
     */
    updateColors() {
        this.render();
    }

    /**
     * 销毁图表实例
     */
    destroy() {
        window.removeEventListener('resize', this.resize);
    }
}

/**
 * 创建趋势图表数据
 * @param {Object} monthlyStats - 月度统计数据
 * @returns {Object} 图表数据
 */
export function createTrendChartData(monthlyStats) {
    const labels = Object.keys(monthlyStats).map(key => {
        const [year, month] = key.split('-');
        return `${month}月`;
    });

    const totalData = Object.values(monthlyStats).map(s => s.total);
    const passedData = Object.values(monthlyStats).map(s => s.passed);

    return {
        labels,
        datasets: [
            {
                label: '面试次数',
                data: totalData,
                color: '#2563eb',
                fillColor: 'rgba(37, 99, 235, 0.1)'
            },
            {
                label: '通过次数',
                data: passedData,
                color: '#10b981',
                fillColor: 'rgba(16, 185, 129, 0.1)'
            }
        ]
    };
}

export default {
    Chart,
    createTrendChartData
};
