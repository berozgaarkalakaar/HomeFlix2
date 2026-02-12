import SwiftUI

@main
struct HomeFlixApp: App {
    @StateObject var networkManager = NetworkManager.shared

    var body: some Scene {
        WindowGroup {
            if networkManager.isAuthenticated {
                NavigationView {
                    LibraryView()
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarLeading) {
                                NavigationLink(destination: SettingsView()) {
                                    Image(systemName: "gear")
                                }
                            }
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Logout") {
                                    networkManager.logout()
                                }
                            }
                        }
                }
                .environmentObject(networkManager)
            } else {
                LoginView()
                    .environmentObject(networkManager)
            }
        }
    }
}
