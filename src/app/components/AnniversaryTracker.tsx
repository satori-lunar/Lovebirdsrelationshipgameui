import React from 'react';
import { Card, CardContent } from './ui/card';
import { Heart, Calendar as CalendarIcon, Cake } from 'lucide-react';
import { differenceInDays, differenceInMonths, differenceInYears, format } from 'date-fns';

interface AnniversaryTrackerProps {
  partnerName: string;
  relationshipStart: Date;
}

export function AnniversaryTracker({ partnerName, relationshipStart }: AnniversaryTrackerProps) {
  const now = new Date();
  const years = differenceInYears(now, relationshipStart);
  const months = differenceInMonths(now, relationshipStart) % 12;
  const totalDays = differenceInDays(now, relationshipStart);

  // Calculate next anniversary
  const nextAnniversary = new Date(
    now.getFullYear() + (now.getMonth() > relationshipStart.getMonth() ||
    (now.getMonth() === relationshipStart.getMonth() && now.getDate() > relationshipStart.getDate()) ? 1 : 0),
    relationshipStart.getMonth(),
    relationshipStart.getDate()
  );
  const daysUntilAnniversary = differenceInDays(nextAnniversary, now);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white border-0 shadow-lg">
      <CardContent className="p-0">
        <div className="relative">
          {/* Background Image */}
          <div className="absolute inset-0 opacity-20">
            <img
              src="/api/placeholder/400/200" // Placeholder - you can replace with actual image
              alt="Couple"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-6 h-6 fill-white" />
              <h2 className="text-2xl font-semibold">Together Forever</h2>
            </div>

            {/* Main Counter */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-4xl font-bold mb-1">{years}</div>
                <div className="text-sm opacity-90">Years</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-4xl font-bold mb-1">{months}</div>
                <div className="text-sm opacity-90">Months</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-4xl font-bold mb-1">{totalDays}</div>
                <div className="text-sm opacity-90">Days</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="text-sm opacity-90">Started Dating</div>
                  <div className="font-semibold">{format(relationshipStart, 'MMM d, yyyy')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Cake className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="text-sm opacity-90">Next Anniversary</div>
                  <div className="font-semibold">{daysUntilAnniversary} days away</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
