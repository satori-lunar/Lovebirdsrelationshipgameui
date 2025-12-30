export interface UpcomingEvent {
  id: string;
  title: string;
  date: Date;
  daysUntil: number;
  type: 'birthday' | 'holiday' | 'anniversary';
}

/**
 * Get upcoming events including partner's birthday and holidays
 */
export function getUpcomingEvents(partnerName: string, partnerBirthday?: string): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();

  // Add Valentine's Day
  const valentinesDay = new Date(currentYear, 1, 14); // Feb 14
  if (valentinesDay < today) {
    // If Valentine's has passed this year, show next year's
    valentinesDay.setFullYear(currentYear + 1);
  }
  const daysUntilValentines = Math.ceil((valentinesDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  events.push({
    id: 'valentines',
    title: "Valentine's Day",
    date: valentinesDay,
    daysUntil: daysUntilValentines,
    type: 'holiday',
  });

  // Add partner's birthday if available
  if (partnerBirthday) {
    const birthdayDate = new Date(partnerBirthday);
    // Get this year's birthday
    const thisYearBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

    // If birthday has passed this year, show next year's
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(currentYear + 1);
    }

    const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    events.push({
      id: 'partner-birthday',
      title: `${partnerName}'s Birthday`,
      date: thisYearBirthday,
      daysUntil: daysUntilBirthday,
      type: 'birthday',
    });
  }

  // Sort by date (closest first)
  events.sort((a, b) => a.daysUntil - b.daysUntil);

  // Return only next 3 events
  return events.slice(0, 3);
}

/**
 * Format days until event as a readable string
 */
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  const months = Math.floor(days / 30);
  return `In ${months} ${months === 1 ? 'month' : 'months'}`;
}

/**
 * Format event date for display
 */
export function formatEventDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
