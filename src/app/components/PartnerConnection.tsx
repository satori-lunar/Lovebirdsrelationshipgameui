import { useState } from 'react';
import { Users, Link2, Copy, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useRelationship } from '../hooks/useRelationship';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface PartnerConnectionProps {
  partnerName: string;
}

export function PartnerConnection({ partnerName }: PartnerConnectionProps) {
  const { user } = useAuth();
  const { relationship, isLoading, createRelationship, connectPartner, isCreating, isConnecting } = useRelationship();
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = !!relationship?.partner_b_id;
  const currentInviteCode = relationship?.invite_code;

  const handleCreateInvite = async () => {
    try {
      await createRelationship();
      setShowInviteDialog(true);
      toast.success('Invite code generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invite code');
    }
  };

  const handleConnect = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    try {
      await connectPartner(inviteCode.trim().toUpperCase());
      setShowConnectDialog(false);
      setInviteCode('');
      toast.success('Successfully connected!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect. Please check your invite code.');
    }
  };

  const handleCopyInviteCode = () => {
    if (currentInviteCode) {
      navigator.clipboard.writeText(currentInviteCode);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
        <div className="flex items-center gap-3">
          <Users className="w-10 h-10 text-white/90 animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Loading...</p>
            <p className="text-xs text-white/80">Checking connection status</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center border-2 border-white/50">
                <span className="text-base">{partnerName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <p className="font-semibold text-sm">{partnerName}</p>
              <p className="text-xs text-white/80">Connected</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show invite or connect options
  if (!relationship) {
    return (
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
        <div className="flex items-center gap-3">
          <Users className="w-10 h-10 text-white/90" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Invite {partnerName}</p>
            <p className="text-xs text-white/80">Connect to unlock all features together</p>
          </div>
          <Button 
            size="sm"
            className="bg-white text-purple-600 hover:bg-white/90 text-xs"
            onClick={handleCreateInvite}
            disabled={isCreating}
          >
            <Link2 className="w-3 h-3 mr-1" />
            {isCreating ? 'Creating...' : 'Invite'}
          </Button>
        </div>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Your Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-gray-600">
                Share this code with {partnerName} so they can connect with you:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={currentInviteCode || ''}
                  readOnly
                  className="text-2xl font-mono text-center tracking-widest"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInviteCode}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                This code expires in 24 hours. Once {partnerName} uses it, you'll be connected!
              </p>
              <Button
                onClick={() => setShowInviteDialog(false)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Has relationship but not connected - show connect option
  return (
    <>
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
        <div className="flex items-center gap-3">
          <Users className="w-10 h-10 text-white/90" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Waiting for {partnerName}</p>
            <p className="text-xs text-white/80">Share your invite code or enter theirs</p>
          </div>
          <Button 
            size="sm"
            className="bg-white text-purple-600 hover:bg-white/90 text-xs"
            onClick={() => setShowConnectDialog(true)}
          >
            Connect
          </Button>
        </div>
      </div>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Invite Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Enter the invite code that {partnerName} shared with you:
              </p>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="text-2xl font-mono text-center tracking-widest"
                maxLength={8}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConnectDialog(false);
                  setInviteCode('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!inviteCode.trim() || isConnecting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

