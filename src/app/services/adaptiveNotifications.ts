import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { useMoodUpdates } from '../hooks/useMoodUpdates';

export interface NotificationSchedule {
  type: 'check_in' | 'celebration' | 'reminder' | 'suggestion';
  timing: 'immediate' | 'gentle' | 'optimal' | 'quiet';
  delay: number; // minutes from trigger
  priority: 'low' | 'medium' | 'high';
  context: {
    partnerMood?: number;
    partnerEnergy?: number;
    sharedAvailability?: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

export class AdaptiveNotificationService {
  private calendarInsights: ReturnType<typeof useSharedCalendar>;
  private moodData: ReturnType<typeof useMoodUpdates>;

  constructor(
    calendarInsights: ReturnType<typeof useSharedCalendar>,
    moodData: ReturnType<typeof useMoodUpdates>
  ) {
    this.calendarInsights = calendarInsights;
    this.moodData = moodData;
  }

  /**
   * Calculate optimal notification timing based on current context
   */
  calculateOptimalTiming(notificationType: NotificationSchedule['type']): NotificationSchedule {
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 6 ? 'night' :
                     hour < 12 ? 'morning' :
                     hour < 17 ? 'afternoon' : 'evening';

    const partnerMood = this.moodData.partnerMood?.mood;
    const partnerEnergy = this.moodData.partnerMood?.energy_level;
    const hasSharedAvailability = this.calendarInsights.insights?.overlapHours > 2;

    // Base timing logic
    let timing: NotificationSchedule['timing'] = 'gentle';
    let delay = 30; // 30 minutes default
    let priority: NotificationSchedule['priority'] = 'medium';

    switch (notificationType) {
      case 'check_in':
        if (partnerMood && partnerMood <= 3) {
          // Low mood - be gentle and immediate
          timing = partnerEnergy && partnerEnergy <= 3 ? 'gentle' : 'immediate';
          delay = partnerEnergy && partnerEnergy <= 3 ? 60 : 15; // Wait longer if low energy
          priority = 'high';
        } else if (partnerEnergy && partnerEnergy >= 8) {
          // High energy - can be more immediate
          timing = 'optimal';
          delay = 20;
        }
        break;

      case 'celebration':
        if (partnerMood && partnerMood >= 8) {
          timing = 'immediate';
          delay = 10;
          priority = 'high';
        } else {
          timing = 'gentle';
          delay = 45;
        }
        break;

      case 'reminder':
        // Adjust based on time of day and availability
        if (timeOfDay === 'morning' && hasSharedAvailability) {
          timing = 'optimal';
          delay = 60; // Wait for morning routine
        } else if (timeOfDay === 'evening') {
          timing = 'gentle';
          delay = 30;
        } else {
          timing = 'quiet';
          delay = 120; // Longer delay during busy times
        }
        break;

      case 'suggestion':
        // Only suggest during optimal times
        if (hasSharedAvailability && timeOfDay === 'evening' && (partnerEnergy || 0) >= 5) {
          timing = 'optimal';
          delay = 90; // Evening window
          priority = 'low';
        } else {
          timing = 'quiet';
          delay = 240; // Much longer delay
          priority = 'low';
        }
        break;
    }

    // Adjust for time of day
    if (timeOfDay === 'night' && timing === 'immediate') {
      timing = 'gentle';
      delay = Math.max(delay, 120); // Don't wake them up
    }

    return {
      type: notificationType,
      timing,
      delay,
      priority,
      context: {
        partnerMood,
        partnerEnergy,
        sharedAvailability: hasSharedAvailability,
        timeOfDay
      }
    };
  }

  /**
   * Schedule a notification with adaptive timing
   */
  scheduleAdaptiveNotification(
    type: NotificationSchedule['type'],
    content: string,
    onTrigger: () => void
  ): () => void { // Returns cleanup function
    const schedule = this.calculateOptimalTiming(type);

    console.log(`Scheduling ${type} notification with ${schedule.timing} timing (${schedule.delay}min delay)`);

    const timeoutId = setTimeout(() => {
      // Double-check context before sending
      const currentSchedule = this.calculateOptimalTiming(type);

      if (currentSchedule.priority === 'high' ||
          (currentSchedule.timing !== 'quiet' && this.isAppropriateTime())) {
        onTrigger();
      }
    }, schedule.delay * 60 * 1000); // Convert minutes to milliseconds

    // Return cleanup function
    return () => clearTimeout(timeoutId);
  }

  /**
   * Check if current time is appropriate for notifications
   */
  private isAppropriateTime(): boolean {
    const hour = new Date().getHours();

    // Don't notify during sleep hours (11 PM - 7 AM)
    if (hour >= 23 || hour <= 7) return false;

    // Check if either partner has low energy
    const partnerEnergy = this.moodData.partnerMood?.energy_level;
    const userEnergy = this.moodData.todayMood?.energy_level;

    if ((partnerEnergy && partnerEnergy <= 2) || (userEnergy && userEnergy <= 2)) {
      return false; // Too draining
    }

    return true;
  }

  /**
   * Get notification preferences based on current context
   */
  getAdaptivePreferences() {
    const partnerMood = this.moodData.partnerMood?.mood;
    const partnerEnergy = this.moodData.partnerMood?.energy_level;

    return {
      checkInFrequency: partnerEnergy && partnerEnergy <= 3 ? 'reduced' : 'normal',
      suggestionTone: partnerMood && partnerMood <= 3 ? 'gentle' : 'normal',
      reminderTiming: this.calendarInsights.insights?.overlapHours > 1 ? 'aligned' : 'flexible'
    };
  }
}

export function useAdaptiveNotifications() {
  const calendarInsights = useSharedCalendar();
  const moodData = useMoodUpdates();

  const adaptiveService = new AdaptiveNotificationService(calendarInsights, moodData);

  return {
    scheduleNotification: adaptiveService.scheduleAdaptiveNotification.bind(adaptiveService),
    getOptimalTiming: adaptiveService.calculateOptimalTiming.bind(adaptiveService),
    getPreferences: adaptiveService.getAdaptivePreferences.bind(adaptiveService),
    isAppropriateTime: adaptiveService.isAppropriateTime.bind(adaptiveService)
  };
}
