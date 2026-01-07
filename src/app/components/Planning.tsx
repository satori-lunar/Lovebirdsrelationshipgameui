/**
 * Planning Component
 *
 * Dedicated planning tab showing active partner needs and support plans.
 * Users can continue planning work they've started and access planning tools.
 */

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Target, Heart, MessageCircle, Clock, CheckCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQuery } from '@tanstack/react-query';
import { needsService } from '../services/needsService';
import { RelationshipNeed } from '../types/needs';

interface PlanningProps {
  onBack: () => void;
  onNavigate: (page: string, data?: any) => void;
  partnerName: string;
}

export function Planning({ onBack, onNavigate, partnerName }: PlanningProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  // Query active needs - only show the most recent need that requires action from this user
  const { data: activeNeeds, isLoading } = useQuery({
    queryKey: ['active-needs', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return [];

      // Get all needs for the couple
      const allNeeds = await needsService.getNeedsForCouple(relationship.id);
      console.log('📋 Raw needs data:', allNeeds);

      // Filter for needs where this user is the receiver (they need to respond)
      // and the need is not yet resolved
      const needsRequiringAction = allNeeds.filter(need => {
        const isReceiver = need.receiverId === user.id;
        const needsAction = need.status === 'acknowledged' || need.status === 'in_progress';
        console.log('🔍 Checking need:', {
          id: need.id,
          receiverId: need.receiverId,
          userId: user.id,
          isReceiver,
          status: need.status,
          needsAction,
          needCategory: need.needCategory || (need as any).need_category
        });
        return isReceiver && needsAction;
      });

      // Return only the most recent need (if any)
      if (needsRequiringAction.length > 0) {
        // Sort by created date (most recent first) and take the first one
        const sortedNeeds = needsRequiringAction.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return [sortedNeeds[0]]; // Return only the most recent one
      }

      return []; // No active needs requiring action
    },
    enabled: !!relationship?.id && !!user?.id,
  });

  const handleStartPlanning = (need: RelationshipNeed) => {
    onNavigate('need-support-plan', { need });
  };

  const handleNewNeed = () => {
    onNavigate('home'); // Navigate to home where they can submit a new need
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-600">Help {partnerName} with their needs</p>
          </div>
        </motion.div>

        {/* Active Planning Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Current Support Request
              </CardTitle>
              <p className="text-sm text-gray-600">
                Your partner's most recent need that needs your attention
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading active plans...</p>
                </div>
              ) : activeNeeds && activeNeeds.length > 0 ? (
                <div className="space-y-4">
                  {activeNeeds.map((need) => (
                    <div
                      key={need.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          need.status === 'in_progress' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {need.needCategory || (need as any).need_category ?
                             (need.needCategory || (need as any).need_category).replace('_', ' ') :
                             'Unknown need'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {need.status === 'in_progress' ? 'In progress' : 'Ready to start'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartPlanning(need)}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        Continue Planning
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No current support requests</p>
                  <p className="text-sm text-gray-500">
                    When {partnerName} shares a need, it will appear here for you to address
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={handleNewNeed}
                  variant="outline"
                  className="p-4 h-auto flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Share a Need</span>
                  <span className="text-xs text-blue-700 text-center">Tell {partnerName} what you need</span>
                </Button>

                <Button
                  onClick={() => onNavigate('messages')}
                  variant="outline"
                  className="p-4 h-auto flex flex-col items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Send Message</span>
                  <span className="text-xs text-green-700 text-center">Check in with {partnerName}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Planning Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Planning Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-700">
                <p>• <strong>Start small:</strong> Even 2-3 minutes of focused attention helps</p>
                <p>• <strong>Be consistent:</strong> Regular small actions build stronger connections</p>
                <p>• <strong>Follow through:</strong> What you start creates expectations</p>
                <p>• <strong>Communicate:</strong> Let {partnerName} know you're working on their needs</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
