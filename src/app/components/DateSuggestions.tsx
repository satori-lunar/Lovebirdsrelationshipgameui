import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, Heart, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface DateSuggestion {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  category: string;
  reason: string;
}

interface DateSuggestionsProps {
  suggestions: DateSuggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function DateSuggestions({ suggestions, onAccept, onDismiss }: DateSuggestionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-semibold">Date Suggestions</h2>
      </div>

      {suggestions.length === 0 ? (
        <Card className="shadow-md border-0 bg-white">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-orange-500" />
            </div>
            <p className="font-medium text-lg">No suggestions available right now</p>
            <p className="text-sm mt-2">Check back later for personalized date ideas!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map(suggestion => (
            <Card key={suggestion.id} className="hover:shadow-lg transition-all border-0 shadow-md bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                      <CardTitle className="text-xl">{suggestion.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">{suggestion.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                    {suggestion.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">{format(suggestion.date, 'EEEE, MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium">{suggestion.time}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 md:col-span-2">
                      <MapPin className="w-5 h-5 text-pink-600" />
                      <span className="text-sm font-medium">{suggestion.location}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
                    <p className="text-sm">
                      <span className="font-semibold text-amber-900">Why this works: </span>
                      <span className="text-amber-800">{suggestion.reason}</span>
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => onAccept(suggestion.id)}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Accept & Schedule
                    </Button>
                    <Button
                      onClick={() => onDismiss(suggestion.id)}
                      variant="outline"
                      className="px-6"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
