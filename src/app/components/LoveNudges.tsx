import { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Bell, CheckCircle, Calendar, Gift as GiftIcon, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { loveNudgesService, type LoveNudge } from '../services/loveNudgesService';
import { useQuery } from '@tanstack/react-query';

interface LoveNudgesProps {
  onBack: () => void;
  onNavigate: (route: string) => void;
  partnerName: string;
}

export function LoveNudges({ onBack, onNavigate, partnerName }: LoveNudgesProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  // Get partner ID
  const partnerId = relationship
    ? user?.id === relationship.partner_a_id
      ? relationship.partner_b_id
      : relationship.partner_a_id
    : null;

  // Fetch today's nudges
  const { data: nudges = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['love-nudges', user?.id, partnerId],
    queryFn: async () => {
      if (!user?.id || !partnerId) return [];
      return loveNudgesService.getTodaysNudges(user.id, partnerId);
    },
    enabled: !!user?.id && !!partnerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-pink-500 bg-pink-50';
      case 'medium':
        return 'border-purple-500 bg-purple-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'love_language':
        return Heart;
      case 'saved_item':
        return CheckCircle;
      case 'upcoming_event':
        return Calendar;
      default:
        return Sparkles;
    }
  };

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
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Love Nudges</h1>
                <p className="text-white/90 text-sm">
                  Gentle reminders to show {partnerName} you care
                </p>
              </div>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Today's Date */}
        <Card className="p-4 mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Today's Nudges</p>
            <p className="text-2xl font-bold text-gray-800">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </Card>

        {/* Nudges List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center border-0 shadow-md">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                <p className="text-gray-600">Loading your nudges...</p>
              </div>
            </Card>
          ) : nudges.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-md">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No nudges for today</p>
              <p className="text-sm text-gray-500">
                Complete your partner's onboarding to get personalized love nudges!
              </p>
            </Card>
          ) : (
            nudges.map((nudge) => {
              const IconComponent = getCategoryIcon(nudge.category);
              const priorityColor = getPriorityColor(nudge.priority);

              return (
                <Card
                  key={nudge.id}
                  className={`p-5 border-l-4 ${priorityColor} shadow-md hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      nudge.priority === 'high' ? 'bg-pink-200' :
                      nudge.priority === 'medium' ? 'bg-purple-200' : 'bg-gray-200'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        nudge.priority === 'high' ? 'text-pink-700' :
                        nudge.priority === 'medium' ? 'text-purple-700' : 'text-gray-700'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{nudge.title}</h3>
                        {nudge.type === 'milestone' && (
                          <span className="text-xs px-2 py-1 bg-pink-200 text-pink-700 rounded-full">
                            Important
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{nudge.message}</p>

                      {nudge.loveLanguage && (
                        <div className="mb-3">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {nudge.loveLanguage}
                          </span>
                        </div>
                      )}

                      {nudge.actionText && nudge.actionRoute && (
                        <Button
                          onClick={() => onNavigate(nudge.actionRoute!)}
                          size="sm"
                          className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        >
                          {nudge.actionText}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Info Card */}
        <Card className="p-5 mt-8 border-0 bg-white/50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>How Love Nudges Work</strong>
              </p>
              <p className="text-sm text-gray-600">
                We give you personalized reminders based on {partnerName}'s love language,
                things you've saved, and upcoming occasions. Check back daily for new nudges!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
