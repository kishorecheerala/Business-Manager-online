import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Eye, EyeOff, Edit, Trash2, BarChart3, TrendingUp, ShoppingCart, Package, Users, DollarSign, AlertTriangle, Target, Calendar, PieChart, AreaChart, LineChart, Activity } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useUI } from '../context/UIContext';
import { DashboardWidget } from '../types';

interface DashboardBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingWidgets?: DashboardWidget[];
    onSave: (widgets: DashboardWidget[]) => void;
}

const widgetTypeIcons = {
    chart: BarChart3,
    metric: Activity,
    table: Users,
    alert: AlertTriangle,
    goal: Target
};

const dataSourceIcons = {
    sales: ShoppingCart,
    products: Package,
    customers: Users,
    expenses: DollarSign,
    purchases: TrendingUp
};

const chartTypeIcons = {
    line: LineChart,
    bar: BarChart3,
    pie: PieChart,
    area: AreaChart,
    treemap: Calendar
};

const predefinedWidgets: Partial<DashboardWidget>[] = [
    {
        type: 'chart',
        title: 'Sales Trend',
        dataSource: 'sales',
        configuration: { chartType: 'line', dateRange: 'month' },
        size: 'large',
        enabled: true
    },
    {
        type: 'metric',
        title: 'Low Stock Alert',
        dataSource: 'products',
        configuration: { metric: 'lowStock', threshold: 10 },
        size: 'small',
        enabled: true
    },
    {
        type: 'chart',
        title: 'Top Products',
        dataSource: 'products',
        configuration: { chartType: 'bar', limit: 10, dateRange: 'month' },
        size: 'medium',
        enabled: true
    },
    {
        type: 'table',
        title: 'Recent Customers',
        dataSource: 'customers',
        configuration: { limit: 5 },
        size: 'medium',
        enabled: true
    },
    {
        type: 'chart',
        title: 'Expense Breakdown',
        dataSource: 'expenses',
        configuration: { chartType: 'pie', dateRange: 'month' },
        size: 'medium',
        enabled: true
    },
    {
        type: 'goal',
        title: 'Monthly Revenue Goal',
        dataSource: 'sales',
        configuration: { metric: 'totalRevenue', dateRange: 'month' },
        size: 'medium',
        enabled: true
    }
];

const DashboardBuilderModal: React.FC<DashboardBuilderModalProps> = ({
    isOpen,
    onClose,
    existingWidgets = [],
    onSave
}) => {
    const { showToast } = useUI();
    const [widgets, setWidgets] = useState<DashboardWidget[]>(existingWidgets);
    const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState<Partial<DashboardWidget>>({
        type: 'chart',
        title: '',
        dataSource: 'sales',
        configuration: { chartType: 'line', dateRange: 'month' },
        size: 'medium',
        enabled: true
    });

    useEffect(() => {
        if (isOpen && existingWidgets.length > 0) {
            setWidgets(existingWidgets);
        }
    }, [isOpen, existingWidgets]);

    const handleAddPredefined = (predefined: Partial<DashboardWidget>) => {
        const newWidget: DashboardWidget = {
            id: `widget_${Date.now()}`,
            ...predefined
        } as DashboardWidget;
        setWidgets([...widgets, newWidget]);
        showToast('Widget added successfully', 'success');
    };

    const handleCreateCustom = () => {
        if (!formData.title) {
            showToast('Please enter a widget title', 'error');
            return;
        }

        const newWidget: DashboardWidget = {
            id: editingWidget?.id || `widget_${Date.now()}`,
            type: formData.type || 'chart',
            title: formData.title,
            dataSource: formData.dataSource || 'sales',
            configuration: formData.configuration || {},
            size: formData.size || 'medium',
            enabled: true
        };

        if (editingWidget) {
            setWidgets(widgets.map(w => w.id === editingWidget.id ? newWidget : w));
            showToast('Widget updated successfully', 'success');
        } else {
            setWidgets([...widgets, newWidget]);
            showToast('Custom widget created successfully', 'success');
        }

        setIsCreating(false);
        setEditingWidget(null);
        setFormData({
            type: 'chart',
            title: '',
            dataSource: 'sales',
            configuration: { chartType: 'line', dateRange: 'month' },
            size: 'medium',
            enabled: true
        });
    };

    const handleEdit = (widget: DashboardWidget) => {
        setEditingWidget(widget);
        setFormData(widget);
        setIsCreating(true);
    };

    const handleDelete = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
        showToast('Widget removed', 'info');
    };

    const toggleWidget = (id: string) => {
        setWidgets(widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
    };

    const handleSave = () => {
        if (widgets.length === 0) {
            showToast('Add at least one widget', 'error');
            return;
        }
        onSave(widgets);
        showToast('Dashboard layout saved successfully', 'success');
        onClose();
    };

    if (!isOpen) return null;

    const TypeIcon = widgetTypeIcons[formData.type || 'chart'];
    const SourceIcon = dataSourceIcons[formData.dataSource || 'sales'];

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in-fast overflow-auto">
            <Card className="w-full max-w-6xl my-8 max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Dashboard Builder</h2>
                            <p className="text-sm text-gray-500">Customize your dashboard with smart widgets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Predefined Widgets */}
                        <div className="lg:col-span-1 space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Quick Add</h3>
                                <div className="space-y-2">
                                    {predefinedWidgets.map((widget, idx) => {
                                        const Icon = widgetTypeIcons[widget.type!];
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAddPredefined(widget)}
                                                className="w-full p-3 bg-gray-50 dark:bg-slate-800 hover:bg-primary/10 dark:hover:bg-primary/20 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center gap-3 transition-colors text-left"
                                            >
                                                <Icon size={20} className="text-primary" />
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{widget.title}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{widget.type} • {widget.size}</div>
                                                </div>
                                                <Plus size={16} className="text-gray-400" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button onClick={() => setIsCreating(!isCreating)} className="w-full">
                                <Plus size={16} className="mr-2" />
                                Create Custom Widget
                            </Button>

                            {/* Custom Widget Form */}
                            {isCreating && (
                                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
                                        {editingWidget ? 'Edit Widget' : 'New Custom Widget'}
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                placeholder="Widget title"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Type</label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="chart">Chart</option>
                                                <option value="metric">Metric</option>
                                                <option value="table">Table</option>
                                                <option value="alert">Alert</option>
                                                <option value="goal">Goal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data Source</label>
                                            <select
                                                value={formData.dataSource}
                                                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value as any })}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="sales">Sales</option>
                                                <option value="products">Products</option>
                                                <option value="customers">Customers</option>
                                                <option value="expenses">Expenses</option>
                                                <option value="purchases">Purchases</option>
                                            </select>
                                        </div>
                                        {formData.type === 'chart' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Chart Type</label>
                                                <select
                                                    value={formData.configuration?.chartType || 'line'}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        configuration: { ...formData.configuration, chartType: e.target.value as any }
                                                    })}
                                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                >
                                                    <option value="line">Line</option>
                                                    <option value="bar">Bar</option>
                                                    <option value="pie">Pie</option>
                                                    <option value="area">Area</option>
                                                    <option value="treemap">Treemap</option>
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Size</label>
                                            <select
                                                value={formData.size}
                                                onChange={(e) => setFormData({ ...formData, size: e.target.value as any })}
                                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="small">Small</option>
                                                <option value="medium">Medium</option>
                                                <option value="large">Large</option>
                                                <option value="full">Full Width</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleCreateCustom} className="flex-1 text-xs">
                                                {editingWidget ? 'Update' : 'Create'}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setIsCreating(false);
                                                    setEditingWidget(null);
                                                    setFormData({
                                                        type: 'chart',
                                                        title: '',
                                                        dataSource: 'sales',
                                                        configuration: { chartType: 'line' },
                                                        size: 'medium',
                                                        enabled: true
                                                    });
                                                }}
                                                variant="secondary"
                                                className="flex-1 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Right: Current Widgets */}
                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    Your Widgets ({widgets.length})
                                </h3>
                                <div className="text-xs text-gray-500">
                                    {widgets.filter(w => w.enabled).length} active
                                </div>
                            </div>
                            {widgets.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>No widgets added yet</p>
                                    <p className="text-sm">Add predefined or create custom widgets</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {widgets.map(widget => {
                                        const Icon = widgetTypeIcons[widget.type];
                                        const SourceIcon = dataSourceIcons[widget.dataSource];
                                        return (
                                            <div
                                                key={widget.id}
                                                className={`p-4 border-2 rounded-lg transition-all ${
                                                    widget.enabled
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={20} className="text-primary" />
                                                        <div>
                                                            <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                                                {widget.title}
                                                            </div>
                                                            <div className="text-xs text-gray-500 capitalize">
                                                                {widget.type} • {widget.size}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => toggleWidget(widget.id)}
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            {widget.enabled ? (
                                                                <Eye size={14} className="text-green-600" />
                                                            ) : (
                                                                <EyeOff size={14} className="text-gray-400" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(widget)}
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            <Edit size={14} className="text-blue-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(widget.id)}
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            <Trash2 size={14} className="text-red-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <SourceIcon size={14} />
                                                    <span className="capitalize">{widget.dataSource}</span>
                                                    {widget.configuration.chartType && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{widget.configuration.chartType}</span>
                                                        </>
                                                    )}
                                                    {widget.configuration.dateRange && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{widget.configuration.dateRange}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        💡 Drag & drop on dashboard to rearrange (coming soon)
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onClose} variant="secondary">
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Dashboard Layout
                        </Button>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};

export default DashboardBuilderModal;
