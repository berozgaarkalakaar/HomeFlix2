import SwiftUI

struct LibraryView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var items: [MediaItem] = []
    @State private var progressMap: [String: UserProgress] = [:]
    @State private var selectedItem: MediaItem?
    
    let columns = [
        GridItem(.adaptive(minimum: 150), spacing: 20)
    ]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 20) {
                ForEach(items) { item in
                    MediaItemCard(item: item, progress: progressMap[item.id])
                        .onTapGesture {
                            selectedItem = item
                        }
                }
            }
            .padding()
        }
        .navigationTitle("Library")
        .onAppear {
            fetchLibrary()
            fetchProgress()
        }
        .fullScreenCover(item: $selectedItem) { item in
            PlayerViewWithError(item: item, progress: progressMap[item.id]) {
                selectedItem = nil
                fetchProgress() // Refresh progress
            }
        }
    }
    
    func fetchLibrary() {
        Task {
            do {
                let fetchedItems: [MediaItem] = try await networkManager.fetch("/library/items")
                DispatchQueue.main.async {
                    self.items = fetchedItems
                }
            } catch {
                print("Error fetching library: \(error)")
            }
        }
    }
    
    func fetchProgress() {
        Task {
            do {
                let fetchedProgress: [String: UserProgress] = try await networkManager.fetch("/user/progress")
                DispatchQueue.main.async {
                    self.progressMap = fetchedProgress
                }
            } catch {
                print("Error fetching progress: \(error)")
            }
        }
    }
}

struct MediaItemCard: View {
    let item: MediaItem
    let progress: UserProgress?
    @EnvironmentObject var networkManager: NetworkManager
    
    var body: some View {
        VStack(alignment: .leading) {
            ZStack(alignment: .bottomLeading) {
                if let serverURL = networkManager.serverURL {
                    AsyncImage(url: serverURL.appendingPathComponent("/api/v1/items/\(item.id)/poster")) { phase in
                        switch phase {
                        case .empty:
                            Color.gray.opacity(0.3)
                        case .success(let image):
                            image.resizable().aspectRatio(2/3, contentMode: .fill)
                        case .failure:
                            Color.red.opacity(0.3)
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .frame(height: 225)
                    .cornerRadius(8)
                    .clipped()
                }
                
                if let progress = progress, let duration = item.duration, duration > 0 {
                    let percent = Double(progress.progressSeconds) / Double(duration)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle().fill(Color.gray.opacity(0.5))
                            Rectangle().fill(Color.red).frame(width: geo.size.width * CGFloat(percent))
                        }
                    }
                    .frame(height: 4)
                    .padding(.bottom, 8)
                    .padding(.horizontal, 4)
                }
            }
            
            Text(item.title)
                .font(.headline)
                .lineLimit(1)
                .foregroundColor(.primary)
            
            if let year = item.year {
                Text(String(year))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}
