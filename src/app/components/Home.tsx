import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Bell, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'motion/react';
import { PartnerConnection } from './PartnerConnection';
import { useDailyQuestion } from '../hooks/useDailyQuestion';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';

interface HomeProps {
  userName: string;
  partnerName: string;
  onNavigate: (page: string) => void;
}

export function Home({ userName, partnerName, onNavigate }: HomeProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { hasAnswered, hasGuessed, canSeeFeedback } = useDailyQuestion();
  const hasCompletedDailyQuestion = hasAnswered && hasGuessed;
  
  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  const weeklyNotificationsEnabled = true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-16">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/40">
                  <span className="text-xl">{userName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div>
                <p className="text-sm opacity-90">Good morning,</p>
                <h1 className="text-xl font-semibold">{userName}</h1>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Partner Connection Status */}
          <PartnerConnection partnerName={partnerName} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-10 pb-24">
        {/* Today's Question - Enhanced */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6 shadow-xl border-0 bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>
            
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  hasCompletedDailyQuestion 
                    ? 'bg-gradient-to-br from-green-400 to-green-500' 
                    : 'bg-gradient-to-br from-pink-500 to-purple-500'
                }`}>
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">Today's Question</h3>
                    {relationship?.partner_b_id && hasAnswered && !hasGuessed && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        {partnerName} answered!
                      </span>
                    )}
                  </div>
                  {hasCompletedDailyQuestion ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">✓ All done for today!</p>
                      <p className="text-xs text-gray-500">Come back tomorrow for a new question</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-3">
                        Answer together and see how well you know each other
                      </p>
                      <Button
                        onClick={() => onNavigate('daily-question')}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        disabled={!relationship}
                      >
                        Answer Now
                        {relationship && hasAnswered && <span className="ml-2">→</span>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Weekly Notification Reminder */}
        {weeklyNotificationsEnabled && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-4 mb-6 border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">New suggestions every Monday</p>
                  <p className="text-xs text-white/90">We'll remind you weekly at 9:00 AM</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Connection Stats - Show when connected */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <Card className="p-4 text-center border-0 shadow-sm bg-white">
              <div className="text-2xl font-bold text-pink-600 mb-1">0</div>
              <div className="text-xs text-gray-600">Day Streak</div>
            </Card>
            <Card className="p-4 text-center border-0 shadow-sm bg-white">
              <div className="text-2xl font-bold text-purple-600 mb-1">0</div>
              <div className="text-xs text-gray-600">Questions</div>
            </Card>
            <Card className="p-4 text-center border-0 shadow-sm bg-white">
              <div className="text-2xl font-bold text-pink-600 mb-1">0</div>
              <div className="text-xs text-gray-600">Dates</div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold px-1">Explore Together</h2>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 gap-4"
          >
            <button
              onClick={() => onNavigate('love-language')}
              className="group bg-white p-5 rounded-3xl shadow-md hover:shadow-xl transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Love Language</h3>
                <p className="text-xs text-gray-600">Weekly ideas</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('dates')}
              className="group bg-white p-5 rounded-3xl shadow-md hover:shadow-xl transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Plan a Date</h3>
                <p className="text-xs text-gray-600">Find ideas</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('gifts')}
              className="group bg-white p-5 rounded-3xl shadow-md hover:shadow-xl transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Gift Ideas</h3>
                <p className="text-xs text-gray-600">Thoughtful picks</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('tracker')}
              className="group bg-white p-5 rounded-3xl shadow-md hover:shadow-xl transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Important Dates</h3>
                <p className="text-xs text-gray-600">Never forget</p>
              </div>
            </button>
          </motion.div>
        </div>

        {/* Upcoming Events - Show when connected */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 mb-6 border-0 shadow-md bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Coming Up</h3>
              </div>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming events yet</p>
                <p className="text-xs text-gray-400 mt-1">Add important dates to see them here</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Memories Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-6 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 text-white border-0 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => onNavigate('memories')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-12 -mb-12"></div>
            
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Camera className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Save Your Memories</h3>
                <p className="text-sm text-white/90">
                  Create your private relationship scrapbook
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 px-6 py-3 safe-area-bottom shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-pink-500 transition-transform hover:scale-110">
            <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center">
              <Heart className="w-5 h-5 fill-pink-500" />
            </div>
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs">Dates</span>
          </button>
          <button 
            onClick={() => onNavigate('tracker')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs">Tracker</span>
          </button>
          <button 
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs">Memories</span>
          </button>
        </div>
      </div>
    </div>
  );
}