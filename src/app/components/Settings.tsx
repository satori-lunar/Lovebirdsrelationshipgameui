import { useState } from 'react';
import { ChevronLeft, Bell, Users, Link2, Copy, Check, Mail, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface SettingsProps {
  onBack: () => void;
  partnerName: string;
}

export function Settings({ onBack, partnerName }: SettingsProps) {
  const [notificationSettings, setNotificationSettings] = useState({
    weeklyLoveLanguage: true,
    dailyQuestions: true,
    upcomingDates: true,
    partnerActivity: false,
  });
  
  const [inviteCode] = useState('LOVE-2024-XY7Z');
  const [copied, setCopied] = useState(false);
  const isPartnerConnected = true; // Mock state

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
          
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-white/90 text-sm mt-1">
            Manage your notifications and connections
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-6">
        {/* Partner Connection */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="font-semibold text-lg">Partner Connection</h2>
          </div>

          {isPartnerConnected ? (
            <div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl mb-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-lg font-semibold text-purple-600">
                    {partnerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{partnerName}</p>
                  <p className="text-sm text-green-700">✓ Connected</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                You and {partnerName} are connected! All features are unlocked.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this invite with {partnerName} to connect your accounts
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    value={inviteCode} 
                    readOnly 
                    className="flex-1 font-mono text-center bg-gray-50"
                  />
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Text
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-900">
                  💡 <span className="font-semibold">Tip:</span> {partnerName} needs to download the app and enter this code during sign up
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="font-semibold text-lg">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="weekly" className="font-semibold text-sm cursor-pointer">
                  Weekly Love Language Ideas
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Every Monday at 9:00 AM
                </p>
              </div>
              <Switch 
                id="weekly"
                checked={notificationSettings.weeklyLoveLanguage}
                onCheckedChange={() => toggleNotification('weeklyLoveLanguage')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="daily" className="font-semibold text-sm cursor-pointer">
                  Daily Question Reminders
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Every day at 8:00 PM
                </p>
              </div>
              <Switch 
                id="daily"
                checked={notificationSettings.dailyQuestions}
                onCheckedChange={() => toggleNotification('dailyQuestions')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="dates" className="font-semibold text-sm cursor-pointer">
                  Upcoming Important Dates
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  1 week before, 3 days before, and day of
                </p>
              </div>
              <Switch 
                id="dates"
                checked={notificationSettings.upcomingDates}
                onCheckedChange={() => toggleNotification('upcomingDates')}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1 pr-4">
                <Label htmlFor="partner" className="font-semibold text-sm cursor-pointer">
                  Partner Activity
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  When {partnerName} completes a daily question
                </p>
              </div>
              <Switch 
                id="partner"
                checked={notificationSettings.partnerActivity}
                onCheckedChange={() => toggleNotification('partnerActivity')}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
            <p className="text-xs text-gray-700">
              🔔 Don't worry - we keep notifications gentle and helpful, never annoying
            </p>
          </div>
        </Card>

        {/* Privacy Note */}
        <Card className="p-6 border-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">🔒 Your Privacy Matters</h3>
            <p className="text-xs text-gray-700">
              All your answers and reflections are private by default. You control what you share with {partnerName}.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
