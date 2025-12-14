import React, { useState, useEffect } from 'react';
import { Target, Trophy, TrendingUp, Edit2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../Card';
import FormattedNumberInput from '../FormattedNumberInput';
import { Sale } from '../../types';

interface GoalTrackerProps {
    sales: Sale[];
    className?: string;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ sales, className }) => {
    const [goal, setGoal] = useState(500000); // Default 5 Lakhs
    const [isEditing, setIsEditing] = useState(false);
    const [tempGoal, setTempGoal] = useState('');

    useEffect(() => {
        const savedGoal = localStorage.getItem('monthly_revenue_goal');
        if (savedGoal) {
            setGoal(Number(savedGoal));
        }
    }, []);

    const handleSaveGoal = () => {
        const newGoal = Number(tempGoal);
        if (newGoal > 0) {
            setGoal(newGoal);
            localStorage.setItem('monthly_revenue_goal', newGoal.toString());
            setIsEditing(false);
        }
    };

    const currentMonthRevenue = React.useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return sales
            .filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, s) => sum + Number(s.totalAmount), 0);
    }, [sales]);

    const progress = Math.min((currentMonthRevenue / goal) * 100, 100);
    const isGoalMet = currentMonthRevenue >= goal;

    return (
        <Card className={`relative overflow-hidden ${className}`}>
            {isGoalMet && (
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Trophy size={120} />
                </div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Target size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">Monthly Goal</h3>
                        <p className="text-xs text-gray-500">Revenue Target</p>
                    </div>
                </div>

                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <FormattedNumberInput
                            className="w-24 text-sm border rounded px-1 py-0.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={tempGoal}
                            onChange={(e) => setTempGoal(e.target.value)}
                            placeholder={goal.toString()}
                            autoFocus
                        />
                        <button onClick={handleSaveGoal} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                            <Check size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { setTempGoal(goal.toString()); setIsEditing(true); }}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                    >
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            <div className="mb-2 flex justify-between items-end relative z-10">
                <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        ₹{currentMonthRevenue.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                        / ₹{goal.toLocaleString()}
                    </span>
                </div>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {progress.toFixed(1)}%
                </span>
            </div>

            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-4 relative z-10">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-3 rounded-full ${isGoalMet ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 relative z-10">
                <TrendingUp size={14} className={isGoalMet ? "text-green-500" : "text-gray-400"} />
                {isGoalMet
                    ? <span className="text-green-600 font-medium">Goal Achieved! Great work! 🎉</span>
                    : <span>Keep pushing! You're doing great.</span>
                }
            </div>
        </Card>
    );
};

export default GoalTracker;
