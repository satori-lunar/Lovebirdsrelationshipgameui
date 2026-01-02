import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, Coffee, Music, Gift, MessageCircle, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { api } from '../services/api';

export default function PartnerInsightsForm() {
  // Get token and couple ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const coupleId = urlParams.get('couple');

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    favorite_things: [],
    love_languages: {
      words_of_affirmation: 3,
      acts_of_service: 3,
      receiving_gifts: 3,
      quality_time: 3,
      physical_touch: 3
    },
    hobbies: '',
    favorite_foods: '',
    music_preferences: '',
    ideal_dates: '',
    appreciation_methods: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLoveLanguageChange = (language, value) => {
    setFormData(prev => ({
      ...prev,
      love_languages: {
        ...prev.love_languages,
        [language]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!token || !coupleId) {
      alert('Invalid form link. Please check the URL and try again.');
      return;
    }

    setLoading(true);
    try {
      // Create partner form response
      const { error: responseError } = await api.supabase
        .from('partner_form_responses')
        .insert({
          couple_id: coupleId,
          form_token: token,
          display_name: formData.display_name,
          love_languages: formData.love_languages,
          hobbies: formData.hobbies.split(',').map(h => h.trim()).filter(Boolean),
          favorite_foods: formData.favorite_foods.split(',').map(f => f.trim()).filter(Boolean),
          music_preferences: formData.music_preferences.split(',').map(m => m.trim()).filter(Boolean),
          preferred_dates: formData.ideal_dates.split(',').map(d => d.trim()).filter(Boolean),
          appreciation_methods: formData.appreciation_methods.split(',').map(a => a.trim()).filter(Boolean),
          created_at: new Date().toISOString()
        });

      if (responseError) throw responseError;

      // Update couple record to mark form as completed
      const { error: updateError } = await api.supabase
        .from('couples')
        .update({
          partner_form_completed: true,
          partner_form_submitted_at: new Date().toISOString()
        })
        .eq('id', coupleId);

      if (updateError) throw updateError;

      console.log('Partner form response saved successfully');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                All done! 🎉
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Thanks for sharing! Your responses will help make your relationship even more special.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
              <div className="inline-block p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl mb-4">
                <Heart className="w-8 h-8 text-white" fill="white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Quick Relationship Quiz
              </h2>
              <p className="text-gray-600">
                Just 5 fun questions about your preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="display_name">What should we call you?</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="Your name or nickname"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.display_name}
              className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500"
            >
              Start Quiz
              <Sparkles className="w-5 h-5 ml-2" />
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
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                How do you like to receive love?
              </h2>
              <p className="text-sm text-gray-600">
                Rate each from 1 (not important) to 5 (very important)
              </p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'words_of_affirmation', label: 'Words & Compliments', icon: MessageCircle },
                { key: 'acts_of_service', label: 'Helpful Actions', icon: Heart },
                { key: 'receiving_gifts', label: 'Thoughtful Gifts', icon: Gift },
                { key: 'quality_time', label: 'Quality Time Together', icon: Coffee },
                { key: 'physical_touch', label: 'Physical Affection', icon: Heart }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <Label className="mb-0">{label}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleLoveLanguageChange(key, value)}
                        className={`w-10 h-10 rounded-full border-2 font-medium transition-all ${
                          formData.love_languages[key] === value
                            ? 'bg-purple-500 border-purple-500 text-white scale-110'
                            : 'border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tell us about your interests
              </h2>
              <p className="text-sm text-gray-600">
                Separate each with a comma
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="hobbies">Your Hobbies</Label>
                <Textarea
                  id="hobbies"
                  value={formData.hobbies}
                  onChange={(e) => handleInputChange('hobbies', e.target.value)}
                  placeholder="e.g., reading, hiking, painting"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="favorite_foods">Favorite Foods</Label>
                <Textarea
                  id="favorite_foods"
                  value={formData.favorite_foods}
                  onChange={(e) => handleInputChange('favorite_foods', e.target.value)}
                  placeholder="e.g., Italian, sushi, chocolate"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="music_preferences">Music You Love</Label>
                <Textarea
                  id="music_preferences"
                  value={formData.music_preferences}
                  onChange={(e) => handleInputChange('music_preferences', e.target.value)}
                  placeholder="e.g., indie, jazz, pop"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                Next
              </Button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl mb-4">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Last couple questions!
              </h2>
              <p className="text-sm text-gray-600">
                Help us understand what makes you happy
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="ideal_dates">Your Ideal Date Ideas</Label>
                <Textarea
                  id="ideal_dates"
                  value={formData.ideal_dates}
                  onChange={(e) => handleInputChange('ideal_dates', e.target.value)}
                  placeholder="e.g., coffee shop hangouts, outdoor adventures, movie nights"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="appreciation_methods">What makes you feel appreciated?</Label>
                <Textarea
                  id="appreciation_methods"
                  value={formData.appreciation_methods}
                  onChange={(e) => handleInputChange('appreciation_methods', e.target.value)}
                  placeholder="e.g., handwritten notes, small surprises, quality time"
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(3)}
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
                {loading ? 'Submitting...' : 'Submit'}
                <Check className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className={`h-2 rounded-full transition-all ${
                num === step
                  ? 'w-12 bg-gradient-to-r from-rose-500 to-pink-500'
                  : num < step
                  ? 'w-8 bg-rose-300'
                  : 'w-8 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {renderStep()}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Your responses are private and will only be used to create a better experience
        </p>
      </div>
    </div>
  );
}
