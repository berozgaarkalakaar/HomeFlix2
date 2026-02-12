import Foundation

struct UserProgress: Codable {
    let mediaItemId: String
    let progressSeconds: Int
    let completed: Bool
    let lastWatchedAt: Date
}
