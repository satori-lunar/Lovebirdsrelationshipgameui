import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, Calendar, Gift, MessageCircle, ArrowRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

interface SoloModeSetupProps {
  onNavigate: (view: string) => void;
}

export default function SoloModeSetup({ onNavigate }: SoloModeSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    partner_name: '',
    partner_nickname: '',
    relationship_start: '',
    partner_interests: [],
    partner_love_language: '',
    what_they_love: '',
    budget_range: 'moderate',
    location: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Create solo mode couple record
      const couple = await base44.entities.Couple.create({
        partner1_email: user.email,
        partner1_name: user.name,
        relationship_mode: 'solo',
        is_long_distance: localStorage.getItem('is_long_distance') === 'true',
        relationship_start_date: formData.relationship_start,
        location: formData.location,
        budget_preference: formData.budget_range
      });

      // Create partner profile (non-user partner)
      await base44.entities.PartnerProfile.create({
        couple_id: couple.id,
        display_name: formData.partner_name,
        nickname: formData.partner_nickname,
        is_app_user: false,
        interests: formData.partner_interests,
        love_language_primary: formData.partner_love_language,
        notes: formData.what_they_love
      });

      // Create user's own profile
      await base44.entities.PartnerProfile.create({
        couple_id: couple.id,
        user_email: user.email,
        display_name: user.name,
        is_app_user: true,
        is_profile_complete: true
      });

      onNavigate('home');
    } catch (error) {
      console.error('Error creating solo mode profile:', error);
      alert('Error setting up profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl mb-4">
                <Heart className="w-8 h-8 text-white" fill="white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Tell us about your partner
              </h2>
              <p className="text-gray-600">
                This helps us give you better suggestions (they'll never see this)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="partner_name">Partner's Name</Label>
                <Input
                  id="partner_name"
                  value={formData.partner_name}
                  onChange={(e) => handleInputChange('partner_name', e.target.value)}
                  placeholder="What do you call them?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="partner_nickname">Nickname (Optional)</Label>
                <Input
                  id="partner_nickname"
                  value={formData.partner_nickname}
                  onChange={(e) => handleInputChange('partner_nickname', e.target.value)}
                  placeholder="Babe, honey, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="relationship_start">When did you start dating?</Label>
                <Input
                  id="relationship_start"
                  type="date"
                  value={formData.relationship_start}
                  onChange={(e) => handleInputChange('relationship_start', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Your Location (City)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="For local date suggestions"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.partner_name || !formData.location}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-violet-500"
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Help us personalize
              </h2>
              <p className="text-gray-600">
                The more we know, the better your suggestions
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>What does {formData.partner_name} love?</Label>
                <Textarea
                  value={formData.what_they_love}
                  onChange={(e) => handleInputChange('what_they_love', e.target.value)}
                  placeholder="Their hobbies, favorite foods, music, activities..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This helps us suggest dates and gifts they'll actually enjoy
                </p>
              </div>

              <div>
                <Label>How do they like to receive love?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value: 'quality_time', label: 'Quality Time', icon: Calendar },
                    { value: 'words', label: 'Words', icon: MessageCircle },
                    { value: 'gifts', label: 'Gifts', icon: Gift },
                    { value: 'acts', label: 'Acts of Service', icon: Heart },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <Card
                        key={option.value}
                        className={`cursor-pointer transition-all ${
                          formData.partner_love_language === option.value
                            ? 'ring-2 ring-purple-400 bg-purple-50'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleInputChange('partner_love_language', option.value)}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                          <p className="text-sm font-medium">{option.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Typical budget for dates</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'low', label: 'Budget-Friendly', desc: 'Under $20' },
                    { value: 'moderate', label: 'Moderate', desc: '$20-$75' },
                    { value: 'high', label: 'Special', desc: '$75+' },
                  ].map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer transition-all ${
                        formData.budget_range === option.value
                          ? 'ring-2 ring-purple-400 bg-purple-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleInputChange('budget_range', option.value)}
                    >
                      <CardContent className="p-3 text-center">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-gray-600">{option.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                You're all set!
              </h2>
              <p className="text-gray-600">
                We'll start giving you thoughtful suggestions right away
              </p>
            </div>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Personalized date ideas</p>
                    <p className="text-sm text-gray-600">Based on {formData.partner_name}'s interests and your location</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Gift suggestions</p>
                    <p className="text-sm text-gray-600">Thoughtful ideas they'll actually love</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Thoughtful prompts</p>
                    <p className="text-sm text-gray-600">Daily reminders to be intentional</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">
                      Pro Tip: Get even better suggestions
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      After you finish setup, you can optionally share a quick "fun quiz"
                      with {formData.partner_name} to get hyper-personalized recommendations.
                    </p>
                    <p className="text-xs text-gray-600 italic">
                      They won't know it's connected to an app — it just looks like a fun relationship quiz!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {loading ? 'Creating...' : 'Get Started'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`h-2 rounded-full transition-all ${
                num === step
                  ? 'w-12 bg-gradient-to-r from-purple-500 to-violet-500'
                  : num < step
                  ? 'w-8 bg-purple-300'
                  : 'w-8 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
