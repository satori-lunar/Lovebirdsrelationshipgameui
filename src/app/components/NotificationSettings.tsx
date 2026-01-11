import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Bell, Calendar, Heart } from 'lucide-react';

interface NotificationPreferences {
  enabled: boolean;
  suggestionFrequency: string;
  reminderTime: number;
  upcomingDateReminders: boolean;
  partnerActivityNotifications: boolean;
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onUpdatePreferences: (preferences: NotificationPreferences) => void;
}

export function NotificationSettings({ preferences, onUpdatePreferences }: NotificationSettingsProps) {
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    onUpdatePreferences({ ...preferences, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-semibold">Notification Settings</h2>
      </div>

      <Card className="shadow-md border-0 bg-white">
        <CardHeader>
          <CardTitle>General Notifications</CardTitle>
          <CardDescription>Control how and when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive all notifications and suggestions
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={preferences.enabled}
              onCheckedChange={(checked) => updatePreference('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Date Suggestions
          </CardTitle>
          <CardDescription>Customize how often you receive date suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="suggestion-frequency">Suggestion Frequency</Label>
            <Select
              value={preferences.suggestionFrequency}
              onValueChange={(value) => updatePreference('suggestionFrequency', value)}
              disabled={!preferences.enabled}
            >
              <SelectTrigger id="suggestion-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="twice-weekly">Twice a week</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Get personalized date suggestions based on both schedules
            </p>
          </div>

          <div className="space-y-2">
            <Label>Advance Notice for Suggestions (days)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[preferences.reminderTime]}
                onValueChange={([value]) => updatePreference('reminderTime', value)}
                min={1}
                max={14}
                step={1}
                disabled={!preferences.enabled}
                className="flex-1"
              />
              <span className="w-12 text-center font-medium">
                {preferences.reminderTime}d
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Suggest dates this many days in advance
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Calendar Reminders
          </CardTitle>
          <CardDescription>Get reminded about upcoming dates and events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="upcoming-reminders">Upcoming Date Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified 24 hours before scheduled dates
              </p>
            </div>
            <Switch
              id="upcoming-reminders"
              checked={preferences.upcomingDateReminders}
              onCheckedChange={(checked) => updatePreference('upcomingDateReminders', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="partner-activity">Partner Activity Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your partner adds or updates events
              </p>
            </div>
            <Switch
              id="partner-activity"
              checked={preferences.partnerActivityNotifications}
              onCheckedChange={(checked) => updatePreference('partnerActivityNotifications', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
