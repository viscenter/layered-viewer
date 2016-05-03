#/usr/bin/bash

# Author: John Walker
# Big Idea:
# This is a one-off script I wrote for generating a collection
# of dzis from a collection of png images. It is noisy, and will
# shout at you if the directories it makes already exists. It
# traverses the directories in the root 'rt'. I am not a bash
# expert, so I am probably doing bad things here.

# The only important thing to note here is that vips from
# the libvips-tools Ubuntu package does all the hard work when
# it comes to generating an individual dzi.

rt="/var/www/layered-viewer/images/fullres-8bpc/"
for i in $(ls "$rt"); do
    mkdir "$i"
    for j in $(ls "$rt/$i"); do
        vips dzsave "$rt$i/$j" "$i/${j%.*}"
    done
done
