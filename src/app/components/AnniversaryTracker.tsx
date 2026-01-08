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
    <Card className="shadow-sm border-0 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-600 fill-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Anniversary</h3>
            <p className="text-sm text-gray-600">Celebrating your love</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Together for</span>
            <span className="font-semibold text-gray-900">
              {years}y {months}m {totalDays - (years * 365 + months * 30)}d
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Started</span>
            <span className="text-sm text-gray-900">{format(relationshipStart, 'MMM d, yyyy')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Next anniversary</span>
            <span className="text-sm font-medium text-pink-600">{daysUntilAnniversary} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
