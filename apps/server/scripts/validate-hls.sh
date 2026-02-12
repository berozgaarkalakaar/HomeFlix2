#!/bin/bash
# Usage: ./validate-hls.sh <path/to/playlist.m3u8>

PLAYLIST=$1

if [ -z "$PLAYLIST" ]; then
    echo "Usage: $0 <path/to/playlist.m3u8>"
    exit 1
fi

echo "--- Validating: $PLAYLIST for Device Friendliness ---"

# 1. Check for INDEPENDENT SEGMENTS
if grep -q "#EXT-X-INDEPENDENT-SEGMENTS" "$PLAYLIST"; then
    echo "✅ EXT-X-INDEPENDENT-SEGMENTS found."
else
    echo "❌ EXT-X-INDEPENDENT-SEGMENTS missing. Segments may not be independently decodeable."
fi

# 2. Check Playlist Type
if grep -q "#EXT-X-PLAYLIST-TYPE:VOD" "$PLAYLIST"; then
    echo "✅ Playlist type is VOD."
elif grep -q "#EXT-X-PLAYLIST-TYPE:EVENT" "$PLAYLIST"; then
    echo "ℹ️  Playlist type is EVENT."
else
    echo "⚠️  Playlist type unspecified (Live default)."
fi

# 3. Target Duration Check
TARGET_DUR=$(grep "#EXT-X-TARGETDURATION" "$PLAYLIST" | cut -d: -f2 | tr -d '\r')
if [ -n "$TARGET_DUR" ] && [ "$TARGET_DUR" -gt 10 ]; then
     echo "❌ Target Duration is high: ${TARGET_DUR}s (Recommended <= 6-10s)"
     echo "   (This likely means keyframes are sparse. Use -force_key_frames)"
else
     echo "✅ Target Duration acceptable: ${TARGET_DUR}s"
fi

# 4. Version Check
VERSION=$(grep "#EXT-X-VERSION" "$PLAYLIST" | cut -d: -f2 | tr -d '\r')
if [ -n "$VERSION" ] && [ "$VERSION" -ge 3 ]; then
     echo "✅ HLS Version: $VERSION"
else
     echo "⚠️  HLS Version low/missing: ${VERSION:-Unknown}"
fi

echo "--- End Validation ---"
