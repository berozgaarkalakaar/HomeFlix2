import SwiftUI
import AVKit

struct PlayerViewWithError: View {
    let item: MediaItem
    let progress: UserProgress?
    let onClose: () -> Void
    @EnvironmentObject var networkManager: NetworkManager
    
    var body: some View {
        if let serverURL = networkManager.serverURL, let token = networkManager.token {
            PlayerView(
                url: serverURL.appendingPathComponent("/api/v1/stream/\(item.id)"), 
                itemId: item.id,
                initialTime: Double(progress?.progressSeconds ?? 0),
                token: token,
                onClose: onClose
            )
            .edgesIgnoringSafeArea(.all)
        } else {
            Text("Error: Server not configured")
        }
    }
}

struct PlayerView: UIViewControllerRepresentable {
    let url: URL
    let itemId: String
    let initialTime: Double
    let token: String
    let onClose: () -> Void
    
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        
        // Add Auth header
        let headers: [String: String] = ["Authorization": "Bearer \(token)"]
        let asset = AVURLAsset(url: url, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
        let playerItem = AVPlayerItem(asset: asset)
        
        let player = AVPlayer(playerItem: playerItem)
        controller.player = player
        
        // Seek to initial time
        if initialTime > 0 {
            let cmTime = CMTime(seconds: initialTime, preferredTimescale: 1)
            player.seek(to: cmTime)
        }
        
        player.play()
        
        // Observe progress
        context.coordinator.startObserving(player: player)
        
        return controller
    }
    
    func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }
    
    class Coordinator: NSObject {
        var parent: PlayerView
        var timeObserver: Any?
        
        init(parent: PlayerView) {
            self.parent = parent
        }
        
        func startObserving(player: AVPlayer) {
            let interval = CMTime(seconds: 10, preferredTimescale: 1)
            timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
                self?.saveProgress(time: time, duration: player.currentItem?.duration)
            }
        }
        
        func saveProgress(time: CMTime, duration: CMTime?) {
            guard let duration = duration else { return }
            
            let seconds = Int(time.seconds)
            let total = duration.seconds
            let completed = total > 0 && (time.seconds / total > 0.9)
            
            guard let url = NetworkManager.shared.serverURL?.appendingPathComponent("/api/v1/user/progress/\(parent.itemId)") else { return }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.addValue("Bearer \(parent.token)", forHTTPHeaderField: "Authorization")
            
            let body = ["progressSeconds": seconds, "completed": completed] as [String : Any]
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            
            URLSession.shared.dataTask(with: request).resume()
        }
        
        deinit {
            // Clean up observer if possible, though AVPlayer often needs explicit cleanup
        }
    }
}
