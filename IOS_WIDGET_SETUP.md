# iOS Widget Setup Guide

This guide documents the iOS widget implementation for the Lovebirds app, following best practices from the Expo Apple Targets tutorial.

## 🎯 What's Implemented

### 1. **SwiftUI Widget Code** ✅
- **Location**: `ios/LovebirdsWidget/`
- **Features**:
  - Home screen widgets (small, medium, large)
  - Lock screen widgets (iOS 16+)
  - Memory rotation (daily)
  - Partner gift display (takes priority over memories)
  - Photo backgrounds with gradient overlays
  - Empty state handling

### 2. **Capacitor Plugin for Widget Refresh** ✅
- **Location**: `ios/App/App/LovebirdsWidgetPlugin.swift`
- **Purpose**: Bridge between React app and native widget
- **Methods**:
  - `reloadWidgets()` - Refresh all widget timelines
  - `saveToAppGroup()` - Save data to shared App Group storage
  - `readFromAppGroup()` - Read data from shared storage
  - `getWidgetInfo()` - Get widget availability info

### 3. **Data Sharing via App Groups** ✅
- **App Group ID**: `group.com.lovebirds.app`
- **Entitlements**:
  - Main app: `ios/App/App/App.entitlements`
  - Widget: `ios/LovebirdsWidget/LovebirdsWidget.entitlements`
- **Shared Data Keys**:
  - `lovebirds_widget_data` - Memory widget data
  - `lovebirds_widget_gift` - Partner gift data
  - `lovebirds_lock_screen_gift` - Lock screen gift data

### 4. **Automatic Widget Refresh** ✅
- **Hook**: `src/app/hooks/useWidgetRefresh.ts`
- **Triggers**:
  - When app goes to background (via Capacitor App plugin)
  - When app becomes active (syncs new gifts)
- **Implementation**: Used in `App.tsx` at root level

### 5. **TypeScript Services** ✅
- **widgetService.ts**: Memory widget management
- **widgetGiftService.ts**: Partner gift management
- **useWidgetGallery.ts**: Widget gallery UI hook
- **useWidgetRefresh.ts**: Auto-refresh logic

## 🔧 Xcode Configuration Required

You need to configure the Xcode project to complete the setup:

### Step 1: Open Xcode Project

```bash
cd ios
xed .
# or
open App/App.xcodeproj
```

### Step 2: Add Widget Target to Build Phases

1. Select the **App** target in Xcode
2. Go to **Build Phases** → **Embed Foundation Extensions**
3. Add **LovebirdsWidget.appex** if not already present

### Step 3: Configure Code Signing

For both **App** and **LovebirdsWidget** targets:

1. Select target → **Signing & Capabilities**
2. Set your **Team** (Apple Developer Team)
3. Ensure **Automatically manage signing** is enabled
4. Bundle Identifiers should be:
   - App: `com.lovebirds.app`
   - Widget: `com.lovebirds.app.LovebirdsWidget`

### Step 4: Enable App Groups Capability

**For Main App Target (App):**
1. Select **App** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability**
4. Add **App Groups**
5. Check `group.com.lovebirds.app`
6. Verify `App.entitlements` is set in **Build Settings** → **Code Signing Entitlements**

**For Widget Extension Target (LovebirdsWidget):**
1. Select **LovebirdsWidget** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability**
4. Add **App Groups**
5. Check `group.com.lovebirds.app`
6. Verify `LovebirdsWidget.entitlements` is set in **Build Settings** → **Code Signing Entitlements**

### Step 5: Register the Capacitor Plugin

The plugin is already registered via:
- Swift implementation: `ios/App/App/LovebirdsWidgetPlugin.swift`
- Objective-C bridge: `ios/App/App/LovebirdsWidgetPlugin.m`

Capacitor should auto-discover it. If not, ensure both files are added to the App target in Xcode.

### Step 6: Build and Test

```bash
# Build the app
npm run build

# Sync Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or run directly
npx cap run ios
```

## 📱 Testing the Widget

### 1. Add Widget to Home Screen
1. Long press on iOS home screen
2. Tap **+** button in top-left
3. Search for "Lovebirds"
4. Choose widget size (small, medium, or large)
5. Add to home screen

### 2. Configure Widget Memories
1. Open Lovebirds app
2. Navigate to Widget Gallery
3. Select up to 5 favorite memories
4. Tap "Save to Widget"
5. Widget will display daily rotating memories

### 3. Send a Widget Gift
1. Open Lovebirds app
2. Navigate to Send Widget Gift
3. Choose a photo or memory
4. Add a sweet message (optional)
5. Send to partner
6. Partner's widget will display the gift for 24 hours

### 4. Add Lock Screen Widget (iOS 16+)
1. Long press on lock screen
2. Tap **Customize**
3. Add Lovebirds widget
4. Choose from circular, rectangular, or inline styles

## 🔄 How It Works

### Data Flow

```
React App → widgetService.syncToWidget()
          ↓
LovebirdsWidget.saveToAppGroup() (Capacitor Plugin)
          ↓
UserDefaults(suiteName: "group.com.lovebirds.app")
          ↓
Swift Widget reads from App Group
          ↓
Widget displays on home screen
```

### Refresh Trigger

```
App goes to background
          ↓
useWidgetRefresh() hook detects state change
          ↓
widgetService.notifyWidgetRefresh()
          ↓
LovebirdsWidget.reloadWidgets()
          ↓
WidgetCenter.shared.reloadAllTimelines()
          ↓
Widget updates with latest data
```

## 🐛 Troubleshooting

### Widget shows "Add memories in app"
- Open the app and configure widget gallery
- Select at least one memory with a photo
- Ensure memories are saved to widget

### Widget not updating
- Check App Groups capability is enabled for both targets
- Verify entitlements files are linked in Build Settings
- Ensure both app and widget use the same App Group ID
- Check Xcode console for errors

### Plugin not found error
- Verify `LovebirdsWidgetPlugin.swift` and `.m` are in App target
- Clean build folder (Cmd + Shift + K)
- Rebuild the app

### Data not syncing
- Verify App Group ID matches in:
  - Entitlements files
  - Swift widget code (`suiteName`)
  - Capacitor plugin code (`appGroupId`)
- Check UserDefaults keys match between app and widget

## 📚 Implementation Reference

Based on the [Expo Apple Targets tutorial](https://docs.expo.dev/guides/apple-targets/):
- ✅ Widget target creation
- ✅ SwiftUI widget views
- ✅ App Groups data sharing
- ✅ UserDefaults with suite name
- ✅ Background refresh triggers
- ✅ Timeline provider with refresh policy
- ✅ Lock screen widget support (iOS 16+)

## 🚀 Next Steps

1. **Configure Xcode project** (see steps above)
2. **Add Apple Team ID** in Xcode signing settings
3. **Build and test** on a physical device or simulator
4. **Publish to TestFlight/App Store** when ready

## 💡 Key Features

- 📸 **Daily Memory Rotation**: Widget shows a different memory each day
- 💌 **Partner Gifts**: Send sweet notes and photos to partner's widget
- 🔒 **Lock Screen Support**: Quick glance widgets for iOS 16+
- 🔄 **Auto-Refresh**: Widget updates when app goes to background
- 🎨 **Beautiful UI**: Photo backgrounds with gradient overlays
- 📦 **App Groups**: Secure data sharing between app and widget

---

**Last Updated**: January 2, 2026
**iOS Version**: iOS 14+ (Lock screen requires iOS 16+)
**Implementation Status**: ✅ Complete - Requires Xcode configuration
