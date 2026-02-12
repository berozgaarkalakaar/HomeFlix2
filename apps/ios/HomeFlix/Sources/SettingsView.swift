import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var networkManager: NetworkManager
    @State private var serverIP = ""
    
    var body: some View {
        Form {
            Section(header: Text("Server Connection")) {
                TextField("Server URL", text: $serverIP)
                    .keyboardType(.URL)
                    .autocapitalization(.none)
            }
            
            Section(header: Text("Account")) {
                if let user = networkManager.currentUser {
                    Text("Logged in as: \(user.username)")
                }
                Button("Logout") {
                    networkManager.logout()
                }
                .foregroundColor(.red)
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            if let url = networkManager.serverURL {
                serverIP = url.absoluteString
            }
        }
        .onChange(of: serverIP) { newValue in
            if let url = URL(string: newValue) {
                networkManager.serverURL = url
            }
        }
    }
}
