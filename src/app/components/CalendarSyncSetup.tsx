import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Bell,
  Heart,
  MessageCircle,
  CalendarDays,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_private: boolean;
  can_share_busy_status: boolean;
}

interface NotificationPreferences {
  daily_question_time?: string;
  needs_suggestion_times?: string[];
  date_suggestion_days?: string[];
  date_suggestion_time_preference?: 'morning' | 'afternoon' | 'evening' | 'any';
}

interface CalendarSyncSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type Step = 'welcome' | 'events' | 'preferences' | 'complete';

export function CalendarSyncSetup({ onComplete, onSkip }: CalendarSyncSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    daily_question_time: '09:00',
    needs_suggestion_times: ['10:00', '14:00', '19:00'],
    date_suggestion_days: ['Friday', 'Saturday', 'Sunday'],
    date_suggestion_time_preference: 'evening'
  });

  // Form state for new/editing event
  const [eventForm, setEventForm] = useState<CalendarEvent>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    is_private: true,
    can_share_busy_status: false
  });

  // Load existing data on mount
  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      // Load existing events (next 30 days)
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const existingEvents = await api.calendar.getCalendarEvents(user.id, startDate, endDate);
      setEvents(existingEvents || []);

      // Load notification preferences
      try {
        const prefs = await api.notifications.getNotificationPreferences(user.id);
        if (prefs) {
          setNotificationPrefs({
            daily_question_time: prefs.daily_question_time || '09:00',
            needs_suggestion_times: prefs.needs_suggestion_times || ['10:00', '14:00', '19:00'],
            date_suggestion_days: prefs.date_suggestion_days || ['Friday', 'Saturday', 'Sunday'],
            date_suggestion_time_preference: prefs.date_suggestion_time_preference || 'evening'
          });
        }
      } catch (error) {
        // Preferences don't exist yet, use defaults
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const handleSaveEvent = async () => {
    if (!user || !eventForm.title || !eventForm.start_time || !eventForm.end_time) return;

    try {
      if (editingEvent?.id) {
        // Update existing event
        await api.calendar.updateCalendarEvent(editingEvent.id, eventForm);
        setEvents(events.map(e => e.id === editingEvent.id ? { ...eventForm, id: editingEvent.id } : e));
      } else {
        // Add new event
        const newEvent = await api.calendar.addCalendarEvent({
          ...eventForm,
          user_id: user.id
        });
        setEvents([...events, newEvent]);
      }

      // Reset form
      setEventForm({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        is_private: true,
        can_share_busy_status: false
      });
      setShowEventForm(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventForm(event);
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await api.calendar.deleteCalendarEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    try {
      await api.notifications.updateNotificationPreferences({
        user_id: user.id,
        ...notificationPrefs
      });
      setStep('complete');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  };

  const addSuggestionTime = () => {
    setNotificationPrefs(prev => ({
      ...prev,
      needs_suggestion_times: [...(prev.needs_suggestion_times || []), '12:00']
    }));
  };

  const updateSuggestionTime = (index: number, time: string) => {
    setNotificationPrefs(prev => ({
      ...prev,
      needs_suggestion_times: (prev.needs_suggestion_times || []).map((t, i) => i === index ? time : t)
    }));
  };

  const removeSuggestionTime = (index: number) => {
    setNotificationPrefs(prev => ({
      ...prev,
      needs_suggestion_times: (prev.needs_suggestion_times || []).filter((_, i) => i !== index)
    }));
  };

  const toggleSuggestionDay = (day: string) => {
    setNotificationPrefs(prev => ({
      ...prev,
      date_suggestion_days: (prev.date_suggestion_days || []).includes(day)
        ? (prev.date_suggestion_days || []).filter(d => d !== day)
        : [...(prev.date_suggestion_days || []), day]
    }));
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12"
      >
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Set Up Your Schedule
              </h1>

              <p className="text-gray-600 leading-relaxed mb-8">
                Help us plan the perfect moments for you and your partner. Add your schedule so we can suggest dates and send notifications at the right times.
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => setStep('events')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 text-lg"
                >
                  Set Up My Calendar
                  <Calendar className="w-5 h-5 ml-2" />
                </Button>

                {onSkip && (
                  <Button
                    onClick={onSkip}
                    variant="outline"
                    className="w-full py-4"
                  >
                    Skip for Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Events step
  if (step === 'events') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => setStep('welcome')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep('preferences')}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Continue to Preferences
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Card className="bg-white shadow-2xl mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-500" />
                Your Calendar Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">Add your upcoming events so we can plan around your schedule.</p>
                <Button
                  onClick={() => setShowEventForm(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>

              {/* Events List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events added yet. Add your first event to get started!</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <Card key={event.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(event.start_time).toLocaleDateString()} {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              {event.can_share_busy_status && (
                                <span className="text-blue-600 font-medium">Shared with partner</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditEvent(event)}
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteEvent(event.id!)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Form Modal */}
          <AnimatePresence>
            {showEventForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setShowEventForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white relative">
                    <button
                      onClick={() => setShowEventForm(false)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                      <Input
                        value={eventForm.title}
                        onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                        placeholder="e.g., Work Meeting, Gym, Doctor Appointment"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                      <Textarea
                        value={eventForm.description || ''}
                        onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                        placeholder="Additional details..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <Input
                          type="datetime-local"
                          value={eventForm.start_time}
                          onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <Input
                          type="datetime-local"
                          value={eventForm.end_time}
                          onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Share Busy Status with Partner</label>
                          <p className="text-xs text-gray-500">Let your partner know you're busy during this time</p>
                        </div>
                        <Switch
                          checked={eventForm.can_share_busy_status}
                          onCheckedChange={(checked) => setEventForm({...eventForm, can_share_busy_status: checked})}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => {
                          setShowEventForm(false);
                          setEditingEvent(null);
                          setEventForm({
                            title: '',
                            description: '',
                            start_time: '',
                            end_time: '',
                            is_private: true,
                            can_share_busy_status: false
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEvent}
                        disabled={!eventForm.title || !eventForm.start_time || !eventForm.end_time}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingEvent ? 'Update' : 'Save'} Event
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Preferences step
  if (step === 'preferences') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-6 py-12"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => setStep('events')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Save & Complete
              <Settings className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Card className="bg-white shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-purple-500" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Daily Question Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Daily Question Time
                </label>
                <p className="text-sm text-gray-600 mb-3">When would you like to receive your daily relationship question?</p>
                <Input
                  type="time"
                  value={notificationPrefs.daily_question_time}
                  onChange={(e) => setNotificationPrefs({...notificationPrefs, daily_question_time: e.target.value})}
                  className="max-w-xs"
                />
              </div>

              {/* Partner Needs Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  Partner Needs Suggestions
                </label>
                <p className="text-sm text-gray-600 mb-3">When should we send suggestions about your partner's needs throughout the day?</p>
                <div className="space-y-2">
                  {notificationPrefs.needs_suggestion_times?.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateSuggestionTime(index, e.target.value)}
                        className="max-w-xs"
                      />
                      {notificationPrefs.needs_suggestion_times!.length > 1 && (
                        <Button
                          onClick={() => removeSuggestionTime(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={addSuggestionTime}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Time
                  </Button>
                </div>
              </div>

              {/* Date Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-green-500" />
                  Date Suggestions
                </label>
                <p className="text-sm text-gray-600 mb-3">Which days work best for date suggestions?</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.date_suggestion_days?.includes(day) || false}
                        onChange={() => toggleSuggestionDay(day)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>

                <p className="text-sm text-gray-600 mb-2">Preferred time of day for dates:</p>
                <select
                  value={notificationPrefs.date_suggestion_time_preference}
                  onChange={(e) => setNotificationPrefs({
                    ...notificationPrefs,
                    date_suggestion_time_preference: e.target.value as any
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="any">Any time</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Complete step
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-6 py-12"
    >
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Calendar Setup Complete! 🎉
            </h1>

            <p className="text-gray-600 leading-relaxed mb-8">
              We'll now use your schedule to send personalized notifications and suggest the perfect times for dates with your partner.
            </p>

            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 text-lg"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
