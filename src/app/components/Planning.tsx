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
      console.log('📋 Raw needs data for couple:', allNeeds);
      console.log('🔍 Current user ID:', user.id);
      console.log('🔍 Relationship ID:', relationship.id);

      // Filter for needs where this user is the requester (their own needs that partner is helping with)
      // and the need is not yet resolved
      const needsBeingHelped = allNeeds.filter(need => {
        const isRequester = need.requesterId === user.id;
        const isActive = need.status !== 'resolved';
        console.log('🔍 Checking need:', {
          id: need.id,
          requesterId: need.requesterId,
          receiverId: need.receiverId,
          userId: user.id,
          isRequester,
          status: need.status,
          isActive,
          needCategory: need.needCategory || (need as any).need_category
        });
        return isRequester && isActive;
      });

      console.log('✅ Filtered needs being helped:', needsBeingHelped);

      // Return only the most recent need (if any)
      if (needsBeingHelped.length > 0) {
        // Sort by created date (most recent first) and take the first one
        const sortedNeeds = needsBeingHelped.sort((a, b) =>
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

        {/* Partner's Needs Progress - What I'm working on */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Partner Support Progress
              </CardTitle>
              <p className="text-sm text-gray-600">
                {partnerName}'s needs that you're helping with
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Track your support progress here</p>
                <p className="text-sm text-gray-500">
                  When {partnerName} shares needs, you'll see your progress on helping them
                </p>
                <Button
                  onClick={() => onNavigate('home')}
                  className="mt-4 bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Go to Home to See Partner Needs
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Support Requests - What my partner is helping me with */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600" />
                My Support Requests
              </CardTitle>
              <p className="text-sm text-gray-600">
                Your needs that {partnerName} is helping you with
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading your requests...</p>
                </div>
              ) : activeNeeds && activeNeeds.length > 0 ? (
                <div className="space-y-4">
                  {activeNeeds.map((need) => (
                    <div
                      key={need.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200"
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
                            {need.status === 'resolved' ? 'Completed' :
                             need.status === 'in_progress' ? `${partnerName} is working on this` :
                             need.status === 'acknowledged' ? `${partnerName} has seen this` :
                             'Waiting for response'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartPlanning(need)}
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        View Progress
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No active support requests</p>
                  <p className="text-sm text-gray-500">
                    Share a need to see {partnerName}'s progress on helping you
                  </p>
                  <Button
                    onClick={() => onNavigate('home')}
                    className="mt-4 bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    Share a Need
                  </Button>
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
