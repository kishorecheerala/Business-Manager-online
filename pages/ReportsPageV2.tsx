import React, { useState, useMemo } from 'react';
import {
    BarChart3, PieChart, LineChart, Table as TableIcon,
    Plus, Save, Play, Filter, Download, MoreVertical, LayoutGrid, Calendar as CalendarIcon,
    FileText, Trash2, Edit2, TrendingUp, Search, Users, Activity, Layers, Funnel
} from 'lucide-react';
import {
    BarChart, Bar, LineChart as RechartsLine, Line, PieChart as RechartsPie, Pie,
    Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ScatterChart, Scatter, ComposedChart, FunnelChart, Funnel as RechartsFunnel, LabelList, Treemap
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import { ReportConfig, ReportField } from '../types';
import { ReportEngine } from '../utils/reporting/ReportEngine';
import { EXTENDED_PREBUILT_REPORTS, REPORT_CATEGORIES } from '../utils/reporting/ReportTemplates';

import { ExportEngine } from '../utils/reporting/ExportEngine';
import ModernDateInput from '../components/ModernDateInput';
import { getLocalDateString } from '../utils/dateUtils';
import { formatDate } from '../utils/formatUtils';

// Colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43'];

const AVAILABLE_FIELDS: Record<string, ReportField[]> = {
    sales: [
        { id: 'totalAmount', label: 'Total Amount', type: 'currency', aggregation: 'SUM' },
        { id: 'discount', label: 'Discount', type: 'currency', aggregation: 'SUM' },
        { id: 'gstAmount', label: 'GST Amount', type: 'currency', aggregation: 'SUM' },
        { id: 'netProfit', label: 'Net Profit', type: 'currency', aggregation: 'SUM' },
        { id: 'cogs', label: 'Cost of Goods', type: 'currency', aggregation: 'SUM' },
        { id: 'customerName', label: 'Customer Name', type: 'string' },
        { id: 'month', label: 'Month', type: 'string' },
        { id: 'year', label: 'Year', type: 'string' },
        { id: 'date', label: 'Date', type: 'date' },
        { id: 'id', label: 'Sale ID', type: 'string', aggregation: 'COUNT' }
    ],
    inventory: [
        { id: 'name', label: 'Product Name', type: 'string' },
        { id: 'category', label: 'Category', type: 'string' },
        { id: 'quantity', label: 'Quantity', type: 'number', aggregation: 'SUM' },
        { id: 'purchasePrice', label: 'Cost Price', type: 'currency', aggregation: 'AVG' },
        { id: 'salePrice', label: 'Sale Price', type: 'currency', aggregation: 'AVG' },
        { id: 'stockValue', label: 'Stock Value', type: 'currency', aggregation: 'SUM' },
        { id: 'marginPercent', label: 'Margin %', type: 'number', aggregation: 'AVG' }
    ],
    customers: [
        { id: 'name', label: 'Customer Name', type: 'string' },
        { id: 'area', label: 'Area', type: 'string' },
        { id: 'totalSpent', label: 'Total Spent', type: 'currency', aggregation: 'SUM' },
        { id: 'dueAmount', label: 'Due Amount', type: 'currency', aggregation: 'SUM' },
        { id: 'transactionCount', label: 'Orders', type: 'number', aggregation: 'SUM' }
    ]
};

const ReportsPageV2: React.FC = () => {
    const { state, showToast } = useAppContext();
    const [viewMode, setViewMode] = useState<'list' | 'builder' | 'view'>('list');
    const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    // --- Date Filter State ---
    const [duration, setDuration] = useState('this_month');
    const [customStart, setCustomStart] = useState(getLocalDateString());
    const [customEnd, setCustomEnd] = useState(getLocalDateString());
    const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
    const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

    const dateRange = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        switch (duration) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                start.setHours(0, 0, 0, 0);
                break;
            case 'this_week':
                const day = now.getDay() || 7;
                start.setDate(now.getDate() - day + 1);
                break;
            case 'last_7':
                start.setDate(now.getDate() - 7);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            case 'custom':
                const [sy, sm, sd] = customStart.split('-').map(Number);
                start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
                const [ey, em, ed] = customEnd.split('-').map(Number);
                end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
                break;
        }
        return { start, end };
    }, [duration, customStart, customEnd]);

    const durationOptions = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_7', label: 'Last 7 Days' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_year', label: 'This Year' },
        { value: 'custom', label: 'Custom Period' },
    ];

    // Builder State
    const [builderConfig, setBuilderConfig] = useState<Partial<ReportConfig>>({
        title: 'New Report',
        dataSource: 'sales',
        chartType: 'TABLE',
        fields: [],
        filters: []
    });

    // --- Derived Data ---
    const reportData = useMemo(() => {
        if (!selectedReport) return [];
        try {
            // Apply Global Date Filter if applicable
            const config = { ...selectedReport };

            if (['sales', 'purchases', 'expenses'].includes(config.dataSource)) {
                const dateFilter: any = {
                    id: 'dateVal', // ReportEngine.flattenItem creates this
                    operator: 'between',
                    value: [dateRange.start.getTime(), dateRange.end.getTime()]
                };
                // Prepend filter to ensure it runs
                config.filters = [dateFilter, ...(config.filters || [])];
            }

            return ReportEngine.process(state, config);
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [state, selectedReport, dateRange]);

    const filteredTemplates = useMemo(() => {
        if (activeCategory === 'All') return EXTENDED_PREBUILT_REPORTS;
        const sourceMap: Record<string, string> = {
            'Sales': 'sales',
            'Inventory': 'inventory',
            'Customers': 'customers',
            'Purchases': 'purchases',
            'Expenses': 'expenses',
            'Financial': 'sales' // Often hybrids
        };
        const targetSource = sourceMap[activeCategory];
        if (!targetSource) return EXTENDED_PREBUILT_REPORTS;
        return EXTENDED_PREBUILT_REPORTS.filter(r => r.dataSource === targetSource || (activeCategory === 'Financial' && ['sales', 'expenses'].includes(r.dataSource)));
    }, [activeCategory]);

    // --- Actions ---
    const handleCreateNew = () => {
        setBuilderConfig({
            title: 'Untitled Report',
            dataSource: 'sales',
            chartType: 'TABLE',
            fields: [AVAILABLE_FIELDS['sales'][0]], // Default field
            filters: []
        });
        setViewMode('builder');
    };

    const handleSaveReport = () => {
        if (!builderConfig.title) { showToast("Title required", "error"); return; }
        const fullConfig = builderConfig as ReportConfig;
        fullConfig.id = `custom_${Date.now()}`;
        fullConfig.createdAt = Date.now();
        setSelectedReport(fullConfig);
        setViewMode('view');
        showToast("Report generated!", "success");
    };

    const handleRunPrebuilt = (report: ReportConfig) => {
        setSelectedReport(report);
        setViewMode('view');
    };

    // --- Renderers ---
    const renderChart = () => {
        if (!selectedReport || reportData.length === 0) return <div className="p-10 text-center text-gray-500">No data available</div>;

        const dataKey = selectedReport.fields.find(f => f.type === 'number' || f.type === 'currency')?.id || 'value';
        const labelKey = selectedReport.groupBy || selectedReport.fields.find(f => f.type === 'string' || f.type === 'date')?.id || 'name';

        // Determine if label is a date
        const isDateLabel = selectedReport.fields.find(f => f.id === labelKey)?.type === 'date' || labelKey === 'date' || labelKey.includes('Date');

        const formatLabel = (val: any) => {
            if (isDateLabel) return formatDate(val);
            return val;
        };

        // Custom Tooltip
        const CustomTooltip = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-white dark:bg-slate-800 p-3 border dark:border-slate-700 shadow-lg rounded-lg">
                        <p className="font-bold mb-1">{formatLabel(label)}</p>
                        {payload.map((p: any, idx: number) => (
                            <p key={idx} style={{ color: p.color }} className="text-sm">
                                {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                            </p>
                        ))}
                    </div>
                );
            }
            return null;
        };

        const CommonProps = {
            data: reportData,
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };

        switch (selectedReport.chartType) {
            case 'BAR':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey={labelKey} tickFormatter={formatLabel} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey={dataKey} fill="#8884d8" radius={[4, 4, 0, 0]}>
                                {reportData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'LINE':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <RechartsLine {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey={labelKey} tickFormatter={formatLabel} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey={dataKey} stroke="#82ca9d" strokeWidth={3} dot={{ r: 4 }} />
                        </RechartsLine>
                    </ResponsiveContainer>
                );
            case 'AREA':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey={labelKey} tickFormatter={formatLabel} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey={dataKey} stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'PIE':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <RechartsPie data={reportData}>
                            <Pie
                                data={reportData}
                                cx="50%" cy="50%"
                                outerRadius={140}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey={dataKey}
                                nameKey={labelKey}
                                label
                            >
                                {reportData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPie>
                    </ResponsiveContainer>
                );
            case 'SCATTER':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="category" dataKey={labelKey} name={labelKey} />
                            <YAxis type="number" dataKey={dataKey} name={dataKey} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name={dataKey} data={reportData} fill="#8884d8">
                                {reportData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            case 'COMPOSED':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart {...CommonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={labelKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey={dataKey} fill="#8884d8" stroke="#8884d8" />
                            <Bar dataKey={dataKey} barSize={20} fill="#413ea0" />
                            <Line type="monotone" dataKey={dataKey} stroke="#ff7300" />
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            case 'FUNNEL':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <FunnelChart>
                            <Tooltip />
                            <RechartsFunnel
                                dataKey={dataKey}
                                data={reportData.sort((a, b) => b[dataKey] - a[dataKey])}
                                isAnimationActive
                            >
                                <LabelList position="right" fill="#000" stroke="none" dataKey={labelKey} />
                            </RechartsFunnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                );
            case 'TREEMAP':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <Treemap
                            data={reportData}
                            dataKey={dataKey}
                            nameKey={labelKey}
                            stroke="#fff"
                            fill="#8884d8"
                        >
                            <Tooltip />
                        </Treemap>
                    </ResponsiveContainer>
                );
            case 'KPI':
                // Single Value View
                const kpiValue = reportData.reduce((sum, item) => sum + (Number(item[dataKey]) || 0), 0);
                return (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                        <div className="text-6xl font-bold text-violet-600 mb-2">
                            {typeof kpiValue === 'number' ? kpiValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : kpiValue}
                        </div>
                        <div className="text-xl text-gray-500 uppercase tracking-widest">{selectedReport.fields.find(f => f.id === dataKey)?.label}</div>
                    </div>
                );

            default: // TABLE
                return (
                    <div className="overflow-auto border rounded-xl max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                                <tr>
                                    {selectedReport.fields.map(f => (
                                        <th key={f.id} className="p-3 font-medium">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, i) => (
                                    <tr key={i} className="border-t hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                                        {selectedReport.fields.map(f => (
                                            <td key={f.id} className="p-3">
                                                {f.type === 'currency' ? `₹${Number(row[f.id] || 0).toLocaleString()}` :
                                                    f.type === 'date' ? formatDate(row[f.id]) :
                                                        row[f.id]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                            <TrendingUp className="text-violet-500" />
                            Enterprise Reporting
                        </h1>
                        <p className="text-gray-500 text-sm">Business Intelligence & Analytics Studio</p>
                    </div>
                    {viewMode === 'list' && (
                        <Button onClick={handleCreateNew} className="bg-violet-600 text-white">
                            <Plus size={18} className="mr-2" />
                            Create Custom Report
                        </Button>
                    )}
                    {viewMode !== 'list' && (
                        <Button onClick={() => setViewMode('list')} variant="secondary">
                            Back to Reports
                        </Button>
                    )}
                </div>

                {/* Date Picker Toolbar (Global) */}
                <div className="flex justify-end animate-fade-in">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 px-2 w-full sm:w-auto mb-2 sm:mb-0">
                            <CalendarIcon size={16} className="text-gray-400 shrink-0" />
                            <Dropdown
                                options={durationOptions}
                                value={duration}
                                onChange={setDuration}
                                className="w-full sm:w-36"
                            />
                        </div>
                        {duration === 'custom' && (
                            <>
                                <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1"></div>
                                <div className="flex items-center gap-2 px-2 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 dark:border-slate-700">
                                    <ModernDateInput
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        isOpen={isStartCalendarOpen}
                                        onToggle={setIsStartCalendarOpen}
                                        containerClassName="flex-1 sm:flex-none sm:w-40"
                                    />
                                    <span className="text-gray-400 shrink-0">-</span>
                                    <ModernDateInput
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        isOpen={isEndCalendarOpen}
                                        onToggle={setIsEndCalendarOpen}
                                        containerClassName="flex-1 sm:flex-none sm:w-40"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="space-y-6">
                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {REPORT_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeCategory === cat
                                    ? 'bg-violet-600 text-white shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border dark:border-slate-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {filteredTemplates.map((report) => (
                            <div key={report.id}
                                onClick={() => handleRunPrebuilt(report)}
                                className="group bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border dark:border-slate-700 hover:shadow-md cursor-pointer transition-all hover:border-violet-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    {report.chartType === 'BAR' ? <BarChart3 size={64} /> :
                                        report.chartType === 'PIE' ? <PieChart size={64} /> :
                                            report.chartType === 'AREA' ? <Activity size={64} /> :
                                                report.chartType === 'LINE' ? <LineChart size={64} /> :
                                                    <TableIcon size={64} />}
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 w-fit rounded-lg text-violet-600">
                                            {report.chartType === 'TABLE' ? <TableIcon size={20} /> :
                                                report.chartType === 'PIE' ? <PieChart size={20} /> :
                                                    report.chartType === 'AREA' ? <Activity size={20} /> :
                                                        <BarChart3 size={20} />}
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${report.dataSource === 'sales' ? 'bg-emerald-100 text-emerald-700' :
                                            report.dataSource === 'inventory' ? 'bg-blue-100 text-blue-700' :
                                                report.dataSource === 'customers' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {report.dataSource}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1 dark:text-gray-100 line-clamp-1">{report.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 h-10">{report.description}</p>

                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Layers size={12} /> {report.groupBy || 'No Grouping'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BUILDER MODE */}
            {viewMode === 'builder' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    <Card className="lg:col-span-1 space-y-4 h-fit">
                        <div className="flex items-center justify-between border-b pb-2 mb-2">
                            <h3 className="font-bold">Report Configuration</h3>
                            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">Draft</span>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Report Title</label>
                            <input
                                className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                value={builderConfig.title}
                                onChange={e => setBuilderConfig({ ...builderConfig, title: e.target.value })}
                                placeholder="e.g. Monthly Sales Report"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Data Source</label>
                            <Dropdown
                                options={['sales', 'inventory', 'customers', 'purchases', 'expenses'].map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
                                value={builderConfig.dataSource || 'sales'}
                                onChange={(val: any) => setBuilderConfig({ ...builderConfig, dataSource: val, fields: [] })}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Visualization Type</label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {['TABLE', 'BAR', 'LINE', 'PIE', 'AREA', 'SCATTER', 'COMPOSED', 'KPI', 'FUNNEL', 'TREEMAP'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setBuilderConfig({ ...builderConfig, chartType: type as any })}
                                        className={`p-2 rounded border flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all ${builderConfig.chartType === type ? 'bg-violet-100 border-violet-500 text-violet-700 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600'}`}
                                        title={type}
                                    >
                                        {type === 'TABLE' && <TableIcon size={14} />}
                                        {type === 'BAR' && <BarChart3 size={14} />}
                                        {type === 'LINE' && <LineChart size={14} />}
                                        {type === 'PIE' && <PieChart size={14} />}
                                        {type === 'AREA' && <Activity size={14} />}
                                        {type === 'SCATTER' && <Users size={14} />}
                                        {type === 'COMPOSED' && <Layers size={14} />}
                                        {type === 'KPI' && <div className="text-xs font-bold">123</div>}
                                        {type === 'FUNNEL' && <Funnel size={14} />}
                                        {type === 'TREEMAP' && <LayoutGrid size={14} />}
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Group By (X-Axis)</label>
                            <Dropdown
                                options={[{ label: 'None', value: '' }, ...((AVAILABLE_FIELDS[builderConfig.dataSource!] || []).map(f => ({ label: f.label, value: f.id })))]}
                                value={builderConfig.groupBy || ''}
                                onChange={(val) => setBuilderConfig({ ...builderConfig, groupBy: val })}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Metrics (Y-Axis) - Select Multiple</label>
                            <div className="space-y-1 mt-1 max-h-40 overflow-y-auto border p-2 rounded dark:border-slate-600">
                                {(AVAILABLE_FIELDS[builderConfig.dataSource!] || []).map(field => (
                                    <label key={field.id} className="flex items-center gap-2 text-sm p-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            className="rounded text-violet-600 focus:ring-violet-500"
                                            checked={!!builderConfig.fields?.find(f => f.id === field.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setBuilderConfig(prev => ({ ...prev, fields: [...(prev.fields || []), field] }));
                                                } else {
                                                    setBuilderConfig(prev => ({ ...prev, fields: prev.fields?.filter(f => f.id !== field.id) }));
                                                }
                                            }}
                                        />
                                        <span>{field.label}</span>
                                        {field.aggregation && <span className="text-[10px] bg-gray-100 dark:bg-slate-600 px-1 rounded text-gray-500 dark:text-gray-300 ml-auto">{field.aggregation}</span>}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleSaveReport} className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-violet-500/30">
                            <Play size={16} className="mr-2" /> Generate Report
                        </Button>
                    </Card>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-8 flex items-center justify-center min-h-[500px] text-gray-400 bg-grid-pattern">
                        {/* Placeholder Content */}
                        <div className="text-center">
                            <LayoutGrid size={64} className="mx-auto mb-4 opacity-20 text-violet-500" />
                            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">Ready to Build</h3>
                            <p>Configure your report settings on the left to preview.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODE */}
            {viewMode === 'view' && selectedReport && (
                <div className="space-y-6 animate-slide-up-fade">
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 border-b pb-4 dark:border-slate-700">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    {selectedReport.title}
                                    <span className="text-xs font-normal px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">Live Data</span>
                                </h2>
                                <p className="text-sm text-gray-500">{selectedReport.description || `Generated from ${selectedReport.dataSource}`}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => showToast("Scheduled for email delivery.", "success")}>
                                    <CalendarIcon size={16} className="mr-2" /> Schedule
                                </Button>
                                <Button variant="secondary" onClick={() => setViewMode('builder')}><Edit2 size={16} className="mr-2" /> Customize</Button>
                                <div className="relative group">
                                    <Button variant="primary"><Download size={16} className="mr-2" /> Export</Button>
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 hidden group-hover:block z-50">
                                        <button
                                            onClick={() => ExportEngine.exportToPDF(selectedReport, reportData)}
                                            className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-slate-700 text-sm"
                                        >
                                            Download PDF
                                        </button>
                                        <button
                                            onClick={() => ExportEngine.exportToCSV(selectedReport, reportData)}
                                            className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-slate-700 text-sm"
                                        >
                                            Download CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[450px]">
                            {renderChart()}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm rounded flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                            <Search size={16} />
                            <strong>Insight:</strong> Click on data points to drill down into specific records (Coming Soon).
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ReportsPageV2;
