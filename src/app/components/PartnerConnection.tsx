import { useState } from 'react';
import { Users, Link2, Copy, Check, X, Share2, Mail, MessageCircle, Facebook, Twitter, UserMinus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { useRelationship } from '../hooks/useRelationship';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface PartnerConnectionProps {
  partnerName: string;
  variant?: 'home' | 'settings'; // 'home' for glassmorphic style, 'settings' for plain
}

export function PartnerConnection({ partnerName, variant = 'home' }: PartnerConnectionProps) {
  const { user } = useAuth();
  const { relationship, isLoading, createRelationship, connectPartner, disconnectPartner, isCreating, isConnecting, isDisconnecting } = useRelationship();
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = !!relationship?.partner_b_id;
  const hasRelationship = !!relationship;
  const currentInviteCode = relationship?.invite_code;

  // Different styling based on variant
  const cardClass = variant === 'settings'
    ? 'bg-white rounded-xl p-4 border border-gray-200'
    : 'bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30';

  const handleCreateInvite = async () => {
    try {
      console.log('🎯 Creating invite...');
      const result = await createRelationship();
      console.log('✅ Invite created:', result);

      // Small delay to ensure query has refreshed
      await new Promise(resolve => setTimeout(resolve, 500));

      setShowInviteDialog(true);
      toast.success('Invite code generated! Share it with your partner.');
    } catch (error: any) {
      console.error('❌ Failed to create invite:', error);
      toast.error(error.message || 'Failed to create invite code');
    }
  };

  const handleConnect = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    try {
      console.log('🔗 Connecting with code:', inviteCode.trim().toUpperCase());
      await connectPartner(inviteCode.trim().toUpperCase());
      console.log('✅ Connected successfully!');
      setShowConnectDialog(false);
      setInviteCode('');
      toast.success('Successfully connected!');
    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      toast.error(error.message || 'Failed to connect. Please check your invite code.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPartner();
      setShowDisconnectDialog(false);
      toast.success('Successfully disconnected from partner');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
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

  const getShareMessage = () => {
    return `Hey! Let's connect on Amora 💕\n\nUse my invite code: ${currentInviteCode}\n\nIt expires in 24 hours!`;
  };

  const handleNativeShare = async () => {
    if (!currentInviteCode) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Amora',
          text: getShareMessage(),
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled or share failed
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      handleCopyInviteCode();
    }
  };

  const handleShareViaEmail = () => {
    if (!currentInviteCode) return;
    const subject = encodeURIComponent('Join me on Amora 💕');
    const body = encodeURIComponent(getShareMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareViaSMS = () => {
    if (!currentInviteCode) return;
    const message = encodeURIComponent(getShareMessage());
    // iOS and Android compatible SMS link
    window.open(`sms:?body=${message}`, '_blank');
  };

  const handleShareViaWhatsApp = () => {
    if (!currentInviteCode) return;
    const message = encodeURIComponent(getShareMessage());
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareViaFacebook = () => {
    if (!currentInviteCode) return;
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(getShareMessage())}`, '_blank');
  };

  const handleShareViaTwitter = () => {
    if (!currentInviteCode) return;
    const text = encodeURIComponent(getShareMessage());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Users className={`w-10 h-10 ${variant === 'settings' ? 'text-gray-400' : 'text-white/90'} animate-pulse`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm mb-1 ${variant === 'settings' ? 'text-gray-900' : 'text-white'}`}>Loading...</p>
            <p className={`text-xs ${variant === 'settings' ? 'text-gray-500' : 'text-white/80'}`}>Checking connection status</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <>
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  variant === 'settings'
                    ? 'bg-green-100 border-green-200'
                    : 'bg-white/30 border-white/50'
                }`}>
                  <span className={`text-base ${variant === 'settings' ? 'text-green-700' : 'text-white'}`}>
                    {partnerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p className={`font-semibold text-sm ${variant === 'settings' ? 'text-gray-900' : 'text-white'}`}>{partnerName}</p>
                <p className={`text-xs ${variant === 'settings' ? 'text-green-600' : 'text-white/80'}`}>✓ Connected</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={variant === 'settings' ? 'outline' : 'ghost'}
              className={`text-xs ${variant === 'settings' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-white/80 hover:text-white'}`}
              onClick={() => setShowDisconnectDialog(true)}
            >
              <UserMinus className="w-3 h-3 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>

        <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Disconnect from {partnerName}?</DialogTitle>
              <DialogDescription className="pt-2">
                This will remove your connection with {partnerName}. You'll both need to create new invite codes to reconnect.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Your data and memories will not be deleted. You can reconnect at any time by sharing a new invite code.
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(false)}
                disabled={isDisconnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Not connected - show invite or connect options
  if (!relationship) {
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Users className={`w-10 h-10 ${variant === 'settings' ? 'text-purple-600' : 'text-white/90'}`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm mb-1 ${variant === 'settings' ? 'text-gray-900' : 'text-white'}`}>Invite {partnerName}</p>
            <p className={`text-xs ${variant === 'settings' ? 'text-gray-600' : 'text-white/80'}`}>Connect to unlock all features together</p>
          </div>
          <Button
            size="sm"
            className={variant === 'settings'
              ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600 text-xs'
              : 'bg-white text-purple-600 hover:bg-white/90 text-xs'}
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
              <DialogTitle>Share Your Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Share this code with {partnerName} so they can connect with you:
                </p>
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <p className="text-xs text-gray-600 mb-2 text-center font-medium">Your Invite Code</p>
                  {!currentInviteCode ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentInviteCode}
                        readOnly
                        className="text-3xl font-mono text-center tracking-widest font-bold bg-white/80"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyInviteCode}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {currentInviteCode && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Share via:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleShareViaSMS}
                      className="flex items-center gap-2 justify-start"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Messages</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareViaEmail}
                      className="flex items-center gap-2 justify-start"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareViaWhatsApp}
                      className="flex items-center gap-2 justify-start"
                    >
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span>WhatsApp</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareViaFacebook}
                      className="flex items-center gap-2 justify-start"
                    >
                      <Facebook className="w-4 h-4 text-blue-600" />
                      <span>Facebook</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareViaTwitter}
                      className="flex items-center gap-2 justify-start"
                    >
                      <Twitter className="w-4 h-4 text-sky-500" />
                      <span>Twitter</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNativeShare}
                      className="flex items-center gap-2 justify-start"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>More...</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This code expires in 24 hours. Once {partnerName} uses it, you'll be connected!
                </p>
              </div>

              {currentInviteCode && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Or have your partner enter their code:</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInviteDialog(false);
                      setShowConnectDialog(true);
                    }}
                    className="w-full"
                  >
                    Enter {partnerName}'s Code
                  </Button>
                </div>
              )}

              <Button
                onClick={() => setShowInviteDialog(false)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Has relationship but not connected - show invite code and connect option
  return (
    <>
      <div className={`${cardClass} space-y-3`}>
        <div className="flex items-center gap-3">
          <Users className={`w-10 h-10 ${variant === 'settings' ? 'text-purple-600' : 'text-white/90'}`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm mb-1 ${variant === 'settings' ? 'text-gray-900' : 'text-white'}`}>
              Waiting for {partnerName}
            </p>
            <p className={`text-xs ${variant === 'settings' ? 'text-gray-600' : 'text-white/80'}`}>
              Share your code or enter theirs
            </p>
          </div>
        </div>

        {currentInviteCode && (
          <div className={variant === 'settings' ? 'bg-purple-50 rounded-xl p-3 space-y-2 border border-purple-100' : 'bg-white/30 rounded-xl p-3 space-y-2'}>
            <p className={`text-xs mb-2 font-medium ${variant === 'settings' ? 'text-purple-700' : 'text-white/90'}`}>
              Your Invite Code:
            </p>
            <div className="flex items-center gap-2">
              <div className={`flex-1 rounded-lg px-3 py-2 ${variant === 'settings' ? 'bg-white border border-purple-200' : 'bg-white/50'}`}>
                <p className="text-xl font-mono font-bold text-center tracking-widest text-gray-800">
                  {currentInviteCode}
                </p>
              </div>
              <Button
                size="icon"
                variant="secondary"
                className={variant === 'settings' ? 'bg-white border border-purple-200 hover:bg-purple-50 shrink-0' : 'bg-white/80 hover:bg-white shrink-0'}
                onClick={handleCopyInviteCode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleShareViaSMS}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                SMS
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleShareViaEmail}
              >
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setShowInviteDialog(true)}
              >
                <Share2 className="w-3 h-3 mr-1" />
                More
              </Button>
            </div>
          </div>
        )}

        <Button
          size="sm"
          className={`w-full text-xs ${
            variant === 'settings'
              ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600'
              : 'bg-white text-purple-600 hover:bg-white/90'
          }`}
          onClick={() => setShowConnectDialog(true)}
        >
          Enter {partnerName}'s Code
        </Button>
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

