# Registered Image Viewer
A web interface for viewing and comparing multi-version, multi-page documents. Originally developed for the presentation of historical documents that have been imaged diachronically.

A live demo is available [here](http://infoforest.vis.uky.edu/).

This work is presented in the article:
Parsons, Stephen, C. Seth Parker, and W. Brent Seales. "The St. Chad Gospels: Diachronic Manuscript Registration and Visualization." Manuscript Studies: A Journal of the Schoenberg Institute for Manuscript Studies 2.2 (2017): 483-498.

# Overview of contents
##css
Stylesheets for the webpage.

##data
On the production server (infoforest.vis.uky.edu) this holds the entire set of images of the Chad Gospels manuscript. In this repository it simply holds the Chad image set structure file (chad.json), and some test images.

##external
Javascript libraries we are importing.

##extras
Extra graphics and scripts used for managing data and for the viewer, including the following:

- chad2json.py: created to go through the Chad Manuscript image files and store their structure in a json file
- varwwwtodzi.sh: created to go through the Chad Manuscript image files and convert them into a Deep Zoom Image format

##images
Images used in the viewer interface.

##js
The primary functional file of the project, handles the layered-viewer interface.

##index.html
The home page of the interface.

#Development
The viewer can be modified by working with the included html, css and JavaScript files, as it is a static webpage. Following any changes to the JavaScript, build.sh should be run to update the minified js files used.

#Issues
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
