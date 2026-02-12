import Foundation

struct MediaItem: Identifiable, Codable {
    let id: String
    let title: String
    let type: String // "movie" or "tv"
    let year: Int?
    let duration: Int?
    let path: String
    let addedAt: Date
}
