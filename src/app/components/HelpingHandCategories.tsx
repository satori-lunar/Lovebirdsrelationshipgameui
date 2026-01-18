import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Plus, Loader2, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import { helpingHandService } from '../services/helpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandCategoriesProps,
  HelpingHandCategory,
  CategoryCount
} from '../types/helpingHand';
import { useQuery } from '@tanstack/react-query';

export default function HelpingHandCategories({ onBack, onSelectCategory, onAddCustom, weekStartDate }: HelpingHandCategoriesProps) {
  const { user } = useAuth();
  const [categoryStats, setCategoryStats] = useState<Map<string, number>>(new Map());

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['helping-hand-categories'],
    queryFn: () => helpingHandService.getCategories(),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Fetch category counts
  const { data: countsResponse, isLoading: countsLoading } = useQuery({
    queryKey: ['helping-hand-category-counts', user?.id, weekStartDate],
    queryFn: () => {
      if (!user) throw new Error('User not found');
      return helpingHandService.getCategoryCounts(user.id, weekStartDate);
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000 // Cache for 1 minute
  });

  useEffect(() => {
    if (countsResponse) {
      const stats = new Map<string, number>();
      countsResponse.counts.forEach(c => {
        stats.set(c.categoryId, c.count);
      });
      setCategoryStats(stats);
    }
  }, [countsResponse]);

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Heart;
  };

  const isLoading = categoriesLoading || countsLoading;
  const totalSuggestions = countsResponse?.totalSuggestions || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-warm-pink mx-auto mb-4" />
          <p className="text-text-warm-light">Loading your suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light pb-20">
      {/* Header */}
      <div className="bg-white border-b border-warm-beige/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-warm-beige/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-warm" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-warm">
                Helping Hand
              </h1>
              <p className="text-sm text-text-warm-light">
                {totalSuggestions} suggestions for this week
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-warm-pink">
                {totalSuggestions}
              </div>
              <div className="text-xs text-text-warm-light">
                ideas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Intro message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-warm-pink/20 bg-gradient-to-r from-warm-pink/5 to-soft-purple/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-warm-pink/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-warm-pink" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-text-warm mb-1">
                    Your personalized suggestions are ready!
                  </h3>
                  <p className="text-sm text-text-warm-light">
                    We've created ideas that match your time, energy, and what your partner loves.
                    Tap a category to see suggestions or add your own.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categories */}
        <div className="space-y-3">
          {categories?.map((category, index) => {
            const Icon = getIconComponent(category.icon);
            const count = categoryStats.get(category.id) || 0;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all border-warm-beige/30 overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Main category button */}
                    <button
                      onClick={() => count > 0 && onSelectCategory(category)}
                      className={`w-full p-4 text-left flex items-center gap-4 ${
                        count > 0 ? 'cursor-pointer hover:bg-warm-beige/10' : 'cursor-default'
                      } transition-colors`}
                      disabled={count === 0}
                    >
                      {/* Icon */}
                      <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${category.colorClass} flex items-center justify-center shadow-md`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-text-warm text-lg">
                            {category.displayName}
                          </h3>
                          {count > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-warm-pink/10 text-warm-pink text-xs font-semibold">
                              {count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-warm-light line-clamp-1">
                          {category.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-warm-light">
                          <span>⏱️ {category.minTimeRequired}-{category.maxTimeRequired} min</span>
                          <span>•</span>
                          <span className="capitalize">{category.effortLevel} effort</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      {count > 0 && (
                        <ChevronRight className="w-6 h-6 text-text-warm-light group-hover:text-warm-pink group-hover:translate-x-1 transition-all" />
                      )}
                    </button>

                    {/* Add custom button */}
                    <div className="border-t border-warm-beige/30 px-4 py-2 bg-warm-beige/5">
                      <button
                        onClick={() => onAddCustom(category)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-soft-purple hover:text-warm-pink transition-colors group/add"
                      >
                        <Plus className="w-4 h-4 group-hover/add:scale-110 transition-transform" />
                        <span>Add Your Own</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {totalSuggestions === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-warm-beige/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-text-warm-light" />
            </div>
            <h3 className="text-xl font-bold text-text-warm mb-2">
              No suggestions yet
            </h3>
            <p className="text-text-warm-light mb-4">
              Complete your weekly assessment to get personalized suggestions
            </p>
            <Button
              onClick={onBack}
              className="bg-warm-pink hover:bg-warm-pink/90 text-white"
            >
              Start Assessment
            </Button>
          </motion.div>
        )}

        {/* Bottom info */}
        {totalSuggestions > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center text-sm text-text-warm-light"
          >
            <p>
              💡 Tap a category to see AI suggestions, or add your own ideas to any category
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
