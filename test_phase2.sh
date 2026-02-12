#!/bin/bash

BASE_URL="http://localhost:3001/api/v1"
MEDIA_DIR="/Users/puneet/gemini/antigravity/scratch/HomeFlix2.0/test_media"

# 1. Register User
echo "--- Registering User ---"
REGISTER_RES=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}')
echo $REGISTER_RES
TOKEN=$(echo $REGISTER_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Registration failed (maybe user exists?), trying login..."
  LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "password123"}')
  TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token: $TOKEN"
fi

# 2. Check Auth
echo "--- Checking Me ---"
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/auth/me

# 3. Create Library & Scan
echo "--- Creating Library ---"
LIB_RES=$(curl -s -X POST $BASE_URL/libraries \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Phase2 Lib\", \"type\": \"movie\", \"path\": \"$MEDIA_DIR\"}")
LIB_ID=$(echo $LIB_RES | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Library ID: $LIB_ID"

echo "Waiting for scan..."
sleep 5

# 4. Get Items & Check Metadata
echo "--- Fetching Items ---"
ITEMS_RES=$(curl -s $BASE_URL/library/items)
echo $ITEMS_RES
ITEM_ID=$(echo $ITEMS_RES | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ITEM_ID" ]; then
  echo "Target Item: $ITEM_ID"
  
  # 5. Check Tracks
  echo "--- Fetching Tracks ---"
  curl -s $BASE_URL/items/$ITEM_ID/tracks

  # 6. Start HLS Transcode
  echo "--- Starting HLS Transcode ---"
  TRANSCODE_RES=$(curl -s -X POST $BASE_URL/transcode/$ITEM_ID)
  echo $TRANSCODE_RES
  JOB_ID=$(echo $TRANSCODE_RES | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
  
  if [ -n "$JOB_ID" ]; then
       echo "Job Started: $JOB_ID"
       echo "Waiting for transcode..."
       sleep 10
       # Check master playlist existence (status code)
       echo "--- Checking Master Playlist ---"
       curl -I $BASE_URL/stream/hls/$JOB_ID/master.m3u8
  fi

  # 7. Check Poster
  echo "--- Checking Poster ---"
  curl -I $BASE_URL/items/$ITEM_ID/poster
fi
