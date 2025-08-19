---
title: "Not Goblins: Runde 1"
date: 2024-03-17
---
## Die Auswertung

Some examples to demonstrate the crmap shortcode.

### Map with details:
{% crmap './reports/template/1234-bLa.cr' %} 

{% crmap_rdetails %}
...
{% crmap_udetails %}
Orders:
{% crmap_commands%}

### Map only:
{% crmap './reports/template/334-42.cr' '{ "crid": "map1", "details": false }' %}

### Another Map: 
{% crmap './reports/template/1000-demo.cr' '{ "crid": "eressea_1000" }' %}
{% crmap './reports/template/1000-demo.cr' '{ "crid": "astral", "layer": 1, "caption": "Astralraum" }'  %}
<!-- the details shortcode always listens to the last crmap by default. If you provide an id ('eressea_1000') you can specify which map details you want to display. You can also specify another placeholder value used before a region has been clicked. -->
{% crmap_rdetails 'eressea_1000' '' %} <!-- no placeholder wanted -->
<!-- no unit details -->
{% crmap_commands 'eressea_1000' '' %} <!-- no placeholder wanted -->

<!-- just the astral space map -->
{% crmap_rdetails 'astral' '' %}

### Map not found error:
{% crmap './reports/template/334-424242.cr' %}
