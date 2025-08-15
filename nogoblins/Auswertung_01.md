---
author: "enno"
title: "Not Goblins: Runde 1"
date: 2024-03-17
---
# Runde 1
## Die Auswertung

Map only:
{% crmap './nogoblins/crs/334-42.cr' '{ crid: "map1", details: false }' %}

Map with details:
{% crmap './nogoblins/crs/334-42.cr' '42' %} 

{% crmap_rdetails '42' %}
...
{% crmap_udetails '42' %}


Map not found error:
{% crmap './nogoblins/crs/334-424242.cr' %}

Another Map:
{% crmap './nogoblins/crs/1000-demo.cr' 'eressea_1000' %}
{% crmap_rdetails 'eressea_1000' %}
{% crmap_udetails 'eressea_1000' %}

{% crmap './nogoblins/crs/1000-demo.cr' '{ z: 1, caption: "Astralraum" }'  %}


Lore ipsum 1... 