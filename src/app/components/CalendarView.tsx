import React from 'react';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  owner: 'you' | 'partner';
  type: 'work' | 'personal' | 'date';
}

interface CalendarViewProps {
  events: Event[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

export function CalendarView({ events, selectedDate, onSelectDate }: CalendarViewProps) {
  const eventsForSelectedDate = selectedDate
    ? events.filter(event =>
        format(event.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : [];

  const hasEvents = (date: Date) => {
    return events.some(event =>
      format(event.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Shared Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDate}
            modifiers={{
              hasEvent: (date) => hasEvents(date)
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: 'bold',
                textDecoration: 'underline'
              }
            }}
            className="rounded-md border"
          />
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Your events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span>Partner's events</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? format(selectedDate, 'EEEE, MMMM d, yyyy')
              : 'Select a date to view events'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsForSelectedDate.length > 0 ? (
            <div className="space-y-3">
              {eventsForSelectedDate.map(event => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={event.owner === 'you' ? 'default' : 'secondary'}
                          className={event.owner === 'you' ? 'bg-blue-500' : 'bg-pink-500'}
                        >
                          {event.owner === 'you' ? 'You' : 'Partner'}
                        </Badge>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No events scheduled for this day</p>
              <p className="text-sm mt-2">This could be a great day for a date!</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a date from the calendar to view events</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
