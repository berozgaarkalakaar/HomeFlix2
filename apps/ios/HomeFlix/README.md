# HomeFlix iOS Client Setup

## Prerequisites
- **Mac** with **Xcode** installed (Free from Mac App Store).
- **Apple ID** (Free developer account is sufficient for local testing).

## Step 1: Create Xcode Project
1. Open **Xcode**.
2. Select **"Create New Project..."**.
3. Choose **iOS** -> **App**. Click Next.
4. **Product Name**: `HomeFlix`
5. **Interface**: `SwiftUI`
6. **Language**: `Swift`
7. **Storage**: `None` (We manage data manually).
8. Click **Next** and save it in `apps/ios` (overwrite the folder if needed, or save next to it and move files).
   * *Tip*: Easiest way is to save it elsewhere, then copy the contents of `apps/ios/HomeFlix/Sources` into the new project's `HomeFlix` folder, replacing key files.

## Step 2: Import Source Files
The source code is currently generated in `apps/ios/HomeFlix/Sources`.
1. In Xcode, right-click the yellow folder "HomeFlix" in the left sidebar.
2. Select **"Add Files to 'HomeFlix'..."**.
3. Navigate to `apps/ios/HomeFlix/Sources` and select all `.swift` files.
4. **Important**: Check "Copy items if needed" and select the "HomeFlix" target.
5. If `HomeFlixApp.swift` or `ContentView.swift` already existed from the template, delete the old ones and use the new ones.

## Step 3: Configure Permissions
To allow the app to connect to your local server (http), you need to allow arbitrary loads or configure App Transport Security.
1. Open `Info.plist` (or the Info tab of the Target settings).
2. A proper production app requires HTTPS, but for local LAN testing:
   - Key: `App Transport Security Settings`
   - Subkey: `Allow Arbitrary Loads` -> `YES`

## Step 4: Run on Device
1. Connect your iPhone to your Mac via USB.
2. Select your iPhone in the top toolbar in Xcode (Device selector).
3. Press **Cmd + R** (Run).
4. **Trust the Developer**: On your iPhone, go to **Settings** -> **General** -> **VPN & Device Management** and trust your developer certificate.

## Step 5: Connect to Server
1. On your Mac (Server), open Terminal and run:
   ```bash
   ipconfig getifaddr en0
   ```
   (This usually gives your local IP, e.g., `192.168.1.5`).
2. On the iPhone app, on the Login screen, enter:
   `http://192.168.1.5:3000` (Replace with your actual IP).
3. Login with your created username/password.
