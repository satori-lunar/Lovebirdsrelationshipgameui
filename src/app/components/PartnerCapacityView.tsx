import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Lightbulb, CheckCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { api } from '../services/api';
import { aiSuggestionService } from '../services/aiSuggestionService';

const moods = {
  energized: {
    icon: '⚡',
    label: 'Energized & Full',
    capacity: 95,
    color: 'from-emerald-400 to-green-500',
    textColor: 'text-emerald-700'
  },
  good: {
    icon: '☀️',
    label: 'Good & Steady',
    capacity: 80,
    color: 'from-blue-400 to-cyan-500',
    textColor: 'text-blue-700'
  },
  okay: {
    icon: '🌤️',
    label: 'Okay, Managing',
    capacity: 60,
    color: 'from-indigo-400 to-purple-500',
    textColor: 'text-indigo-700'
  },
  stretched: {
    icon: '⚠️',
    label: 'Stretched Thin',
    capacity: 40,
    color: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-700'
  },
  low: {
    icon: '🌧️',
    label: 'Low & Tired',
    capacity: 25,
    color: 'from-slate-400 to-gray-500',
    textColor: 'text-slate-700'
  },
  overwhelmed: {
    icon: '🌊',
    label: 'Overwhelmed',
    capacity: 15,
    color: 'from-red-400 to-rose-500',
    textColor: 'text-red-700'
  },
  struggling: {
    icon: '⛈️',
    label: 'Really Struggling',
    capacity: 10,
    color: 'from-purple-500 to-violet-600',
    textColor: 'text-purple-700'
  },
  numb: {
    icon: '🌫️',
    label: 'Numb & Disconnected',
    capacity: 5,
    color: 'from-gray-500 to-slate-600',
    textColor: 'text-gray-700'
  },
};

const needsLabels = {
  comfort: 'Wants comfort',
  distraction: 'Wants distraction',
  encouragement: 'Wants encouragement',
  space: 'Wants space',
  no_talk: "Doesn't want to talk about it",
  open_to_talk: 'Open to talking',
  check_in: 'Wants you to check in',
  be_close: 'Wants physical closeness',
  be_present_virtual: 'Wants virtual presence',
};

// Suggestions based on mood + needs combinations
const getSuggestions = (mood: string, needs: string[], isLongDistance: boolean) => {
  const suggestions: string[] = [];

  if (needs.includes('comfort')) {
    if (isLongDistance) {
      suggestions.push('Send a care package or order comfort food delivery');
      suggestions.push('Watch the same movie together on video call');
    } else {
      suggestions.push('Bring their favorite comfort food');
      suggestions.push('Movie night in bed with snacks');
    }
  }

  if (needs.includes('distraction')) {
    if (isLongDistance) {
      suggestions.push('Play an online game together');
      suggestions.push('Send funny memes or videos');
    } else {
      suggestions.push('Suggest a fun activity or outing');
      suggestions.push('Watch a comedy together');
    }
  }

  if (needs.includes('no_talk')) {
    if (isLongDistance) {
      suggestions.push('Send a care text: "No need to reply, just thinking of you"');
      suggestions.push('Be on FaceTime together doing your own things');
    } else {
      suggestions.push('Sit together quietly - no pressure to talk');
      suggestions.push('Gentle physical affection without asking questions');
    }
  }

  if (needs.includes('be_close') || needs.includes('be_present_virtual')) {
    if (isLongDistance) {
      suggestions.push('Set up a long FaceTime/video call - just being there');
      suggestions.push('Send a voice note instead of text');
    } else {
      suggestions.push('Offer a hug or physical closeness');
      suggestions.push('Do an activity side-by-side quietly');
    }
  }

  if (needs.includes('encouragement')) {
    suggestions.push('Send an encouraging text about something specific they\'re working on');
    suggestions.push('Remind them of a time they overcame something difficult');
  }

  if (needs.includes('space')) {
    suggestions.push('Give them time alone, but check in later');
    suggestions.push('Send a simple "I\'m here when you\'re ready" message');
  }

  // Default suggestions if none match
  if (suggestions.length === 0) {
    suggestions.push('Ask "What would help most right now?"');
    suggestions.push('Offer your presence without pressure to talk');
  }

  return suggestions.slice(0, 4); // Return top 4 suggestions
};

interface PartnerCapacityViewProps {
  checkin: {
    id: string;
    user_id: string;
    mood: string;
    needs: string[];
    context?: string;
    created_at: string;
    partner_viewed: boolean;
  };
  partnerName: string;
  isLongDistance?: boolean;
}

export default function PartnerCapacityView({
  checkin,
  partnerName,
  isLongDistance = false
}: PartnerCapacityViewProps) {
  const mood = moods[checkin.mood as keyof typeof moods];
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Fetch AI-generated suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoadingSuggestions(true);
        const suggestions = await aiSuggestionService.generateCapacityCheckInSuggestions(
          checkin.mood,
          checkin.needs,
          checkin.context,
          checkin.user_id,
          isLongDistance
        );
        setAiSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching capacity suggestions:', error);
        // Fallback to hardcoded suggestions
        setAiSuggestions(getSuggestions(checkin.mood, checkin.needs, isLongDistance));
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [checkin.id, checkin.mood, checkin.needs, checkin.context, checkin.user_id, isLongDistance]);

  const suggestions = aiSuggestions.length > 0 ? aiSuggestions : getSuggestions(checkin.mood, checkin.needs, isLongDistance);

  useEffect(() => {
    // Mark as viewed when component mounts
    if (!checkin.partner_viewed) {
      api.supabase
        .from('capacity_checkins')
        .update({
          partner_viewed: true,
          partner_viewed_at: new Date().toISOString()
        })
        .eq('id', checkin.id)
        .then(() => {
          console.log('Capacity check-in marked as viewed');
        });
    }
  }, [checkin.id, checkin.partner_viewed]);

  const timeAgo = () => {
    const now = new Date();
    const created = new Date(checkin.created_at);
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return 'Today';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Capacity Card */}
      <Card className={`overflow-hidden border-0 shadow-xl bg-gradient-to-br ${mood.color}`}>
        <CardContent className="p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-white/80 text-sm mb-1">{timeAgo()}</p>
              <h3 className="text-2xl font-bold mb-2">
                {partnerName}'s Capacity Today
              </h3>
              {/* Capacity Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${mood.capacity}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-white/90">{mood.capacity}%</span>
              </div>
            </div>
            <div className="text-5xl ml-4">{mood.icon}</div>
          </div>

          <div className="bg-white/20 rounded-xl p-4 mb-4">
            <p className="font-semibold text-lg mb-2">Feeling: {mood.label}</p>
            {checkin.needs.length > 0 && (
              <div className="space-y-1 mt-3">
                <p className="text-sm text-white/90 font-medium">What they need:</p>
                {checkin.needs.map((need) => (
                  <div key={need} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{needsLabels[need as keyof typeof needsLabels]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {checkin.context && (
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-sm italic">"{checkin.context}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Ways to show up today
            </h3>
          </div>

          <div className="space-y-3">
            {isLoadingSuggestions ? (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-6 h-6 rounded-full bg-purple-200 animate-pulse flex-shrink-0"></div>
                <p className="italic">Generating personalized suggestions...</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Heart className="w-4 h-4 text-white" fill="white" />
                  </div>
                  <p className="text-gray-700">{suggestion}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Remember:</span> No need to fix or solve -
              just showing up matters most.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
