import { DragonVisualization } from './dragon/DragonVisualization';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface DragonEvolutionDemoProps {
  onBack: () => void;
}

export function DragonEvolutionDemo({ onBack }: DragonEvolutionDemoProps) {
  const stages = [
    { stage: 'egg' as const, label: '🥚 Egg', xp: '0 XP', description: 'Your journey begins...' },
    { stage: 'hatchling' as const, label: '🐣 Hatchling', xp: '100 XP', description: 'Tiny and adorable!' },
    { stage: 'young' as const, label: '🐉 Young Dragon', xp: '400 XP', description: 'Learning to fly' },
    { stage: 'teen' as const, label: '🔥 Teen Dragon', xp: '1000 XP', description: 'Growing stronger' },
    { stage: 'adult' as const, label: '👑 Adult Dragon', xp: '2000 XP', description: 'Majestic & powerful!' },
  ];

  const colors = ['purple', 'red', 'blue', 'green', 'gold', 'pink'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 pb-12 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Dragon Evolution Stages</h1>
            <p className="text-white/90 text-lg">
              Watch your dragon grow from egg to majestic adult!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 pb-12">
        {/* Evolution Timeline */}
        <Card className="p-8 mb-8 bg-white shadow-2xl border-4 border-purple-200">
          <h2 className="text-2xl font-bold text-center mb-8 text-purple-800">
            Evolution Timeline (Purple Dragon)
          </h2>
          <div className="grid grid-cols-5 gap-6">
            {stages.map((stage, index) => (
              <div key={stage.stage} className="relative">
                {/* Connector arrow */}
                {index < stages.length - 1 && (
                  <div className="absolute top-24 -right-3 text-3xl text-purple-400 z-10">
                    →
                  </div>
                )}

                <div className="flex flex-col items-center">
                  <div className="mb-3">
                    <DragonVisualization
                      stage={stage.stage}
                      color="purple"
                      size={180}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">{stage.label}</h3>
                    <p className="text-sm text-purple-600 font-semibold mb-1">{stage.xp}</p>
                    <p className="text-xs text-gray-600">{stage.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Color Variations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-purple-800">
            Color Variations
          </h2>

          {colors.map((color) => (
            <Card key={color} className="p-6 bg-white shadow-lg border-2 border-purple-100">
              <h3 className="text-xl font-bold mb-4 capitalize text-center">
                {color} Dragon Evolution
              </h3>
              <div className="flex justify-around items-center gap-4">
                {stages.map((stage) => (
                  <div key={`${color}-${stage.stage}`} className="text-center">
                    <DragonVisualization
                      stage={stage.stage}
                      color={color}
                      size={140}
                    />
                    <p className="text-xs text-gray-600 mt-2">{stage.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* XP Requirements */}
        <Card className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 border-4 border-purple-300 mt-8">
          <h3 className="text-xl font-bold mb-4 text-purple-800">
            How to Evolve Your Dragon
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-purple-700 mb-2">XP Requirements:</h4>
              <ul className="space-y-1 text-sm">
                <li>🥚 Egg → Hatchling: <strong>100 XP</strong></li>
                <li>🐣 Hatchling → Young: <strong>400 XP total</strong> (+300)</li>
                <li>🐉 Young → Teen: <strong>1000 XP total</strong> (+600)</li>
                <li>🔥 Teen → Adult: <strong>2000 XP total</strong> (+1000)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-700 mb-2">Earn XP By:</h4>
              <ul className="space-y-1 text-sm">
                <li>💬 Answering daily questions: <strong>+10 XP</strong></li>
                <li>🤔 Guessing partner's answer: <strong>+15 XP</strong></li>
                <li>💌 Sending love messages: <strong>+5 XP</strong></li>
                <li>🙏 Completing partner requests: <strong>+20 XP</strong></li>
                <li>📝 Saving memories & more!</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="text-center mt-8">
          <Button
            onClick={onBack}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
