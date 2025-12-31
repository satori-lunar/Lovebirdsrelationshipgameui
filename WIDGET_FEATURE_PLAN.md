# Lovebirds Mobile Widget Feature - Implementation Plan

## Executive Summary

This plan outlines how to add a **Memories Photo Widget** to iOS and Android home screens for the Lovebirds app. Users will be able to display their favorite relationship memories with photos directly on their phone's home screen.

**MVP Focus**: Memories Widget with photo, date, and note display.
**Premium Status**: Free for all users.

---

## Current State

| Aspect | Current Status |
|--------|----------------|
| Framework | React 18 + Vite (Web App) |
| Backend | Supabase (PostgreSQL) |
| Mobile Support | Responsive web only |
| Native Code | None |
| Memories Feature | Fully implemented with photo storage |

### Existing Memories Data Structure

```typescript
// From src/app/types/database.ts
memories: {
  id: string;
  relationship_id: string;
  user_id: string;
  title: string;                    // Short title (required)
  photo_url: string | null;         // Supabase CDN URL
  journal_entry: string | null;     // The "nice note"
  memory_date: string;              // When memory happened
  category: 'date_night' | 'milestone' | 'trip' | ... | null;
  tags: string[];
  is_private: boolean;
}
```

**Key Insight**: `photo_url` is already a public Supabase CDN URL - perfect for widgets!

---

## Recommended Approach: Capacitor

Wrap the existing React app in Capacitor to enable native widgets while keeping all existing code.

---

## MVP Widget: Memories Photo Widget

### Widget Design

**Sizes**: Small (2x2), Medium (4x2), Large (4x4)

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │         [PHOTO]                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│   Our trip to Paris                 │
│   "The best croissants ever! 🥐"   │
│   June 15, 2024                     │
└─────────────────────────────────────┘
```

**Content Displayed**:
- **Photo**: Full-bleed or rounded corner image
- **Title**: Memory title (e.g., "Our trip to Paris")
- **Note**: Journal entry excerpt (the "nice little note")
- **Date**: Formatted memory_date

**Behavior**:
- Rotates through user-selected memories (daily or on each view)
- Tap opens app to that specific memory
- Only shows memories WITH photos

---

## In-App Widget Gallery

### Feature: Widget Gallery Section

A new section in the app where users configure their widget:

```
┌─────────────────────────────────────┐
│  Widget Gallery                     │
│─────────────────────────────────────│
│                                     │
│  Select memories for your widget:   │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ✓   │ │     │ │ ✓   │ │     │   │
│  │photo│ │photo│ │photo│ │photo│   │
│  │     │ │     │ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  Paris    Beach   Anniv   Picnic    │
│                                     │
│  Selected: 2 of 5 max               │
│                                     │
│  Preview:                           │
│  ┌─────────────────────────────┐    │
│  │  [Widget Preview]           │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Save to Widget]                   │
│                                     │
│  ℹ️ Add widget from home screen    │
│     after saving                    │
└─────────────────────────────────────┘
```

**Features**:
- Grid of memories with photos only (filters out text-only memories)
- Tap to select/deselect (max 5 for rotation)
- Live preview of widget appearance
- Instructions for adding widget to home screen
- Widget rotates through selected memories

---

## Technical Implementation Plan

### Phase 1: Capacitor Setup

#### Step 1.1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init "Lovebirds" "com.lovebirds.app"
```

#### Step 1.2: Configure Capacitor
Create `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovebirds.app',
  appName: 'Lovebirds',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

#### Step 1.3: Add Native Platforms
```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

#### Step 1.4: Configure App Groups (iOS) for Widget Data Sharing
- Enable App Groups capability in Xcode
- Create shared container: `group.com.lovebirds.app`

### Phase 2: Widget Data Service & Types

#### Step 2.1: Create Widget Data Types
File: `src/app/types/widget.ts`

```typescript
export interface MemoryWidgetData {
  id: string;
  photoUrl: string;           // Supabase CDN URL
  title: string;              // Memory title
  note: string | null;        // Journal entry (the "nice little note")
  date: string;               // Formatted memory_date
  category: string | null;    // For potential styling
}

export interface WidgetConfiguration {
  selectedMemoryIds: string[];    // IDs of memories user selected
  currentIndex: number;           // Which memory is currently displayed
  lastRotated: string;            // ISO date of last rotation
  rotationMode: 'daily' | 'tap';  // How often to rotate
}

export interface WidgetBundle {
  memories: MemoryWidgetData[];   // Array of selected memories
  config: WidgetConfiguration;
  lastUpdated: string;
}
```

#### Step 2.2: Create Widget Data Service
File: `src/app/services/widgetService.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../lib/supabase';
import type { MemoryWidgetData, WidgetBundle, WidgetConfiguration } from '../types/widget';

const WIDGET_DATA_KEY = 'lovebirds_widget_data';
const WIDGET_CONFIG_KEY = 'lovebirds_widget_config';

export const widgetService = {
  // Fetch memories with photos for widget gallery
  async getWidgetReadyMemories(relationshipId: string, userId: string): Promise<MemoryWidgetData[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('id, photo_url, title, journal_entry, memory_date, category')
      .eq('relationship_id', relationshipId)
      .not('photo_url', 'is', null)        // Only memories WITH photos
      .or(`is_private.eq.false,user_id.eq.${userId}`)  // Respect privacy
      .order('memory_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(memory => ({
      id: memory.id,
      photoUrl: memory.photo_url!,
      title: memory.title,
      note: memory.journal_entry,
      date: this.formatDate(memory.memory_date),
      category: memory.category
    }));
  },

  // Save user's widget configuration
  async saveWidgetConfig(config: WidgetConfiguration): Promise<void> {
    await Preferences.set({
      key: WIDGET_CONFIG_KEY,
      value: JSON.stringify(config)
    });
  },

  // Get current widget configuration
  async getWidgetConfig(): Promise<WidgetConfiguration | null> {
    const { value } = await Preferences.get({ key: WIDGET_CONFIG_KEY });
    return value ? JSON.parse(value) : null;
  },

  // Sync selected memories to native widget storage
  async syncToWidget(
    selectedIds: string[],
    allMemories: MemoryWidgetData[]
  ): Promise<void> {
    const selectedMemories = allMemories.filter(m => selectedIds.includes(m.id));

    const bundle: WidgetBundle = {
      memories: selectedMemories,
      config: {
        selectedMemoryIds: selectedIds,
        currentIndex: 0,
        lastRotated: new Date().toISOString(),
        rotationMode: 'daily'
      },
      lastUpdated: new Date().toISOString()
    };

    await Preferences.set({
      key: WIDGET_DATA_KEY,
      value: JSON.stringify(bundle)
    });

    // Trigger native widget refresh
    await this.notifyWidgetRefresh();
  },

  // Trigger platform-specific widget refresh
  async notifyWidgetRefresh(): Promise<void> {
    // Will be implemented with Capacitor plugin
    // iOS: WidgetCenter.shared.reloadAllTimelines()
    // Android: AppWidgetManager.notifyAppWidgetViewDataChanged()
  },

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      ...(isThisYear ? {} : { year: 'numeric' })
    });
  }
};
```

#### Step 2.3: Create Widget Gallery Hook
File: `src/app/hooks/useWidgetGallery.ts`

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetService } from '../services/widgetService';
import type { MemoryWidgetData, WidgetConfiguration } from '../types/widget';

export function useWidgetGallery(relationshipId: string, userId: string) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch all memories with photos
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['widget-memories', relationshipId],
    queryFn: () => widgetService.getWidgetReadyMemories(relationshipId, userId),
    enabled: !!relationshipId && !!userId
  });

  // Load saved configuration
  useEffect(() => {
    widgetService.getWidgetConfig().then(config => {
      if (config) {
        setSelectedIds(config.selectedMemoryIds);
      }
    });
  }, []);

  // Toggle memory selection (max 5)
  const toggleMemory = (memoryId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(memoryId)) {
        return prev.filter(id => id !== memoryId);
      }
      if (prev.length >= 5) {
        return prev; // Max 5 selected
      }
      return [...prev, memoryId];
    });
  };

  // Save to widget
  const saveToWidget = useMutation({
    mutationFn: async () => {
      await widgetService.syncToWidget(selectedIds, memories);
      await widgetService.saveWidgetConfig({
        selectedMemoryIds: selectedIds,
        currentIndex: 0,
        lastRotated: new Date().toISOString(),
        rotationMode: 'daily'
      });
    }
  });

  return {
    memories,
    isLoading,
    selectedIds,
    toggleMemory,
    saveToWidget: saveToWidget.mutate,
    isSaving: saveToWidget.isPending,
    canSave: selectedIds.length > 0
  };
}
```

---

### Phase 3: Widget Gallery UI Component

File: `src/app/components/WidgetGallery.tsx`

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Image, Info, Smartphone } from 'lucide-react';
import { useWidgetGallery } from '../hooks/useWidgetGallery';
import { Button } from './ui/button';

interface WidgetGalleryProps {
  relationshipId: string;
  userId: string;
  onBack: () => void;
}

export function WidgetGallery({ relationshipId, userId, onBack }: WidgetGalleryProps) {
  const {
    memories,
    isLoading,
    selectedIds,
    toggleMemory,
    saveToWidget,
    isSaving,
    canSave
  } = useWidgetGallery(relationshipId, userId);

  const selectedMemory = memories.find(m => selectedIds.includes(m.id));

  if (isLoading) {
    return <div className="p-6 text-center">Loading memories...</div>;
  }

  if (memories.length === 0) {
    return (
      <div className="p-6 text-center">
        <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="font-semibold mb-2">No Photo Memories Yet</h3>
        <p className="text-gray-500 text-sm">
          Add some memories with photos to use the widget!
        </p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Widget Gallery</h2>
        <p className="text-gray-500 text-sm">
          Select up to 5 memories for your home screen widget
        </p>
      </div>

      {/* Memory Grid */}
      <div className="grid grid-cols-3 gap-2">
        {memories.map(memory => {
          const isSelected = selectedIds.includes(memory.id);
          return (
            <motion.button
              key={memory.id}
              onClick={() => toggleMemory(memory.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                isSelected ? 'border-pink-500 ring-2 ring-pink-200' : 'border-transparent'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={memory.photoUrl}
                alt={memory.title}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute top-1 right-1 bg-pink-500 rounded-full p-1">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-1">
                <p className="text-white text-xs truncate">{memory.title}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selection Count */}
      <div className="text-center text-sm text-gray-500">
        Selected: {selectedIds.length} of 5 max
      </div>

      {/* Widget Preview */}
      {selectedMemory && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Preview</h3>
          <div className="bg-gray-100 rounded-2xl p-3 max-w-[200px] mx-auto shadow-lg">
            <div className="aspect-square rounded-xl overflow-hidden mb-2">
              <img
                src={selectedMemory.photoUrl}
                alt={selectedMemory.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-medium text-sm truncate">{selectedMemory.title}</p>
            {selectedMemory.note && (
              <p className="text-xs text-gray-600 line-clamp-2">"{selectedMemory.note}"</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{selectedMemory.date}</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={() => saveToWidget()}
        disabled={!canSave || isSaving}
        className="w-full"
      >
        {isSaving ? 'Saving...' : 'Save to Widget'}
      </Button>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-3 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How to add the widget:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1 text-blue-700">
            <li>Save your selection above</li>
            <li>Go to your home screen</li>
            <li>Long press → Add Widget</li>
            <li>Find "Lovebirds" and add it</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4: iOS Widget Extension

#### Step 4.1: Create Widget Extension in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode
2. File → New → Target → Widget Extension
3. Name: `LovebirdsMemoryWidget`
4. Enable "Include Configuration Intent" (optional for MVP)

#### Step 4.2: iOS Widget Implementation (Swift)
File: `ios/App/LovebirdsMemoryWidget/MemoryWidget.swift`

```swift
import WidgetKit
import SwiftUI

// MARK: - Data Models
struct MemoryData: Codable {
    let id: String
    let photoUrl: String
    let title: String
    let note: String?
    let date: String
}

struct WidgetBundle: Codable {
    let memories: [MemoryData]
    let lastUpdated: String
}

// MARK: - Timeline Provider
struct MemoryProvider: TimelineProvider {
    func placeholder(in context: Context) -> MemoryEntry {
        MemoryEntry(date: Date(), memory: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MemoryEntry) -> Void) {
        let memory = loadCurrentMemory()
        completion(MemoryEntry(date: Date(), memory: memory))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MemoryEntry>) -> Void) {
        let memory = loadCurrentMemory()
        let entry = MemoryEntry(date: Date(), memory: memory)

        // Refresh daily at midnight
        let tomorrow = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }

    private func loadCurrentMemory() -> MemoryData {
        let defaults = UserDefaults(suiteName: "group.com.lovebirds.app")
        guard let jsonString = defaults?.string(forKey: "lovebirds_widget_data"),
              let data = jsonString.data(using: .utf8),
              let bundle = try? JSONDecoder().decode(WidgetBundle.self, from: data),
              !bundle.memories.isEmpty
        else {
            return .placeholder
        }

        // Rotate based on day of year
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 0
        let index = dayOfYear % bundle.memories.count
        return bundle.memories[index]
    }
}

struct MemoryEntry: TimelineEntry {
    let date: Date
    let memory: MemoryData
}

extension MemoryData {
    static let placeholder = MemoryData(
        id: "placeholder",
        photoUrl: "",
        title: "Your Memories",
        note: "Select memories in the app",
        date: "Add photos to get started"
    )
}

// MARK: - Widget Views
struct MemoryWidgetEntryView: View {
    var entry: MemoryEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallMemoryView(memory: entry.memory)
        case .systemMedium:
            MediumMemoryView(memory: entry.memory)
        case .systemLarge:
            LargeMemoryView(memory: entry.memory)
        default:
            SmallMemoryView(memory: entry.memory)
        }
    }
}

struct SmallMemoryView: View {
    let memory: MemoryData

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                // Photo
                AsyncImage(url: URL(string: memory.photoUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(width: geo.size.width, height: geo.size.height)

                // Gradient overlay
                LinearGradient(
                    colors: [.clear, .black.opacity(0.7)],
                    startPoint: .center,
                    endPoint: .bottom
                )

                // Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(memory.title)
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text(memory.date)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(URL(string: "lovebirds://memory/\(memory.id)"))
    }
}

struct MediumMemoryView: View {
    let memory: MemoryData

    var body: some View {
        HStack(spacing: 12) {
            // Photo
            AsyncImage(url: URL(string: memory.photoUrl)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(width: 140, height: 140)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(memory.title)
                    .font(.headline)
                    .lineLimit(2)

                if let note = memory.note, !note.isEmpty {
                    Text("\"\(note)\"")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                        .italic()
                }

                Spacer()

                Text(memory.date)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 8)

            Spacer()
        }
        .padding(8)
        .widgetURL(URL(string: "lovebirds://memory/\(memory.id)"))
    }
}

struct LargeMemoryView: View {
    let memory: MemoryData

    var body: some View {
        VStack(spacing: 0) {
            // Large photo
            AsyncImage(url: URL(string: memory.photoUrl)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.3)
            }
            .frame(height: 220)
            .clipped()

            // Content
            VStack(alignment: .leading, spacing: 6) {
                Text(memory.title)
                    .font(.headline)

                if let note = memory.note, !note.isEmpty {
                    Text("\"\(note)\"")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .italic()
                }

                Spacer()

                HStack {
                    Text(memory.date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Image(systemName: "heart.fill")
                        .foregroundColor(.pink)
                        .font(.caption)
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "lovebirds://memory/\(memory.id)"))
    }
}

// MARK: - Widget Configuration
@main
struct LovebirdsMemoryWidget: Widget {
    let kind: String = "LovebirdsMemoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MemoryProvider()) { entry in
            MemoryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Memories")
        .description("Display your favorite relationship memories")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

---

### Phase 5: Android Widget Implementation

#### Step 5.1: Create Widget Provider
File: `android/app/src/main/java/com/lovebirds/app/widgets/MemoryWidgetProvider.kt`

```kotlin
package com.lovebirds.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.widget.RemoteViews
import com.bumptech.glide.Glide
import com.lovebirds.app.MainActivity
import com.lovebirds.app.R
import kotlinx.coroutines.*
import org.json.JSONObject

class MemoryWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            CoroutineScope(Dispatchers.IO).launch {
                val memory = loadCurrentMemory(context)
                val views = RemoteViews(context.packageName, R.layout.widget_memory)

                // Load image with Glide
                try {
                    val bitmap: Bitmap = Glide.with(context)
                        .asBitmap()
                        .load(memory.photoUrl)
                        .submit(400, 400)
                        .get()
                    views.setImageViewBitmap(R.id.memory_image, bitmap)
                } catch (e: Exception) {
                    // Use placeholder
                }

                // Set text
                views.setTextViewText(R.id.memory_title, memory.title)
                views.setTextViewText(R.id.memory_note, memory.note ?: "")
                views.setTextViewText(R.id.memory_date, memory.date)

                // Click intent to open app
                val intent = Intent(context, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = android.net.Uri.parse("lovebirds://memory/${memory.id}")
                }
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

                withContext(Dispatchers.Main) {
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }
        }

        private fun loadCurrentMemory(context: Context): MemoryData {
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val json = prefs.getString("lovebirds_widget_data", null)

            return try {
                val bundle = JSONObject(json ?: "{}")
                val memories = bundle.getJSONArray("memories")
                if (memories.length() == 0) return MemoryData.placeholder

                // Rotate based on day of year
                val dayOfYear = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_YEAR)
                val index = dayOfYear % memories.length()
                val memory = memories.getJSONObject(index)

                MemoryData(
                    id = memory.getString("id"),
                    photoUrl = memory.getString("photoUrl"),
                    title = memory.getString("title"),
                    note = memory.optString("note", null),
                    date = memory.getString("date")
                )
            } catch (e: Exception) {
                MemoryData.placeholder
            }
        }
    }
}

data class MemoryData(
    val id: String,
    val photoUrl: String,
    val title: String,
    val note: String?,
    val date: String
) {
    companion object {
        val placeholder = MemoryData(
            id = "placeholder",
            photoUrl = "",
            title = "Your Memories",
            note = "Select memories in the app",
            date = "Add photos to get started"
        )
    }
}
```

#### Step 5.2: Widget Layout XML
File: `android/app/src/main/res/layout/widget_memory.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background">

    <ImageView
        android:id="@+id/memory_image"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scaleType="centerCrop"
        android:contentDescription="Memory photo"/>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom"
        android:orientation="vertical"
        android:padding="12dp"
        android:background="@drawable/gradient_overlay">

        <TextView
            android:id="@+id/memory_title"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textColor="@android:color/white"
            android:textSize="14sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end"/>

        <TextView
            android:id="@+id/memory_note"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textColor="#CCFFFFFF"
            android:textSize="12sp"
            android:maxLines="2"
            android:ellipsize="end"
            android:layout_marginTop="2dp"/>

        <TextView
            android:id="@+id/memory_date"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textColor="#AAFFFFFF"
            android:textSize="10sp"
            android:layout_marginTop="4dp"/>

    </LinearLayout>

</FrameLayout>
```

#### Step 5.3: Register Widget in AndroidManifest.xml
```xml
<receiver
    android:name=".widgets.MemoryWidgetProvider"
    android:exported="true"
    android:label="Lovebirds Memories">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/memory_widget_info"/>
</receiver>
```

---

### Phase 6: Deep Links for Widget Taps

File: `src/app/utils/deepLinks.ts`

```typescript
import { App } from '@capacitor/app';

export function setupDeepLinks(navigate: (view: string, params?: any) => void) {
  App.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url);

    // Handle memory deep link: lovebirds://memory/{id}
    if (parsed.pathname.startsWith('/memory/')) {
      const memoryId = parsed.pathname.split('/')[2];
      navigate('memories', { openMemoryId: memoryId });
    }
  });
}
```

---

### Phase 7: Testing & Polish

#### Test Matrix
| Feature | iOS Small | iOS Medium | iOS Large | Android 4x1 | Android 4x2 |
|---------|-----------|------------|-----------|-------------|-------------|
| Photo Display | ✓ | ✓ | ✓ | ✓ | ✓ |
| Title | ✓ | ✓ | ✓ | ✓ | ✓ |
| Note | - | ✓ | ✓ | ✓ | ✓ |
| Date | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tap to Open | ✓ | ✓ | ✓ | ✓ | ✓ |
| Daily Rotation | ✓ | ✓ | ✓ | ✓ | ✓ |

#### Edge Cases to Handle
- [ ] User not logged in → Show placeholder with "Open app to set up"
- [ ] No memories with photos → Show prompt to add photos
- [ ] Photo URL expired/broken → Show fallback image
- [ ] Network offline → Use cached image if available
- [ ] Very long title/note → Truncate gracefully

---

## File Structure After Implementation

```
Lovebirdsrelationshipgameui/
├── src/
│   └── app/
│       ├── components/
│       │   └── WidgetGallery.tsx     # NEW: In-app widget configuration
│       ├── hooks/
│       │   └── useWidgetGallery.ts   # NEW: Widget gallery hook
│       ├── services/
│       │   └── widgetService.ts      # NEW: Widget data service
│       ├── types/
│       │   └── widget.ts             # NEW: Widget type definitions
│       └── utils/
│           └── deepLinks.ts          # NEW: Deep link handler
├── ios/
│   └── App/
│       └── LovebirdsMemoryWidget/    # NEW: iOS widget extension
│           └── MemoryWidget.swift
├── android/
│   └── app/
│       └── src/main/
│           ├── java/.../widgets/
│           │   └── MemoryWidgetProvider.kt
│           └── res/
│               ├── layout/widget_memory.xml
│               ├── drawable/widget_background.xml
│               └── xml/memory_widget_info.xml
└── capacitor.config.ts               # NEW: Capacitor config
```

---

## Implementation Summary

| Phase | Deliverable |
|-------|-------------|
| 1. Capacitor Setup | Mobile app shell with native platforms |
| 2. Widget Data Service | TypeScript service + types for widget data |
| 3. Widget Gallery UI | In-app component for selecting memories |
| 4. iOS Widget | WidgetKit extension with 3 sizes |
| 5. Android Widget | AppWidget with photo display |
| 6. Deep Links | Tap-to-open memory functionality |
| 7. Testing | Cross-platform QA and edge cases |

---

## Ready to Implement!

This MVP plan focuses on:
- **One widget type**: Memories with photos
- **In-app configuration**: Widget Gallery for selecting memories
- **Display-only**: No interactive buttons (MVP simplicity)
- **Free for all users**: Not premium-gated

Let me know when you're ready to start implementation!
