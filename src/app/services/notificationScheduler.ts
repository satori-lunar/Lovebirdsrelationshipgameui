/**
 * Notification Scheduler Service
 *
 * Intelligently schedules notifications based on user preferences and calendar availability.
 * Avoids sending notifications during busy periods and respects user-preferred times.
 */

import { api } from './api';

export interface ScheduledNotification {
  type: 'daily_question' | 'needs_suggestion' | 'date_suggestion';
  userId: string;
  scheduledTime: Date;
  reason: string;
}

export class NotificationScheduler {
  /**
   * Get the best time to send a daily question notification for a user
   */
  async getBestTimeForDailyQuestion(userId: string): Promise<Date | null> {
    try {
      // Get user preferences
      const preferences = await api.notifications.getNotificationPreferences(userId);
      if (!preferences?.daily_question_time) {
        return null; // No preference set
      }

      // Parse the preferred time
      const [hours, minutes] = preferences.daily_question_time.split(':').map(Number);
      const preferredTime = new Date();
      preferredTime.setHours(hours, minutes, 0, 0);

      // Check if the preferred time is in the future today
      const now = new Date();
      if (preferredTime > now) {
        // Check if user is busy at preferred time
        const isBusy = await this.isUserBusyAtTime(userId, preferredTime);
        if (!isBusy) {
          return preferredTime;
        }
      }

      // If busy or time has passed, find next available slot
      return this.findNextAvailableSlot(userId, preferredTime, 2); // Within 2 hours

    } catch (error) {
      console.error('Error getting best time for daily question:', error);
      return null;
    }
  }

  /**
   * Get the best times to send needs suggestion notifications throughout the day
   */
  async getBestTimesForNeedsSuggestions(userId: string): Promise<Date[]> {
    try {
      const preferences = await api.notifications.getNotificationPreferences(userId);
      if (!preferences?.needs_suggestion_times || preferences.needs_suggestion_times.length === 0) {
        return [];
      }

      const availableTimes: Date[] = [];

      for (const timeString of preferences.needs_suggestion_times) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const suggestedTime = new Date();
        suggestedTime.setHours(hours, minutes, 0, 0);

        // Check if time is in future and user is not busy
        const now = new Date();
        if (suggestedTime > now) {
          const isBusy = await this.isUserBusyAtTime(userId, suggestedTime);
          if (!isBusy) {
            availableTimes.push(suggestedTime);
          }
        }
      }

      return availableTimes;

    } catch (error) {
      console.error('Error getting best times for needs suggestions:', error);
      return [];
    }
  }

  /**
   * Get the best times for date suggestions based on preferences and mutual availability
   */
  async getBestTimesForDateSuggestions(userId: string, partnerId: string): Promise<ScheduledNotification[]> {
    try {
      const preferences = await api.notifications.getNotificationPreferences(userId);
      if (!preferences?.date_suggestion_days || preferences.date_suggestion_days.length === 0) {
        return [];
      }

      const suggestions: ScheduledNotification[] = [];
      const now = new Date();

      // Check next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + dayOffset);
        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Check if this day is preferred
        if (preferences.date_suggestion_days.includes(dayName)) {
          // Determine preferred time of day
          let targetHour = 19; // Default evening
          if (preferences.date_suggestion_time_preference === 'morning') {
            targetHour = 9;
          } else if (preferences.date_suggestion_time_preference === 'afternoon') {
            targetHour = 14;
          } else if (preferences.date_suggestion_time_preference === 'evening') {
            targetHour = 19;
          }

          const suggestedTime = new Date(checkDate);
          suggestedTime.setHours(targetHour, 0, 0, 0);

          // Check if both partners are available
          const userBusy = await this.isUserBusyAtTime(userId, suggestedTime);
          const partnerBusy = await this.isUserBusyAtTime(partnerId, suggestedTime);

          if (!userBusy && !partnerBusy && suggestedTime > now) {
            suggestions.push({
              type: 'date_suggestion',
              userId,
              scheduledTime: suggestedTime,
              reason: `Preferred ${preferences.date_suggestion_time_preference} time on ${dayName}`
            });
          }
        }
      }

      return suggestions.slice(0, 3); // Return top 3 suggestions

    } catch (error) {
      console.error('Error getting best times for date suggestions:', error);
      return [];
    }
  }

  /**
   * Check if a user is busy at a specific time
   */
  private async isUserBusyAtTime(userId: string, checkTime: Date): Promise<boolean> {
    try {
      // Get events for the day of the check time
      const startOfDay = new Date(checkTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(checkTime);
      endOfDay.setHours(23, 59, 59, 999);

      const events = await api.calendar.getCalendarEvents(userId, startOfDay.toISOString(), endOfDay.toISOString());

      // Check if any event overlaps with the check time
      return events.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return checkTime >= eventStart && checkTime <= eventEnd;
      });

    } catch (error) {
      console.error('Error checking if user is busy:', error);
      return false; // Default to not busy on error
    }
  }

  /**
   * Find the next available time slot after a preferred time
   */
  private async findNextAvailableSlot(userId: string, preferredTime: Date, maxHours: number): Promise<Date | null> {
    const checkInterval = 30; // Check every 30 minutes
    const maxChecks = (maxHours * 60) / checkInterval;

    for (let i = 0; i < maxChecks; i++) {
      const checkTime = new Date(preferredTime);
      checkTime.setMinutes(preferredTime.getMinutes() + (i * checkInterval));

      if (checkTime <= preferredTime) continue; // Skip past times

      const isBusy = await this.isUserBusyAtTime(userId, checkTime);
      if (!isBusy) {
        return checkTime;
      }
    }

    return null; // No available slot found
  }

  /**
   * Schedule all types of notifications for a user
   */
  async scheduleAllNotifications(userId: string, partnerId?: string): Promise<ScheduledNotification[]> {
    const scheduled: ScheduledNotification[] = [];

    // Daily question
    const dailyQuestionTime = await this.getBestTimeForDailyQuestion(userId);
    if (dailyQuestionTime) {
      scheduled.push({
        type: 'daily_question',
        userId,
        scheduledTime: dailyQuestionTime,
        reason: 'User preferred time, not during busy period'
      });
    }

    // Needs suggestions
    const needsSuggestionTimes = await this.getBestTimesForNeedsSuggestions(userId);
    needsSuggestionTimes.forEach(time => {
      scheduled.push({
        type: 'needs_suggestion',
        userId,
        scheduledTime: time,
        reason: 'User preferred time, not during busy period'
      });
    });

    // Date suggestions (requires partner)
    if (partnerId) {
      const dateSuggestions = await this.getBestTimesForDateSuggestions(userId, partnerId);
      scheduled.push(...dateSuggestions);
    }

    return scheduled;
  }
}

export const notificationScheduler = new NotificationScheduler();
