# made only for chad gospels
# run from /data/images

import json, os

directories = os.listdir('.')
directories.remove(__file__)

images = {}
for directory in directories:
    for filename in os.listdir(directory):
        filename = filename.split('.')[0]
        volumeID, pageNumInsideVersion, folioID, version = filename.split('-')
        if folioID not in images:
            images[folioID] = []
        images[folioID].append([version, "data/dzi/"+filename+".dzi"])

names = sorted(images.keys())
for name in names:
    images[name] = sorted(images[name])
names.insert(0, names.pop())
names.insert(0, names.pop())
names.insert(0, names.pop(-2))
names.insert(0, names.pop())
names.insert(len(names), names.pop(240))
names.insert(len(names), names.pop(240))

final = []
for name in names:
    final.append([name, images[name]])

pages = {}
pages["pages"] = []
for [name, images] in final:
    pages["pages"].append({name: []})
    for [imagename, dziname] in images:
        pages["pages"][-1].append({imagename: dziname})
    

open("chad.json", "w").write(json.dumps(pages, indent=4, separators=(',',': ')))
