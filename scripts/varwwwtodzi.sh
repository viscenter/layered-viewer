#/usr/bin/bash
rt="/var/www/layered-viewer/images/fullres-8bpc/"
for i in $(ls "$rt"); do
    mkdir "$i"
    for j in $(ls "$rt/$i"); do
        vips dzsave "$rt$i/$j" "$i/${j%.*}"
    done
done
