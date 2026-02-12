import Foundation

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct User: Codable {
    let id: String
    let username: String
    let isAdmin: Bool
}
