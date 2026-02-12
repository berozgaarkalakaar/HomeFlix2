# HomeFlix 2.0

A self-hosted media server with web, desktop, and iOS clients.

## 🚀 Features
- **Media Server**: Scans local libraries, transcodes via FFmpeg, and serves HLS streams.
- **Web Client**: React-based player with progress tracking and PWA support.
- **Desktop Client**: Electron app for Mac & Windows.
- **iOS Client**: SwiftUI app for iPhone/iPad.

## 📦 Installation & Setup (Windows)

To run this on a Windows machine and make it your server:

### 1. Prerequisites
- **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org/).
- **Git**: Install from [git-scm.com](https://git-scm.com/).
- **FFmpeg**:
  1. Download build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
  2. Extract it to `C:\ffmpeg`.
  3. Add `C:\ffmpeg\bin` to your System **PATH** environment variable.

### 2. Clone & Install
Open PowerShell or Command Prompt:

```bash
git clone <YOUR_REPO_URL> homeflix
cd homeflix
npm install
```

### 3. Run the Server
To start both the Server and Web Client:

```bash
npm run dev
```
- Server runs on port **3000**.
- Web Client runs on port **5173**.

### 4. Make it a Server (Access from LAN)
By default, `vite` (Web Client) might only listen on `localhost`. To expose it:

1. Open `apps/web/package.json`.
2. Change `"dev": "vite"` to `"dev": "vite --host"`.
3. Restart `npm run dev`.

Now, on any device in your Wi-Fi:
- Open `http://YOUR_WINDOWS_IP:5173`.
- Example: `http://192.168.1.10:5173`.

### 5. Persistent Server (Optional)
To run it in the background properly:

```bash
npm install -g pm2
pm2 start "npm run dev" --name homeflix
pm2 save
pm2 startup
```

## 📱 iOS Client
See `apps/ios/HomeFlix/README.md` for Xcode setup instructions.

## 🖥️ Desktop Client
See `apps/desktop/package.json` for build scripts (`npm run dist`).
