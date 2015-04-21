# Author: Stephen Parsons and John Walker

# The Chad Gospels are stored as images on the customer's
# server. There are 5 directories of images, one of images taken in
# 2010 and 4 of images taken in other years which have been registered
# to the 2010 images. We need to store these as Deep Zoom Images
# (directories of subimages or tiles, with an XML description of the
# layout) so that the viewer can grab individual tiles at lower
# resolutions rather than the entire high resolution image.

# This script loads the images by filename and then writes a JSON file
# which contains the pages of the manuscript and their names, as well
# as where to find the corresponding DZIs for each layer.

# This script is meant for one-time use with the Chad Gospels only and
# should be run on the infoforest server from
# layered-viewer/data/images/.

import json, os

# get the directories of images and remove this script
directories = os.listdir('.')
if __file__ in directories:
	directories.remove(__file__)

# Map the folioID of each image to a list of versions and their DZI
# locations.
images = {}
for directory in directories:
    for filename in os.listdir(directory):
        filename = filename.split('.')[0]
        # The filename contains all of this information separated by hyphen.
        volumeID, pageNumInsideVersion, folioID, version = filename.split('-')
        if folioID not in images:
            # if we have yet to see this page, make a new entry
            images[folioID] = []
        # store the version name and the DZI location for this layer
        # of the page
        images[folioID].append([version, "/data/dzi/"+version+"/"+filename+".dzi"])

# Sort the folioIDs lexicographically to order the manuscript.
names = sorted(images.keys())
for name in names:
    images[name] = sorted(images[name])

# The Chad Gospels folioIDs are not quite exactly ordered
# lexicographically, so these are manual reorderings to make the pages
# in the correct order.
names.insert(0, names.pop())
names.insert(0, names.pop())
names.insert(0, names.pop(-2))
names.insert(0, names.pop())
names.insert(len(names), names.pop(240))
names.insert(len(names), names.pop(240))

# Map names of pages to their information in one big messy list.
final = []
for name in names:
    final.append([name, images[name]])

# Store this information in a more organized format with named fields
# that is appropriate for JSON output.
pages = {}
pages["pages"] = []
for [name, images] in final:
    pages["pages"].append({"name": name,
                           "entries": []})
    for [imagename, dziname] in images:
        pages["pages"][-1]["entries"].append({
                "version": imagename,
                "dzi": dziname,
                "pixelsPerMeter": 13000
        })
    
# Write the resulting data structure to chad.json with nice
# formatting.
open("chad.json", "w").write(json.dumps(pages, indent=4, separators=(',',': ')))
