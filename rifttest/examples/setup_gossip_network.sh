#!/bin/bash
# Setup distributed gossip network for code sharing

echo "Setting up OBINexus Gossip Network..."

# Start bootstrap nodes
gosilang --port 31337 --daemon &
BOOTSTRAP1=$!
sleep 1

gosilang --port 31338 --bootstrap "localhost:31337" --daemon &
BOOTSTRAP2=$!
sleep 1

gosilang --port 31339 --bootstrap "localhost:31337,localhost:31338" --daemon &
BOOTSTRAP3=$!

echo "Gossip network started with 3 nodes"
echo "Ports: 31337, 31338, 31339"

# Share initial cultural symbols
sleep 2
echo 'share nsibidi community "community: U+DB8FDCFB [0.88,0.75,0.50]"' | \
    gosilang --port 31340 --bootstrap "localhost:31337"

echo
echo "To connect: gosilang --bootstrap localhost:31337"
echo "To stop: kill $BOOTSTRAP1 $BOOTSTRAP2 $BOOTSTRAP3"
