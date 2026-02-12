import Foundation
import Combine

class NetworkManager: ObservableObject {
    static let shared = NetworkManager()
    
    @Published var serverURL: URL? {
        didSet {
            // Save to UserDefaults or Keychain
            if let url = serverURL {
                UserDefaults.standard.set(url.absoluteString, forKey: "serverURL")
            }
        }
    }
    
    @Published var token: String? {
        didSet {
            if let token = token {
                let data = token.data(using: .utf8)!
                KeychainHelper.standard.save(data, service: "homeflix-token", account: "user")
            } else {
                KeychainHelper.standard.delete(service: "homeflix-token", account: "user")
            }
        }
    }
    
    @Published var currentUser: User?
    
    private init() {
        // Load stored URL
        if let urlString = UserDefaults.standard.string(forKey: "serverURL"),
           let url = URL(string: urlString) {
            self.serverURL = url
        }
        
        // Load stored token
        if let data = KeychainHelper.standard.read(service: "homeflix-token", account: "user"),
           let token = String(data: data, encoding: .utf8) {
            self.token = token
        }
    }
    
    var isAuthenticated: Bool {
        return token != nil
    }
    
    func fetch<T: Decodable>(_ endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let serverURL = serverURL else {
            throw URLError(.badURL)
        }
        
        let url = serverURL.appendingPathComponent("/api/v1" + endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode == 401 {
            // Token expired or invalid
            DispatchQueue.main.async {
                self.token = nil
            }
            throw URLError(.userAuthenticationRequired)
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        // Handle void response or empty body
        if T.self == Bool.self && data.isEmpty {
             return true as! T
        }
        
        let decoder = JSONDecoder()
        // Handle dates if needed
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode(T.self, from: data)
    }
    
    func logout() {
        token = nil
        currentUser = nil
    }
}
