# Lovebirds Mobile Widget Feature - Implementation Plan

## Executive Summary

This plan outlines how to add native iOS and Android home screen widgets to the Lovebirds relationship app. Since the current app is a **React web application** (not native mobile), we need to first wrap the app in a native container before implementing widgets.

---

## Current State

| Aspect | Current Status |
|--------|----------------|
| Framework | React 18 + Vite (Web App) |
| Backend | Supabase (PostgreSQL) |
| Mobile Support | Responsive web only |
| Native Code | None |

---

## Implementation Approach Options

### Option A: Capacitor (Recommended) ⭐

**Overview**: Wrap the existing React app in a native container using Capacitor, then build native widget extensions.

**Pros**:
- Reuse 100% of existing React code
- Minimal changes to current architecture
- Native widget support via extensions
- Single codebase for web + mobile

**Cons**:
- Widgets require separate native code (Swift/Kotlin)
- Slightly less native feel than pure native

**Effort**: 2-4 weeks for MVP widgets

---

### Option B: React Native Rewrite

**Overview**: Rebuild the UI in React Native while keeping the Supabase backend.

**Pros**:
- True native performance
- Better widget integration libraries
- Full native capabilities

**Cons**:
- Complete UI rewrite (6-12 weeks)
- Maintaining two codebases

**Effort**: 6-12 weeks

---

### Option C: Companion Native Apps

**Overview**: Build separate lightweight iOS/Android apps focused only on widget features.

**Pros**:
- Best widget experience
- Keep web app unchanged
- Focused feature set

**Cons**:
- Three codebases to maintain
- More complex authentication flow

**Effort**: 4-8 weeks

---

## Recommended Approach: Capacitor (Option A)

Given your existing React codebase and Supabase backend, Capacitor provides the best path forward.

---

## Widget Types to Implement

### 1. Dragon Pet Widget (Primary Widget) 🐉

**Sizes**: Small (2x2), Medium (4x2), Large (4x4)

**Content**:
- Dragon visual based on evolution stage
- Health/Happiness/Hunger bars
- Quick action buttons (Feed, Play, Care)
- Bond level indicator

**Data Source**: `dragonService.ts` → `dragons` table

**Refresh Rate**: Every 15 minutes (iOS minimum)

```
┌─────────────────────────────┐
│  🐉 Ember (Teen Dragon)     │
│  ████████░░ Health: 80%     │
│  ██████░░░░ Happy: 60%      │
│  ████░░░░░░ Hunger: 40%     │
│  [Feed] [Play] [Care]       │
└─────────────────────────────┘
```

---

### 2. Daily Question Widget 💬

**Sizes**: Small (2x2), Medium (4x2)

**Content**:
- Today's question preview
- Answer status (Pending/Answered/Revealed)
- Current streak count
- Tap to open app

**Data Source**: `useDailyQuestion` hook → `daily_questions` table

```
┌─────────────────────────────┐
│  Today's Question           │
│  "What's your favorite..."  │
│  🔥 12 day streak           │
│  Status: Waiting for you    │
└─────────────────────────────┘
```

---

### 3. Love Nudge Widget 💝

**Sizes**: Small (2x2), Medium (4x2)

**Content**:
- Today's love language suggestion
- Partner's primary love language icon
- Completion checkbox
- "New suggestion" countdown

**Data Source**: `loveNudgesService.ts`

```
┌─────────────────────────────┐
│  💝 Today's Nudge           │
│  "Send a voice message      │
│   telling them why you      │
│   love them"                │
│  [Mark Complete]            │
└─────────────────────────────┘
```

---

### 4. Partner Request Widget 💫

**Sizes**: Small (2x2)

**Content**:
- Active partner wish/request
- Days remaining
- Quick fulfill button

**Data Source**: `partner_requests` table

```
┌─────────────────────────────┐
│  💫 Partner's Wish          │
│  "Plan a movie night"       │
│  ⏰ 3 days left             │
│  [Fulfill]                  │
└─────────────────────────────┘
```

---

### 5. Important Date Countdown Widget 📅

**Sizes**: Small (2x2)

**Content**:
- Next important date (birthday, anniversary)
- Days countdown
- Date type icon

**Data Source**: `important_dates` table

```
┌─────────────────────────────┐
│  📅 Coming Up               │
│  Anniversary                │
│  🎉 14 days                 │
│  February 14th              │
└─────────────────────────────┘
```

---

### 6. Relationship Stats Widget 📊

**Sizes**: Medium (4x2)

**Content**:
- Current streak
- Total days together
- Questions answered
- Guess accuracy

**Data Source**: `useQuestionStats` hook

```
┌─────────────────────────────┐
│  📊 Your Journey Together   │
│  🔥 12 day streak           │
│  💕 247 days together       │
│  ✅ 89% guess accuracy      │
└─────────────────────────────┘
```

---

## Technical Implementation Plan

### Phase 1: Capacitor Setup (Week 1)

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
  },
  plugins: {
    // Widget-specific plugins will go here
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

---

### Phase 2: Widget Data Service (Week 1-2)

#### Step 2.1: Create Widget Data Types
File: `src/app/types/widget.ts`

```typescript
export interface DragonWidgetData {
  name: string;
  stage: 'egg' | 'hatchling' | 'young' | 'teen' | 'adult';
  health: number;
  happiness: number;
  hunger: number;
  bondLevel: number;
  lastUpdated: string;
}

export interface QuestionWidgetData {
  questionText: string;
  status: 'pending' | 'answered' | 'revealed';
  currentStreak: number;
  lastUpdated: string;
}

export interface NudgeWidgetData {
  suggestion: string;
  loveLanguage: string;
  isCompleted: boolean;
  lastUpdated: string;
}

export interface CountdownWidgetData {
  eventName: string;
  eventType: 'birthday' | 'anniversary' | 'custom';
  daysUntil: number;
  eventDate: string;
}

export interface WidgetBundle {
  dragon: DragonWidgetData | null;
  question: QuestionWidgetData | null;
  nudge: NudgeWidgetData | null;
  countdown: CountdownWidgetData | null;
  stats: {
    streak: number;
    daysTogether: number;
    accuracy: number;
  } | null;
}
```

#### Step 2.2: Create Widget Data Service
File: `src/app/services/widgetService.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../lib/supabase';
import type { WidgetBundle } from '../types/widget';

export const widgetService = {
  // Fetch and prepare all widget data
  async fetchWidgetData(userId: string): Promise<WidgetBundle> {
    const [dragon, question, nudge, events, stats] = await Promise.all([
      this.fetchDragonData(userId),
      this.fetchQuestionData(userId),
      this.fetchNudgeData(userId),
      this.fetchUpcomingEvent(userId),
      this.fetchStats(userId)
    ]);

    return { dragon, question, nudge, countdown: events, stats };
  },

  // Save to native storage for widget access
  async syncToNative(data: WidgetBundle): Promise<void> {
    await Preferences.set({
      key: 'widget_data',
      value: JSON.stringify(data)
    });

    // Trigger native widget refresh
    await this.notifyWidgetRefresh();
  },

  // Platform-specific widget refresh
  async notifyWidgetRefresh(): Promise<void> {
    // Will use a Capacitor plugin to trigger WidgetKit/AppWidgetManager refresh
  }
};
```

#### Step 2.3: Implement Background Sync
File: `src/app/services/widgetSync.ts`

```typescript
import { App } from '@capacitor/app';
import { widgetService } from './widgetService';

export function initWidgetSync(userId: string) {
  // Sync on app resume
  App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      const data = await widgetService.fetchWidgetData(userId);
      await widgetService.syncToNative(data);
    }
  });

  // Initial sync
  widgetService.fetchWidgetData(userId).then(data => {
    widgetService.syncToNative(data);
  });
}
```

---

### Phase 3: iOS Widget Extension (Week 2-3)

#### Step 3.1: Create Widget Extension in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode
2. File → New → Target → Widget Extension
3. Name: `LovebirdsWidgets`
4. Enable "Include Configuration Intent" for customizable widgets

#### Step 3.2: iOS Widget Implementation (Swift)
File: `ios/App/LovebirdsWidgets/DragonWidget.swift`

```swift
import WidgetKit
import SwiftUI

struct DragonProvider: TimelineProvider {
    func placeholder(in context: Context) -> DragonEntry {
        DragonEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (DragonEntry) -> Void) {
        let entry = DragonEntry(date: Date(), data: loadWidgetData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DragonEntry>) -> Void) {
        let data = loadWidgetData()
        let entry = DragonEntry(date: Date(), data: data)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadWidgetData() -> DragonWidgetData {
        // Read from App Group shared container
        let defaults = UserDefaults(suiteName: "group.com.lovebirds.app")
        guard let jsonString = defaults?.string(forKey: "widget_data"),
              let data = jsonString.data(using: .utf8),
              let bundle = try? JSONDecoder().decode(WidgetBundle.self, from: data)
        else {
            return .placeholder
        }
        return bundle.dragon ?? .placeholder
    }
}

struct DragonWidgetEntryView: View {
    var entry: DragonEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallDragonView(data: entry.data)
        case .systemMedium:
            MediumDragonView(data: entry.data)
        case .systemLarge:
            LargeDragonView(data: entry.data)
        default:
            SmallDragonView(data: entry.data)
        }
    }
}

@main
struct LovebirdsWidgetBundle: WidgetBundle {
    var body: some Widget {
        DragonWidget()
        QuestionWidget()
        NudgeWidget()
        CountdownWidget()
        StatsWidget()
    }
}
```

---

### Phase 4: Android Widget Implementation (Week 3-4)

#### Step 4.1: Create Widget Provider
File: `android/app/src/main/java/com/lovebirds/app/widgets/DragonWidget.kt`

```kotlin
package com.lovebirds.app.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.lovebirds.app.R

class DragonWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val widgetData = loadWidgetData(context)

            val views = RemoteViews(context.packageName, R.layout.widget_dragon)
            views.setTextViewText(R.id.dragon_name, widgetData.name)
            views.setProgressBar(R.id.health_bar, 100, widgetData.health, false)
            views.setProgressBar(R.id.happiness_bar, 100, widgetData.happiness, false)
            views.setProgressBar(R.id.hunger_bar, 100, widgetData.hunger, false)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun loadWidgetData(context: Context): DragonWidgetData {
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val json = prefs.getString("widget_data", null)
            // Parse JSON and return data
            return DragonWidgetData.fromJson(json)
        }
    }
}
```

#### Step 4.2: Widget Layout XML
File: `android/app/src/main/res/layout/widget_dragon.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_background">

    <TextView
        android:id="@+id/dragon_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="16sp"
        android:textStyle="bold"/>

    <ProgressBar
        android:id="@+id/health_bar"
        style="@style/Widget.AppCompat.ProgressBar.Horizontal"
        android:layout_width="match_parent"
        android:layout_height="8dp"
        android:layout_marginTop="8dp"/>

    <!-- Additional UI elements -->
</LinearLayout>
```

#### Step 4.3: Register Widget in AndroidManifest.xml
```xml
<receiver
    android:name=".widgets.DragonWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/dragon_widget_info"/>
</receiver>
```

---

### Phase 5: Widget Actions & Deep Links (Week 4)

#### Step 5.1: Implement Deep Link Handling
File: `src/app/utils/deepLinks.ts`

```typescript
import { App } from '@capacitor/app';

export function setupDeepLinks(navigate: (view: string) => void) {
  App.addListener('appUrlOpen', ({ url }) => {
    const path = new URL(url).pathname;

    switch (path) {
      case '/dragon':
        navigate('dragon');
        break;
      case '/question':
        navigate('question');
        break;
      case '/nudges':
        navigate('nudges');
        break;
      // etc.
    }
  });
}
```

#### Step 5.2: Widget Quick Actions
For widgets with buttons (Feed Dragon, Mark Complete), implement:

**iOS**: App Intents framework for interactive widgets
**Android**: PendingIntent with broadcast receivers

---

### Phase 6: Testing & Polish (Week 4-5)

#### Step 6.1: Test Matrix
| Widget | iOS Small | iOS Medium | iOS Large | Android Small | Android Medium |
|--------|-----------|------------|-----------|---------------|----------------|
| Dragon | ✓ | ✓ | ✓ | ✓ | ✓ |
| Question | ✓ | ✓ | - | ✓ | ✓ |
| Nudge | ✓ | ✓ | - | ✓ | ✓ |
| Countdown | ✓ | - | - | ✓ | - |
| Stats | - | ✓ | - | - | ✓ |

#### Step 6.2: Edge Cases to Handle
- [ ] User not logged in
- [ ] No partner connected
- [ ] No dragon created yet
- [ ] Network offline
- [ ] Expired subscription (premium widgets)

---

## File Structure After Implementation

```
Lovebirdsrelationshipgameui/
├── src/
│   └── app/
│       ├── services/
│       │   ├── widgetService.ts      # NEW: Widget data fetching
│       │   └── widgetSync.ts         # NEW: Background sync
│       └── types/
│           └── widget.ts             # NEW: Widget type definitions
├── ios/
│   └── App/
│       ├── App/
│       └── LovebirdsWidgets/         # NEW: Widget extension
│           ├── DragonWidget.swift
│           ├── QuestionWidget.swift
│           ├── NudgeWidget.swift
│           ├── CountdownWidget.swift
│           └── StatsWidget.swift
├── android/
│   └── app/
│       └── src/main/
│           ├── java/.../widgets/     # NEW: Widget providers
│           │   ├── DragonWidgetProvider.kt
│           │   └── QuestionWidgetProvider.kt
│           └── res/
│               ├── layout/           # Widget layouts
│               └── xml/              # Widget info files
└── capacitor.config.ts               # NEW: Capacitor config
```

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Capacitor Setup | 3-4 days | Mobile app shell |
| 2. Widget Data Service | 3-4 days | Data sync layer |
| 3. iOS Widgets | 5-7 days | 5 iOS widgets |
| 4. Android Widgets | 5-7 days | 5 Android widgets |
| 5. Actions & Deep Links | 2-3 days | Interactive widgets |
| 6. Testing & Polish | 3-4 days | Production ready |

**Total Estimate**: 3-5 weeks

---

## Questions for Clarification

Before proceeding, please confirm:

1. **Widget Priority**: Which widgets are most important to launch first?
   - [ ] Dragon Pet (most visual/engaging)
   - [ ] Daily Question (core feature)
   - [ ] Love Nudge (daily engagement)
   - [ ] Countdown (utility)
   - [ ] Stats (informational)

2. **App Store Deployment**: Do you have Apple Developer and Google Play accounts set up?

3. **Capacitor vs Alternatives**: Are you comfortable with Capacitor, or would you prefer to explore React Native?

4. **Premium Features**: Should any widgets be premium-only?

5. **Interactive Widgets**: Do you want widgets with action buttons, or display-only initially?

---

## Next Steps

Once you approve this plan:

1. I'll start with Phase 1: Setting up Capacitor
2. Create the widget data service layer
3. Implement the first widget (Dragon Pet recommended)
4. Test on iOS simulator / Android emulator
5. Iterate on remaining widgets

Ready to proceed? Let me know which widgets to prioritize!
