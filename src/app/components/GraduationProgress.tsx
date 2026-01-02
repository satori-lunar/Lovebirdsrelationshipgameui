/**
 * Graduation Progress Widget
 *
 * Shows user's progress toward 6-month graduation and lifetime free access.
 * Celebrates independence as success, not dependency.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, TrendingUp, Heart, Sparkles, Trophy } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { graduationService, type GrowthMetrics } from '../services/graduationService';

interface GraduationProgressProps {
  userId: string;
  coupleId: string;
  onViewDetails?: () => void;
}

export function GraduationProgress({ userId, coupleId, onViewDetails }: GraduationProgressProps) {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [userId, coupleId]);

  const loadMetrics = async () => {
    try {
      const data = await graduationService.getGrowthMetrics(userId, coupleId);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load graduation metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return null;
  }

  // Don't show if already graduated
  if (metrics.readyForGraduation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">🎓 Graduated!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Lifetime free access unlocked. You've learned to love each other well!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Determine progress color
  const progressColor =
    metrics.graduationProgress >= 75 ? 'from-green-500 to-emerald-500' :
    metrics.graduationProgress >= 50 ? 'from-blue-500 to-indigo-500' :
    'from-rose-500 to-pink-500';

  const borderColor =
    metrics.graduationProgress >= 75 ? 'border-green-200' :
    metrics.graduationProgress >= 50 ? 'border-blue-200' :
    'border-rose-200';

  const bgColor =
    metrics.graduationProgress >= 75 ? 'from-green-50 to-emerald-50' :
    metrics.graduationProgress >= 50 ? 'from-blue-50 to-indigo-50' :
    'from-rose-50 to-pink-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onViewDetails}
        className="w-full text-left"
      >
        <Card className={`border-2 ${borderColor} bg-gradient-to-br ${bgColor} shadow-lg hover:shadow-xl transition-all`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className={`w-12 h-12 bg-gradient-to-br ${progressColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </motion.div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Journey to Graduation
                  </p>
                  {metrics.trendLastMonth === 'improving' && (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                </div>

                <h3 className="font-semibold text-gray-900">
                  {metrics.weeksSinceStart} weeks • {metrics.graduationProgress}% complete
                </h3>

                {/* Progress Bar */}
                <div className="mt-3 mb-2">
                  <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.graduationProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${progressColor}`}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" fill="currentColor" />
                    <span>{metrics.independenceScore} independence</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{metrics.spontaneousActionsCount} spontaneous</span>
                  </div>
                </div>

                {/* Next Milestone */}
                <p className="text-xs text-gray-500 mt-2">
                  {metrics.daysUntilGraduation > 0
                    ? `${metrics.daysUntilGraduation} days until free access`
                    : 'Final milestone check!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </button>
    </motion.div>
  );
}
