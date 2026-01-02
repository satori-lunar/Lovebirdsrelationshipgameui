import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Camera, MessageCircle, Music, BookOpen, Gift, Coffee, Star } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const asyncDateIdeas = [
  {
    id: 1,
    title: "Voice Note Exchange",
    description: "Send each other 5-minute voice notes about your day, dreams, or favorite memories together.",
    icon: Mic,
    category: "voice",
    prompts: [
      "Describe your perfect day together",
      "Share a childhood memory",
      "Tell them about your biggest dream",
      "Describe what you love most about them"
    ]
  },
  {
    id: 2,
    title: "Photo Story Challenge",
    description: "Each day for a week, send a photo that represents something: your mood, your favorite place, what reminds you of them.",
    icon: Camera,
    category: "photo",
    prompts: [
      "A place that reminds you of them",
      "Something that made you smile today",
      "Your current view",
      "A color that matches your mood"
    ]
  },
  {
    id: 3,
    title: "Question Exchange",
    description: "Take turns sending each other deep questions throughout the day. Answer whenever you can.",
    icon: MessageCircle,
    category: "questions",
    prompts: [
      "What's something you've never told me?",
      "What does home feel like to you?",
      "What are you most proud of?",
      "What's a fear you want to overcome?"
    ]
  },
  {
    id: 4,
    title: "Shared Playlist",
    description: "Create a collaborative playlist. Each add songs that remind you of each other or your relationship.",
    icon: Music,
    category: "music",
    prompts: [
      "Song from when we met",
      "Song that makes you think of me",
      "Song for our future",
      "Song that describes us"
    ]
  },
  {
    id: 5,
    title: "Book or Article Exchange",
    description: "Share interesting articles, poems, or book passages. Discuss what resonated with you.",
    icon: BookOpen,
    category: "reading",
    prompts: [
      "A quote that made you think of us",
      "An article about something you care about",
      "A poem that moved you",
      "A story you want to share"
    ]
  },
  {
    id: 6,
    title: "Daily Gratitude",
    description: "Every evening, send a message about one thing you're grateful for about them or your relationship.",
    icon: Star,
    category: "gratitude",
    prompts: [
      "Something they did that touched you",
      "A quality you admire in them",
      "A memory you're grateful for",
      "How they've helped you grow"
    ]
  },
  {
    id: 7,
    title: "Virtual Coffee Dates",
    description: "Schedule async 'coffee dates' - record yourselves having coffee and talking about your week.",
    icon: Coffee,
    category: "video",
    prompts: [
      "Weekend plans and wishes",
      "Wins and struggles this week",
      "Something new you learned",
      "Plans for when you're together"
    ]
  },
  {
    id: 8,
    title: "Surprise Package Planning",
    description: "Plan and send surprise care packages. Document the process and the joy of receiving.",
    icon: Gift,
    category: "gifts",
    prompts: [
      "Their favorite snacks",
      "Something from your city",
      "A handwritten letter",
      "Inside jokes as gifts"
    ]
  }
];

export default function AsyncDateIdeas() {
  const [selectedIdea, setSelectedIdea] = useState(null);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Asynchronous Date Ideas
        </h2>
        <p className="text-gray-600">
          Stay connected even when you're not online at the same time
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {asyncDateIdeas.map((idea, i) => {
          const Icon = idea.icon;
          return (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all h-full"
                onClick={() => setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {idea.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {idea.description}
                      </p>
                    </div>
                  </div>

                  {selectedIdea?.id === idea.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-gray-100"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Prompt Ideas:
                      </p>
                      <div className="space-y-2">
                        {idea.prompts.map((prompt, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{prompt}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
