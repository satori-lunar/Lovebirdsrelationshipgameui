import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Plus, Calendar, Edit, Trash2, X, Cake, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { relationshipService } from '../services/relationshipService';
import { importantDatesService, ImportantDate } from '../services/importantDatesService';
import { PhotoUpload } from './PhotoUpload';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

interface RelationshipTrackerProps {
  onBack: () => void;
  partnerName: string;
}

export function RelationshipTracker({ onBack, partnerName }: RelationshipTrackerProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null);
  const [showAnniversaryDialog, setShowAnniversaryDialog] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<'anniversary' | 'birthday' | 'custom'>('custom');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('📅 RelationshipTracker: relationship =', relationship);
    if (relationship) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [relationship]);

  const loadData = async () => {
    if (!relationship) {
      console.log('📅 RelationshipTracker: No relationship found');
      setIsLoading(false);
      return;
    }

    console.log('📅 RelationshipTracker: Loading data for relationship', relationship.id);
    setIsLoading(true);
    try {
      // Get anniversary date from relationship
      console.log('📅 Anniversary date from DB:', relationship.relationship_start_date);
      setAnniversaryDate(relationship.relationship_start_date || null);

      // Get all important dates
      const dates = await importantDatesService.getDatesForRelationship(relationship.id);
      console.log('📅 Loaded important dates:', dates);
      setImportantDates(dates);
    } catch (error) {
      console.error('📅 Error loading dates:', error);
      toast.error('Failed to load dates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnniversary = async () => {
    if (!user || !formDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      await relationshipService.updateRelationshipStartDate(user.id, formDate);
      setAnniversaryDate(formDate);
      setShowAnniversaryDialog(false);
      toast.success('Anniversary date saved!');
    } catch (error) {
      console.error('Error saving anniversary:', error);
      toast.error('Failed to save anniversary');
    }
  };

  const handleAddDate = async () => {
    if (!user || !relationship || !formTitle || !formDate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await importantDatesService.createDate(
        relationship.id,
        user.id,
        formTitle,
        formDate,
        formType,
        formRecurring,
        formPhotoUrl
      );
      await loadData();
      resetForm();
      setShowAddDialog(false);
      toast.success('Special date added!');
    } catch (error) {
      console.error('Error adding date:', error);
      toast.error('Failed to add date');
    }
  };

  const handleEditDate = async () => {
    if (!editingDate || !formTitle || !formDate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await importantDatesService.updateDate(editingDate.id, {
        title: formTitle,
        date: formDate,
        type: formType,
        recurring: formRecurring,
        photo_url: formPhotoUrl,
      });
      await loadData();
      resetForm();
      setShowEditDialog(false);
      setEditingDate(null);
      toast.success('Date updated!');
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    if (!confirm('Are you sure you want to delete this date?')) return;

    try {
      await importantDatesService.deleteDate(dateId);
      await loadData();
      toast.success('Date deleted');
    } catch (error) {
      console.error('Error deleting date:', error);
      toast.error('Failed to delete date');
    }
  };

  const openEditDialog = (date: ImportantDate) => {
    setEditingDate(date);
    setFormTitle(date.title);
    setFormDate(date.date);
    setFormType(date.type);
    setFormRecurring(date.recurring);
    setFormPhotoUrl(date.photo_url);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDate('');
    setFormType('custom');
    setFormRecurring(true);
    setFormPhotoUrl(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anniversary':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'birthday':
        return <Cake className="w-5 h-5 text-purple-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'anniversary':
        return 'from-red-400 to-pink-400';
      case 'birthday':
        return 'from-purple-400 to-pink-400';
      default:
        return 'from-blue-400 to-cyan-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="font-['Lora',serif] text-[24px] text-white">Relationship Tracker</h1>
            <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/90">
              Track your special moments together
            </p>
          </div>
        </div>
      </div>

      {!relationship && !isLoading ? (
        <div className="px-6 py-12 text-center">
          <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-gray-600 mb-2">
            No relationship found
          </p>
          <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-500">
            Please set up your relationship first
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF2D55]"></div>
        </div>
      ) : (
        <div className="px-6 py-6 max-w-2xl mx-auto">
          {/* Anniversary Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/60 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </div>
                <div>
                  <h2 className="font-['Lora',serif] text-[20px] text-[#2c2c2c]">Our Anniversary</h2>
                  {anniversaryDate ? (
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-600">
                      {new Date(anniversaryDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  ) : (
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-500 italic">
                      Not set yet
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  setFormDate(anniversaryDate || '');
                  setShowAnniversaryDialog(true);
                }}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {anniversaryDate ? 'Edit' : 'Set'}
              </Button>
            </div>
            {anniversaryDate && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-4">
                <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] font-semibold mb-1">
                  Together for {importantDatesService.formatDuration(importantDatesService.daysSince(anniversaryDate))}
                </p>
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-600">
                  {importantDatesService.daysSince(anniversaryDate)} days and counting! ❤️
                </p>
              </div>
            )}
          </div>

          {/* Special Dates Section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Lora',serif] text-[22px] text-[#2c2c2c]">Special Dates</h2>
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="gap-2 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white"
            >
              <Plus className="w-4 h-4" />
              Add Date
            </Button>
          </div>

          {importantDates.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 shadow-lg border border-white/60 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-gray-600 mb-2">
                No special dates yet
              </p>
              <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-500">
                Add birthdays, anniversaries, or other important dates
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {importantDates.map((date) => {
                const daysUntil = importantDatesService.daysUntil(date.date);
                const isPast = daysUntil < 0;
                const isToday = daysUntil === 0;

                return (
                  <div
                    key={date.id}
                    className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 shadow-lg border border-white/60"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTypeColor(date.type)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        {getTypeIcon(date.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c] mb-1">
                          {date.title}
                        </h3>
                        <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-600 mb-2">
                          {new Date(date.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        {!isPast && (
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            isToday
                              ? 'bg-green-100 text-green-700'
                              : daysUntil <= 7
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isToday ? 'Today! 🎉' : `In ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}
                          </div>
                        )}
                        {date.recurring && (
                          <span className="ml-2 text-xs text-gray-500">🔄 Recurring</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => openEditDialog(date)}
                          variant="ghost"
                          size="sm"
                          className="p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteDate(date.id)}
                          variant="ghost"
                          size="sm"
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Anniversary Dialog */}
      {showAnniversaryDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Lora',serif] text-[20px] text-[#2c2c2c]">
                Set Anniversary Date
              </h3>
              <button
                onClick={() => setShowAnniversaryDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Anniversary Date
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowAnniversaryDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAnniversary}
                  className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Date Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Lora',serif] text-[20px] text-[#2c2c2c]">
                Add Special Date
              </h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Title
                </Label>
                <Input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., First Date, Engagement"
                  className="w-full"
                />
              </div>

              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Date
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Type
                </Label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2D55]"
                >
                  <option value="custom">Custom</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="birthday">Birthday</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px]">
                  Recurring yearly
                </Label>
                <Switch checked={formRecurring} onCheckedChange={setFormRecurring} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowAddDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDate}
                  className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white"
                >
                  Add Date
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Date Dialog */}
      {showEditDialog && editingDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Lora',serif] text-[20px] text-[#2c2c2c]">
                Edit Date
              </h3>
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingDate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Title
                </Label>
                <Input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., First Date, Engagement"
                  className="w-full"
                />
              </div>

              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Date
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px] mb-2 block">
                  Type
                </Label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2D55]"
                >
                  <option value="custom">Custom</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="birthday">Birthday</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <Label className="font-['Nunito_Sans',sans-serif] text-[14px]">
                  Recurring yearly
                </Label>
                <Switch checked={formRecurring} onCheckedChange={setFormRecurring} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingDate(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditDate}
                  className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
