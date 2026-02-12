#!/bin/bash
# 1. Create Library
curl -X POST http://localhost:3001/api/v1/libraries \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Movies", "type": "movie", "path": "/Users/puneet/gemini/antigravity/scratch/HomeFlix2.0/test_media"}'

# 2. Wait for scan (async)
sleep 2

# 3. List Items
curl http://localhost:3001/api/v1/library/items
