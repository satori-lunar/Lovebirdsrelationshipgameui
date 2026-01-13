import { useState } from 'react';
import { ChevronLeft, Bookmark, Trash2, Search, Heart, Calendar, Plus, MessageSquare, Target, Zap } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { usePartnerInsights, InsightType } from '../hooks/usePartnerInsights';
import { usePartner } from '../hooks/usePartner';
import { useRelationship } from '../hooks/useRelationship';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InsightsNotesProps {
  onBack: () => void;
}

export function InsightsNotes({ onBack }: InsightsNotesProps) {
  const { relationship } = useRelationship();
  const { partner } = usePartner(relationship);
  const {
    savedInsights,
    isLoading,
    deleteInsight,
    createManualNote,
    isSaving,
    isDeleting
  } = usePartnerInsights();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<InsightType | 'all'>('all');
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
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

  const handleCreateNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    createManualNote(
      { title: newNoteTitle.trim(), content: newNoteContent.trim() },
      {
        onSuccess: () => {
          toast.success('Note created successfully');
          setNewNoteTitle('');
          setNewNoteContent('');
          setShowCreateNote(false);
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to create note');
        },
      }
    );
  };

  // Filter insights based on search query and type
  const filteredInsights = savedInsights.filter((insight) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      insight.title?.toLowerCase().includes(searchLower) ||
      insight.content?.toLowerCase().includes(searchLower) ||
      insight.question_text?.toLowerCase().includes(searchLower) ||
      insight.partner_answer?.toLowerCase().includes(searchLower) ||
      insight.user_guess?.toLowerCase().includes(searchLower);

    const matchesType = selectedType === 'all' || insight.insight_type === selectedType;

    return matchesSearch && matchesType;
  });

  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'daily_question': return MessageSquare;
      case 'couple_challenge': return Target;
      case 'icebreaker': return Zap;
      case 'manual_note': return Heart;
      default: return Bookmark;
    }
  };

  const getInsightTypeLabel = (type: InsightType) => {
    switch (type) {
      case 'daily_question': return 'Daily Question';
      case 'couple_challenge': return 'Couple Challenge';
      case 'icebreaker': return 'Icebreaker';
      case 'manual_note': return 'Personal Note';
      default: return 'Insight';
    }
  };

  const getTypeColor = (type: InsightType) => {
    switch (type) {
      case 'daily_question': return 'text-blue-600 bg-blue-50';
      case 'couple_challenge': return 'text-purple-600 bg-purple-50';
      case 'icebreaker': return 'text-green-600 bg-green-50';
      case 'manual_note': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const typeStats = savedInsights.reduce((acc, insight) => {
    acc[insight.insight_type] = (acc[insight.insight_type] || 0) + 1;
    return acc;
  }, {} as Record<InsightType, number>);

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
              <h1 className="text-2xl font-bold">Insights & Notes</h1>
              <p className="text-white/90 text-sm">
                Cherished moments with {partner?.name || 'your partner'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Search Bar */}
        <Card className="mb-4 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search insights and notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Type Filter */}
        <Card className="mb-4 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex gap-2 overflow-x-auto">
              <Button
                onClick={() => setSelectedType('all')}
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                className={selectedType === 'all' ? 'bg-purple-500 hover:bg-purple-600' : ''}
              >
                All ({savedInsights.length})
              </Button>
              {(['daily_question', 'couple_challenge', 'icebreaker', 'manual_note'] as InsightType[]).map((type) => (
                <Button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  className={selectedType === type ? 'bg-purple-500 hover:bg-purple-600' : ''}
                >
                  {getInsightTypeLabel(type)} ({typeStats[type] || 0})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Note Button */}
        <Card className="mb-4 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <Button
              onClick={() => setShowCreateNote(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSaving ? 'Creating...' : 'Add Personal Note'}
            </Button>
          </CardContent>
        </Card>

        {/* Create Note Modal */}
        <AnimatePresence>
          {showCreateNote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
              >
                <h3 className="text-xl font-bold mb-4">Create Personal Note</h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="e.g., Sweet moment today"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="What made you smile? What did they do that you loved?"
                      rows={4}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCreateNote(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateNote}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Creating...' : 'Create Note'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInsights.length === 0 && savedInsights.length === 0 && (
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
                  Start saving meaningful moments from daily questions, couple challenges, icebreakers, or create personal notes about {partner?.name || 'your partner'}.
                </p>
                <Button
                  onClick={() => setShowCreateNote(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  Create Your First Note
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filtered Empty State */}
        {!isLoading && filteredInsights.length === 0 && savedInsights.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No insights found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filter
              </p>
            </CardContent>
          </Card>
        )}

        {/* Insights List */}
        {!isLoading && filteredInsights.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredInsights.map((insight, index) => {
                const IconComponent = getInsightIcon(insight.insight_type);
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(insight.insight_type)}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900">
                                {insight.title || insight.question_text || 'Untitled'}
                              </p>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(insight.insight_type)}`}>
                                {getInsightTypeLabel(insight.insight_type)}
                              </span>
                            </div>
                            {insight.created_at && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(insight.created_at), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        {insight.insight_type === 'daily_question' && (
                          <>
                            {insight.partner_answer && (
                              <div className="bg-pink-50 rounded-xl p-4 mb-3">
                                <p className="text-xs text-gray-600 mb-1 font-medium">
                                  {partner?.name || 'Partner'}'s answer:
                                </p>
                                <p className="text-gray-900">{insight.partner_answer}</p>
                              </div>
                            )}
                            {insight.user_guess && (
                              <div className="bg-purple-50 rounded-xl p-4 mb-3">
                                <p className="text-xs text-gray-600 mb-1 font-medium">Your guess:</p>
                                <p className="text-gray-700">{insight.user_guess}</p>
                              </div>
                            )}
                          </>
                        )}

                        {(insight.insight_type === 'manual_note' || insight.insight_type === 'couple_challenge' || insight.insight_type === 'icebreaker') && insight.content && (
                          <div className="bg-gray-50 rounded-xl p-4 mb-3">
                            <p className="text-gray-900">{insight.content}</p>
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
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}