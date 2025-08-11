#!/bin/bash
# OBINexus Axis Repository Cleanup

echo "🧹 Cleaning OBINexus Axis Repository..."

# Remove all Zone.Identifier files
find . -name "*:Zone.Identifier" -type f -delete

# Create organized structure
mkdir -p {docs,diagrams,manifestos,scripts,assets}

# Reorganize files
mv rnd-zettel/*.pdf docs/ 2>/dev/null
mv rnd-zettel/*.txt diagrams/ 2>/dev/null
mv rnd-zettel/*.md manifestos/ 2>/dev/null
mv rnd-zettel/*.jpg assets/ 2>/dev/null

# Rename files to clean names
cd diagrams && for f in *.txt; do mv "$f" "${f%.txt}.puml" 2>/dev/null; done && cd ..
cd docs && for f in *; do mv "$f" "$(echo $f | tr '[:upper:]' '[:lower:]' | tr ' ' '-')" 2>/dev/null; done && cd ..

# Clean up
rm -rf rnd-zettel rnd-kastern
rm -f desktop.ini

echo "✅ Cleanup complete!"
