import React, { useState, useMemo } from 'react';
import {
    Calculator, TrendingUp, Target, DollarSign, PieChart,
    ArrowUpRight, ArrowDownRight, RefreshCw, Save, Plus, Trash2, FileText
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Budget, FinancialScenario, ExpenseCategory } from '../types';
import { calculateRevenueForecast } from '../utils/analytics';
import { formatCurrency, formatNumber } from '../utils/formatUtils';

const FinancialPlanningPage: React.FC = () => {
    const { state, dispatch, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'budgets' | 'forecasting' | 'scenarios' | 'tax'>('budgets');

    // --- Data Prep ---
    const totalRevenue = useMemo(() => state.sales.reduce((sum, s) => sum + s.totalAmount, 0), [state.sales]);
    const totalExpenses = useMemo(() => state.expenses.reduce((sum, e) => sum + e.amount, 0), [state.expenses]);
    const netProfit = totalRevenue - totalExpenses; // Simplified

    // Tax Logic
    const taxData = useMemo(() => {
        const outputTax = state.sales.reduce((sum, s) => sum + (s.gstAmount || 0), 0);
        const inputTax = state.purchases.reduce((sum, p) => sum + (p.gstAmount || 0), 0);
        const payable = Math.max(0, outputTax - inputTax);
        return { outputTax, inputTax, payable };
    }, [state.sales, state.purchases]);

    // Break Even Logic
    const breakEvenData = useMemo(() => {
        // Assumption: Expenses (Rent, Salary) are FIXED. Purchases (COGS) are VARIABLE.
        const fixedCosts = totalExpenses;
        const totalSales = totalRevenue || 1; // Avoid div by 0
        const totalCOGS = state.purchases.reduce((sum, p) => sum + p.totalAmount, 0); // Approximation of COGS

        // Contribution Margin Ratio = (Sales - VariableCosts) / Sales
        const variableCosts = totalCOGS;
        const marginRatio = (totalSales - variableCosts) / totalSales;

        const breakEvenRevenue = marginRatio > 0 ? fixedCosts / marginRatio : 0;
        const currentProgress = (totalRevenue / breakEvenRevenue) * 100;

        return { fixedCosts, variableCosts, breakEvenRevenue, currentProgress };
    }, [totalExpenses, totalRevenue, state.purchases]);

    // ... (Budget Logic remains)


    // --- Budget Logic ---
    const [newBudget, setNewBudget] = useState<Partial<Budget>>({ period: 'monthly' });
    const expenseCategories: ExpenseCategory[] = ['Rent', 'Salary', 'Electricity', 'Transport', 'Maintenance', 'Marketing', 'Food', 'Other'];

    const handleSaveBudget = () => {
        if (!newBudget.category || !newBudget.amount) return;

        const existingBudget = state.budgets.find(b => b.category === newBudget.category);

        if (existingBudget) {
            dispatch({
                type: 'UPDATE_BUDGET',
                payload: { ...existingBudget, amount: Number(newBudget.amount), updatedAt: new Date().toISOString() }
            });
            showToast(`Budget updated for ${newBudget.category}`, "success");
        } else {
            const budget: Budget = {
                id: `budget_${Date.now()}`,
                category: newBudget.category,
                amount: Number(newBudget.amount),
                period: newBudget.period || 'monthly',
                startDate: new Date().toISOString()
            };
            dispatch({ type: 'ADD_BUDGET', payload: budget });
            showToast(`Budget set for ${newBudget.category}`, "success");
        }
        setNewBudget({ period: 'monthly' }); // Reset form
    };

    // Actual Spend per category
    const actualSpend = useMemo(() => {
        const map: Record<string, number> = {};
        state.expenses.forEach(e => {
            map[e.category] = (map[e.category] || 0) + e.amount;
        });
        return map;
    }, [state.expenses]);


    // --- Forecasting Logic ---
    const forecastData = useMemo(() => {
        // Use last 12 months for basis
        return calculateRevenueForecast(state.sales, 90); // 90 days forecast
    }, [state.sales]);


    // --- Scenario Logic ---
    const [scenario, setScenario] = useState({
        revenueChange: 0,
        expenseChange: 0,
        cogsChange: 0
    });

    const scenarioResult = useMemo(() => {
        const projectedRevenue = totalRevenue * (1 + scenario.revenueChange / 100);
        const projectedExpense = totalExpenses * (1 + scenario.expenseChange / 100);
        // COGS approx 60% of Revenue usually, but let's take average margin
        // Let's assume current margin is (Revenue - COGS) / Revenue. 
        // We catch COGS from Purchases roughly.
        const totalPurchases = state.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const projectedCOGS = totalPurchases * (1 + scenario.cogsChange / 100);

        const projectedProfit = projectedRevenue - projectedExpense - projectedCOGS;
        return { projectedRevenue, projectedExpense, projectedCOGS, projectedProfit };
    }, [totalRevenue, totalExpenses, state.purchases, scenario]);


    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                        <Calculator className="text-teal-500" />
                        Financial Planning
                    </h1>
                    <p className="text-gray-500 text-sm">Forecasting, Budgeting & Strategy</p>
                </div>

                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-full md:w-fit overflow-x-auto scrollbar-hide">
                    {(['budgets', 'forecasting', 'scenarios', 'tax'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-white dark:bg-slate-700 shadow text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* BUDGETS TAB */}
            {activeTab === 'budgets' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    <Card title="Budget Allocation">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                                    value={newBudget.category || ''}
                                    onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Target Amount"
                                    className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                                    value={newBudget.amount || ''}
                                    onChange={e => setNewBudget({ ...newBudget, amount: Number(e.target.value) })}
                                />
                            </div>
                            <Button onClick={handleSaveBudget} className="w-full">
                                <Plus size={16} className="mr-2" /> Set Budget
                            </Button>
                        </div>

                        <div className="mt-6 space-y-4">
                            {expenseCategories.map(cat => {
                                // Find real budget or default to 0
                                const budgetItem = state.budgets.find(b => b.category === cat);
                                const budgetAmt = budgetItem ? budgetItem.amount : 0;
                                const spent = actualSpend[cat] || 0;
                                // If budget is 0, percentage is undefined or 100% if spent > 0? 
                                // Let's handle visual: if budget 0, show spent but bar is full red if spent > 0
                                const percent = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0);
                                const isOver = spent > budgetAmt;

                                return (
                                    <div key={cat} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{cat}</span>
                                            <span className={isOver ? 'text-red-500' : 'text-gray-500'}>
                                                {formatCurrency(spent)} / {formatCurrency(budgetAmt)}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isOver ? 'bg-red-500' : 'bg-teal-500'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card title="Expense Composition">
                        <div className="h-[300px] flex items-center justify-center">
                            {/* Simple Pie Chart of Actuals */}
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={expenseCategories.map(c => ({ name: c, value: actualSpend[c] || 0 }))} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* FORECASTING TAB */}
            {activeTab === 'forecasting' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="text-center">
                            <div className="text-gray-500 text-sm">Projected Revenue (30 Days)</div>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalRevenue * 1.1)}
                            </div>
                            <div className="text-xs text-green-500 flex justify-center items-center">
                                <ArrowUpRight size={12} /> +10% vs last month
                            </div>
                        </Card>
                        <Card className="text-center">
                            <div className="text-gray-500 text-sm">Projected Cash Flow</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency((totalRevenue - totalExpenses) * 1.05)}
                            </div>
                            <div className="text-xs text-gray-400">Based on current burn rate</div>
                        </Card>
                        <Card className="text-center">
                            <div className="text-gray-500 text-sm">Runway</div>
                            <div className="text-2xl font-bold text-orange-600">
                                6.5 Months
                            </div>
                            <div className="text-xs text-gray-400">If revenue stops today</div>
                        </Card>
                    </div>

                    <Card title="Revenue Forecast (90 Days)">
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="predicted" stroke="#0d9488" fillOpacity={1} fill="url(#colorSales)" name="Forecast Revenue" />
                                    <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} dot={false} name="Historical Trend" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* SCENARIOS TAB */}
            {activeTab === 'scenarios' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    <Card className="lg:col-span-1 space-y-6">
                        <h3 className="font-bold border-b pb-2">Scenario Controls</h3>

                        <div>
                            <label className="text-sm font-medium flex justify-between">
                                Revenue Change
                                <span className={scenario.revenueChange >= 0 ? 'text-green-600' : 'text-red-500'}>
                                    {scenario.revenueChange > 0 ? '+' : ''}{scenario.revenueChange}%
                                </span>
                            </label>
                            <input
                                type="range" min="-50" max="50" step="5"
                                className="w-full mt-2 accent-teal-500"
                                value={scenario.revenueChange}
                                onChange={e => setScenario({ ...scenario, revenueChange: Number(e.target.value) })}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium flex justify-between">
                                Expense Change
                                <span className={scenario.expenseChange <= 0 ? 'text-green-600' : 'text-red-500'}>
                                    {scenario.expenseChange > 0 ? '+' : ''}{scenario.expenseChange}%
                                </span>
                            </label>
                            <input
                                type="range" min="-50" max="50" step="5"
                                className="w-full mt-2 accent-red-500"
                                value={scenario.expenseChange}
                                onChange={e => setScenario({ ...scenario, expenseChange: Number(e.target.value) })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Impacts Overheads (Rent, Salaries)</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium flex justify-between">
                                COGS Change (Inflation)
                                <span className={scenario.cogsChange <= 0 ? 'text-green-600' : 'text-red-500'}>
                                    {scenario.cogsChange > 0 ? '+' : ''}{scenario.cogsChange}%
                                </span>
                            </label>
                            <input
                                type="range" min="-20" max="50" step="5"
                                className="w-full mt-2"
                                value={scenario.cogsChange}
                                onChange={e => setScenario({ ...scenario, cogsChange: Number(e.target.value) })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Cost of Goods Sold</p>
                        </div>

                        <div className="pt-4 border-t">
                            <Button variant="secondary" className="w-full mb-2" onClick={() => setScenario({ revenueChange: 0, expenseChange: 0, cogsChange: 0 })}>
                                <RefreshCw size={16} className="mr-2" /> Reset
                            </Button>
                            <Button className="w-full" onClick={() => {
                                const newScenario: FinancialScenario = {
                                    id: `scenario_${Date.now()}`,
                                    name: `Scenario ${new Date().toLocaleDateString()}`,
                                    changes: {
                                        revenueChangePercent: scenario.revenueChange,
                                        expenseChangePercent: scenario.expenseChange,
                                        cogsChangePercent: scenario.cogsChange
                                    },
                                    isActive: false
                                };
                                dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
                                showToast("Scenario Saved!", "success");
                            }}>
                                <Save size={16} className="mr-2" /> Save Scenario
                            </Button>
                        </div>
                    </Card>

                    <Card className="lg:col-span-2">
                        <h3 className="font-bold mb-4">Projected Profit & Loss</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                                <div className="text-sm text-gray-500">Revenue</div>
                                <div className="text-xl font-bold">{formatCurrency(scenarioResult.projectedRevenue)}</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                                <div className="text-sm text-gray-500">Total Costs</div>
                                <div className="text-xl font-bold text-red-500">
                                    {formatCurrency(scenarioResult.projectedExpense + scenarioResult.projectedCOGS)}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                                <div className="text-sm text-gray-500">Net Profit</div>
                                <div className={`text-xl font-bold ${scenarioResult.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(scenarioResult.projectedProfit)}
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={[
                                    { name: 'Current', revenue: totalRevenue, profit: netProfit },
                                    { name: 'Scenario', revenue: scenarioResult.projectedRevenue, profit: scenarioResult.projectedProfit }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `${formatCurrency(Number(value))} `} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#0d9488" name="Revenue" barSize={50} />
                                    <Bar dataKey="profit" fill="#f59e0b" name="Net Profit" barSize={50} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAX TAB */}
            {activeTab === 'tax' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    <Card title="GST Compliance Estimator">
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded border border-l-4 border-l-blue-500">
                                <h3 className="text-sm text-gray-500 uppercase font-bold mb-1">Net GST Payable</h3>
                                <div className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(taxData.payable)}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Output Tax (Sales) - Input Tax (Purchases)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded">
                                    <div className="text-xs text-red-500 font-bold">Output Tax (Collected)</div>
                                    <div className="text-lg font-bold">{formatCurrency(taxData.outputTax)}</div>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded">
                                    <div className="text-xs text-green-600 font-bold">Input Tax (Paid)</div>
                                    <div className="text-lg font-bold">{formatCurrency(taxData.inputTax)}</div>
                                </div>
                            </div>

                            <Button variant="secondary" className="w-full" onClick={() => showToast("Tax Report Exported (PDF)", "success")}>
                                <FileText size={16} className="mr-2" /> Export GST Report
                            </Button>
                        </div>
                    </Card>

                    <Card title="Break-Even Analysis">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-sm text-gray-500">Break-Even Revenue Point</div>
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {formatCurrency(breakEvenData.breakEvenRevenue)}
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${breakEvenData.currentProgress >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                                    {breakEvenData.currentProgress.toFixed(1)}% Reached
                                </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden relative">
                                <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${Math.min(100, breakEvenData.currentProgress)}%` }}
                                ></div>
                                {/* Marker for 100% */}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-black left-[100%] opacity-0"></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{formatCurrency(0)}</span>
                                <span>Current: {formatCurrency(totalRevenue)}</span>
                                <span>Target: {formatCurrency(breakEvenData.breakEvenRevenue)}</span>
                            </div>

                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 text-xs text-yellow-800 dark:text-yellow-200 rounded border border-yellow-200">
                                <strong>Insight:</strong> You need to generate {formatCurrency(Math.max(0, breakEvenData.breakEvenRevenue - totalRevenue))} more in revenue to cover all fixed expenses (Rent, Salaries) and COGS.
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default FinancialPlanningPage;
