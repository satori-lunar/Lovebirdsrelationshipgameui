/**
 * Partner Needs View
 *
 * Shows when your partner has shared what they need from the relationship.
 * Displays AI-generated suggestions on how to support them.
 */

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, CheckCircle, Clock, AlertCircle, Sparkles, ChevronRight, Send, Copy, Play, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { needsService } from '../services/needsService';
import { RelationshipNeed } from '../types/needs';
import { toast } from 'sonner';

interface PartnerNeedsViewProps {
  userId: string;
  partnerName: string;
  onViewDetails?: (need: RelationshipNeed) => void;
}

export function PartnerNeedsView({ userId, partnerName, onViewDetails }: PartnerNeedsViewProps) {
  const [needs, setNeeds] = useState<RelationshipNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingOnNeed, setWorkingOnNeed] = useState<string | null>(null);

  useEffect(() => {
    loadNeeds();
  }, [userId]);

  const loadNeeds = async () => {
    try {
      setLoading(true);
      const pendingNeeds = await needsService.getPendingNeeds(userId);
      console.log('📋 Loaded needs:', pendingNeeds);
      pendingNeeds.forEach((need, idx) => {
        console.log(`Need ${idx + 1}:`, {
          category: need.needCategory,
          hasAiSuggestion: !!need.aiSuggestion,
          aiSuggestion: need.aiSuggestion,
          suggestedMessages: need.aiSuggestion?.suggestedMessages,
          messagesCount: need.aiSuggestion?.suggestedMessages?.length || 0
        });
      });
      setNeeds(pendingNeeds);
    } catch (error) {
      console.error('Failed to load partner needs:', error);
      toast.error('Failed to load needs');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (needId: string) => {
    try {
      await needsService.acknowledgeNeed(needId);
      await loadNeeds();
      toast.success("You've acknowledged this need");
    } catch (error) {
      console.error('Failed to acknowledge need:', error);
      toast.error('Failed to update');
    }
  };

  const handleMarkInProgress = async (needId: string) => {
    try {
      await needsService.markInProgress(needId);
      await loadNeeds();
      toast.success("Working on it! They'll appreciate your effort");
    } catch (error) {
      console.error('Failed to update need:', error);
      toast.error('Failed to update');
    }
  };

  const handleCopyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied! You can paste it in your messaging app");
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast.error('Failed to copy message');
    }
  };

  const handleSendAppMessage = (message: string) => {
    // For now, just copy to clipboard with a note about app messages
    // In the future, this could integrate with the app's messaging system
    navigator.clipboard.writeText(message).then(() => {
      toast.success("Message copied! Send it through your favorite messaging app");
    }).catch(() => {
      toast.error('Failed to copy message');
    });
  };

  const handleCompleteNeed = async (needId: string) => {
    try {
      await needsService.resolveNeed({
        needId,
        resolvedBy: userId,
        howItWasResolved: "Completed the need",
        wasHelpful: true
      });
      await loadNeeds();
      toast.success("Great job completing this! Your partner will appreciate it.");
      setWorkingOnNeed(null);
    } catch (error) {
      console.error('Failed to complete need:', error);
      toast.error('Failed to mark as completed');
    }
  };

  const handleStartWorking = async (needId: string) => {
    try {
      await needsService.markInProgress(needId);
      setWorkingOnNeed(needId);
      await loadNeeds();
      toast.success("Let's work on this together! Check back in a few hours for a progress update.");

      // Schedule follow-up check-ins (simplified - in a real app this would be more sophisticated)
      setTimeout(() => {
        if (window.confirm(`How's it going with helping ${partnerName}? Any progress to report?`)) {
          // User clicked OK - could show a follow-up modal here
          toast.info("Keep up the great work!");
        }
      }, 4 * 60 * 60 * 1000); // 4 hours later

    } catch (error) {
      console.error('Failed to start working on need:', error);
      toast.error('Failed to start working on this');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'important':
        return 'from-red-500 to-rose-500';
      case 'would_help':
        return 'from-amber-500 to-yellow-500';
      case 'not_urgent':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'important':
        return 'Important';
      case 'would_help':
        return 'Would Help';
      case 'not_urgent':
        return 'Not Urgent';
      default:
        return 'Normal';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      communication: '💬',
      quality_time: '⏰',
      affection: '💕',
      appreciation: '🙏',
      help: '🤝',
      space: '🌌',
      intimacy: '❤️',
      adventure: '🎢',
      other: '💭'
    };
    return emojiMap[category] || '💭';
  };

  const getCategoryLabel = (category: string) => {
    const labelMap: Record<string, string> = {
      communication: 'Communication',
      quality_time: 'Quality Time',
      affection: 'Affection',
      appreciation: 'Appreciation',
      help: 'Help & Support',
      space: 'Space',
      intimacy: 'Intimacy',
      adventure: 'Adventure',
      other: 'Other'
    };
    return labelMap[category] || category;
  };

  if (loading) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-purple-200 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needs.length === 0) {
    return null; // Don't show anything if there are no needs
  }

  return (
    <div className="space-y-4">
      {needs.map((need, index) => (
        <motion.div
          key={need.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`border-2 ${
            need.urgency === 'important'
              ? 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
              : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'
          } shadow-lg hover:shadow-xl transition-all`}>
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getUrgencyColor(need.urgency)} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{getCategoryEmoji(need.needCategory)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {partnerName} needs {getCategoryLabel(need.needCategory)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        need.urgency === 'important'
                          ? 'bg-red-100 text-red-700'
                          : need.urgency === 'would_help'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getUrgencyLabel(need.urgency)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(need.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Context */}
              {need.context && (
                <div className="mb-4 p-3 bg-white/80 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-700 italic">"{need.context}"</p>
                </div>
              )}

              {/* AI Suggestion */}
              {need.aiSuggestion && (
                <div className="mb-4 space-y-3">
                  {/* What they need */}
                  <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-purple-900 text-sm">What they need:</h4>
                    </div>
                    <p className="text-sm text-gray-800">{need.aiSuggestion.receiverMessage}</p>
                  </div>

                  {/* Suggested messages to send */}
                  {need.aiSuggestion.suggestedMessages && need.aiSuggestion.suggestedMessages.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl border border-pink-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-pink-600" />
                        <h4 className="font-semibold text-pink-900 text-sm">Suggested messages to send:</h4>
                      </div>
                      <div className="space-y-2">
                        {need.aiSuggestion.suggestedMessages.map((msg: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-pink-200 hover:border-pink-300 transition-colors">
                            <p className="text-sm text-gray-800 mb-2">"{msg.message}"</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 capitalize">{msg.tone} tone</span>
                                {msg.confidence && (
                                  <span className="text-xs text-gray-400">• {msg.confidence}% match</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSendAppMessage(msg.message)}
                                  className="p-1.5 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded transition-colors"
                                  title="Send via messaging app"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCopyMessage(msg.message)}
                                  className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* How to help with reasoning */}
                  {need.aiSuggestion.reasoning && (
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-900 text-sm">How to help:</h4>
                      </div>
                      <p className="text-sm text-gray-800">{need.aiSuggestion.reasoning}</p>
                    </div>
                  )}

                  {/* Suggested actions */}
                  {need.aiSuggestion.suggestedActions && need.aiSuggestion.suggestedActions.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-green-900 text-sm">Suggested actions:</h4>
                      </div>
                      <ul className="space-y-2">
                        {need.aiSuggestion.suggestedActions.map((action, idx) => (
                          <li key={idx} className="text-sm text-gray-800 flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>{action.description || action.action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {need.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleCompleteNeed(need.id)}
                      className="flex-1 px-4 py-2.5 bg-green-500 border-2 border-green-600 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Completed It
                    </button>
                    <button
                      onClick={() => handleStartWorking(need.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                    >
                      <Play className="w-4 h-4" fill="white" />
                      Start This
                    </button>
                  </>
                )}
                {need.status === 'acknowledged' && (
                  <>
                    <button
                      onClick={() => handleCompleteNeed(need.id)}
                      className="flex-1 px-4 py-2.5 bg-green-500 border-2 border-green-600 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Completed It
                    </button>
                    <button
                      onClick={() => handleStartWorking(need.id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                    >
                      <Play className="w-4 h-4" fill="white" />
                      Start This
                    </button>
                  </>
                )}
                {need.status === 'in_progress' && workingOnNeed === need.id && (
                  <>
                    <button
                      onClick={() => handleCompleteNeed(need.id)}
                      className="flex-1 px-4 py-2.5 bg-green-500 border-2 border-green-600 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Mark Complete
                    </button>
                    <div className="flex-1 px-4 py-2.5 bg-blue-100 border-2 border-blue-300 text-blue-700 rounded-xl font-medium flex items-center justify-center gap-2">
                      <Heart className="w-4 h-4" />
                      Working On It
                    </div>
                  </>
                )}
                {need.status === 'in_progress' && workingOnNeed !== need.id && (
                  <div className="w-full px-4 py-2.5 bg-blue-100 border-2 border-blue-300 text-blue-700 rounded-xl font-medium flex items-center justify-center gap-2">
                    <Heart className="w-4 h-4" />
                    In Progress
                  </div>
                )}
              </div>

              {/* Working guidance for started needs */}
              {need.status === 'in_progress' && workingOnNeed === need.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 text-sm">Your Action Plan:</h4>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Great! You're working on helping {partnerName}. Use the suggestions above as your guide.
                    You'll get a check-in reminder in a few hours to see how it's going.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>Next check-in: ~4 hours from now</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
