import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Bell, Calendar as CalendarIcon, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { useAuth } from '../hooks/useAuth';
import { helpingHandService } from '../services/helpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandReminderSetupProps,
  ReminderFrequency
} from '../types/helpingHand';

// For calendar integration - placeholder until Capacitor Calendar is integrated
const hasCalendarSupport = false; // Will be true when Capacitor is available

const frequencyOptions: { id: ReminderFrequency; label: string; description: string }[] = [
  { id: 'once', label: 'Once', description: 'One-time reminder' },
  { id: 'daily', label: 'Daily', description: 'Every day' },
  { id: 'every_other_day', label: 'Every Other Day', description: 'Twice a week' },
  { id: 'twice_weekly', label: 'Twice Weekly', description: 'Pick 2 days' },
  { id: 'weekly', label: 'Weekly', description: 'Once a week' }
];

const daysOfWeek = [
  { id: 0, label: 'Sun', fullLabel: 'Sunday' },
  { id: 1, label: 'Mon', fullLabel: 'Monday' },
  { id: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { id: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { id: 4, label: 'Thu', fullLabel: 'Thursday' },
  { id: 5, label: 'Fri', fullLabel: 'Friday' },
  { id: 6, label: 'Sat', fullLabel: 'Saturday' }
];

export default function HelpingHandReminderSetup({ suggestion, onBack, onComplete }: HelpingHandReminderSetupProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 4]); // Default: Monday & Thursday
  const [time, setTime] = useState('19:00'); // Default: 7 PM
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to end of week
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return end.toISOString().split('T')[0];
  });
  const [syncToCalendar, setSyncToCalendar] = useState(true);

  const handleDayToggle = (dayId: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayId)) {
        return prev.filter(d => d !== dayId);
      } else {
        return [...prev, dayId].sort();
      }
    });
  };

  const needsDaySelection = frequency === 'twice_weekly' || frequency === 'weekly';

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    // Validation
    if (needsDaySelection && selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    if (frequency === 'twice_weekly' && selectedDays.length !== 2) {
      toast.error('Please select exactly 2 days');
      return;
    }

    if (frequency === 'weekly' && selectedDays.length !== 1) {
      toast.error('Please select exactly 1 day');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create reminder
      const result = await helpingHandService.setupReminder({
        suggestionId: suggestion.id,
        userId: user.id,
        frequency,
        specificDays: needsDaySelection ? selectedDays : undefined,
        preferredTime: time,
        startDate,
        endDate: frequency === 'once' ? startDate : endDate,
        syncToCalendar
      });

      // TODO: Integrate Capacitor Calendar when available
      if (syncToCalendar && hasCalendarSupport) {
        try {
          // This will be implemented with Capacitor Calendar plugin
          // const calendarEventId = await createCalendarEvent({
          //   title: `💝 ${suggestion.title}`,
          //   description: suggestion.description,
          //   startDate: new Date(`${startDate}T${time}`),
          //   duration: suggestion.timeEstimateMinutes,
          //   recurrence: frequency
          // });

          // await helpingHandService.updateReminderCalendarEvent(
          //   result.reminder.id,
          //   calendarEventId
          // );

          toast.success('Reminder set and added to calendar!');
        } catch (error) {
          console.error('Failed to sync to calendar:', error);
          toast.warning('Reminder set, but calendar sync failed');
        }
      } else {
        toast.success('Reminder set successfully!');
      }

      onComplete(result.reminder);
    } catch (error) {
      console.error('Failed to setup reminder:', error);
      toast.error('Failed to setup reminder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light pb-20">
      {/* Header */}
      <div className="bg-white border-b border-warm-beige/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-warm-beige/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-warm" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-warm">
                Set Up Reminder
              </h1>
              <p className="text-sm text-text-warm-light line-clamp-1">
                {suggestion.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Suggestion summary */}
        <Card className="mb-6 border-warm-pink/20 bg-warm-pink/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-text-warm mb-2">
              {suggestion.title}
            </h3>
            <p className="text-sm text-text-warm-light mb-3">
              {suggestion.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-text-warm-light">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{helpingHandService.formatTimeEstimate(suggestion.timeEstimateMinutes)}</span>
              </div>
              {suggestion.bestTiming && (
                <div className="flex items-center gap-1">
                  <span>Best: </span>
                  <span className="capitalize">{suggestion.bestTiming}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Frequency selection */}
        <div className="mb-6">
          <Label className="text-base font-semibold text-text-warm mb-3 block">
            How often?
          </Label>
          <div className="space-y-2">
            {frequencyOptions.map(option => (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  frequency === option.id
                    ? 'ring-2 ring-warm-pink bg-warm-pink/5'
                    : 'hover:bg-warm-beige/20'
                }`}
                onClick={() => setFrequency(option.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      frequency === option.id
                        ? 'border-warm-pink bg-warm-pink'
                        : 'border-warm-beige'
                    }`}>
                      {frequency === option.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-text-warm">
                        {option.label}
                      </div>
                      <div className="text-xs text-text-warm-light">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Day selection (for twice_weekly and weekly) */}
        {needsDaySelection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Label className="text-base font-semibold text-text-warm mb-3 block">
              Which day{frequency === 'twice_weekly' ? 's' : ''}?
              {frequency === 'twice_weekly' && (
                <span className="text-sm font-normal text-text-warm-light ml-2">
                  (Select 2 days)
                </span>
              )}
            </Label>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleDayToggle(day.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedDays.includes(day.id)
                      ? 'border-warm-pink bg-warm-pink text-white'
                      : 'border-warm-beige hover:border-warm-pink text-text-warm'
                  }`}
                >
                  <div className="text-xs font-semibold text-center">
                    {day.label}
                  </div>
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-sm text-text-warm-light mt-2">
                Selected: {selectedDays.map(id => daysOfWeek.find(d => d.id === id)?.fullLabel).join(', ')}
              </p>
            )}
          </motion.div>
        )}

        {/* Time selection */}
        <div className="mb-6">
          <Label htmlFor="time" className="text-base font-semibold text-text-warm mb-3 block">
            What time works best?
          </Label>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-warm-pink" />
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-text-warm-light mt-2">
            You'll get a notification at this time
          </p>
        </div>

        {/* Date range */}
        <div className="mb-6">
          <Label className="text-base font-semibold text-text-warm mb-3 block">
            When?
          </Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="startDate" className="text-sm text-text-warm-light mb-2 block">
                Start date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {frequency !== 'once' && (
              <div>
                <Label htmlFor="endDate" className="text-sm text-text-warm-light mb-2 block">
                  End date (optional)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            )}
          </div>
        </div>

        {/* Calendar sync */}
        {hasCalendarSupport && (
          <Card className="mb-6 border-soft-blue/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-soft-blue/10 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-soft-blue" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="calendar-sync" className="font-semibold text-text-warm cursor-pointer">
                      Add to device calendar
                    </Label>
                    <p className="text-xs text-text-warm-light">
                      Sync with your calendar app
                    </p>
                  </div>
                </div>
                <Switch
                  id="calendar-sync"
                  checked={syncToCalendar}
                  onCheckedChange={setSyncToCalendar}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar integration note */}
        {!hasCalendarSupport && (
          <Card className="mb-6 border-warm-beige/30 bg-warm-beige/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-text-warm-light shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-warm-light">
                    Calendar sync coming soon! For now, you'll receive push notifications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card className="mb-6 border-warm-pink/20 bg-white">
          <CardContent className="p-4">
            <h3 className="font-semibold text-text-warm mb-3">Summary:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-warm-light">Frequency:</span>
                <span className="font-medium text-text-warm">
                  {frequencyOptions.find(o => o.id === frequency)?.label}
                </span>
              </div>
              {needsDaySelection && selectedDays.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-warm-light">Days:</span>
                  <span className="font-medium text-text-warm">
                    {selectedDays.map(id => daysOfWeek.find(d => d.id === id)?.label).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-warm-light">Time:</span>
                <span className="font-medium text-text-warm">
                  {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-warm-light">Duration:</span>
                <span className="font-medium text-text-warm">
                  {frequency === 'once' ? 'One time' : `${startDate} - ${endDate || 'Ongoing'}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (needsDaySelection && selectedDays.length === 0)}
          className="w-full bg-gradient-to-r from-warm-pink to-soft-purple hover:opacity-90 text-white"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Setting Up...
            </>
          ) : (
            <>
              <Bell className="w-5 h-5 mr-2" />
              Set Reminder
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
