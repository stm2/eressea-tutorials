---
title: "Not Goblins: Runde 1"
date: 2024-03-17
---
# Runde 1
## Die Auswertung

Some examples to demonstrate the crmap shortcode.

### Map with details:
{% crmap './template/crs/1234-bLa.cr' %} 

{% crmap_rdetails %}
...
{% crmap_udetails %}
Orders:
{% crmap_commands%}

### Map only:
{% crmap './template/crs/334-42.cr' '{ crid: "map1", details: false }' %}

### Another Map: 
{% crmap './template/crs/1000-demo.cr' 'eressea_1000' %}
{% crmap './template/crs/1000-demo.cr' '{ crid: "astral", z: 1, caption: "Astralraum" }'  %}
<!-- the details shortcode always listens to the last crmap by default. If you provide an id ('eressea_1000') you can specify which map details you want to display. You can also specify another placeholder value used before a region has been clicked. -->
{% crmap_rdetails 'eressea_1000' '' %} <!-- no placeholder wanted -->
<!-- no unit details -->
{% crmap_commands 'eressea_1000' '' %} <!-- no placeholder wanted -->

<!-- just the astral space map -->
{% crmap_rdetails 'astral' '' %}

### Map not found error:
{% crmap './template/crs/334-424242.cr' %}
