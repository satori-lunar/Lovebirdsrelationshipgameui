import { useState } from 'react';
import { ChevronLeft, Package, Users, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useDragon, usePartnerDragon } from '../hooks/useDragon';
import { useDragonInventory } from '../hooks/useDragonInventory';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { DragonHabitat } from './dragon/DragonHabitat';
import { DragonVisualization } from './dragon/DragonVisualization';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface DragonPetProps {
  onBack: () => void;
}

export function DragonPet({ onBack }: DragonPetProps) {
  const { dragon, isLoading, feedDragon, playWithDragon, isFeeding, isPlaying } = useDragon();
  const { inventory, getItemsByType } = useDragonInventory();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();
  const { partnerDragon } = usePartnerDragon(partnerId);

  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<'inventory' | 'partner' | null>(null);

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

  const handleFeed = () => {
    const foodItems = getItemsByType('food');
    if (foodItems.length === 0) {
      toast.error('No food items! Complete activities to earn food 🍎');
      return;
    }

    feedDragon(foodItems[0].item_id);
    toast.success('Fed your dragon! 🍎', {
      description: `+${10} hunger restored`,
    });
  };

  const handlePlay = () => {
    const toyItems = getItemsByType('toy');

    if (toyItems.length > 0) {
      playWithDragon(toyItems[0].item_id);
      toast.success('Played with your dragon! 🎾', {
        description: `+${15} happiness restored`,
      });
    } else {
      playWithDragon();
      toast.success('Played with your dragon!', {
        description: '+5 happiness restored',
      });
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100 relative">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
          <div className="text-6xl mb-4">🐉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon!</h2>
          <p className="text-gray-600 mb-4">
            We're working on making your dragon pet experience even more amazing. Check back soon for updates!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{dragon.name}</span>
            <span className="text-sm opacity-90">{getStageLabel(dragon.stage)}</span>
          </div>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Main habitat view */}
      <div className="pt-16 pb-24 px-4 max-w-md mx-auto">
        <DragonHabitat
          dragon={dragon}
          onFeedClick={handleFeed}
          onPlayClick={handlePlay}
          isFeeding={isFeeding}
          isPlaying={isPlaying}
        />
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 border-t-2 border-purple-700 p-3 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around gap-3">
          <Button
            onClick={() => {
              setMenuView('inventory');
              setShowMenu(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-white/95 hover:bg-white text-purple-700 border-2 border-white/30 shadow-lg font-semibold"
          >
            <Package className="w-4 h-4" />
            <span>Items ({inventory.length})</span>
          </Button>

          <Button
            onClick={() => {
              setMenuView('partner');
              setShowMenu(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-white/95 hover:bg-white text-pink-700 border-2 border-white/30 shadow-lg font-semibold"
          >
            <Users className="w-4 h-4" />
            <span>Partner</span>
          </Button>
        </div>
      </div>

      {/* Slide-out menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Menu panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {menuView === 'inventory' && 'Inventory'}
                    {menuView === 'partner' && `${partnerName}'s Dragon`}
                    {!menuView && 'Menu'}
                  </h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Inventory view */}
                {menuView === 'inventory' && (
                  <div className="space-y-4">
                    <Card className="p-4 bg-purple-50 border-2 border-purple-200">
                      <p className="text-sm text-gray-700">
                        💡 <strong>Tip:</strong> Earn items by completing relationship activities!
                      </p>
                    </Card>

                    {inventory.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">No items yet!</p>
                        <p className="text-sm text-gray-400">
                          Complete activities to earn food, treats, and toys
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {inventory.map((item) => (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl text-center border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="text-3xl mb-2">
                              {item.item_type === 'food' && '🍎'}
                              {item.item_type === 'treat' && '🍪'}
                              {item.item_type === 'toy' && '🎾'}
                              {item.item_type === 'accessory' && '👑'}
                            </div>
                            <p className="text-xs font-semibold capitalize text-gray-700">
                              {item.item_id.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-purple-600 font-bold mt-1">
                              x{item.quantity}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Partner dragon view */}
                {menuView === 'partner' && (
                  <div className="space-y-4">
                    {partnerDragon ? (
                      <>
                        <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200">
                          <div className="flex justify-center mb-4">
                            <DragonVisualization
                              stage={partnerDragon.stage as any}
                              color={partnerDragon.color}
                              size={150}
                              accessories={partnerDragon.accessories as string[]}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-800">{partnerDragon.name}</p>
                            <p className="text-sm text-gray-600">{getStageLabel(partnerDragon.stage)}</p>
                          </div>
                        </Card>

                        <Card className="p-4">
                          <h3 className="font-semibold mb-3">Stats</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Experience:</span>
                              <span className="font-bold">{partnerDragon.experience} XP</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bond Level:</span>
                              <span className="font-bold">{partnerDragon.bond_level}</span>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 bg-purple-50 border-2 border-purple-200">
                          <p className="text-sm text-gray-700">
                            💝 <strong>Coming Soon:</strong> Send gifts and play with {partnerName}'s dragon!
                          </p>
                        </Card>
                      </>
                    ) : (
                      <Card className="p-8 text-center">
                        <p className="text-gray-500">{partnerName} doesn't have a dragon yet!</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Default menu */}
                {!menuView && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setMenuView('inventory')}
                      className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-colors"
                    >
                      <Package className="w-5 h-5 inline mr-2" />
                      View Inventory
                    </button>

                    <button
                      onClick={() => setMenuView('partner')}
                      className="w-full p-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-colors"
                    >
                      <Users className="w-5 h-5 inline mr-2" />
                      Partner's Dragon
                    </button>

                    <Card className="p-4 bg-purple-50 border-2 border-purple-200 mt-6">
                      <h3 className="font-semibold mb-2">How to Play</h3>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• Feed your dragon to keep hunger up</li>
                        <li>• Play to keep happiness up</li>
                        <li>• Complete activities to earn XP</li>
                        <li>• Watch your dragon grow!</li>
                      </ul>
                    </Card>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
