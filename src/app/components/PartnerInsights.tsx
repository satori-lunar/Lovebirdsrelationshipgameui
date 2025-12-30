import React from 'react';
import { Bookmark, Trash2, ArrowLeft, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'motion/react';
import { usePartnerInsights } from '../hooks/usePartnerInsights';
import { useRelationship } from '../hooks/useRelationship';
import { toast } from 'sonner';

interface PartnerInsightsProps {
  partnerName: string;
  onNavigate: (page: string) => void;
}

export function PartnerInsights({ partnerName, onNavigate }: PartnerInsightsProps) {
  const { savedInsights, isLoading, deleteInsight, isDeleting } = usePartnerInsights();
  const { relationship } = useRelationship();

  const handleDelete = (insightId: string) => {
    if (confirm('Are you sure you want to remove this insight?')) {
      deleteInsight(insightId, {
        onSuccess: () => {
          toast.success('Insight removed');
        },
        onError: () => {
          toast.error('Failed to remove insight');
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Partner Insights</h1>
              <p className="text-sm text-white/90">Things you've learned about {partnerName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 pb-24">
        {isLoading ? (
          <Card className="p-8 text-center bg-white shadow-lg">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Loading insights...</p>
          </Card>
        ) : savedInsights.length === 0 ? (
          <Card className="p-8 text-center bg-white shadow-lg">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Insights Yet</h3>
            <p className="text-gray-600 mb-6">
              When you answer daily questions, you can save interesting things you learn about {partnerName}
            </p>
            <Button
              onClick={() => onNavigate('daily-question')}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              Answer Today's Question
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-sm text-gray-600">
                {savedInsights.length} {savedInsights.length === 1 ? 'insight' : 'insights'} saved
              </p>
            </div>

            {savedInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 bg-white shadow-md hover:shadow-lg transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bookmark className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-500">
                            {formatDate(insight.created_at)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {insight.question_text}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleDelete(insight.id)}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {insight.user_guess && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Your guess:</p>
                          <p className="text-sm text-gray-800">{insight.user_guess}</p>
                        </div>
                      )}

                      <div className="p-3 bg-pink-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">{partnerName}'s answer:</p>
                        <p className="text-sm font-semibold text-gray-900">{insight.partner_answer}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
