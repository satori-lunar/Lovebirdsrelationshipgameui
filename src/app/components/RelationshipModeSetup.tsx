import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Heart, Plane, ArrowRight, Sparkles, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface RelationshipModeSetupProps {
  onNavigate: (view: string) => void;
}

export default function RelationshipModeSetup({ onNavigate }: RelationshipModeSetupProps) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [isLongDistance, setIsLongDistance] = useState(false);

  const modes = [
    {
      id: 'shared',
      title: "We're using it together",
      description: "Both partners will use Amora to stay connected and intentional",
      icon: Users,
      color: 'from-rose-500 to-pink-500',
      benefits: [
        'Shared date planning',
        'Daily questions for both',
        'Sync calendar and reminders',
        'Partner insights and tracking'
      ]
    },
    {
      id: 'solo',
      title: "I'm using this solo",
      description: "Get thoughtful ideas and suggestions to be more intentional in your relationship",
      icon: Sparkles,
      color: 'from-purple-500 to-violet-500',
      benefits: [
        'Personalized date ideas',
        'Gift suggestions',
        'Thoughtful prompts',
        'Optional partner insights (they won\'t need an account)'
      ],
      badge: 'Most Flexible'
    },
  ];

  const handleContinue = () => {
    // Store mode selection
    localStorage.setItem('relationship_mode', selectedMode);
    localStorage.setItem('is_long_distance', isLongDistance.toString());

    // Navigate based on mode
    if (selectedMode === 'shared') {
      onNavigate('onboarding');
    } else {
      onNavigate('solo-mode-setup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            How are you using Amora?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the mode that fits your relationship best. You can always change this later.
          </p>
        </motion.div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {modes.map((mode, i) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;

            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all relative overflow-hidden ${
                    isSelected
                      ? 'ring-4 ring-purple-400 shadow-xl'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <CardContent className="p-6">
                    {mode.badge && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-semibold rounded-full">
                          {mode.badge}
                        </span>
                      </div>
                    )}

                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {mode.title}
                    </h3>

                    <p className="text-gray-600 mb-4">
                      {mode.description}
                    </p>

                    <div className="space-y-2">
                      {mode.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          </div>
                          <span className="text-sm text-gray-700">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {mode.id === 'solo' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-4 text-purple-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-4 h-4 mr-2" />
                            How does this work?
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Solo Mode - How It Works</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-purple-50 rounded-xl p-4">
                              <p className="font-semibold text-gray-900 mb-2">
                                Perfect for being thoughtful without the app
                              </p>
                              <p className="text-sm text-gray-700">
                                Your partner never needs to know you're using Amora.
                                You'll get personalized suggestions for dates, gifts, and
                                thoughtful gestures based on what you tell us about them.
                              </p>
                            </div>

                            <div className="bg-green-50 rounded-xl p-4">
                              <p className="font-semibold text-gray-900 mb-2">
                                Optional: Get even better suggestions
                              </p>
                              <p className="text-sm text-gray-700 mb-2">
                                You can send your partner a quick "relationship quiz"
                                (they'll never know it's connected to an app). Their answers
                                will help us give you hyper-personalized ideas.
                              </p>
                              <p className="text-xs text-gray-600 italic">
                                Frame it as: "Found this fun quiz, want to try it?"
                              </p>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4">
                              <p className="font-semibold text-gray-900 mb-2">
                                What you'll get
                              </p>
                              <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Date ideas they'll actually love</li>
                                <li>• Gift suggestions based on their tastes</li>
                                <li>• Conversation starters and questions</li>
                                <li>• Reminders to be thoughtful</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Long Distance Toggle */}
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card
              className={`cursor-pointer transition-all ${
                isLongDistance ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => setIsLongDistance(!isLongDistance)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Plane className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      We're in a long-distance relationship
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get virtual date ideas, async activities, and countdown features
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isLongDistance
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {isLongDistance && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Continue Button */}
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Button
              onClick={handleContinue}
              className="h-14 px-8 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-xl text-lg font-semibold shadow-lg"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
