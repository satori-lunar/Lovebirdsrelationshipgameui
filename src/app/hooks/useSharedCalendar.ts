import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useRelationship } from './useRelationship';

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  type: 'free' | 'busy' | 'overlap' | 'potential_date';
  confidence: number; // 0-1, how confident we are in this availability
}

export interface SharedTimeInsights {
  overlapHours: number;
  nextSyncTime: Date;
  availabilityWindows: AvailabilitySlot[];
  suggestedDateTimes: Date[];
  lastCalendarSync: Date;
}

export function useSharedCalendar() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [insights, setInsights] = useState<SharedTimeInsights | null>(null);

  // Fetch calendar data for both partners
  const { data: calendarData } = useQuery({
    queryKey: ['sharedCalendar', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;

      try {
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (!partnerId) return null;

        // Get next 7 days of calendar data
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);

        const [userEvents, partnerEvents] = await Promise.all([
          api.calendar.getCalendarEvents(user.id, startDate.toISOString().split('T')[0],
                                        endDate.toISOString().split('T')[0]),
          api.calendar.getCalendarEvents(partnerId, startDate.toISOString().split('T')[0],
                                        endDate.toISOString().split('T')[0])
        ]);

        return {
          userEvents: userEvents || [],
          partnerEvents: partnerEvents || [],
          lastSync: new Date()
        };
      } catch (error) {
        console.error('Failed to fetch shared calendar data:', error);
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Calculate availability insights
  useEffect(() => {
    if (!calendarData) {
      setInsights(null);
      return;
    }

    const calculateInsights = (): SharedTimeInsights => {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      // Create hourly slots for next 7 days
      const slots: AvailabilitySlot[] = [];
      let currentTime = new Date(now);

      // Round to next hour
      currentTime.setMinutes(0, 0, 0);

      while (currentTime < nextWeek) {
        const slotEnd = new Date(currentTime);
        slotEnd.setHours(currentTime.getHours() + 1);

        const userBusy = calendarData.userEvents.some(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          return (eventStart <= currentTime && eventEnd > currentTime) ||
                 (eventStart < slotEnd && eventEnd >= slotEnd);
        });

        const partnerBusy = calendarData.partnerEvents.some(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          return (eventStart <= currentTime && eventEnd > currentTime) ||
                 (eventStart < slotEnd && eventEnd >= slotEnd);
        });

        let type: AvailabilitySlot['type'] = 'free';
        let confidence = 0.8; // Default confidence for calendar data

        if (userBusy && partnerBusy) {
          type = 'overlap';
          confidence = 0.95; // High confidence for overlapping busy time
        } else if (userBusy || partnerBusy) {
          type = 'busy';
        } else {
          // Check if it's a good time for dates (evenings, weekends)
          const hour = currentTime.getHours();
          const day = currentTime.getDay();
          const isEvening = hour >= 18 && hour <= 22;
          const isWeekend = day === 0 || day === 6;
          const isAfternoon = hour >= 14 && hour <= 17;

          if ((isEvening && isWeekend) || (isAfternoon && !isWeekend)) {
            type = 'potential_date';
            confidence = 0.7; // Moderate confidence for suggested times
          }
        }

        slots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          type,
          confidence
        });

        currentTime = slotEnd;
      }

      // Calculate overlap hours (free time that overlaps)
      const overlapHours = slots.filter(slot => slot.type === 'free').length;

      // Find best date times (evening slots with high confidence)
      const suggestedDateTimes = slots
        .filter(slot => slot.type === 'potential_date' && slot.confidence > 0.6)
        .slice(0, 3) // Top 3 suggestions
        .map(slot => slot.start);

      return {
        overlapHours,
        nextSyncTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        availabilityWindows: slots,
        suggestedDateTimes,
        lastCalendarSync: calendarData.lastSync
      };
    };

    setInsights(calculateInsights());
  }, [calendarData]);

  return {
    insights,
    isLoading: !insights,
    refetch: () => {
      // Force refetch calendar data
      window.location.reload(); // Simple refresh for now
    }
  };
}
