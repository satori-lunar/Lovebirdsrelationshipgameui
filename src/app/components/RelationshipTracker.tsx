import { useState } from 'react';
import { ChevronLeft, Calendar, Plus, Heart, Gift, Cake, PartyPopper, Target, Sparkles, Users, Zap, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AISuggestions } from './AISuggestions';
import { DatePlanning } from './DatePlanning';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { useCoupleGoals } from '../hooks/useCoupleGoals';
import type { AISuggestion } from '../services/aiSuggestionService';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackerService } from '../services/trackerService';
import type { ImportantDate as DBImportantDate } from '../services/trackerService';

interface RelationshipTrackerProps {
  onBack: () => void;
  partnerName: string;
}

export function RelationshipTracker({ onBack, partnerName }: RelationshipTrackerProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const queryClient = useQueryClient();

  // Force cache bust - database-connected version

  // Use database for goals
  const {
    goals: dbGoals,
    isLoading: goalsLoading,
    createGoal,
    toggleGoal,
    deleteGoal,
    isCreating,
    isToggling,
    isDeleting
  } = useCoupleGoals(relationship?.id);

  // Fetch dates from database
  const { data: dates = [], isLoading: datesLoading, error: datesError } = useQuery({
    queryKey: ['important-dates', relationship?.id],
    queryFn: async () => {
      console.log('🔍 Fetching important dates for relationship:', relationship?.id);
      const result = await trackerService.getImportantDates(relationship!.id);
      console.log('✅ Important dates fetched:', result);
      return result;
    },
    enabled: !!relationship?.id,
  });

  // Debug logging for dates - v2
  console.log('📅 [DB-Connected] Dates state:', { dates, datesLoading, datesError, relationshipId: relationship?.id });

  // Create date mutation
  const createDateMutation = useMutation({
    mutationFn: (data: { title: string; date: string; type: 'anniversary' | 'birthday' | 'custom' }) =>
      trackerService.createImportantDate(relationship!.id, { ...data, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['important-dates', relationship?.id] });
      toast.success('Date added!');
    },
    onError: (error) => {
      console.error('Failed to create date:', error);
      toast.error('Failed to add date');
    },
  });

  // Delete date mutation
  const deleteDateMutation = useMutation({
    mutationFn: (dateId: string) => trackerService.deleteImportantDate(dateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['important-dates', relationship?.id] });
      toast.success('Date removed');
    },
    onError: (error) => {
      console.error('Failed to delete date:', error);
      toast.error('Failed to remove date');
    },
  });
  const [activeTab, setActiveTab] = useState<'dates' | 'goals'>('dates');
  const [datePlanningMode, setDatePlanningMode] = useState<'swipe-together' | 'random-challenge' | null>(null);

  const [isAddingDate, setIsAddingDate] = useState(false);
  const [newDate, setNewDate] = useState({
    title: '',
    date: '',
    type: 'custom' as const
  });

  const handleGoalSelect = async (suggestion: AISuggestion) => {
    if (!relationship?.id) {
      toast.error('Please connect with your partner first');
      return;
    }

    try {
      await createGoal({
        coupleId: relationship.id,
        title: suggestion.text,
        category: suggestion.category,
      });
      toast.success('Goal added!');
    } catch (error) {
      console.error('Failed to create goal:', error);
      toast.error('Failed to add goal');
    }
  };

  const toggleGoalComplete = async (goalId: string, currentCompleted: boolean) => {
    try {
      await toggleGoal({ goalId, completed: !currentCompleted });
      toast.success(currentCompleted ? 'Goal reopened' : 'Goal completed! 🎉');
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const removeGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success('Goal removed');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to remove goal');
    }
  };

  const getDaysUntil = (dateStr: string) => {
    return trackerService.getDaysUntil(dateStr);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'anniversary':
        return Heart;
      case 'birthday':
        return Cake;
      default:
        return PartyPopper;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'anniversary':
        return 'pink';
      case 'birthday':
        return 'purple';
      default:
        return 'blue';
    }
  };

  const sortedDates = [...dates].sort((a, b) => {
    return getDaysUntil(a.date) - getDaysUntil(b.date);
  });

  const handleAddDate = async () => {
    if (newDate.title && newDate.date && relationship?.id) {
      await createDateMutation.mutateAsync(newDate);
      setNewDate({ title: '', date: '', type: 'custom' });
      setIsAddingDate(false);
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    await deleteDateMutation.mutateAsync(dateId);
  };

  // If date planning mode is active, show DatePlanning component
  if (datePlanningMode) {
    return (
      <DatePlanning
        onBack={() => setDatePlanningMode(null)}
        partnerName={partnerName}
        initialMode={datePlanningMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                {activeTab === 'dates' ? <Calendar className="w-6 h-6" /> : <Target className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-2xl">{activeTab === 'dates' ? 'Important Dates' : 'Couple Goals'}</h1>
                <p className="text-white/90 text-sm">
                  {activeTab === 'dates' ? 'Never forget a special moment' : 'Grow together with shared goals'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
      </div>
    </div>
  );
}