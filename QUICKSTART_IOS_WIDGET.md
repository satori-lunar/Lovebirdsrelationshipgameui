# iOS Widget Quick Start Guide

Get your iOS widget up and running in 5 steps!

## 🚀 Quick Setup (5 minutes)

### 1️⃣ Run the Configuration Helper

```bash
./scripts/configure-xcode-widget.sh
```

This will verify all files are in place and show you what's needed.

### 2️⃣ Open Xcode

```bash
cd ios
xed .
```

### 3️⃣ Add Plugin Files to App Target

1. In Xcode navigator, **right-click** on `App` folder
2. Select **"Add Files to App..."**
3. Navigate to `App` folder and select:
   - ✅ `LovebirdsWidgetPlugin.swift`
   - ✅ `LovebirdsWidgetPlugin.m`
4. Make sure **"App" target is checked**
5. Click **Add**

### 4️⃣ Enable App Groups (CRITICAL!)

**For Main App (App target):**
1. Select **App** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** → Add **App Groups**
4. Check ✅ `group.com.lovebirds.app`

**For Widget (LovebirdsWidget target):**
1. Select **LovebirdsWidget** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** → Add **App Groups**
4. Check ✅ **THE SAME** `group.com.lovebirds.app`

⚠️ **IMPORTANT**: Both targets MUST use the exact same App Group ID!

### 5️⃣ Build & Run

```bash
# In Xcode:
Cmd+Shift+K (Clean)
Cmd+B (Build)
Cmd+R (Run)
```

## 📱 Testing Your Widget

1. **Configure Widget**
   - Open Lovebirds app
   - Go to **Widget Gallery**
   - Select 1-5 favorite memories
   - Tap **"Save to Widget"**

2. **Add Widget to Home Screen**
   - Go to home screen
   - **Long press** anywhere
   - Tap **"+"** in top-left
   - Search for **"Lovebirds"**
   - Select widget size
   - **Add to Home Screen**

3. **See Your Memory!**
   - Widget displays your selected memory
   - Rotates daily
   - Beautiful photo with title overlay

## 🎁 Bonus: Test Widget Gifts

1. Open app → **Send Widget Gift**
2. Choose a photo or memory
3. Add a sweet message
4. Send to partner
5. Partner's widget shows the gift for 24 hours! 💕

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Plugin not found | Add .swift/.m files to App target |
| Widget shows "Add memories" | Configure widget gallery in app |
| Data not syncing | Check App Groups enabled on BOTH targets |
| Build errors | Clean build (Cmd+Shift+K) and rebuild |

## 📚 Need More Help?

- **Full Guide**: See [IOS_WIDGET_SETUP.md](./IOS_WIDGET_SETUP.md)
- **Run Helper**: `./scripts/configure-xcode-widget.sh`

## ✨ What You Get

- 📸 **Daily Memory Rotation** - Different memory each day
- 💌 **Partner Gifts** - Send love notes to widget
- 🔒 **Lock Screen Widgets** - iOS 16+ support
- 🔄 **Auto-Refresh** - Updates when app backgrounds
- 🎨 **Beautiful UI** - Photo backgrounds with gradients

---

**Time to complete**: ~5 minutes
**iOS Version**: iOS 14+ (Lock screen: iOS 16+)
**Status**: ✅ Ready to configure!
