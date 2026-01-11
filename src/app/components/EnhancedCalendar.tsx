import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  owner: 'you' | 'partner';
  type: 'work' | 'personal' | 'date';
}

interface EnhancedCalendarProps {
  events: Event[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

const eventColors = {
  work: 'bg-blue-100 border-blue-300 text-blue-700',
  personal: 'bg-green-100 border-green-300 text-green-700',
  date: 'bg-pink-100 border-pink-300 text-pink-700'
};

const ownerColors = {
  you: 'bg-indigo-500',
  partner: 'bg-rose-500'
};

export function EnhancedCalendar({ events, selectedDate, onSelectDate, onMonthChange }: EnhancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const eventsForSelectedDate = events.filter(event =>
    isSameDay(event.date, selectedDate)
  );

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const hasEvents = (date: Date) => {
    return events.some(event => isSameDay(event.date, date));
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-9 w-9 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-9 w-9 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
              hasEvent: (date) => hasEvents(date)
            }}
            modifiersClassNames={{
              hasEvent: 'font-semibold bg-pink-50 text-pink-700 hover:bg-pink-100'
            }}
            className="rounded-xl border-gray-200 w-full"
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-6 mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-sm text-gray-600">Your events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-sm text-gray-600">Partner's events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400"></div>
              <span className="text-sm text-gray-600">Date night</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Timeline for Selected Date */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold text-gray-900">{format(selectedDate, 'EEEE, MMMM d')}</span>
            {eventsForSelectedDate.length > 0 && (
              <Badge variant="secondary" className="bg-pink-100 text-pink-700 hover:bg-pink-200">
                {eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? 'event' : 'events'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px] pr-4">
            {eventsForSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {eventsForSelectedDate
                  .sort((a, b) => {
                    const timeA = a.time.split(' - ')[0];
                    const timeB = b.time.split(' - ')[0];
                    return timeA.localeCompare(timeB);
                  })
                  .map(event => (
                    <div key={event.id} className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200"></div>

                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-white shadow-sm ${ownerColors[event.owner]}`}></div>

                      {/* Event content */}
                      <div className="ml-12">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h4 className="font-semibold text-gray-900 text-base leading-tight">{event.title}</h4>
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-1 ${
                                event.owner === 'you'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {event.owner === 'you' ? 'You' : 'Partner'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                            {event.type === 'date' && (
                              <span className="ml-2 text-pink-600 text-xs font-medium">♥ Date</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  This day looks perfect for planning something special with your partner!
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
