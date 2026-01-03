/**
 * AI Suggestions Component
 *
 * A reusable component that displays AI-powered suggestions
 * for goals, secrets, and messages with a beautiful UI.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { aiSuggestionService, type AISuggestion, type SuggestionType } from '../services/aiSuggestionService';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';

interface AISuggestionsProps {
  type: SuggestionType;
  onSelect: (suggestion: AISuggestion) => void;
  messageType?: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function AISuggestions({
  type,
  onSelect,
  messageType,
  title = 'AI Suggestions',
  className = '',
  compact = false,
}: AISuggestionsProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (user?.id && isExpanded && !hasLoaded) {
      loadSuggestions();
    }
  }, [user?.id, isExpanded, hasLoaded]);

  const loadSuggestions = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Use partnerId if available, otherwise use user's own ID for solo suggestions
      const targetId = partnerId || user.id;
      const newSuggestions = await aiSuggestionService.refreshSuggestions(
        type,
        user.id,
        targetId,
        messageType
      );
      setSuggestions(newSuggestions);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback to empty suggestions array on error
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const targetId = partnerId || user.id;
      const newSuggestions = await aiSuggestionService.refreshSuggestions(
        type,
        user.id,
        targetId,
        messageType
      );
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: AISuggestion) => {
    onSelect(suggestion);
  };

  if (!user?.id) {
    return null;
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-white/80 text-xs">Powered by AI</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
              {/* Refresh Button */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Loading State */}
              {isLoading && suggestions.length === 0 ? (
                <div className="py-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full mx-auto mb-3"
                  />
                  <p className="text-sm text-violet-600">Generating suggestions...</p>
                </div>
              ) : (
                /* Suggestions List */
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelect(suggestion)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-violet-100 hover:border-violet-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{suggestion.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm group-hover:text-violet-700 transition-colors">
                            {suggestion.text}
                          </p>
                          {suggestion.category && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-violet-100 text-violet-600 text-xs rounded-full">
                              {suggestion.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <Sparkles className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && suggestions.length === 0 && (
                <div className="py-6 text-center">
                  <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No suggestions available</p>
                  <button
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-violet-600 hover:text-violet-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Tip */}
              <p className="mt-4 text-xs text-violet-500 text-center">
                Tap any suggestion to use it
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
