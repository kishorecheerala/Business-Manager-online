import React, { useState, useEffect, useMemo } from 'react';
import { Target, Trophy, Edit2, Check, X, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale } from '../types';
import { formatCurrency } from '../utils/formatUtils';

interface GoalTrackerCardProps {
    sales: Sale[];
}

const GoalTrackerCard: React.FC<GoalTrackerCardProps> = ({ sales }) => {
    const { showToast } = useAppContext();
    const [monthlyGoal, setMonthlyGoal] = useState<number>(100000); // Default 1 Lakh
    const [isEditing, setIsEditing] = useState(false);
    const [tempGoal, setTempGoal] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);

    // Load saved goal
    useEffect(() => {
        const savedGoal = localStorage.getItem('monthly_sales_goal');
        if (savedGoal) {
            setMonthlyGoal(Number(savedGoal));
        }
    }, []);

    const currentMonthSales = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return sales.reduce((total, sale) => {
            const saleDate = new Date(sale.date);
            if (saleDate >= startOfMonth) {
                return total + Number(sale.totalAmount);
            }
            return total;
        }, 0);
    }, [sales]);

    const progress = Math.min((currentMonthSales / monthlyGoal) * 100, 100);
    const isGoalReached = currentMonthSales >= monthlyGoal;

    // Trigger confetti only once when goal is reached for the first time in session
    useEffect(() => {
        if (isGoalReached && !sessionStorage.getItem('goal_reached_celebrated')) {
            setShowConfetti(true);
            sessionStorage.setItem('goal_reached_celebrated', 'true');
            setTimeout(() => setShowConfetti(false), 5000);
        }
    }, [isGoalReached]);

    const handleSaveGoal = () => {
        const newGoal = parseInt(tempGoal.replace(/[^0-9]/g, ''));
        if (isNaN(newGoal) || newGoal <= 0) {
            showToast("Please enter a valid goal amount", 'error');
            return;
        }

        setMonthlyGoal(newGoal);
        localStorage.setItem('monthly_sales_goal', newGoal.toString());
        setIsEditing(false);

        // Reset celebration if goal is increased
        if (currentMonthSales < newGoal) {
            sessionStorage.removeItem('goal_reached_celebrated');
        }

        showToast("Monthly goal updated!", 'success');
    };

    const startEditing = () => {
        setTempGoal(monthlyGoal.toString());
        setIsEditing(true);
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 h-full flex flex-col border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Target size={80} />
                </div>

                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isGoalReached ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'} dark:bg-opacity-20`}>
                            {isGoalReached ? <Trophy size={16} /> : <Target size={16} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Monthly Goal</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {new Date().toLocaleString('default', { month: 'long' })} Target
                            </p>
                        </div>
                    </div>

                    {!isEditing && (
                        <button
                            onClick={startEditing}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <Edit2 size={12} />
                        </button>
                    )}
                </div>

                <div className="flex-grow flex flex-col justify-center relative z-10">
                    {isEditing ? (
                        <div className="flex items-center gap-2 animate-fade-in-fast">
                            <input
                                type="number"
                                value={tempGoal}
                                onChange={(e) => setTempGoal(e.target.value)}
                                className="w-full text-sm p-1.5 border rounded dark:bg-slate-700 dark:border-slate-600 font-mono"
                                autoFocus
                            />
                            <button onClick={handleSaveGoal} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xl font-bold text-slate-800 dark:text-white">
                                    {formatCurrency(currentMonthSales)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    of {formatCurrency(monthlyGoal)}
                                </span>
                            </div>

                            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalReached ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <p className="text-[10px] mt-2 text-right text-slate-500 dark:text-slate-400 italic">
                                {isGoalReached
                                    ? "🎉 Goal Reached! Outstanding!"
                                    : `${Math.round(progress)}% completed. Keep pushing!`}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default GoalTrackerCard;
