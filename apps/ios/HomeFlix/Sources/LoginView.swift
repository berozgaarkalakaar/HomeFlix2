import SwiftUI

struct LoginView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var serverIP = ""
    @State private var username = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("HomeFlix")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.red)
            
            TextField("Server IP (e.g. 192.168.1.5:3000)", text: $serverIP)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding(.horizontal)
                .onChange(of: serverIP) { newValue in
                    // Clean URL
                    var url = newValue
                    if !url.hasPrefix("http") {
                        url = "http://" + url
                    }
                    if let validURL = URL(string: url) {
                        networkManager.serverURL = validURL
                    }
                }

            TextField("Username", text: $username)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding(.horizontal)

            SecureField("Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding(.horizontal)

            if let error = error {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            Button(action: login) {
                if isLoading {
                    ProgressView()
                } else {
                    Text("Login")
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .cornerRadius(10)
                }
            }
            .padding(.horizontal)
            .disabled(isLoading || serverIP.isEmpty || username.isEmpty || password.isEmpty)
        }
        .padding()
        .onAppear {
            if let url = networkManager.serverURL {
                serverIP = url.absoluteString.replacingOccurrences(of: "http://", with: "")
            }
        }
    }
    
    func login() {
        isLoading = true
        error = nil
        
        // Ensure URL is set (redundant but safe)
        var url = serverIP
        if !url.hasPrefix("http") {
            url = "http://" + url
        }
        networkManager.serverURL = URL(string: url)

        let body = ["username": username, "password": password]
        let jsonData = try? JSONEncoder().encode(body)

        // We can't use async/await directly in Button action without Task in iOS 15+
        Task {
            do {
                let response: AuthResponse = try await NetworkManager.shared.fetch("/auth/login", method: "POST", body: jsonData)
                DispatchQueue.main.async {
                    networkManager.token = response.token
                    networkManager.currentUser = response.user
                    isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = "Login failed. Check IP and credentials."
                    isLoading = false
                }
            }
        }
    }
}
