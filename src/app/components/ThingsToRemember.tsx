import { useState } from 'react';
import { ChevronLeft, Bookmark, Trash2, Search, Heart, Calendar } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { usePartnerInsights } from '../hooks/usePartnerInsights';
import { usePartner } from '../hooks/usePartner';
import { useRelationship } from '../hooks/useRelationship';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ThingsToRememberProps {
  onBack: () => void;
}

export function ThingsToRemember({ onBack }: ThingsToRememberProps) {
  const { relationship } = useRelationship();
  const { partner } = usePartner(relationship);
  const { savedInsights, isLoading, deleteInsight, isDeleting } = usePartnerInsights();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (insightId: string) => {
    setDeletingId(insightId);
    deleteInsight(insightId, {
      onSuccess: () => {
        toast.success('Insight removed');
        setDeletingId(null);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to delete');
        setDeletingId(null);
      },
    });
  };

  // Filter insights based on search query
  const filteredInsights = savedInsights.filter((insight) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      insight.question_text?.toLowerCase().includes(searchLower) ||
      insight.partner_answer?.toLowerCase().includes(searchLower) ||
      insight.user_guess?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Things to Remember</h1>
              <p className="text-white/90 text-sm">
                Important insights about {partner?.name || 'your partner'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Search Bar */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{savedInsights.length}</p>
                  <p className="text-sm text-gray-600">Saved Insights</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600 font-medium">
                  Keep learning more
                </p>
                <p className="text-xs text-gray-500">about {partner?.name || 'your partner'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && savedInsights.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bookmark className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No insights saved yet</h3>
                <p className="text-gray-600 mb-6">
                  When you answer daily questions with {partner?.name || 'your partner'}, you can save their answers here to remember important things about them.
                </p>
                <Button
                  onClick={onBack}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  Go Back Home
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Insights List */}
        {!isLoading && filteredInsights.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-5">
                      {/* Question */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Bookmark className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">
                            {insight.question_text}
                          </p>
                          {insight.created_at && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(insight.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Partner's Answer */}
                      <div className="bg-pink-50 rounded-xl p-4 mb-3">
                        <p className="text-xs text-gray-600 mb-1 font-medium">
                          {partner?.name || 'Partner'}'s answer:
                        </p>
                        <p className="text-gray-900">{insight.partner_answer}</p>
                      </div>

                      {/* Your Guess (if available) */}
                      {insight.user_guess && (
                        <div className="bg-purple-50 rounded-xl p-4 mb-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Your guess:</p>
                          <p className="text-gray-700">{insight.user_guess}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleDelete(insight.id)}
                          disabled={isDeleting && deletingId === insight.id}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting && deletingId === insight.id ? 'Deleting...' : 'Remove'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* No Results from Search */}
        {!isLoading && savedInsights.length > 0 && filteredInsights.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No insights found</h3>
              <p className="text-gray-600">
                Try a different search term
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
