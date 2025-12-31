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
}

// MARK: - Timeline Provider

struct LovebirdsMemoryProvider: TimelineProvider {

    typealias Entry = LovebirdsMemoryEntry

    private let suiteName = "group.com.lovebirds.app"
    private let dataKey = "lovebirds_widget_data"

    func placeholder(in context: Context) -> LovebirdsMemoryEntry {
        LovebirdsMemoryEntry(
            date: Date(),
            memory: nil,
            isPlaceholder: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LovebirdsMemoryEntry) -> Void) {
        let entry = loadCurrentEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LovebirdsMemoryEntry>) -> Void) {
        let entry = loadCurrentEntry()

        // Refresh at midnight for daily rotation
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: Date())!)

        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }

    private func loadCurrentEntry() -> LovebirdsMemoryEntry {
        guard let userDefaults = UserDefaults(suiteName: suiteName),
              let jsonString = userDefaults.string(forKey: dataKey),
              let jsonData = jsonString.data(using: .utf8),
              let bundle = try? JSONDecoder().decode(WidgetBundle.self, from: jsonData),
              !bundle.memories.isEmpty else {
            return LovebirdsMemoryEntry(date: Date(), memory: nil, isPlaceholder: false)
        }

        // Rotate based on day of year
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        let index = (dayOfYear - 1) % bundle.memories.count
        let memory = bundle.memories[index]

        return LovebirdsMemoryEntry(date: Date(), memory: memory, isPlaceholder: false)
    }
}

// MARK: - Timeline Entry

struct LovebirdsMemoryEntry: TimelineEntry {
    let date: Date
    let memory: MemoryWidgetData?
    let isPlaceholder: Bool
}

// MARK: - Widget Views

struct LovebirdsWidgetEntryView: View {
    var entry: LovebirdsMemoryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if entry.isPlaceholder {
                PlaceholderView()
            } else if let memory = entry.memory {
                MemoryView(memory: memory, family: family)
            } else {
                EmptyStateView()
            }
        }
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
