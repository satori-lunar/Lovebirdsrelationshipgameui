import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createPageUrl } from '@/utils';

export default function PartnerFormInvite({ couple }) {
  const [copied, setCopied] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const generateFormToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getFormLink = () => {
    const token = couple.partner_form_token || generateFormToken();
    return `${window.location.origin}${createPageUrl('PartnerInsightsForm')}?token=${token}&couple=${couple.id}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getFormLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const link = getFormLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Quick Relationship Quiz 💕',
          text: "Hey! I found this fun relationship quiz. Want to take it?",
          url: link
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (couple.partner_form_completed) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Partner Insights Collected</p>
            <p className="text-sm text-gray-600">You'll get more personalized suggestions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 cursor-pointer hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Get Better Suggestions</p>
                <p className="text-sm text-gray-600">Optional partner insights</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Learn More
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner Insights (Optional)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            Share a quick quiz with your partner to get hyper-personalized date ideas and thoughtful prompts.
          </p>

          <div className="bg-purple-50 rounded-xl p-4 space-y-2">
            <p className="font-medium text-gray-900">What they'll do:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Answer 5 quick questions</li>
              <li>Share preferences and interests</li>
              <li>No account or app required</li>
            </ul>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
            <p className="font-medium text-gray-900">What you'll get:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Date ideas they'll actually love</li>
              <li>Gift suggestions based on their tastes</li>
              <li>Personalized thoughtful prompts</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={shareLink}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Quiz
            </Button>
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Frame it as: "Found this fun quiz about relationships — wanna try it?"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
