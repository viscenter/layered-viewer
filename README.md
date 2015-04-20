# Overview of contents
##client
The bulk of the project code is found here.

- css: stylesheets for the webpage
- external: JavaScript libraries we are importing
- js: the primary functional file of the project, handles the layered-viewer interface
- test/data: test images and structure file used for development
- index.html: the home page of the interface

##data
On the production server (infoforest.vis.uky.edu) this holds the entire set of images of the Chad Gospels manuscript. In this repository it simply holds the Chad image set structure file (chad.json).

##scripts
One time use scripts used for managing specific sets of data such as the Chad manuscripts. 

- chad2json.py: created to go through the Chad Manuscript image files and store their structure in a json file
- varwwwtodzi.sh: created to go through the Chad Manuscript image files and convert them into a Deep Zoom Image format

##Issues
Check the [issues page](https://github.com/viscenter/layered-viewer/issues) to stay up to date with our current work.

Copyright (C) 2015 Thomas Loy, Stephen Parsons, and John Walker

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
