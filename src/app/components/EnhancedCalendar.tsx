import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { RelationshipStats } from './RelationshipStats';

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
      {/* Stats */}
      <RelationshipStats events={events} />

      {/* Calendar Card */}
      <Card className="shadow-md border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              hasEvent: 'font-bold relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-pink-500 after:rounded-full'
            }}
            className="rounded-md"
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ownerColors.you}`}></div>
              <span className="text-sm text-muted-foreground">Your events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ownerColors.partner}`}></div>
              <span className="text-sm text-muted-foreground">Partner's events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-sm text-muted-foreground">Has events</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Timeline for Selected Date */}
      <Card className="shadow-md border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{format(selectedDate, 'EEEE, MMMM d')}</span>
            {eventsForSelectedDate.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? 'event' : 'events'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {eventsForSelectedDate.length > 0 ? (
              <div className="space-y-3">
                {eventsForSelectedDate
                  .sort((a, b) => {
                    const timeA = a.time.split(' - ')[0];
                    const timeB = b.time.split(' - ')[0];
                    return timeA.localeCompare(timeB);
                  })
                  .map(event => (
                    <div
                      key={event.id}
                      className={`relative pl-6 pb-4 border-l-2 ${
                        event.type === 'date' ? 'border-pink-400' :
                        event.type === 'work' ? 'border-blue-400' :
                        'border-green-400'
                      }`}
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute left-[-5px] top-1 w-3 h-3 rounded-full ${ownerColors[event.owner]}`}></div>

                      {/* Event Content */}
                      <div className={`p-4 rounded-xl border ${eventColors[event.type]}`}>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="font-semibold text-base">{event.title}</h4>
                          <Badge
                            variant="outline"
                            className="text-xs whitespace-nowrap"
                          >
                            {event.owner === 'you' ? 'You' : 'Partner'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 opacity-70" />
                          <span>{event.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-pink-500" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">No events scheduled</p>
                <p className="text-sm text-muted-foreground">
                  This day is free - perfect for planning a date!
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
