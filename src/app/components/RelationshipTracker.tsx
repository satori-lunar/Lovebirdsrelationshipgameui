import { useState } from 'react';
import { ChevronLeft, Calendar, Plus, Heart, Gift, Cake, PartyPopper } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface RelationshipTrackerProps {
  onBack: () => void;
  partnerName: string;
}

interface ImportantDate {
  id: number;
  title: string;
  date: string;
  type: 'anniversary' | 'birthday' | 'custom';
  recurring: boolean;
}

export function RelationshipTracker({ onBack, partnerName }: RelationshipTrackerProps) {
  const [dates, setDates] = useState<ImportantDate[]>([]);

  const [isAddingDate, setIsAddingDate] = useState(false);
  const [newDate, setNewDate] = useState({
    title: '',
    date: '',
    type: 'custom' as const
  });

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'anniversary':
        return Heart;
      case 'birthday':
        return Cake;
      default:
        return PartyPopper;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'anniversary':
        return 'pink';
      case 'birthday':
        return 'purple';
      default:
        return 'blue';
    }
  };

  const sortedDates = [...dates].sort((a, b) => {
    return getDaysUntil(a.date) - getDaysUntil(b.date);
  });

  const handleAddDate = () => {
    if (newDate.title && newDate.date) {
      setDates([
        ...dates,
        {
          id: dates.length + 1,
          ...newDate,
          recurring: true
        }
      ]);
      setNewDate({ title: '', date: '', type: 'custom' });
      setIsAddingDate(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Important Dates</h1>
                <p className="text-white/90 text-sm">Never forget a special moment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Add Date Button */}
        <Dialog open={isAddingDate} onOpenChange={setIsAddingDate}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-white text-purple-600 hover:bg-white/90 shadow-lg border-0 py-6">
              <Plus className="w-5 h-5 mr-2" />
              Add Important Date
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Important Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="date-title">What's the occasion?</Label>
                <Input
                  id="date-title"
                  value={newDate.title}
                  onChange={(e) => setNewDate({ ...newDate, title: e.target.value })}
                  placeholder="e.g., First Kiss Anniversary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-date">Date</Label>
                <Input
                  id="date-date"
                  type="date"
                  value={newDate.date}
                  onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleAddDate}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Add Date
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upcoming Dates */}
        <div className="space-y-4">
          <h2 className="font-semibold">Upcoming</h2>
          
          {sortedDates.map((date) => {
            const Icon = getIcon(date.type);
            const color = getColor(date.type);
            const daysUntil = getDaysUntil(date.date);
            const dateObj = new Date(date.date);
            const isUpcoming = daysUntil > 0;
            
            if (!isUpcoming) return null;

            const bgColor = color === 'pink' ? 'bg-pink-100' : color === 'purple' ? 'bg-purple-100' : 'bg-blue-100';
            const textColor = color === 'pink' ? 'text-pink-600' : color === 'purple' ? 'text-purple-600' : 'text-blue-600';
            const iconColor = color === 'pink' ? 'text-pink-500' : color === 'purple' ? 'text-purple-500' : 'text-blue-500';

            return (
              <Card key={date.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 ${bgColor} rounded-2xl flex flex-col items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs ${textColor} uppercase`}>
                      {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className={`text-2xl font-semibold ${textColor}`}>
                      {dateObj.getDate()}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{date.title}</h3>
                        <p className="text-sm text-gray-600">
                          {dateObj.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {daysUntil <= 7 && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days`}
                        </span>
                      )}
                      {daysUntil > 7 && daysUntil <= 30 && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                          {daysUntil} days away
                        </span>
                      )}
                      {daysUntil > 30 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {daysUntil} days away
                        </span>
                      )}
                    </div>

                    {/* Quick Actions for Upcoming Important Dates */}
                    {daysUntil <= 30 && (
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <Gift className="w-3 h-3 mr-1" />
                          Gift Ideas
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Plan Date
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Past Dates */}
        <div className="mt-8 space-y-4">
          <h2 className="font-semibold text-gray-500">Past</h2>
          
          {sortedDates.map((date) => {
            const daysUntil = getDaysUntil(date.date);
            const dateObj = new Date(date.date);
            const isPast = daysUntil < 0;
            
            if (!isPast) return null;

            return (
              <Card key={date.id} className="p-4 border-0 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700">{date.title}</h3>
                    <p className="text-xs text-gray-500">
                      {dateObj.toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.abs(daysUntil)} days ago
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="p-5 mt-6 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1 text-sm">Smart Reminders</h3>
              <p className="text-xs text-gray-600">
                We'll remind you 1 week before, 3 days before, and on the day of each important date. We'll also suggest dates and gifts in advance!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}