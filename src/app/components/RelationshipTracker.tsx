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
      console.log('🔍 [RelationshipTracker] Fetching important dates for relationship:', relationship?.id);
      const result = await trackerService.getImportantDates(relationship!.id);
      console.log('✅ [RelationshipTracker] Important dates fetched:', result);
      return result;
    },
    enabled: !!relationship?.id,
  });

  console.log('📅 [RelationshipTracker] State:', {
    relationshipId: relationship?.id,
    datesCount: dates?.length,
    datesLoading,
    datesError,
    activeTab
  });

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
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dates')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dates'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Dates
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'goals'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Target className="w-4 h-4" />
            Goals
          </button>
        </div>

        {/* Dates Tab Content */}
        {activeTab === 'dates' && (
          <>
            {/* Date Planning Widget */}
            <Card className="p-4 mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-800">Plan a Date</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setDatePlanningMode('swipe-together')}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-purple-300"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">Choose Together</span>
                </button>

                <button
                  onClick={() => setDatePlanningMode('random-challenge')}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-orange-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">Random Challenge</span>
                </button>

                <button
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-pink-300 opacity-50 cursor-not-allowed"
                  disabled
                >
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">Plan for Partner</span>
                  <span className="text-xs text-gray-400">Coming Soon</span>
                </button>
              </div>
            </Card>

            {/* Add Date Button */}
            <Dialog open={isAddingDate} onOpenChange={setIsAddingDate}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-white text-purple-600 hover:bg-white/90 shadow-lg border-0 py-6">
              <Plus className="w-5 h-5 mr-2" />
              Add Important Date
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Important Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="date-title">What's the occasion?</Label>
                <Input
                  id="date-title"
                  value={newDate.title}
                  onChange={(e) => setNewDate({ ...newDate, title: e.target.value })}
                  placeholder="e.g., First Kiss Anniversary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-date">Date</Label>
                <Input
                  id="date-date"
                  type="date"
                  value={newDate.date}
                  onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                />
              </div>
              <Button
                onClick={handleAddDate}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Add Date
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upcoming Dates */}
        <div className="space-y-4">
          <h2 className="font-semibold">Upcoming</h2>

          {datesLoading ? (
            <Card className="p-8 text-center border-0 shadow-lg">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading dates...</p>
            </Card>
          ) : sortedDates.filter(d => getDaysUntil(d.date) > 0).length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-lg">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No upcoming dates</p>
              <p className="text-sm text-gray-400">
                Add important dates to never forget special moments!
              </p>
            </Card>
          ) : sortedDates.map((date) => {
            const Icon = getIcon(date.type);
            const color = getColor(date.type);
            const daysUntil = getDaysUntil(date.date);
            const dateObj = new Date(date.date);
            const isUpcoming = daysUntil > 0;

            if (!isUpcoming) return null;

            const bgColor = color === 'pink' ? 'bg-pink-100' : color === 'purple' ? 'bg-purple-100' : 'bg-blue-100';
            const textColor = color === 'pink' ? 'text-pink-600' : color === 'purple' ? 'text-purple-600' : 'text-blue-600';
            const iconColor = color === 'pink' ? 'text-pink-500' : color === 'purple' ? 'text-purple-500' : 'text-blue-500';

            return (
              <Card key={date.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 ${bgColor} rounded-2xl flex flex-col items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs ${textColor} uppercase`}>
                      {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className={`text-2xl font-semibold ${textColor}`}>
                      {dateObj.getDate()}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{date.title}</h3>
                        <p className="text-sm text-gray-600">
                          {dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        <button
                          onClick={() => handleDeleteDate(date.id)}
                          disabled={deleteDateMutation.isPending}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {daysUntil <= 7 && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days`}
                        </span>
                      )}
                      {daysUntil > 7 && daysUntil <= 30 && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                          {daysUntil} days away
                        </span>
                      )}
                      {daysUntil > 30 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {daysUntil} days away
                        </span>
                      )}
                    </div>

                    {/* Quick Actions for Upcoming Important Dates */}
                    {daysUntil <= 30 && (
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          Gift Ideas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Plan Date
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Past Dates */}
        <div className="mt-8 space-y-4">
          <h2 className="font-semibold text-gray-500">Past</h2>

          {sortedDates.map((date) => {
            const daysUntil = getDaysUntil(date.date);
            const dateObj = new Date(date.date);
            const isPast = daysUntil < 0;

            if (!isPast) return null;

            return (
              <Card key={date.id} className="p-4 border-0 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-700">{date.title}</h3>
                    <p className="text-xs text-gray-500">
                      {dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {Math.abs(daysUntil)} days ago
                    </span>
                    <button
                      onClick={() => handleDeleteDate(date.id)}
                      disabled={deleteDateMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="p-5 mt-6 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1 text-sm">Smart Reminders</h3>
              <p className="text-xs text-gray-600">
                We'll remind you 1 week before, 3 days before, and on the day of each important date. We'll also suggest dates and gifts in advance!
              </p>
            </div>
          </div>
        </Card>
          </>
        )}

        {/* Goals Tab Content */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            {/* AI Suggestions */}
            <AISuggestions
              type="goal"
              title="AI Goal Ideas"
              onSelect={handleGoalSelect}
            />

            {/* Current Goals */}
            <div className="space-y-4">
              <h2 className="font-semibold">Your Goals</h2>

              {goalsLoading ? (
                <Card className="p-8 text-center border-0 shadow-lg">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading goals...</p>
                </Card>
              ) : dbGoals.length === 0 ? (
                <Card className="p-8 text-center border-0 shadow-lg">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No goals yet</p>
                  <p className="text-sm text-gray-400">
                    Use the AI suggestions above to add your first goal!
                  </p>
                </Card>
              ) : (
                dbGoals.map((goal) => (
                  <Card
                    key={goal.id}
                    className={`p-4 border-0 shadow-md transition-all ${
                      goal.completed ? 'bg-green-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleGoalComplete(goal.id, goal.completed)}
                        disabled={isToggling}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          goal.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {goal.completed && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {goal.title}
                        </p>
                        {goal.category && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                            {goal.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeGoal(goal.id)}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Stats */}
            {dbGoals.length > 0 && (
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-0">
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{dbGoals.length}</p>
                    <p className="text-xs text-gray-600">Total Goals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {dbGoals.filter(g => g.completed).length}
                    </p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {dbGoals.filter(g => !g.completed).length}
                    </p>
                    <p className="text-xs text-gray-600">In Progress</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
