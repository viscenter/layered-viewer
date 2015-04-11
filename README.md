# Overview of contents
###client
The bulk of the project code is found here.

- css: stylesheets for the webpage
- external: JavaScript libraries we are importing
- js: the primary functional file of the project, handles the layered-viewer interface
- test/data: test images and structure file used for development
- index.html: the home page of the interface

###data
On the production server (infoforest.vis.uky.edu) this holds the entire set of images of the Chad Gospels manuscript. In this repository it simply holds the Chad image set structure file (chad.json).

###scripts
One time use scripts used for managing specific sets of data such as the Chad manuscripts. 

- chad2json.py: created to go through the Chad Manuscript image files and store their structure in a json file
- varwwwtodzi.sh: created to go through the Chad Manuscript image files and convert them into a Deep Zoom Image format

###Issues
Check the [issues page](https://github.com/viscenter/layered-viewer/issues) to stay up to date with our current work.
