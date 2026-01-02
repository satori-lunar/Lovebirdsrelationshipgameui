#!/bin/bash

# Lovebirds iOS Widget - Xcode Configuration Script
# This script helps verify and guide the Xcode configuration process

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Lovebirds iOS Widget - Xcode Configuration Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "ios/App/App.xcodeproj/project.pbxproj" ]; then
    echo -e "${RED}❌ Error: Xcode project not found${NC}"
    echo "   Please run this script from the project root"
    exit 1
fi

echo "📋 Checking widget implementation files..."
echo ""

# Check Swift widget code
if [ -f "ios/LovebirdsWidget/LovebirdsWidget.swift" ]; then
    echo -e "${GREEN}✓${NC} Widget SwiftUI code exists"
else
    echo -e "${RED}✗${NC} Widget SwiftUI code missing"
fi

# Check plugin files
if [ -f "ios/App/App/LovebirdsWidgetPlugin.swift" ]; then
    echo -e "${GREEN}✓${NC} Capacitor plugin (Swift) exists"
else
    echo -e "${RED}✗${NC} Capacitor plugin (Swift) missing"
fi

if [ -f "ios/App/App/LovebirdsWidgetPlugin.m" ]; then
    echo -e "${GREEN}✓${NC} Capacitor plugin (Objective-C bridge) exists"
else
    echo -e "${RED}✗${NC} Capacitor plugin (Objective-C bridge) missing"
fi

# Check entitlements
if [ -f "ios/App/App/App.entitlements" ]; then
    echo -e "${GREEN}✓${NC} Main app entitlements exists"
else
    echo -e "${RED}✗${NC} Main app entitlements missing"
fi

if [ -f "ios/LovebirdsWidget/LovebirdsWidget.entitlements" ]; then
    echo -e "${GREEN}✓${NC} Widget entitlements exists"
else
    echo -e "${RED}✗${NC} Widget entitlements missing"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 MANUAL XCODE CONFIGURATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}You must complete these steps in Xcode:${NC}"
echo ""

echo -e "${BLUE}STEP 1: Open Xcode Project${NC}"
echo "  $ cd ios"
echo "  $ xed ."
echo "  Or: File → Open → ios/App/App.xcodeproj"
echo ""

echo -e "${BLUE}STEP 2: Add Plugin Files to App Target${NC}"
echo "  1. In Xcode, select 'App' target in navigator"
echo "  2. Right-click on 'App' folder → Add Files to \"App\""
echo "  3. Navigate to and select:"
echo "     • LovebirdsWidgetPlugin.swift"
echo "     • LovebirdsWidgetPlugin.m"
echo "  4. Ensure 'App' target is checked"
echo "  5. Click 'Add'"
echo ""

echo -e "${BLUE}STEP 3: Configure App Groups for Main App${NC}"
echo "  1. Select 'App' target"
echo "  2. Go to 'Signing & Capabilities' tab"
echo "  3. Set your Team (Apple Developer account)"
echo "  4. Click '+ Capability'"
echo "  5. Add 'App Groups'"
echo "  6. Check or create: group.com.lovebirds.app"
echo "  7. Verify 'Code Signing Entitlements' points to:"
echo "     App/App.entitlements"
echo ""

echo -e "${BLUE}STEP 4: Configure App Groups for Widget${NC}"
echo "  1. Select 'LovebirdsWidget' target"
echo "  2. Go to 'Signing & Capabilities' tab"
echo "  3. Set your Team (same as main app)"
echo "  4. Click '+ Capability'"
echo "  5. Add 'App Groups'"
echo "  6. Check the SAME group: group.com.lovebirds.app"
echo "  7. Verify 'Code Signing Entitlements' points to:"
echo "     LovebirdsWidget/LovebirdsWidget.entitlements"
echo ""

echo -e "${BLUE}STEP 5: Verify Widget Target Embedding${NC}"
echo "  1. Select 'App' target"
echo "  2. Go to 'Build Phases' tab"
echo "  3. Expand 'Embed Foundation Extensions'"
echo "  4. Verify 'LovebirdsWidget.appex' is listed"
echo "  5. If not, click '+' and add it"
echo ""

echo -e "${BLUE}STEP 6: Build and Test${NC}"
echo "  1. Select a device or simulator"
echo "  2. Product → Clean Build Folder (Cmd+Shift+K)"
echo "  3. Product → Build (Cmd+B)"
echo "  4. Fix any errors that appear"
echo "  5. Product → Run (Cmd+R)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTING THE WIDGET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Run the app on device/simulator"
echo "2. Open Lovebirds app → Widget Gallery"
echo "3. Select 1-5 memories with photos"
echo "4. Tap 'Save to Widget'"
echo "5. Go to home screen (Cmd+Shift+H)"
echo "6. Long press → Add Widget → Lovebirds"
echo "7. Widget should show your selected memory!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐛 TROUBLESHOOTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Issue: Plugin not found error"
echo "  → Add LovebirdsWidgetPlugin.swift/.m to App target"
echo "  → Clean and rebuild (Cmd+Shift+K, then Cmd+B)"
echo ""
echo "Issue: Widget shows 'Add memories in app'"
echo "  → Open app and configure widget gallery"
echo "  → Select memories and save"
echo ""
echo "Issue: Data not syncing"
echo "  → Verify App Groups enabled on BOTH targets"
echo "  → Check group ID is: group.com.lovebirds.app"
echo "  → Verify entitlements files are linked"
echo ""
echo "Issue: Build errors in plugin code"
echo "  → Ensure WidgetKit is imported"
echo "  → Check iOS deployment target is 14.0+"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation: See IOS_WIDGET_SETUP.md for details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Ready to configure? Open Xcode with:${NC}"
echo "  $ cd ios && xed ."
echo ""
