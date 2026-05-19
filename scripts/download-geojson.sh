#!/usr/bin/env bash
set -e

DEST="public/geojson"
mkdir -p "$DEST"

echo "Downloading Natural Earth country boundaries (110m)..."
curl -sL \
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" \
  -o "$DEST/countries.json"

echo "Downloading Natural Earth state/province boundaries (10m)..."
curl -sL \
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson" \
  -o "$DEST/regions.json"

echo "Done. Files saved to $DEST/"
echo "  countries.json: $(wc -c < "$DEST/countries.json" | tr -d ' ') bytes"
echo "  regions.json:   $(wc -c < "$DEST/regions.json" | tr -d ' ') bytes"
