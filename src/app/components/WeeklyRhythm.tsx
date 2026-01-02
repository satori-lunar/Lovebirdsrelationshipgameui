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
// TODO: Import actual API client when backend is ready
// import { api } from '../services/api';
import moment from 'moment';

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
    try {
      // TODO: Replace with actual API calls when backend is ready
      const today = moment().format('YYYY-MM-DD');

      // Generate mock weekly rhythm
      await generateWeeklyRhythm();

      // Get activities from localStorage
      const stored = localStorage.getItem(`weekly_rhythm_${couple?.id || 'demo'}`);
      const allActivities = stored ? JSON.parse(stored) : [];

      setActivities(allActivities);

      // Find today's activity
      const today_activity = allActivities.find(a => a.scheduled_date === today);
      setTodayActivity(today_activity || allActivities[0]);

      // Get upcoming activities
      const upcoming = allActivities
        .filter(a => moment(a.scheduled_date).isAfter(today))
        .slice(0, 3);

      setUpcomingActivities(upcoming);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activities:', error);
      setLoading(false);
    }
  };

  const generateWeeklyRhythm = async () => {
    const weekStart = moment().startOf('week');
    const activities = [];

    // Monday: Daily question
    activities.push({
      couple_id: couple.id,
      activity_type: 'daily_question',
      scheduled_date: weekStart.clone().add(0, 'days').format('YYYY-MM-DD'),
      day_of_week: 'monday',
      title: 'Start the Week Connected',
      prompt: "What's one thing you're looking forward to this week? Share with your partner."
    });

    // Tuesday: Encouragement
    activities.push({
      couple_id: couple.id,
      activity_type: 'encouragement',
      scheduled_date: weekStart.clone().add(1, 'days').format('YYYY-MM-DD'),
      day_of_week: 'tuesday',
      title: 'Send Some Love',
      prompt: "Send your partner an encouraging message about something they're working on."
    });

    // Wednesday: Check-in
    activities.push({
      couple_id: couple.id,
      activity_type: 'check_in',
      scheduled_date: weekStart.clone().add(2, 'days').format('YYYY-MM-DD'),
      day_of_week: 'wednesday',
      title: 'Mid-Week Check-In',
      prompt: 'How are you feeling this week? Share one high and one low with your partner.'
    });

    // Thursday: Voice note / Photo challenge
    const isPhotoWeek = Math.random() > 0.5;
    activities.push({
      couple_id: couple.id,
      activity_type: isPhotoWeek ? 'photo_challenge' : 'voice_note_prompt',
      scheduled_date: weekStart.clone().add(3, 'days').format('YYYY-MM-DD'),
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
      scheduled_date: weekStart.clone().add(4, 'days').format('YYYY-MM-DD'),
      day_of_week: 'friday',
      title: 'Virtual Date Night',
      prompt: 'Plan a virtual date this weekend! Ideas: watch party, cook together over video, play an online game.'
    });

    // Saturday: Send question
    activities.push({
      couple_id: couple.id,
      activity_type: 'send_question',
      scheduled_date: weekStart.clone().add(5, 'days').format('YYYY-MM-DD'),
      day_of_week: 'saturday',
      title: 'Deep Question Saturday',
      prompt: "Ask your partner: \"What's a dream you have that you haven't told me about yet?\""
    });

    // Sunday: Gratitude
    activities.push({
      couple_id: couple.id,
      activity_type: 'encouragement',
      scheduled_date: weekStart.clone().add(6, 'days').format('YYYY-MM-DD'),
      day_of_week: 'sunday',
      title: 'Weekly Gratitude',
      prompt: "Tell your partner three things about them you're grateful for this week."
    });

    // TODO: Replace with actual API calls when backend is ready
    // Store in localStorage for now
    const existingKey = `weekly_rhythm_${couple?.id || 'demo'}`;
    const existing = localStorage.getItem(existingKey);
    if (!existing) {
      const activitiesWithIds = activities.map((a, i) => ({ ...a, id: `activity_${i}` }));
      localStorage.setItem(existingKey, JSON.stringify(activitiesWithIds));
    }
  };

  const handleComplete = async () => {
    if (!selectedActivity) return;

    // TODO: Replace with actual API calls when backend is ready
    // Update in localStorage for now
    const existingKey = `weekly_rhythm_${couple?.id || 'demo'}`;
    const stored = localStorage.getItem(existingKey);
    if (stored) {
      const allActivities = JSON.parse(stored);
      const updated = allActivities.map(a =>
        a.id === selectedActivity.id
          ? { ...a, completed: true, response }
          : a
      );
      localStorage.setItem(existingKey, JSON.stringify(updated));
    }

    console.log('Activity completed (localStorage only):', { activity: selectedActivity.id, response });

    setSelectedActivity(null);
    setResponse('');
    loadActivities();
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
