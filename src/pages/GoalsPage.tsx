import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Target, Car, Home, Plane, GraduationCap, Heart,
  Shield, Armchair, Smartphone, ChevronRight, TrendingUp,
  Calendar, CheckCircle2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/formatters/currency';
import { formatDate } from '@/lib/formatters/date';
import { calculateGoalProgress, GOAL_PRIORITIES } from '@/lib/calculations/budget';
import { getGoalsWithProgress, type GoalWithProgress } from '@/lib/services/goalService';
import { GoalStatus } from '@/types';

// Goal icons mapping
const goalIcons: Record<string, React.ElementType> = {
  car: Car,
  Car: Car,
  home: Home,
  Home: Home,
  travel: Plane,
  Plane: Plane,
  education: GraduationCap,
  GraduationCap: GraduationCap,
  wedding: Heart,
  Heart: Heart,
  emergency: Shield,
  Shield: Shield,
  retirement: Armchair,
  Armchair: Armchair,
  gadget: Smartphone,
  Smartphone: Smartphone,
  custom: Target,
  Target: Target,
};

const DEFAULT_USER_ID = 'default-user';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load goals from database
  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await getGoalsWithProgress(DEFAULT_USER_ID);
        setGoals(data);
      } catch (err) {
        console.error('Error loading goals:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadGoals();
  }, []);

  // Separate active and completed goals
  const { activeGoals, completedGoals } = useMemo(() => {
    const active: GoalWithProgress[] = [];
    const completed: GoalWithProgress[] = [];

    for (const goal of goals) {
      if (goal.status === GoalStatus.COMPLETED) {
        completed.push(goal);
      } else if (goal.status === GoalStatus.ACTIVE) {
        active.push(goal);
      }
    }

    return { activeGoals: active, completedGoals: completed };
  }, [goals]);

  // Calculate totals
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
            <p className="text-sm text-gray-500 mt-1">Track your financial dreams</p>
          </div>
          <Button
            onClick={() => navigate('/goals/add')}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="px-4 py-4">
        <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-cyan-100 text-sm font-medium">Total Saved</p>
                <p className="text-3xl font-bold mt-1">{formatINR(totalSaved, { compact: true })}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Target className="w-7 h-7" />
              </div>
            </div>

            {/* Progress */}
            {totalTarget > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-cyan-100">
                    {((totalSaved / totalTarget) * 100).toFixed(0)}% of total goals
                  </span>
                  <span className="text-cyan-100">
                    {formatINR(totalTarget, { compact: true })} target
                  </span>
                </div>
                <Progress
                  value={(totalSaved / totalTarget) * 100}
                  className="h-2.5 bg-white/20"
                />
              </div>
            )}

            <div className="flex gap-6">
              <div>
                <p className="text-cyan-100 text-xs">Active Goals</p>
                <p className="text-lg font-semibold">{activeGoals.length}</p>
              </div>
              <div>
                <p className="text-cyan-100 text-xs">Completed</p>
                <p className="text-lg font-semibold">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
        </div>

        {activeGoals.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {activeGoals.map((goal, index) => {
                const Icon = goalIcons[goal.icon] || Target;
                const priorityConfig = GOAL_PRIORITIES[goal.priority as keyof typeof GOAL_PRIORITIES] || GOAL_PRIORITIES.medium;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/goals/${goal.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${goal.color || '#06B6D4'}20` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: goal.color || '#06B6D4' }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{goal.name}</h3>
                              <Badge className={`${priorityConfig.bgColor} ${priorityConfig.color} text-xs`}>
                                {goal.priority}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium" style={{ color: goal.color || '#06B6D4' }}>
                                {formatINR(goal.currentAmount)}
                              </span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-sm text-gray-500">
                                {formatINR(goal.targetAmount)}
                              </span>
                            </div>

                            <Progress
                              value={goal.progress.percentage}
                              className="h-2 mb-2"
                            />

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {goal.progress.daysLeft} days left
                              </span>
                              <span className="flex items-center gap-1">
                                {goal.progress.onTrack ? (
                                  <>
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">On track</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-3 h-3 text-amber-500 transform rotate-45" />
                                    <span className="text-amber-500">Behind</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No active goals yet</p>
            <Button onClick={() => navigate('/goals/add')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </Card>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Completed
            </h2>
          </div>

          <div className="space-y-3">
            {completedGoals.map((goal) => {
              const Icon = goalIcons[goal.icon] || Target;

              return (
                <Card
                  key={goal.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow opacity-80"
                  onClick={() => navigate(`/goals/${goal.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">{goal.name}</p>
                        <p className="text-sm text-gray-500">{formatINR(goal.targetAmount)} achieved</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <motion.button
        onClick={() => navigate('/goals/add')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-cyan-500 shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}
