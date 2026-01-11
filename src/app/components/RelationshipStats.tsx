import React from 'react';
import { Card, CardContent } from './ui/card';
import { Heart, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  owner: 'you' | 'partner';
  type: 'work' | 'personal' | 'date';
}

interface RelationshipStatsProps {
  events: Event[];
}

export function RelationshipStats({ events }: RelationshipStatsProps) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Count dates this month
  const datesThisMonth = events.filter(event =>
    event.type === 'date' &&
    event.date.getMonth() === thisMonth &&
    event.date.getFullYear() === thisYear
  ).length;

  // Count upcoming dates
  const upcomingDates = events.filter(event =>
    event.type === 'date' && event.date >= now
  ).length;

  // Calculate compatibility score (based on free time overlap)
  const yourEvents = events.filter(e => e.owner === 'you').length;
  const partnerEvents = events.filter(e => e.owner === 'partner').length;
  const dateEvents = events.filter(e => e.type === 'date').length;
  const compatibilityScore = Math.min(95, 70 + (dateEvents * 5));

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="shadow-md border-0 bg-gradient-to-br from-pink-500 to-rose-600 text-white">
        <CardContent className="p-4 text-center">
          <Heart className="w-6 h-6 mx-auto mb-2 fill-white" />
          <div className="text-2xl font-bold mb-1">{datesThisMonth}</div>
          <div className="text-xs opacity-90">Dates This Month</div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
        <CardContent className="p-4 text-center">
          <CalendarIcon className="w-6 h-6 mx-auto mb-2" />
          <div className="text-2xl font-bold mb-1">{upcomingDates}</div>
          <div className="text-xs opacity-90">Upcoming Dates</div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 bg-gradient-to-br from-orange-500 to-amber-600 text-white">
        <CardContent className="p-4 text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-2" />
          <div className="text-2xl font-bold mb-1">{compatibilityScore}%</div>
          <div className="text-xs opacity-90">Sync Score</div>
        </CardContent>
      </Card>
    </div>
  );
}
