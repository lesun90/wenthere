#!/bin/sh
set -e

# Download GeoJSON data if not present (skipped on subsequent starts)
if [ ! -f "public/geojson/countries.json" ]; then
  echo "  Downloading GeoJSON map data..."
  mkdir -p public/geojson
  wget -qO public/geojson/countries.json \
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
  wget -qO public/geojson/regions.json \
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson"
  echo "  GeoJSON ready."
fi

npm install --prefer-offline --silent

npm run dev 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line"
  case "$line" in
    *"Ready in"*)
      printf '\n\033[1m  → http://localhost:3000\033[0m\n\n'
      ;;
  esac
done
