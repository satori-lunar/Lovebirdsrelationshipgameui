import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EnhancedCalendar } from './EnhancedCalendar';
import { CalendarSyncSetup } from './CalendarSyncSetup';
import { DateSuggestions } from './DateSuggestions';
import { NotificationSettings } from './NotificationSettings';
import { AnniversaryTracker } from './AnniversaryTracker';
import { PartnerProfile } from './PartnerProfile';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  owner: 'you' | 'partner';
  type: 'work' | 'personal' | 'date';
}

interface DateSuggestion {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  category: string;
  reason: string;
}

interface NotificationPreferences {
  enabled: boolean;
  suggestionFrequency: string;
  reminderTime: number;
  upcomingDateReminders: boolean;
  partnerActivityNotifications: boolean;
}

interface CalendarPageProps {
  onNavigate: (page: string) => void;
}

export function CalendarPage({ onNavigate }: CalendarPageProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [suggestions, setSuggestions] = useState<DateSuggestion[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enabled: true,
    suggestionFrequency: 'weekly',
    reminderTime: 3,
    upcomingDateReminders: true,
    partnerActivityNotifications: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendarSetup, setShowCalendarSetup] = useState(false);

  // Mock partner data - in a real app this would come from your partner profile
  const partner = {
    name: "Alex",
    initials: "AX",
    relationshipStart: new Date('2023-06-15'),
    syncStatus: 'connected' as const
  };

  // Load calendar data on mount
  useEffect(() => {
    if (user) {
      loadCalendarData();
      loadNotificationPreferences();
      loadDateSuggestions();
    }
  }, [user]);

  const loadCalendarData = async () => {
    if (!user) return;

    try {
      // Load user's events
      const userEvents = await api.calendar.getCalendarEvents(user.id, '2024-01-01', '2024-12-31');

      // Load partner's events (if sharing is enabled)
      let partnerEvents: any[] = [];
      if (relationship) {
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;
        partnerEvents = await api.calendar.getPartnerBusyStatus(user.id, partnerId, '2024-01-01', '2024-12-31');
      }

      // Combine and format events
      const allEvents: Event[] = [
        ...userEvents.map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_time),
          time: `${new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          owner: 'you' as const,
          type: 'personal' as const
        })),
        ...partnerEvents.map(event => ({
          id: `partner-${event.id}`,
          title: 'Busy', // Partner events show as "Busy" for privacy
          date: new Date(event.start_time),
          time: `${new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(event.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          owner: 'partner' as const,
          type: 'work' as const
        }))
      ];

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await api.notifications.getNotificationPreferences(user.id);
      if (prefs) {
        setNotificationPrefs({
          enabled: true, // Default to enabled if preferences exist
          suggestionFrequency: prefs.date_suggestion_days?.length ? 'weekly' : 'monthly',
          reminderTime: 3,
          upcomingDateReminders: true,
          partnerActivityNotifications: false
        });
      }
    } catch (error) {
      // Preferences don't exist yet, use defaults
    }
  };

  const loadDateSuggestions = () => {
    // Mock date suggestions - in a real app these would come from your backend
    const mockSuggestions: DateSuggestion[] = [
      {
        id: '1',
        title: 'Romantic Dinner at Giovanni\'s',
        description: 'Try the new Italian restaurant downtown with amazing pasta and wine selection.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        time: '7:00 PM',
        location: 'Giovanni\'s Italian Restaurant, Downtown',
        category: 'Dining',
        reason: 'You both love Italian food and haven\'t tried this place yet. Perfect for a Friday evening.'
      },
      {
        id: '2',
        title: 'Hiking in the Mountains',
        description: 'A beautiful scenic hike with waterfalls and picnic spots.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks from now
        time: '10:00 AM',
        location: 'Mountain Trail Park',
        category: 'Adventure',
        reason: 'Both your schedules are free on Saturday, and you mentioned wanting more outdoor activities.'
      }
    ];

    setSuggestions(mockSuggestions);
  };

  const handleAcceptSuggestion = (id: string) => {
    // In a real app, this would add the date to both partners' calendars
    console.log('Accepted suggestion:', id);
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const handleCalendarSetupComplete = () => {
    setShowCalendarSetup(false);
    loadCalendarData(); // Reload calendar data
  };

  if (showCalendarSetup) {
    return (
      <CalendarSyncSetup
        onComplete={handleCalendarSetupComplete}
        onSkip={() => setShowCalendarSetup(false)}
      />
    );
  }

  if (showSettings) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => setShowSettings(false)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Calendar
            </Button>
          </div>

          <NotificationSettings
            preferences={notificationPrefs}
            onUpdatePreferences={setNotificationPrefs}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => onNavigate('home')}
              variant="outline"
              size="icon"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">Plan dates and manage your schedule together</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowCalendarSetup(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              size="icon"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Partner Profile and Anniversary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <PartnerProfile partner={partner} />
          <AnniversaryTracker
            partnerName={partner.name}
            relationshipStart={partner.relationshipStart}
          />
        </div>

        {/* Main Calendar Content */}
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="suggestions">Date Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <EnhancedCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <DateSuggestions
              suggestions={suggestions}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
