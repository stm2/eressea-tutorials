---
title: "Not Goblins: Runde 1"
date: 2024-03-17
---
## Die Auswertung

Beispiele für die Darstellung von Karten, NRs, Befehlen mit crmap Shortcodes.

## Karte mit Details

Relative Pfade funktionieren, Quelldateien sollten automatisch zur erzeugten Seite kopiert werden, wenn nicht ist der Link zur cr-Datei tot.

{% crmap './reports/1234-bLa.cr' %}

{% crmap_rdetails %}
...
{% crmap_udetails %}
Orders:
{% crmap_commands%}

### Karte alleine

Alle Dateien in /reports werden im Projekt automatisch zur erzeugten Seite kopiert (`.eleventy.js:  eleventyConfig.addPassthroughCopy("reports");`) Hier funktioniert der Link.

{% crmap '/reports/template/334-42.cr' '{ "crid": "map1", "details": false }' %}

### Noch eine Karte mit Astralraum
{% crmap '/reports/template/1000-demo.cr' '{ "crid": "eressea_1000" }' %}
{% crmap '/reports/template/1000-demo.cr' '{ "crid": "astral", "layer": 1, "caption": "Astralraum" }'  %}
<!-- the details shortcode always listens to the last crmap by default. If you provide an id ('eressea_1000') you can specify which map details you want to display. You can also specify another placeholder value used before a region has been clicked. -->
{% crmap_rdetails 'eressea_1000' '' %} <!-- no placeholder wanted -->
<!-- no unit details -->
{% crmap_commands 'eressea_1000' '' %} <!-- no placeholder wanted -->

<!-- just the astral space map -->
{% crmap_rdetails 'astral' '' %}

### Fehlermeldungen, falls datei nicht vorhanden
{% crmap '/reports/template/334-424242.cr' %}


## Befehlsdateien mit Formatierung der Kommentare und Wikilinks

{% orderfile '/reports/template/befehle-42.txt' %}

... oder ohne Formatierung

{% orderfile '/reports/template/befehle-42.txt' '{ "commentsAsOrders": true, "markdownInComments": false }' %}


## NR-Abschnitte 

Einlesen:

{% readnr '/reports/template/334-42.nr' %} 

#### Liste aller gefundenen Abschnitte anzeigen

{% shownr 'list' %}

#### Headers / Regions / Outro
{% shownr 'intro' %}

{% shownr '{ "bookmark": "header",  "maxHeight" : "15em" }' %}

{% shownr '{ "bookmark": "regions",  "maxHeight" : "15em" }' %}

{% shownr 'outro' %}

#### Abschnitte
{% shownr 'heading_Ereignisse' %}

{% shownr 'heading_Kämpfe' %}

{% shownr 'heading_In_Cibifar_-20050_findet_ein_Kampf_statt' %}

#### Zeilen
{% shownr '10-20' %} 

#### Region
{% shownr 'region_-2005_0' %}
  
#### Einheit
{% shownr 'unit_mrv4' %}

### Beliebige Dateien

Wir können sogar beliebige Textdateien anzeigen.
{% readnr './reports/1234-bLa.cr' %}
{% shownr '{ "bookmark": "21-33", "lineNumbers" : true }' %}
