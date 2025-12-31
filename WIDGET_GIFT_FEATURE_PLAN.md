# Widget Gift Feature Plan
## "Send Love to Partner's Screen"

### Overview
Allow partners to send photos, messages, and sweet moments directly to each other's:
- **Home Screen Widget** - Always visible on their phone
- **Lock Screen** - See it every time they check their phone

---

## User Experience Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PARTNER A (Sender)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Taps "Send to Partner's Screen" button                      │
│  2. Chooses content type:                                       │
│     • Photo from gallery/camera                                 │
│     • Memory from saved memories                                │
│     • Quick love note (text only)                               │
│  3. Adds optional sweet message                                 │
│  4. Previews how it will look                                   │
│  5. Taps "Send" ❤️                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PARTNER B (Receiver)                      │
├─────────────────────────────────────────────────────────────────┤
│  • Push notification: "Your partner sent you something! 💕"     │
│  • Home screen widget updates with the content                  │
│  • Lock screen shows the love note/photo                        │
│  • Can tap to open app and respond                              │
│  • Content stays until new gift arrives or they dismiss         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Platform Capabilities

### iOS

| Surface | Technology | Availability |
|---------|------------|--------------|
| Home Screen Widget | WidgetKit (StaticConfiguration) | iOS 14+ |
| Lock Screen Widget | WidgetKit (accessoryRectangular/Circular) | iOS 16+ |
| Live Activity | ActivityKit (temporary banner) | iOS 16.1+ |
| Push Notification | APNs + Rich Notifications | iOS 10+ |

### Android

| Surface | Technology | Availability |
|---------|------------|--------------|
| Home Screen Widget | AppWidget | Android 4.0+ |
| Lock Screen | Persistent Notification with image | Android 5.0+ |
| Always-on Display | Dream Service (limited) | Varies by device |
| Push Notification | FCM + Big Picture style | Android 4.1+ |

---

## Database Schema

### New Table: `widget_gifts`

```sql
CREATE TABLE widget_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  relationship_id UUID NOT NULL REFERENCES relationships(id),

  -- Content
  gift_type TEXT NOT NULL CHECK (gift_type IN ('photo', 'memory', 'note')),
  photo_url TEXT,                    -- CDN URL for uploaded photo
  memory_id UUID REFERENCES memories(id),  -- If sending existing memory
  message TEXT,                      -- Sweet note (max 150 chars)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'seen', 'dismissed')),
  delivered_at TIMESTAMPTZ,          -- When widget updated
  seen_at TIMESTAMPTZ,               -- When partner opened app
  dismissed_at TIMESTAMPTZ,          -- When partner dismissed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ             -- Optional expiration
);

-- Indexes for fast lookups
CREATE INDEX idx_widget_gifts_receiver ON widget_gifts(receiver_id, status, created_at DESC);
CREATE INDEX idx_widget_gifts_sender ON widget_gifts(sender_id, created_at DESC);

-- RLS Policies
ALTER TABLE widget_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gifts they sent or received"
  ON widget_gifts FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts to their partner"
  ON widget_gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update gifts they received"
  ON widget_gifts FOR UPDATE
  USING (auth.uid() = receiver_id);
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)
**Goal**: Basic send-to-widget functionality without push notifications

#### 1.1 Database & Backend
- [ ] Create `widget_gifts` table migration
- [ ] Add RLS policies
- [ ] Create `widgetGiftService.ts` for CRUD operations

#### 1.2 Send UI Component
- [ ] Create `SendWidgetGift.tsx` component
- [ ] Photo picker (gallery + camera)
- [ ] Memory selector (from existing memories with photos)
- [ ] Message input (150 char limit)
- [ ] Preview screen
- [ ] Send confirmation with animation

#### 1.3 Widget Updates
- [ ] Update `widgetService.ts` to check for pending gifts
- [ ] Modify widget data structure to include gift content
- [ ] Gift takes priority over regular memory rotation
- [ ] Update iOS Swift widget to display gifts
- [ ] Update Android Kotlin widget to display gifts

#### 1.4 In-App Notification
- [ ] Real-time subscription for incoming gifts
- [ ] Toast notification when gift arrives
- [ ] Gift indicator in app (badge/icon)

---

### Phase 2: Lock Screen Integration

#### 2.1 iOS Lock Screen Widget
```swift
// New widget family for lock screen
struct LovebirdsLockScreenWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LockScreenGift", provider: GiftProvider()) { entry in
            LockScreenGiftView(entry: entry)
        }
        .supportedFamilies([
            .accessoryRectangular,  // Rectangular lock screen widget
            .accessoryCircular      // Circular with photo
        ])
    }
}
```

#### 2.2 Android Lock Screen Notification
```kotlin
// Persistent notification with big picture
val notification = NotificationCompat.Builder(context, CHANNEL_ID)
    .setSmallIcon(R.drawable.ic_heart)
    .setContentTitle("From ${senderName}")
    .setContentText(message)
    .setStyle(NotificationCompat.BigPictureStyle()
        .bigPicture(photoBitmap)
        .bigLargeIcon(null))
    .setOngoing(true)  // Stays on lock screen
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    .build()
```

---

### Phase 3: Push Notifications

#### 3.1 Infrastructure Setup
- [ ] Configure Firebase Cloud Messaging (FCM) for Android
- [ ] Configure Apple Push Notification service (APNs) for iOS
- [ ] Add Capacitor Push Notifications plugin
- [ ] Create push token storage in database

#### 3.2 Backend Trigger
- [ ] Supabase Edge Function or Database Webhook
- [ ] Send push when new gift is inserted
- [ ] Include payload to refresh widget

#### 3.3 Widget Refresh on Push
- [ ] iOS: Use `WidgetKit.reloadTimelines()`
- [ ] Android: Use `AppWidgetManager.notifyAppWidgetViewDataChanged()`

---

### Phase 4: Enhanced Features

#### 4.1 Gift Types Expansion
- [ ] Animated stickers/GIFs
- [ ] Voice messages (audio note)
- [ ] "Thinking of you" quick-send templates
- [ ] Countdown ("See you in X hours")

#### 4.2 Reactions & Responses
- [ ] Partner can react with emoji from widget
- [ ] Quick reply from lock screen
- [ ] "Send one back" shortcut

#### 4.3 Gift History
- [ ] Gallery of sent/received gifts
- [ ] Save favorites
- [ ] Anniversary reminders ("1 year ago you sent...")

---

## Component Structure

```
src/app/
├── components/
│   ├── WidgetGift/
│   │   ├── SendWidgetGift.tsx       # Main send flow
│   │   ├── GiftComposer.tsx         # Photo/memory/note picker
│   │   ├── GiftPreview.tsx          # Preview before sending
│   │   ├── GiftConfirmation.tsx     # Success animation
│   │   ├── ReceivedGift.tsx         # View received gift in app
│   │   └── GiftHistory.tsx          # Past gifts gallery
│   └── ...
├── services/
│   └── widgetGiftService.ts         # Gift CRUD operations
├── hooks/
│   └── useWidgetGifts.ts            # React Query hooks
└── types/
    └── widgetGift.ts                # TypeScript types
```

---

## UI/UX Design

### Send Button Placement
Option A: Floating action button on Home screen
Option B: In existing Love Messages section
Option C: New "Gift" tab in bottom navigation
**Recommendation**: Option A - prominent, easy to access

### Gift Composer Flow
```
┌─────────────────────────────────┐
│  Send to Partner's Screen  ❤️   │
├─────────────────────────────────┤
│                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │ 📷  │  │ 🖼️  │  │ ✉️  │     │
│  │Photo│  │Memory│  │Note │     │
│  └─────┘  └─────┘  └─────┘     │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │   [Selected Image]      │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Add a sweet message...  │   │
│  └─────────────────────────┘   │
│                                 │
│  [Preview] [Send to Widget 💕] │
│                                 │
└─────────────────────────────────┘
```

### Preview Screen
Shows exactly how it will appear on partner's:
- Home screen widget (small/medium/large)
- Lock screen
- Notification

---

## Technical Considerations

### Image Handling
- Compress images before upload (max 1MB)
- Use Supabase Storage for uploads
- Generate CDN URL for fast widget loading
- Cache images on device for offline display

### Widget Data Sync
```typescript
interface WidgetGiftData {
  hasGift: boolean;
  gift?: {
    id: string;
    senderName: string;
    photoUrl: string | null;
    message: string | null;
    sentAt: string;
  };
  // Fallback to regular memories if no gift
  memories: MemoryWidgetData[];
}
```

### Priority Logic
1. **Active gift** (pending/delivered) → Show gift
2. **No active gift** → Show memory rotation
3. **Gift dismissed** → Return to memory rotation

### Offline Handling
- Cache last gift locally
- Queue sends when offline
- Sync when connection restored

---

## Security Considerations

- [ ] Validate sender/receiver are in same relationship
- [ ] Rate limit gift sending (max 10/day?)
- [ ] Content moderation for uploaded photos (optional)
- [ ] Secure image URLs with signed tokens
- [ ] Expire old gifts after 30 days

---

## Dragon XP Integration

| Action | XP Reward |
|--------|-----------|
| Send first gift | +50 XP |
| Send gift | +15 XP |
| View partner's gift | +10 XP |
| Send gift 7 days in a row | +100 XP bonus |

---

## Success Metrics

- Gifts sent per day/week
- Time from send to view
- Widget engagement rate
- Return sending (gift → response gift)
- User retention correlation

---

## Questions for Discussion

1. **Gift persistence**: How long should a gift stay on widget before reverting to memories?
   - Until dismissed?
   - 24 hours?
   - Until next gift?

2. **Multiple pending gifts**: If partner sends 3 gifts before you see the first:
   - Show newest only?
   - Queue/carousel?
   - Stack notification style?

3. **Lock screen priority**: On Android, lock screen uses notifications. Should it:
   - Be a persistent (ongoing) notification?
   - Auto-dismiss after viewing?
   - Require manual dismiss?

4. **Notification permission**: If user denies notifications:
   - Still allow sending (partner sees on next app open)?
   - Require for feature?

---

## Estimated Effort

| Phase | Scope | Complexity |
|-------|-------|------------|
| Phase 1 (MVP) | DB + Send UI + Widget update | Medium |
| Phase 2 (Lock Screen) | iOS/Android lock screen | Medium-High |
| Phase 3 (Push) | FCM/APNs + triggers | High |
| Phase 4 (Enhanced) | Extra features | Medium |

**Recommended approach**: Ship Phase 1 first, gather feedback, then iterate.

---

## Next Steps

1. Review and approve this plan
2. Answer discussion questions above
3. Begin Phase 1 implementation:
   - Database migration
   - widgetGiftService.ts
   - SendWidgetGift.tsx component
   - Update widgets to display gifts
