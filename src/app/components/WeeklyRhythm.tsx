import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Heart,
  Video,
  Mic,
  Camera,
  MessageCircle,
  Coffee,
  Check,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { api } from '../services/api';

// Date utility functions (replacing moment)
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getEndOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isAfter = (date1: string, date2: string): boolean => {
  return new Date(date1) > new Date(date2);
};

const activityIcons = {
  daily_question: MessageCircle,
  encouragement: Heart,
  virtual_date: Video,
  voice_note_prompt: Mic,
  photo_challenge: Camera,
  send_question: Sparkles,
  check_in: Coffee
};

const activityColors = {
  daily_question: 'from-blue-500 to-cyan-500',
  encouragement: 'from-rose-500 to-pink-500',
  virtual_date: 'from-purple-500 to-violet-500',
  voice_note_prompt: 'from-amber-500 to-orange-500',
  photo_challenge: 'from-green-500 to-emerald-500',
  send_question: 'from-indigo-500 to-blue-500',
  check_in: 'from-teal-500 to-cyan-500'
};

export default function WeeklyRhythm({ couple, user }) {
  const [activities, setActivities] = useState([]);
  const [todayActivity, setTodayActivity] = useState(null);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [couple.id]);

  const loadActivities = async () => {
    if (!couple?.id) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const today = formatDate(now);
      const weekStart = formatDate(getStartOfWeek(now));
      const weekEnd = formatDate(getEndOfWeek(now));

      // Get all activities for this week
      const { data: allActivities, error } = await api.supabase
        .from('long_distance_activities')
        .select('*')
        .eq('couple_id', couple.id)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const thisWeek = allActivities || [];

      // If no activities exist for this week, generate them
      if (thisWeek.length === 0) {
        await generateWeeklyRhythm();
        // Reload activities after generation
        await loadActivities();
        return;
      }

      setActivities(thisWeek);

      // Find today's activity
      const today_activity = thisWeek.find(a => a.scheduled_date === today);
      setTodayActivity(today_activity || thisWeek[0]);

      // Get upcoming activities
      const upcoming = thisWeek
        .filter(a => isAfter(a.scheduled_date, today))
        .slice(0, 3);

      setUpcomingActivities(upcoming);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activities:', error);
      setLoading(false);
    }
  };

  const generateWeeklyRhythm = async () => {
    const weekStart = getStartOfWeek(new Date());
    const activities = [];

    // Monday: Daily question
    activities.push({
      couple_id: couple.id,
      activity_type: 'daily_question',
      scheduled_date: formatDate(addDays(weekStart, 0)),
      day_of_week: 'monday',
      title: 'Start the Week Connected',
      prompt: "What's one thing you're looking forward to this week? Share with your partner."
    });

    // Tuesday: Encouragement
    activities.push({
      couple_id: couple.id,
      activity_type: 'encouragement',
      scheduled_date: formatDate(addDays(weekStart, 1)),
      day_of_week: 'tuesday',
      title: 'Send Some Love',
      prompt: "Send your partner an encouraging message about something they're working on."
    });

    // Wednesday: Check-in
    activities.push({
      couple_id: couple.id,
      activity_type: 'check_in',
      scheduled_date: formatDate(addDays(weekStart, 2)),
      day_of_week: 'wednesday',
      title: 'Mid-Week Check-In',
      prompt: 'How are you feeling this week? Share one high and one low with your partner.'
    });

    // Thursday: Voice note / Photo challenge
    const isPhotoWeek = Math.random() > 0.5;
    activities.push({
      couple_id: couple.id,
      activity_type: isPhotoWeek ? 'photo_challenge' : 'voice_note_prompt',
      scheduled_date: formatDate(addDays(weekStart, 3)),
      day_of_week: 'thursday',
      title: isPhotoWeek ? 'Photo Challenge' : 'Voice Note Moment',
      prompt: isPhotoWeek
        ? 'Take a photo of something that reminded you of your partner today and send it to them.'
        : 'Record a 1-minute voice note telling your partner about the best part of your day.'
    });

    // Friday: Virtual date suggestion
    activities.push({
      couple_id: couple.id,
      activity_type: 'virtual_date',
      scheduled_date: formatDate(addDays(weekStart, 4)),
      day_of_week: 'friday',
      title: 'Virtual Date Night',
      prompt: 'Plan a virtual date this weekend! Ideas: watch party, cook together over video, play an online game.'
    });

    // Saturday: Send question
    activities.push({
      couple_id: couple.id,
      activity_type: 'send_question',
      scheduled_date: formatDate(addDays(weekStart, 5)),
      day_of_week: 'saturday',
      title: 'Deep Question Saturday',
      prompt: "Ask your partner: \"What's a dream you have that you haven't told me about yet?\""
    });

    // Sunday: Gratitude
    activities.push({
      couple_id: couple.id,
      activity_type: 'encouragement',
      scheduled_date: formatDate(addDays(weekStart, 6)),
      day_of_week: 'sunday',
      title: 'Weekly Gratitude',
      prompt: "Tell your partner three things about them you're grateful for this week."
    });

    // Create all activities in Supabase
    try {
      const { error } = await api.supabase
        .from('long_distance_activities')
        .insert(activities);

      if (error) throw error;
      console.log('Weekly rhythm generated successfully');
    } catch (error) {
      console.error('Error generating weekly rhythm:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (!selectedActivity || !user) return;

    try {
      const isPartner1 = user.email === couple.partner1_email;
      const completionField = isPartner1 ? 'partner1_completed' : 'partner2_completed';
      const responseField = isPartner1 ? 'partner1_response' : 'partner2_response';

      const { error } = await api.supabase
        .from('long_distance_activities')
        .update({
          [completionField]: true,
          [responseField]: response
        })
        .eq('id', selectedActivity.id);

      if (error) throw error;

      console.log('Activity completed successfully');

      setSelectedActivity(null);
      setResponse('');
      loadActivities();
    } catch (error) {
      console.error('Error completing activity:', error);
      alert(`Error completing activity: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Heart className="w-8 h-8 text-rose-500 animate-pulse" />
      </div>
    );
  }

  const isUserCompleted = todayActivity && (
    user.email === couple.partner1_email
      ? todayActivity.partner1_completed
      : todayActivity.partner2_completed
  );

  return (
    <div className="space-y-4">
      {/* Today's Activity */}
      {todayActivity && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {React.createElement(activityIcons[todayActivity.activity_type] || Heart, {
                    className: "w-6 h-6"
                  })}
                  <div>
                    <p className="text-sm opacity-90">Today's Prompt</p>
                    <h3 className="text-xl font-bold">{todayActivity.title}</h3>
                  </div>
                </div>
                {isUserCompleted && (
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              <p className="text-white/90 mb-4 leading-relaxed">
                {todayActivity.prompt}
              </p>

              {!isUserCompleted && (
                <Button
                  onClick={() => setSelectedActivity(todayActivity)}
                  className="w-full bg-white text-purple-600 hover:bg-white/90"
                >
                  Respond Now
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upcoming Activities */}
      {upcomingActivities.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">This Week</h3>
          <div className="space-y-2">
            {upcomingActivities.map((activity, i) => {
              const Icon = activityIcons[activity.activity_type] || Heart;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activityColors[activity.activity_type]} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500">
                          {moment(activity.scheduled_date).format('dddd')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedActivity?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">{selectedActivity?.prompt}</p>

            <div>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Your response..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleComplete}
              disabled={!response.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500"
            >
              Complete Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
