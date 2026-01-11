import { useState } from 'react';
import { ChevronLeft, Bell, Users, Link2, Copy, Check, Mail, MessageSquare, LogOut, Trash2, AlertTriangle, Smartphone, ChevronRight, Edit3, Heart, Calendar, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { authService } from '../services/authService';
import { onboardingService } from '../services/onboardingService';
import { relationshipService } from '../services/relationshipService';
import { toast } from 'sonner';
import { PartnerConnection } from './PartnerConnection';

interface SettingsProps {
  onBack: () => void;
  partnerName: string;
  onNavigate?: (page: string) => void;
  onPartnerNameUpdate?: () => void;
}

export function Settings({ onBack, partnerName, onNavigate, onPartnerNameUpdate }: SettingsProps) {
  const { user, signOut } = useAuth();
  const { relationship } = useRelationship();

  const [notificationSettings, setNotificationSettings] = useState({
    weeklyLoveLanguage: true,
    dailyQuestions: true,
    upcomingDates: true,
    partnerActivity: false,
  });

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showPartnerNameDialog, setShowPartnerNameDialog] = useState(false);
  const [editingPartnerName, setEditingPartnerName] = useState(partnerName);
  const [isUpdatingPartnerName, setIsUpdatingPartnerName] = useState(false);
  const [showAnniversaryDialog, setShowAnniversaryDialog] = useState(false);
  const [editingAnniversaryDate, setEditingAnniversaryDate] = useState(
    relationship?.relationship_start_date
      ? new Date(relationship.relationship_start_date).toISOString().split('T')[0]
      : ''
  );
  const [isUpdatingAnniversary, setIsUpdatingAnniversary] = useState(false);

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      setShowLogoutDialog(false);
      // The auth context will handle redirecting to login
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const handleDeleteData = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    setIsDeleting(true);
    try {
      await authService.deleteUserData(user.id);
      toast.success('Your data has been deleted');
      // Sign out the user after deleting data
      await signOut();
    } catch (error) {
      console.error('Delete data error:', error);
      toast.error('Failed to delete data. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    }
  };

  const handleUpdatePartnerName = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (!editingPartnerName.trim()) {
      toast.error('Partner name cannot be empty');
      return;
    }

    setIsUpdatingPartnerName(true);
    try {
      await onboardingService.updateOnboarding(user.id, {
        partnerName: editingPartnerName.trim(),
      });
      toast.success('Partner name updated successfully');
      setShowPartnerNameDialog(false);
      onPartnerNameUpdate?.();
    } catch (error) {
      console.error('Update partner name error:', error);
      toast.error('Failed to update partner name');
    } finally {
      setIsUpdatingPartnerName(false);
    }
  };

  const handleUpdateAnniversaryDate = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (!editingAnniversaryDate) {
      toast.error('Please select an anniversary date');
      return;
    }

    setIsUpdatingAnniversary(true);
    try {
      await relationshipService.updateRelationshipStartDate(user.id, editingAnniversaryDate);
      toast.success('Anniversary date updated successfully');
      setShowAnniversaryDialog(false);
      // Refresh relationship data
      window.location.reload();
    } catch (error) {
      console.error('Update anniversary date error:', error);
      toast.error('Failed to update anniversary date');
    } finally {
      setIsUpdatingAnniversary(false);
    }
  };

  const handleRetakeLoveLanguageQuiz = () => {
    if (onNavigate) {
      // Navigate to a love language quiz page
      onNavigate('love-language-quiz');
    }
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
          
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-white/90 text-sm mt-1">
            Manage your notifications and connections
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-6">
        {/* Partner Connection */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="font-semibold text-lg">Partner Connection</h2>
          </div>

          <PartnerConnection partnerName={partnerName} variant="settings" />

          {/* Partner Name Edit */}
          <div className="border-t pt-4">
            <Button
              onClick={() => {
                setEditingPartnerName(partnerName);
                setShowPartnerNameDialog(true);
              }}
              variant="outline"
              className="w-full flex items-center justify-between h-12"
            >
              <span className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit Partner Name
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-gray-600 mt-2">
              Current: {partnerName}
            </p>
          </div>
        </Card>

        {/* Relationship Settings */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="font-semibold text-lg">Relationship Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Anniversary Date */}
            <div className="border-b border-gray-100 pb-4">
              <Button
                onClick={() => {
                  setEditingAnniversaryDate(
                    relationship?.relationship_start_date
                      ? new Date(relationship.relationship_start_date).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0]
                  );
                  setShowAnniversaryDialog(true);
                }}
                variant="outline"
                className="w-full flex items-center justify-between h-12"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Anniversary Date
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-gray-600 mt-2">
                Current: {relationship?.relationship_start_date
                  ? new Date(relationship.relationship_start_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not set'
                }
              </p>
            </div>

            {/* Retake Love Language Quiz */}
            <div>
              <Button
                onClick={handleRetakeLoveLanguageQuiz}
                variant="outline"
                className="w-full flex items-center justify-between h-12"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retake Love Language Quiz
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-gray-600 mt-2">
                Discover your love language again or update your preferences
              </p>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="font-semibold text-lg">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="weekly" className="font-semibold text-sm cursor-pointer">
                  Weekly Love Language Ideas
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Every Monday at 9:00 AM
                </p>
              </div>
              <Switch 
                id="weekly"
                checked={notificationSettings.weeklyLoveLanguage}
                onCheckedChange={() => toggleNotification('weeklyLoveLanguage')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="daily" className="font-semibold text-sm cursor-pointer">
                  Daily Question Reminders
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Every day at 8:00 PM
                </p>
              </div>
              <Switch 
                id="daily"
                checked={notificationSettings.dailyQuestions}
                onCheckedChange={() => toggleNotification('dailyQuestions')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1 pr-4">
                <Label htmlFor="dates" className="font-semibold text-sm cursor-pointer">
                  Upcoming Important Dates
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  1 week before, 3 days before, and day of
                </p>
              </div>
              <Switch 
                id="dates"
                checked={notificationSettings.upcomingDates}
                onCheckedChange={() => toggleNotification('upcomingDates')}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1 pr-4">
                <Label htmlFor="partner" className="font-semibold text-sm cursor-pointer">
                  Partner Activity
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  When {partnerName} completes a daily question
                </p>
              </div>
              <Switch 
                id="partner"
                checked={notificationSettings.partnerActivity}
                onCheckedChange={() => toggleNotification('partnerActivity')}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
            <p className="text-xs text-gray-700">
              🔔 Don't worry - we keep notifications gentle and helpful, never annoying
            </p>
          </div>
        </Card>

        {/* Lockscreen Gifts */}
        {onNavigate && (
          <Card className="p-6 border-0 shadow-lg bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-lg">Lockscreen Gifts 🎁</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Design and gift beautiful lockscreen wallpapers to your partner
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => onNavigate('create-lockscreen-gift')}
                variant="outline"
                className="w-full flex items-center justify-between h-12"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Create a Gift
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => onNavigate('view-lockscreen-gift')}
                variant="ghost"
                className="w-full flex items-center justify-between h-10"
              >
                <span className="flex items-center gap-2 text-sm">
                  View Your Gifts
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Account Actions */}
        <Card className="p-6 border-0 shadow-lg bg-white">
          <h2 className="font-semibold text-lg mb-4 text-gray-900">Account</h2>

          <div className="space-y-3">
            <Button
              onClick={() => setShowLogoutDialog(true)}
              variant="outline"
              className="w-full flex items-center justify-start gap-3 h-12"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
              <span>Log Out</span>
            </Button>

            <div className="border-t pt-3">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="w-full flex items-center justify-start gap-3 h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete My Data</span>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                This will permanently delete all your data and cannot be undone.
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy Note */}
        <Card className="p-6 border-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">🔒 Your Privacy Matters</h3>
            <p className="text-xs text-gray-700">
              All your answers and reflections are private by default. You control what you share with {partnerName}.
            </p>
          </div>
        </Card>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Name Dialog */}
      <Dialog open={showPartnerNameDialog} onOpenChange={setShowPartnerNameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Partner Name</DialogTitle>
            <DialogDescription>
              Update your partner's name as it appears throughout the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partnerName">Partner's Name</Label>
              <Input
                id="partnerName"
                value={editingPartnerName}
                onChange={(e) => setEditingPartnerName(e.target.value)}
                placeholder="Enter partner's name"
                className="h-12"
                disabled={isUpdatingPartnerName}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPartnerNameDialog(false)}
              disabled={isUpdatingPartnerName}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePartnerName}
              disabled={isUpdatingPartnerName || !editingPartnerName.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              {isUpdatingPartnerName ? 'Updating...' : 'Update Name'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Data Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-red-600">Delete All Data</DialogTitle>
              </div>
            </div>
            <DialogDescription className="space-y-3">
              <p>
                This action <strong>cannot be undone</strong>. This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All your memories and photos</li>
                <li>Your daily questions and answers</li>
                <li>Your onboarding responses</li>
                <li>Your love language suggestions</li>
                <li>Your date ideas and matches</li>
                <li>Your important dates and reminders</li>
                <li>Your account and profile information</li>
              </ul>
              <div className="bg-red-50 p-3 rounded-lg mt-4">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Type "DELETE" to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isDeleting}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmation('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteData}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Anniversary Date Dialog */}
      <Dialog open={showAnniversaryDialog} onOpenChange={setShowAnniversaryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Anniversary Date</DialogTitle>
            <DialogDescription>
              Update the start date of your relationship. This helps us personalize your experience with milestone celebrations and reminders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="anniversaryDate">Anniversary Date</Label>
              <Input
                id="anniversaryDate"
                type="date"
                value={editingAnniversaryDate}
                onChange={(e) => setEditingAnniversaryDate(e.target.value)}
                className="h-12"
                disabled={isUpdatingAnniversary}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAnniversaryDialog(false)}
              disabled={isUpdatingAnniversary}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAnniversaryDate}
              disabled={isUpdatingAnniversary || !editingAnniversaryDate}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              {isUpdatingAnniversary ? 'Updating...' : 'Update Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
