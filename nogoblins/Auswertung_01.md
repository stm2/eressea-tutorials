---
author: "enno"
title: "Not Goblins: Runde 1"
date: 2024-03-17
---
# Runde 1
## Die Auswertung

Some examples to demonstrate the crmap shortcode.

Map only:
{% crmap './nogoblins/crs/334-42.cr' '{ crid: "map1", details: false }' %}

Map with details:
{% crmap './nogoblins/crs/1234-bLa.cr' 'bla' %} 

{% crmap_rdetails 'bla' %}
...
{% crmap_udetails 'bla' %}
Orders:
{% crmap_commands 'bla' %}


Another Map:
{% crmap './nogoblins/crs/1000-demo.cr' 'eressea_1000' %}
{% crmap_rdetails 'eressea_1000' %}
{% crmap_commands 'eressea_1000' %}

{% crmap './nogoblins/crs/1000-demo.cr' '{ z: 1, caption: "Astralraum" }'  %}



Map not found error:
{% crmap './nogoblins/crs/334-424242.cr' %}

