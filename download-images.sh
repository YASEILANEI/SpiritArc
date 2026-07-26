#!/usr/bin/env bash
# Download Rider-Waite-Smith tarot card images (public domain)
# Images sourced from Wikimedia Commons / public domain repositories
# Pamela Colman Smith died in 1951 — artwork is public domain worldwide

# Try multiple sources
CARD_DIR="client/public/cards/rw"
mkdir -p "$CARD_DIR"

echo "Downloading tarot card images..."

# Source 1: try raw.githubusercontent.com mirrors
BASE_URLS=(
  "https://raw.githubusercontent.com/seven102161/elaine-tarot-cards/main/public"
  "https://raw.githubusercontent.com/lalesleon13-hash/Tarot/main"
)

# Card mapping: id-name
CARDS=(
  "00-the-fool" "01-the-magician" "02-the-high-priestess" "03-the-empress"
  "04-the-emperor" "05-the-hierophant" "06-the-lovers" "07-the-chariot"
  "08-strength" "09-the-hermit" "10-wheel-of-fortune" "11-justice"
  "12-the-hanged-man" "13-death" "14-temperance" "15-the-devil"
  "16-the-tower" "17-the-star" "18-the-moon" "19-the-sun"
  "20-judgement" "21-the-world"
)

# Minor Arcana: Ace to King for each suit
SUITS=("wands" "cups" "swords" "pentacles")
NUMBERS=("ace" "2" "3" "4" "5" "6" "7" "8" "9" "10" "page" "knight" "queen" "king")

download_card() {
  local name="$1"
  local dest="$CARD_DIR/$name.jpg"
  if [ -f "$dest" ] && [ -s "$dest" ]; then
    return 0
  fi
  for base in "${BASE_URLS[@]}"; do
    for ext in "jpg" "png"; do
      url="$base/$name.$ext"
      if curl -sfL "$url" -o "$dest" 2>/dev/null; then
        echo "  ✓ $name.$ext"
        return 0
      fi
    done
  done
  echo "  ✗ $name (not found)"
  return 1
}

# Download Major Arcana
echo "Major Arcana:"
for card in "${CARDS[@]}"; do
  download_card "$card"
done

# Download Minor Arcana
echo "Minor Arcana:"
for suit in "${SUITS[@]}"; do
  for num in "${NUMBERS[@]}"; do
    download_card "$num-of-$suit"
  done
done

echo ""
echo "Done! $(ls "$CARD_DIR"/*.jpg 2>/dev/null | wc -l) / 78 cards downloaded."
