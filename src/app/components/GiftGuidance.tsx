import { ChevronLeft, Gift, Heart, Sparkles, DollarSign, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GiftGuidanceProps {
  onBack: () => void;
  partnerName: string;
}

const giftCategories = [
  {
    id: 'sentimental',
    title: 'Sentimental Gifts',
    icon: Heart,
    color: 'pink',
    gifts: [
      {
        id: 1,
        title: 'Custom Photo Album',
        description: 'Create a physical photo album with your favorite memories together. Add handwritten notes on each page.',
        budget: '$$',
        effort: 'High',
        occasion: 'Anniversary, Birthday'
      },
      {
        id: 2,
        title: 'Personalized Star Map',
        description: 'A map of the night sky from a special date - your first date, when you met, or your anniversary.',
        budget: '$',
        effort: 'Low',
        occasion: 'Any occasion'
      },
      {
        id: 3,
        title: 'Love Letter Jar',
        description: 'Write 52 love letters (one for each week) and put them in a decorated jar they can open throughout the year.',
        budget: '$',
        effort: 'High',
        occasion: 'Birthday, Anniversary'
      }
    ]
  },
  {
    id: 'experience',
    title: 'Experience Gifts',
    icon: Sparkles,
    color: 'purple',
    gifts: [
      {
        id: 4,
        title: 'Couples Cooking Class',
        description: 'Book a cooking class to learn a new cuisine together. Based on their interest in cooking!',
        budget: '$$',
        effort: 'Low',
        occasion: 'Just because'
      },
      {
        id: 5,
        title: 'Weekend Getaway',
        description: 'Plan a surprise weekend trip to a nearby city or nature spot they\'ve mentioned wanting to visit.',
        budget: '$$$',
        effort: 'Medium',
        occasion: 'Anniversary, Birthday'
      },
      {
        id: 6,
        title: 'Concert or Show Tickets',
        description: 'Get tickets to see their favorite artist or a show they\'ve been talking about.',
        budget: '$$',
        effort: 'Low',
        occasion: 'Any occasion'
      }
    ]
  },
  {
    id: 'thoughtful',
    title: 'Thoughtful Everyday',
    icon: Gift,
    color: 'pink',
    gifts: [
      {
        id: 7,
        title: 'Custom Playlist',
        description: 'Curate a playlist of songs that remind you of them, your relationship, or songs they\'d love.',
        budget: 'Free',
        effort: 'Medium',
        occasion: 'Just because'
      },
      {
        id: 8,
        title: 'Their Favorite Treat Subscription',
        description: 'Set up a monthly subscription box for something they love - coffee, snacks, books, etc.',
        budget: '$$',
        effort: 'Low',
        occasion: 'Just because'
      },
      {
        id: 9,
        title: 'Homemade Care Package',
        description: 'Put together a box of things they need right now - stress relief items, comfort foods, or self-care essentials.',
        budget: '$',
        effort: 'Medium',
        occasion: 'When they need support'
      }
    ]
  }
];

export function GiftGuidance({ onBack, partnerName }: GiftGuidanceProps) {
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
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <h1 className="text-2xl">Gift Ideas</h1>
          </div>
          <p className="text-white/90 text-sm">
            Thoughtful gifts for {partnerName}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Upcoming Occasions */}
        <Card className="p-5 mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Upcoming Occasions</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
              <div>
                <p className="font-semibold text-sm">{partnerName}'s Birthday</p>
                <p className="text-xs text-gray-600">March 15, 2025</p>
              </div>
              <span className="text-xs px-2 py-1 bg-pink-200 text-pink-700 rounded-full">
                76 days
              </span>
            </div>
          </div>
        </Card>

        {/* Gift Categories */}
        <div className="space-y-8">
          {giftCategories.map((category) => {
            const IconComponent = category.icon;
            const bgColor = category.color === 'pink' ? 'bg-pink-100' : 'bg-purple-100';
            const textColor = category.color === 'pink' ? 'text-pink-600' : 'text-purple-600';
            const gradientFrom = category.color === 'pink' ? 'from-pink-500' : 'from-purple-500';
            const gradientFromHover = category.color === 'pink' ? 'from-pink-600' : 'from-purple-600';
            
            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
                    <IconComponent className={`w-4 h-4 ${textColor}`} />
                  </div>
                  <h2 className="font-semibold">{category.title}</h2>
                </div>

                <div className="space-y-4">
                  {category.gifts.map((gift) => (
                    <Card key={gift.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold flex-1">{gift.title}</h3>
                        <div className="text-sm text-gray-600 ml-2">
                          {gift.budget}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{gift.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          {gift.effort} effort
                        </span>
                        <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                          {gift.occasion}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-sm"
                        >
                          Save for Later
                        </Button>
                        <Button
                          className={`flex-1 text-sm ${gradientFrom} to-purple-500 hover:${gradientFromHover} hover:to-purple-600 text-white bg-gradient-to-r`}
                        >
                          Get Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Budget Guide */}
        <Card className="p-5 mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-0">
          <h3 className="font-semibold mb-3">Budget Guide</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Free - $</span>
              <span>Under $25</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">$$</span>
              <span>$25 - $100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">$$$</span>
              <span>$100+</span>
            </div>
          </div>
        </Card>

        {/* Personalization Note */}
        <Card className="p-5 mt-4 border-0 bg-white/50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                These suggestions are based on {partnerName}'s preferences, love language, and things they've mentioned in daily questions.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}