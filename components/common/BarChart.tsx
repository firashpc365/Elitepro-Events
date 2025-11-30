// components/common/BarChart.tsx
import React from 'react';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface GroupedBarData {
    label: string;
    values: {
        label: string;
        value: number;
        color: string;
    }[];
}

type ChartData = BarData | GroupedBarData;

interface BarChartProps {
  data: ChartData[];
  title: string;
  yAxisLabel?: string;
}

const formatCurrency = (value: number) => `SAR ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const BarChart: React.FC<BarChartProps> = ({ data, title, yAxisLabel }) => {
    if (!data || data.length === 0) {
        return (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius)', padding: '1rem', color: 'var(--text-primary-color)' }}>
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-secondary-color)'}}>
                    No data available for this chart.
                </div>
            </div>
        );
    }
    
    const PADDING = { top: 30, right: 20, bottom: 80, left: 80 };
    const SVG_WIDTH = 600;
    const SVG_HEIGHT = 400;

    const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
    const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

    const maxValue = React.useMemo(() => {
        const allValues = data.flatMap(d => 'value' in d ? d.value : d.values.map(v => v.value));
        const max = Math.max(0, ...allValues);
        return max === 0 ? 1 : max; // Avoid division by zero
    }, [data]);
    
    const yScale = (value: number) => CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
    
    const yAxisTicks = React.useMemo(() => {
        const ticks = [];
        const tickCount = 5;
        const step = maxValue / tickCount;
        for (let i = 0; i <= tickCount; i++) {
            ticks.push(Math.round(i * step));
        }
        return ticks;
    }, [maxValue]);

    const isGrouped = 'values' in data[0];

    return (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius)', padding: '1rem', color: 'var(--text-primary-color)' }}>
            <h3 className="text-lg font-bold mb-4">{title}</h3>
            <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={{ fontFamily: 'inherit', fontSize: '12px' }}>
                <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                    {/* Y-Axis */}
                    <text transform={`rotate(-90)`} x={-CHART_HEIGHT / 2} y={-PADDING.left + 20} textAnchor="middle" fill="var(--text-secondary-color)" fontSize="12px">
                        {yAxisLabel}
                    </text>
                    {yAxisTicks.map((tick, i) => (
                        <g key={i} transform={`translate(0, ${yScale(tick)})`}>
                            <line x1="-5" x2={CHART_WIDTH} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2,2" />
                            <text x="-10" y="4" textAnchor="end" fill="var(--text-secondary-color)">
                                {tick.toLocaleString()}
                            </text>
                        </g>
                    ))}

                    {/* Bars and X-Axis Labels */}
                    {data.map((d, i) => {
                        if (isGrouped && 'values' in d) {
                            const groupWidth = CHART_WIDTH / data.length;
                            const barWidth = (groupWidth * 0.8) / d.values.length;
                            const groupX = i * groupWidth + (groupWidth * 0.1);

                            return (
                                <g key={i}>
                                    {d.values.map((item, j) => {
                                        const barHeight = CHART_HEIGHT - yScale(item.value);
                                        const x = groupX + j * barWidth;
                                        return (
                                            <rect
                                                key={j}
                                                x={x}
                                                y={yScale(item.value)}
                                                width={barWidth - 1}
                                                height={Math.max(0, barHeight)}
                                                fill={item.color}
                                                rx="2"
                                            >
                                                <title>{`${d.label} - ${item.label}: ${formatCurrency(item.value)}`}</title>
                                            </rect>
                                        );
                                    })}
                                    <text
                                        x={groupX + (groupWidth * 0.8) / 2}
                                        y={CHART_HEIGHT + 20}
                                        textAnchor="middle"
                                        fill="var(--text-secondary-color)"
                                        transform={`rotate(-45, ${groupX + (groupWidth * 0.8) / 2}, ${CHART_HEIGHT + 20})`}
                                    >
                                        {d.label.length > 15 ? `${d.label.substring(0, 15)}...` : d.label}
                                    </text>
                                </g>
                            );
                        } else if ('value' in d) {
                            const barWidth = (CHART_WIDTH / data.length) * 0.8;
                            const x = (i * (CHART_WIDTH / data.length)) + ((CHART_WIDTH / data.length) * 0.1);
                            const barHeight = CHART_HEIGHT - yScale(d.value);
                            return (
                                <g key={i}>
                                    <rect
                                        x={x}
                                        y={yScale(d.value)}
                                        width={barWidth}
                                        height={Math.max(0, barHeight)}
                                        fill={(d as BarData).color || 'var(--primary-accent-color)'}
                                        rx="2"
                                    >
                                        <title>{`${d.label}: ${formatCurrency(d.value)}`}</title>
                                    </rect>
                                    <text
                                        x={x + barWidth / 2}
                                        y={CHART_HEIGHT + 20}
                                        textAnchor="middle"
                                        fill="var(--text-secondary-color)"
                                        transform={`rotate(-45, ${x + barWidth / 2}, ${CHART_HEIGHT + 20})`}
                                    >
                                        {d.label.length > 15 ? `${d.label.substring(0, 15)}...` : d.label}
                                    </text>
                                </g>
                            );
                        }
                        return null;
                    })}
                </g>
            </svg>
            {isGrouped && (
                <div className="flex justify-center gap-4 mt-2 text-xs">
                    {(data[0] as GroupedBarData).values.map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};