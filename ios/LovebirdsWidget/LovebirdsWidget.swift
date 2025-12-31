import WidgetKit
import SwiftUI

// MARK: - Widget Data Models

struct MemoryWidgetData: Codable, Identifiable {
    let id: String
    let photoUrl: String
    let title: String
    let note: String?
    let date: String
    let category: String?
}

struct WidgetConfiguration: Codable {
    let selectedMemoryIds: [String]
    let currentIndex: Int
    let lastRotated: String
    let rotationMode: String
}

struct WidgetBundle: Codable {
    let memories: [MemoryWidgetData]
    let config: WidgetConfiguration
    let lastUpdated: String
    let activeGift: WidgetGiftData?
}

// Widget Gift data from partner
struct WidgetGiftData: Codable {
    let id: String
    let senderId: String
    let senderName: String
    let giftType: String
    let photoUrl: String?
    let memoryId: String?
    let memoryTitle: String?
    let message: String?
    let createdAt: String
    let expiresAt: String
}

// Separate gift storage
struct GiftStorage: Codable {
    let gifts: [WidgetGiftData]
    let activeGift: WidgetGiftData?
    let lastChecked: String
}

// MARK: - Timeline Provider

struct LovebirdsMemoryProvider: TimelineProvider {

    typealias Entry = LovebirdsMemoryEntry

    private let suiteName = "group.com.lovebirds.app"
    private let dataKey = "lovebirds_widget_data"
    private let giftKey = "lovebirds_widget_gift"

    func placeholder(in context: Context) -> LovebirdsMemoryEntry {
        LovebirdsMemoryEntry(
            date: Date(),
            memory: nil,
            gift: nil,
            isPlaceholder: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LovebirdsMemoryEntry) -> Void) {
        let entry = loadCurrentEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LovebirdsMemoryEntry>) -> Void) {
        let entry = loadCurrentEntry()

        // If there's an active gift, refresh more frequently to catch expiration
        let refreshDate: Date
        if entry.hasGift {
            // Refresh every hour for gifts
            refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        } else {
            // Refresh at midnight for daily rotation
            let calendar = Calendar.current
            refreshDate = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: Date())!)
        }

        let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
        completion(timeline)
    }

    private func loadCurrentEntry() -> LovebirdsMemoryEntry {
        guard let userDefaults = UserDefaults(suiteName: suiteName) else {
            return LovebirdsMemoryEntry(date: Date(), memory: nil, gift: nil, isPlaceholder: false)
        }

        // Check for active gift first (priority over memories)
        if let giftJsonString = userDefaults.string(forKey: giftKey),
           let giftData = giftJsonString.data(using: .utf8),
           let giftStorage = try? JSONDecoder().decode(GiftStorage.self, from: giftData),
           let activeGift = giftStorage.activeGift {
            // Check if gift is expired
            let dateFormatter = ISO8601DateFormatter()
            if let expiresAt = dateFormatter.date(from: activeGift.expiresAt),
               expiresAt > Date() {
                return LovebirdsMemoryEntry(date: Date(), memory: nil, gift: activeGift, isPlaceholder: false)
            }
        }

        // Also check activeGift in main bundle
        if let jsonString = userDefaults.string(forKey: dataKey),
           let jsonData = jsonString.data(using: .utf8),
           let bundle = try? JSONDecoder().decode(WidgetBundle.self, from: jsonData) {

            // Check for active gift in bundle
            if let activeGift = bundle.activeGift {
                let dateFormatter = ISO8601DateFormatter()
                if let expiresAt = dateFormatter.date(from: activeGift.expiresAt),
                   expiresAt > Date() {
                    return LovebirdsMemoryEntry(date: Date(), memory: nil, gift: activeGift, isPlaceholder: false)
                }
            }

            // Fall back to memory rotation
            if !bundle.memories.isEmpty {
                let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
                let index = (dayOfYear - 1) % bundle.memories.count
                let memory = bundle.memories[index]
                return LovebirdsMemoryEntry(date: Date(), memory: memory, gift: nil, isPlaceholder: false)
            }
        }

        return LovebirdsMemoryEntry(date: Date(), memory: nil, gift: nil, isPlaceholder: false)
    }
}

// MARK: - Timeline Entry

struct LovebirdsMemoryEntry: TimelineEntry {
    let date: Date
    let memory: MemoryWidgetData?
    let gift: WidgetGiftData?
    let isPlaceholder: Bool

    var hasGift: Bool { gift != nil }
}

// MARK: - Widget Views

struct LovebirdsWidgetEntryView: View {
    var entry: LovebirdsMemoryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if entry.isPlaceholder {
                PlaceholderView()
            } else if let gift = entry.gift {
                GiftView(gift: gift, family: family)
            } else if let memory = entry.memory {
                MemoryView(memory: memory, family: family)
            } else {
                EmptyStateView()
            }
        }
    }
}

// MARK: - Gift View (from partner)

struct GiftView: View {
    let gift: WidgetGiftData
    let family: WidgetFamily

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                // Background
                if let photoUrl = gift.photoUrl, !photoUrl.isEmpty {
                    AsyncImage(url: URL(string: photoUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: geometry.size.width, height: geometry.size.height)
                                .clipped()
                        case .failure:
                            Color.pink.opacity(0.3)
                        case .empty:
                            Color.pink.opacity(0.1)
                                .overlay(ProgressView())
                        @unknown default:
                            Color.pink.opacity(0.1)
                        }
                    }
                } else {
                    // Note-only gift - show heart background
                    LinearGradient(
                        gradient: Gradient(colors: [Color.pink.opacity(0.3), Color.purple.opacity(0.3)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .overlay(
                        Image(systemName: "heart.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.pink.opacity(0.3))
                    )
                }

                // Gradient overlay
                LinearGradient(
                    gradient: Gradient(colors: [.clear, .black.opacity(0.8)]),
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Content overlay
                VStack(alignment: .leading, spacing: 4) {
                    // "From" label with heart
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .font(.caption2)
                            .foregroundColor(.pink)
                        Text("From \(gift.senderName)")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.9))
                    }

                    if let message = gift.message, !message.isEmpty {
                        Text("\"\(message)\"")
                            .font(family == .systemSmall ? .caption : .subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .italic()
                            .lineLimit(family == .systemSmall ? 2 : 3)
                    }
                }
                .padding(12)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

struct MemoryView: View {
    let memory: MemoryWidgetData
    let family: WidgetFamily

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                // Background image
                AsyncImage(url: URL(string: memory.photoUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width, height: geometry.size.height)
                            .clipped()
                    case .failure:
                        Color.pink.opacity(0.3)
                    case .empty:
                        Color.pink.opacity(0.1)
                            .overlay(
                                ProgressView()
                            )
                    @unknown default:
                        Color.pink.opacity(0.1)
                    }
                }

                // Gradient overlay
                LinearGradient(
                    gradient: Gradient(colors: [.clear, .black.opacity(0.7)]),
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Content overlay
                VStack(alignment: .leading, spacing: 4) {
                    if family != .systemSmall {
                        Text(memory.title)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .lineLimit(1)

                        if let note = memory.note, !note.isEmpty {
                            Text("\"\(note)\"")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.9))
                                .italic()
                                .lineLimit(2)
                        }
                    }

                    Text(memory.date)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(12)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

struct PlaceholderView: View {
    var body: some View {
        ZStack {
            Color.pink.opacity(0.2)
            VStack(spacing: 8) {
                Image(systemName: "heart.fill")
                    .font(.largeTitle)
                    .foregroundColor(.pink)
                Text("Lovebirds")
                    .font(.headline)
                    .foregroundColor(.pink)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

struct EmptyStateView: View {
    var body: some View {
        ZStack {
            Color.pink.opacity(0.1)
            VStack(spacing: 8) {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.largeTitle)
                    .foregroundColor(.pink.opacity(0.6))
                Text("Add memories in app")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .containerBackground(.clear, for: .widget)
    }
}

// MARK: - Widget Configuration

struct LovebirdsMemoryWidget: Widget {
    let kind: String = "LovebirdsMemoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LovebirdsMemoryProvider()) { entry in
            LovebirdsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Lovebirds Memories")
        .description("See your favorite memories with your partner")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Lock Screen Widget (iOS 16+)

@available(iOSApplicationExtension 16.0, *)
struct LovebirdsLockScreenWidget: Widget {
    let kind: String = "LovebirdsLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LovebirdsMemoryProvider()) { entry in
            LockScreenWidgetView(entry: entry)
        }
        .configurationDisplayName("Lovebirds")
        .description("Partner gifts & memories on your lock screen")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Lock Screen Views

@available(iOSApplicationExtension 16.0, *)
struct LockScreenWidgetView: View {
    var entry: LovebirdsMemoryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            LockScreenCircularView(entry: entry)
        case .accessoryRectangular:
            LockScreenRectangularView(entry: entry)
        case .accessoryInline:
            LockScreenInlineView(entry: entry)
        default:
            LockScreenCircularView(entry: entry)
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockScreenCircularView: View {
    var entry: LovebirdsMemoryProvider.Entry

    var body: some View {
        ZStack {
            if entry.hasGift {
                // Gift from partner - show heart with notification dot
                AccessoryWidgetBackground()
                VStack(spacing: 2) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.pink)
                    Text("Gift!")
                        .font(.system(size: 8, weight: .medium))
                }
            } else if let memory = entry.memory {
                // Show memory photo in circular frame
                if let url = URL(string: memory.photoUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .clipShape(Circle())
                        default:
                            AccessoryWidgetBackground()
                            Image(systemName: "heart.fill")
                                .font(.title2)
                        }
                    }
                } else {
                    AccessoryWidgetBackground()
                    Image(systemName: "heart.fill")
                        .font(.title2)
                }
            } else {
                // Empty state
                AccessoryWidgetBackground()
                Image(systemName: "heart")
                    .font(.title2)
            }
        }
        .widgetAccentable()
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockScreenRectangularView: View {
    var entry: LovebirdsMemoryProvider.Entry

    var body: some View {
        HStack(spacing: 8) {
            // Left side - icon or photo
            if entry.hasGift {
                ZStack {
                    Circle()
                        .fill(.pink.opacity(0.3))
                        .frame(width: 40, height: 40)
                    Image(systemName: "heart.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.pink)
                }
            } else if let memory = entry.memory, let url = URL(string: memory.photoUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 40)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    default:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.secondary.opacity(0.3))
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: "photo")
                                    .foregroundColor(.secondary)
                            )
                    }
                }
            } else {
                ZStack {
                    Circle()
                        .fill(.secondary.opacity(0.3))
                        .frame(width: 40, height: 40)
                    Image(systemName: "heart")
                        .font(.system(size: 16))
                }
            }

            // Right side - text content
            VStack(alignment: .leading, spacing: 2) {
                if let gift = entry.gift {
                    Text("From \(gift.senderName)")
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                    if let message = gift.message, !message.isEmpty {
                        Text(message)
                            .font(.system(size: 11))
                            .lineLimit(2)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Sent you love!")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                } else if let memory = entry.memory {
                    Text(memory.title)
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                    Text(memory.date)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                } else {
                    Text("Lovebirds")
                        .font(.system(size: 12, weight: .semibold))
                    Text("Add memories in app")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .widgetAccentable()
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockScreenInlineView: View {
    var entry: LovebirdsMemoryProvider.Entry

    var body: some View {
        if let gift = entry.gift {
            Label {
                if let message = gift.message, !message.isEmpty {
                    Text("\(gift.senderName): \(message)")
                } else {
                    Text("\(gift.senderName) sent you love!")
                }
            } icon: {
                Image(systemName: "heart.fill")
            }
        } else if let memory = entry.memory {
            Label {
                Text("\(memory.title) - \(memory.date)")
            } icon: {
                Image(systemName: "heart")
            }
        } else {
            Label("Lovebirds", systemImage: "heart")
        }
    }
}

// MARK: - Preview

#Preview(as: .systemMedium) {
    LovebirdsMemoryWidget()
} timeline: {
    LovebirdsMemoryEntry(
        date: Date(),
        memory: MemoryWidgetData(
            id: "preview",
            photoUrl: "",
            title: "Our First Date",
            note: "The night everything changed",
            date: "December 25",
            category: nil
        ),
        isPlaceholder: false
    )
}
