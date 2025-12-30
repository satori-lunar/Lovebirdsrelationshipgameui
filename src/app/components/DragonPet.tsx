import { useState } from 'react';
import { ChevronLeft, Heart, Sparkles, Package, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useDragon, usePartnerDragon } from '../hooks/useDragon';
import { useDragonInventory } from '../hooks/useDragonInventory';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { DragonVisualization } from './dragon/DragonVisualization';
import { toast } from 'sonner';

interface DragonPetProps {
  onBack: () => void;
}

export function DragonPet({ onBack }: DragonPetProps) {
  const { dragon, isLoading, xpProgress, feedDragon, playWithDragon, isFeeding, isPlaying } = useDragon();
  const { inventory, getItemsByType } = useDragonInventory();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();
  const { partnerDragon } = usePartnerDragon(partnerId);

  const [activeTab, setActiveTab] = useState<'my-dragon' | 'partner' | 'inventory'>('my-dragon');

  if (isLoading || !dragon) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dragon...</p>
        </div>
      </div>
    );
  }

  const getStageLabel = (stage: string) => {
    const labels = {
      egg: '🥚 Egg',
      hatchling: '🐣 Hatchling',
      young: '🐉 Young Dragon',
      teen: '🔥 Teen Dragon',
      adult: '👑 Adult Dragon',
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getStatColor = (value: number) => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleFeed = () => {
    const foodItems = getItemsByType('food');
    if (foodItems.length === 0) {
      toast.error('No food items in inventory!');
      return;
    }

    // Use the first available food item
    feedDragon(foodItems[0].item_id);
    toast.success('Fed your dragon! 🍎');
  };

  const handlePlay = () => {
    const toyItems = getItemsByType('toy');

    if (toyItems.length > 0) {
      // Use a toy
      playWithDragon(toyItems[0].item_id);
      toast.success('Played with your dragon! 🎾');
    } else {
      // Play without toy
      playWithDragon();
      toast.success('Played with your dragon!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 mb-6 hover:opacity-80">
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">{dragon.name}</h1>
                <p className="text-white/90 text-sm">{getStageLabel(dragon.stage)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my-dragon')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'my-dragon'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Heart className="w-4 h-4 inline mr-2" />
            My Dragon
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'partner'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Partner
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Items
          </button>
        </div>

        {/* My Dragon Tab */}
        {activeTab === 'my-dragon' && (
          <div className="space-y-4">
            {/* Dragon visualization */}
            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex justify-center mb-4">
                <DragonVisualization
                  stage={dragon.stage as any}
                  color={dragon.color}
                  size={200}
                  accessories={dragon.accessories as string[]}
                />
              </div>
            </Card>

            {/* Stats */}
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4">Stats</h3>

              {/* XP Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Experience</span>
                  <span>{dragon.experience} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                    style={{ width: `${xpProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {xpProgress.progress}% to next stage
                </p>
              </div>

              {/* Hunger */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>🍎 Hunger</span>
                  <span>{dragon.hunger}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatColor(dragon.hunger)}`}
                    style={{ width: `${dragon.hunger}%` }}
                  />
                </div>
              </div>

              {/* Happiness */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>😊 Happiness</span>
                  <span>{dragon.happiness}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatColor(dragon.happiness)}`}
                    style={{ width: `${dragon.happiness}%` }}
                  />
                </div>
              </div>

              {/* Health */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>❤️ Health</span>
                  <span>{dragon.health}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatColor(dragon.health)}`}
                    style={{ width: `${dragon.health}%` }}
                  />
                </div>
              </div>

              {/* Bond Level */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>💕 Bond</span>
                  <span>{dragon.bond_level}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-pink-500"
                    style={{ width: `${dragon.bond_level}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleFeed}
                  disabled={isFeeding || dragon.hunger >= 95}
                  className="bg-green-500 hover:bg-green-600"
                >
                  🍎 Feed
                </Button>
                <Button
                  onClick={handlePlay}
                  disabled={isPlaying || dragon.happiness >= 95}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  🎾 Play
                </Button>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-4 border-0 shadow-lg bg-purple-50">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> Complete relationship activities to earn XP and help your dragon grow!
              </p>
            </Card>
          </div>
        )}

        {/* Partner's Dragon Tab */}
        {activeTab === 'partner' && (
          <div className="space-y-4">
            {partnerDragon ? (
              <>
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-pink-50 to-purple-50">
                  <h3 className="font-semibold mb-4 text-center">
                    {partnerName}'s Dragon
                  </h3>
                  <div className="flex justify-center mb-4">
                    <DragonVisualization
                      stage={partnerDragon.stage as any}
                      color={partnerDragon.color}
                      size={200}
                      accessories={partnerDragon.accessories as string[]}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{partnerDragon.name}</p>
                    <p className="text-sm text-gray-600">{getStageLabel(partnerDragon.stage)}</p>
                  </div>
                </Card>

                <Card className="p-5 border-0 shadow-lg">
                  <h3 className="font-semibold mb-4">Partner Interactions</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Send gifts and interact with {partnerName}'s dragon!
                  </p>
                  <Button disabled className="w-full" variant="outline">
                    Coming Soon: Send Gift
                  </Button>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center border-0 shadow-lg">
                <p className="text-gray-500">
                  {partnerName} doesn't have a dragon yet!
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4">Inventory</h3>

              {inventory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No items yet! Complete activities to earn items.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-lg text-center border-2 border-gray-200"
                    >
                      <div className="text-2xl mb-1">
                        {item.item_type === 'food' && '🍎'}
                        {item.item_type === 'treat' && '🍪'}
                        {item.item_type === 'toy' && '🎾'}
                        {item.item_type === 'accessory' && '👑'}
                      </div>
                      <p className="text-xs font-medium capitalize">
                        {item.item_id.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 border-0 shadow-lg bg-pink-50">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> Use food to restore hunger and toys to increase happiness and bond!
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
