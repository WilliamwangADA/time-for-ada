#!/bin/bash
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
echo "======================================"
echo "  iPad Safari 打开: http://$IP:8080/index.html"
echo "======================================"
python3 -m http.server 8080
