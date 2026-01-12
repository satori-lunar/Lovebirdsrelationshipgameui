import { useState } from 'react';
import { ChevronLeft, Plus, X, RotateCw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface DecisionSpinnerProps {
  onBack: () => void;
  partnerName: string;
}

export function DecisionSpinner({ onBack, partnerName }: DecisionSpinnerProps) {
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2', 'Option 3']);
  const [newOption, setNewOption] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAddOption = () => {
    if (newOption.trim() && options.length < 10) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSpin = () => {
    if (isSpinning || options.length < 2) return;

    setIsSpinning(true);
    setSelectedOption(null);
    let spins = 0;
    const totalSpins = 20 + Math.floor(Math.random() * 10);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % options.length);
      spins++;

      if (spins >= totalSpins) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * options.length);
        setCurrentIndex(finalIndex);
        setSelectedOption(options[finalIndex]);
        setIsSpinning(false);
      }
    }, 100);
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <RotateCw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl">Decision Spinner</h1>
              <p className="text-white/90 text-sm">
                Can't decide? Let fate choose for you!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-6">
        {/* Spinner Display */}
        <Card className="p-8 border-0 shadow-2xl bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full opacity-30 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full opacity-30 -ml-16 -mb-16" />

          <div className="relative text-center">
            <motion.div
              key={selectedOption || currentIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`min-h-[200px] flex items-center justify-center mb-6 rounded-2xl p-8 ${
                selectedOption
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-400'
                  : 'bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-gray-200'
              }`}
            >
              <div>
                {selectedOption && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="mb-4"
                  >
                    <Sparkles className="w-12 h-12 mx-auto text-green-600" />
                  </motion.div>
                )}
                <h2 className={`font-bold ${
                  selectedOption ? 'text-3xl text-green-800' : 'text-2xl text-gray-800'
                }`}>
                  {isSpinning ? options[currentIndex] : selectedOption || 'Tap spin to decide!'}
                </h2>
                {selectedOption && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-green-700 mt-2 font-medium"
                  >
                    🎉 Here's your choice!
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSpin}
                disabled={isSpinning || options.length < 2}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-5 h-5 mr-2" />
                    Spin to Decide!
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </Card>

        {/* Options List */}
        <Card className="p-6 border-0 shadow-xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900">Your Options</h3>
            <span className="text-sm text-gray-500">{options.length}/10</span>
          </div>

          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                    <span className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-800"
                      placeholder="Enter option..."
                    />
                  </div>
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add New Option */}
          {options.length < 10 && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                placeholder="Add a new option..."
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddOption}
                disabled={!newOption.trim()}
                className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
          <p className="text-sm text-center text-gray-600">
            💡 Perfect for deciding where to eat, what movie to watch, or what activity to do with {partnerName}!
          </p>
        </Card>
      </div>
    </div>
  );
}
