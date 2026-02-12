import SwiftUI
import Combine

class ImageLoader: ObservableObject {
    @Published var image: UIImage?
    private var cancellable: AnyCancellable?
    private static let cache = NSCache<NSString, UIImage>()

    func load(from url: URL) {
        if let cached = ImageLoader.cache.object(forKey: url.absoluteString as NSString) {
            self.image = cached
            return
        }

        cancellable = URLSession.shared.dataTaskPublisher(for: url)
            .map { UIImage(data: $0.data) }
            .replaceError(with: nil)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                if let img = $0 {
                    ImageLoader.cache.setObject(img, forKey: url.absoluteString as NSString)
                }
                self?.image = $0
            }
    }
    
    func cancel() {
        cancellable?.cancel()
    }
}

struct AsyncImageView: View {
    @StateObject private var loader = ImageLoader()
    let url: URL?

    var body: some View {
        Group {
            if let image = loader.image {
                Image(uiImage: image)
                    .resizable()
            } else {
                Color.gray.opacity(0.3)
            }
        }
        .onAppear {
            if let url = url { loader.load(from: url) }
        }
    }
}
