// crs.js
const fs = require('fs');
const path = require('path');

// Color and image mappings from PHP
const colors = {
  'default': 'grey',
  'Ozean': '#0000ff',
  'Ebene': '#ffff00',
  'Wald': '#00dd00',
  'Sumpf': '#226611',
  'Berge': '#777777',
  'Hochland': '#ffeeaa',
  'Wüste': '#ffcc55',
  'Gletscher': '#bbbbcc',
  'Eisberg': '#eeeeff',
  'Vulkan': '#bb0022',
  'Aktiver Vulkan': '#ee0022',
  'Feuerwand': '#ff0000',
};

const images = {
  'Ozean': 'ozean',
  'Ebene': 'ebene',
  'Wald': 'wald',
  'Sumpf': 'sumpf',
  'Berge': 'berge',
  'Hochland': 'hochland',
  'Wüste': 'wueste',
  'Gletscher': 'gletscher',
  'Eisberg': 'eisberg',
  'Vulkan': 'vulkan',
  'Aktiver Vulkan': 'aktiver vulkan',
  'Feuerwand': 'feuerwand',
  'Nebel': 'nebel',
  'Dichter Nebel': 'dichter nebel',
  'Packeis': 'packeis',
  'Gang': 'gang',
  'Halle': 'halle',
  'Wand': 'wand',
};

const defaultImage = 'region';

let crids = [];
let cridCounter = 0;
let cridOwners = {}; // crid -> template inputPath

function validateCrid(id) {
  if (typeof id !== 'string') return { ok: false, message: 'crid must be a string' };
  if (id !== id.toLowerCase()) return { ok: false, message: `crid '${id}' must be lowercase` };
  if (!/^[a-z0-9_-]+$/.test(id)) return { ok: false, message: `crid '${id}' contains invalid characters (allowed: a-z 0-9 _ -)` };
  return { ok: true };
}

function getColor(terrain) {
  return colors[terrain] || colors['default'];
}

function getImage(terrain) {
  return images[terrain] || null;
}

const rwidth = 100;
const yoff = rwidth * 0.5;

function transformx(region) {
  return Math.round(region.x * rwidth + region.y * yoff);
}
function transformy(region) {
  return Math.round(region.y * -rwidth * 3 / 4);
}

function itoa36(num) {
  return num.toString(36);
}

function parseFaction(line, matches) {
  const parts = line.trim().split(/\s+/);
  const numid = parseInt(matches[1], 10);
  const faction = { id: itoa36(numid), numid, tags: {} };
  console.log("found faction ", faction);

  return faction;
}

function parseRegion(line, matches) {
  const parts = line.trim().split(/\s+/);
  // Use plain objects for tags & units (units keyed by id)
  const region = { tags: {}, units: {} };
  region.x = parseInt(matches[1], 10);
  region.y = parseInt(matches[2], 10);
  if (matches[3]) region.z = parseInt(matches[3], 10); else region.z = 0;
  console.log("found region ", region);

  return region;
}

function parseUnit(line, matches) {
  const parts = line.trim().split(/\s+/);
  const unit = { id: itoa36(parseInt(matches[1], 10)), name: '???', tags: {}, skills: {}, items: {}, commands: [] };
  console.log("found unit ", unit);

  return unit;
}

function outputRegion(region, bounds, crid, withDetails, ownerFactionId) {
  if (!region) return '';
  if (!region.tags.Terrain) return '';
  let color = getColor(region.tags.Terrain);
  let tag = getImage(region.tags.Terrain);
  if (!tag) {
    tag = defaultImage;
    color = `fill=\"${color}\"`;
  } else {
    color = '';
  }
  const xx = region.x;
  const yy = region.y;
  const x = transformx(region);
  const y = transformy(region);
  let tt = region.tags.Name ? region.tags.Name : region.tags.Terrain;
  tt += ` (${xx}, ${yy})`;
  // We no longer build HTML inside <desc>; we will store JSON in data-* attributes.
  // console.log('tags ', region.tags);


  // Prepare JSON payloads
  let regionData = {};
  if (withDetails) {
    regionData = { x: region.x, y: region.y, tags: region.tags };
  }

  let id = 'r_';
  id += xx < 0 ? `m${-xx}` : xx;
  id += yy < 0 ? `_m${-yy}` : `_${yy}`;
  id += `_${crid}`;
  // Update bounds
  bounds.xmin = Math.min(bounds.xmin, x);
  bounds.ymin = Math.min(bounds.ymin, y);
  bounds.xmax = Math.max(bounds.xmax, x);
  bounds.ymax = Math.max(bounds.ymax, y);
  // console.log(region.units);
  let unitsMarkup = '';
  let unitsData = [];
  if (withDetails && Object.keys(region.units).length > 0) {
    unitsData = Object.entries(region.units).map(([id, unit]) => {
      return {
        id: unit.id,
        name: unit.tags.Name || unit.id,
        faction: unit.faction ? unit.faction.id : null,
        factionName: unit.factionName || null,
        isOwner: ownerFactionId && unit.faction && unit.faction.id === ownerFactionId ? true : false,
        tags: unit.tags,
        skills: unit.skills || {},
        items: unit.items || {},
        commands: unit.commands || []
      };
    });
    // Keep a single <use> for units icon location (optional)
    unitsMarkup = `<use xlink:href="#units" x="${x}" y="${y}" data-units="${encodeURIComponent(JSON.stringify(unitsData))}"></use>`;
  }

  // onmousemove="showTooltip(evt, '${tt}');"
  // onmouseout="hideTooltip();"
  // onclick = "showDescription(event, '${desc}');" 
  const regionDataAttr = withDetails ? ` data-region="${encodeURIComponent(JSON.stringify(regionData))}"` : '';
  const clickHandler = withDetails ? ` onclick="showDescription(event, 'rdetails_${crid}', '${id}');"` : '';
  return `<a href="#${id}" onmousemove="showTooltip(evt, 'tooltip_${crid}', '${tt}');" onmouseout="hideTooltip('tooltip_${crid}');"${clickHandler}>` +
    `<use xlink:href="#${tag}" id="${id}" x="${x}" y="${y}" ${color}${regionDataAttr} data-crid="${crid}"><title>${tt}</title></use>\n` +
    unitsMarkup + `</a>`;

}


function includeImage(image) {
  // Looks for images/<image>.svg and includes its content as a <g id='image'>...</g>
  const imgPath = path.resolve(process.cwd(), 'images', image + '.svg');
  if (fs.existsSync(imgPath)) {
    let contents = fs.readFileSync(imgPath, 'utf8');
    // Extract only the inner SVG content (remove outer <svg> tags)
    const match = contents.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    contents = match ? match[1] : contents;
    return `    <g id='${image}'>${contents}    </g>`;
  } else {
    // Optionally log a warning or just skip
    // console.warn(`Warning: Image not found: ${imgPath}`);
    return `    <g id='${image}'><polygon points="50 0,100 25,100 75,50 100,0 75,0 25" stroke="yellow" stroke-width="1" fill="grey" /></g>\n`;
  }
}

function outputFront(bounds) {
  // SVG header and region polygon definition, plus terrain images
  let svg =
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<svg xmlns:svg="http://www.w3.org/2000/svg"\n` +
    `     xmlns="http://www.w3.org/2000/svg"\n` +
    `     xmlns:xlink="http://www.w3.org/1999/xlink"\n` +
    `     width="${(bounds.xmax - bounds.xmin + 110) / 2}"\n` +
    `     height="${(bounds.ymax - bounds.ymin + 110) / 2}"\n` +
    `     viewBox="${bounds.xmin - 5} ${bounds.ymin - 5} ${bounds.xmax - bounds.xmin + 110} ${bounds.ymax - bounds.ymin + 110}">\n` +
    `  <defs>\n` +
    `    <g id='region'>\n` +
    `      <polygon points="50 0,100 25,100 75,50 100,0 75,0 25" stroke="black" stroke-width="1" />\n` +
    `    </g>\n`;
  // Include all terrain images
  console.log(`Including terrain images...`);
  for (const terrain in images) {
    console.log(`Including terrain: ${terrain}`);
    if (Object.prototype.hasOwnProperty.call(images, terrain)) {
      svg += includeImage(images[terrain]);
    }
  }
  svg += includeImage('units');
  svg += `  </defs>\n  <g>\n`;
  return svg;
}

function outputBack() {
  return '</g>\n</svg>';
}

function parseSkill(key) {
  return parseInt(key.trim().split(/\s+/)[1], 10);
}

function parseItem(key) {
  return parseInt(key.trim(), 10);
}

// Report class encapsulating all regions and their units
class Report {
  constructor(crid, name, withDetails = true) {
    this.crid = crid;
    this.name = name || `Report ${crid}`;
    this.tags = {};
    this.owner = null;
    this.regions = [];
    this.factions = [];
    this.withDetails = withDetails;
  }

  addFaction(faction) {
    this.factions.push(faction);
    return faction;
  }

  addRegion(region) {
    this.regions.push(region);
    return region;
  }

  addUnit(region, unit) {
    region.units[unit.id] = unit;
    return unit;
  }

  static parse(filePath, crid, name, withDetails = true, zFilter = 0) {
    console.log(`Processing CR file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const pregRegion = /^REGION (-?\d+) (-?\d+)(?: (-?\d+))?$/;
    const pregTagq = /^"(.*)";(.*)$/;
    const pregTag = /^(.*);(.*)$/;
    const pregBlock = /^([A-Z]+)\s*(.*)$/;
    const pregQString = /^"(.*)"$/;
    const pregUnit = /^EINHEIT (\d+)$/;
    const pregFaction = /^PARTEI (\d+)$/;

    const report = new Report(crid, name, withDetails);
    let block = 'ERESSEA';
    let currentUnit = null, currentRegion = null, currentFaction = null;
    for (let line of lines) {
      let tag = null, value = null, matches;
      if ((matches = pregFaction.exec(line))) {
        block = 'FACTION';
        currentRegion = null;
        currentUnit = null;
        currentFaction = report.addFaction(parseFaction(line, matches));
        if (!report.owner) {
          report.owner = currentFaction;
        }
        continue;
      }
      if ((matches = pregRegion.exec(line))) {
        block = 'REGION';
        currentFaction = null;
        currentUnit = null;
        const reg = parseRegion(line, matches);
        console.log(`parsing region ${reg.id} with z=${reg.z}, needs to match ${zFilter}`);
        if ((reg.z || 0) === (zFilter || 0)) {
          currentRegion = report.addRegion(reg);
        } else {
          // Skip this region's subsequent UNIT/TAG blocks by keeping currentRegion null
          currentRegion = null;
        }
        continue;
      }

      if (currentRegion && (matches = pregUnit.exec(line))) {
        block = 'UNIT';
        currentUnit = report.addUnit(currentRegion, parseUnit(line, matches));

        continue;
      }
      if ((matches = pregQString.exec(line))) {
        tag = true;
        value = matches[1];
      } else if ((matches = pregTagq.exec(line))) {
        value = matches[1]; tag = matches[2];
      } else if ((matches = pregTag.exec(line))) {
        value = matches[1]; tag = matches[2];
      } else if ((matches = pregBlock.exec(line))) {
        block = matches[1];
        continue;
      }
      if (!tag) continue;
      if (block === 'ERESSEA') {
        report.tags[tag] = value;
      } else if (block == 'FACTION' && currentFaction) {
        currentFaction.tags[tag] = value;
      } else if (block === 'REGION' && currentRegion) {
        currentRegion.tags[tag] = value;
      } else if (block === 'UNIT' && currentUnit && currentRegion) {
        currentUnit.tags[tag] = value;
        currentRegion.units[currentUnit.id] = currentUnit;
      } else if (block === 'TALENTE' && currentUnit) {
        currentUnit.skills = currentUnit.skills || {};
        currentUnit.skills[tag] = parseSkill(value);
      } else if (block === 'GEGENSTAENDE' && currentUnit) {
        currentUnit.items = currentUnit.items || {};
        currentUnit.items[tag] = parseItem(value);
      } else if (block === 'COMMANDS' && currentUnit) {
        currentUnit.commands = currentUnit.commands || [];
        // Remove surrounding quotes if present
        let cmd = value;
        if (cmd.length > 1 && ((cmd.startsWith('"') && cmd.endsWith('"')) || (cmd.startsWith("'") && cmd.endsWith("'")))) {
          cmd = cmd.slice(1, -1);
        }
        currentUnit.commands.push(cmd);
      }
    }


    // Resolve unit factions (Partei tag) to actual faction objects & names
    const factionIndexByNum = {};
    for (const f of report.factions) factionIndexByNum[f.numid] = f;
    for (const region of report.regions) {
      for (const unit of Object.values(region.units)) {
        if (unit.tags && unit.tags.Partei) {
          const fid = parseInt(unit.tags.Partei, 10);
          if (!isNaN(fid) && factionIndexByNum[fid]) {
            unit.faction = factionIndexByNum[fid];
            unit.factionName = factionIndexByNum[fid].tags.Parteiname || factionIndexByNum[fid].id;
          }
        }
      }
    }
    return report;
  }
  computeBounds() {
    const bounds = { xmin: Infinity, ymin: Infinity, xmax: -Infinity, ymax: -Infinity };
    for (const r of this.regions) {
      const x = transformx(r);
      const y = transformy(r);
      bounds.xmin = Math.min(bounds.xmin, x);
      bounds.ymin = Math.min(bounds.ymin, y);
      bounds.xmax = Math.max(bounds.xmax, x);
      bounds.ymax = Math.max(bounds.ymax, y);
    }
    if (!isFinite(bounds.xmin)) { // empty safeguard
      bounds.xmin = bounds.ymin = 0;
      bounds.xmax = bounds.ymax = 100;
    }
    return bounds;
  }
  toSVG() {
    const bounds = this.computeBounds();
    let body = '';
    const ownerFactionId = this.owner ? this.owner.id : null;
    for (const r of this.regions) {
      body += outputRegion(r, bounds, this.crid, this.withDetails, ownerFactionId);
    }
    return outputFront(bounds) + body + outputBack();
  }
}

module.exports = function (eleventyConfig) {
  // Usage examples (positional order: file, id, details, layer, caption):
  //   {% crmap 'path/to/file.cr' %}                         -> auto numeric crid, details true, layer 0
  //   {% crmap 'path/to/file.cr' 'map1' %}                  -> explicit crid
  //   {% crmap 'path/to/file.cr' 'map1' false %}            -> explicit crid, no details (tooltips only)
  //   {% crmap 'path/to/file.cr' 'map1' true 2 %}           -> explicit crid, details, layer z=2 (auto caption)
  //   {% crmap 'path/to/file.cr' 'map1' true 2 'My Caption'%} -> custom caption
  //   {% crmap 'path/to/file.cr' 'map1' true 2 false %}     -> omit caption entirely
  //   {% crmap 'path/to/file.cr' '' true 1 %}               -> auto crid, details, layer z=1 (empty id)
  // Object/options form (backwards compatible):
  //   {% crmap 'path/to/file.cr' { crid: 'map1', details: false, z: 1, caption: 'Custom' } %}
  //   {% crmap 'path/to/file.cr' { caption: false } %}      -> omit caption
  // Notes:
  //   - layer (z) defaults to 0; regions without z are treated as z=0.
  //   - id (crid) must be lowercase a-z 0-9 _ - ; empty string means auto.
  //   - details:false omits region/unit descriptions and links but keeps tooltips.
  //   - caption: string for custom text; false to omit figcaption.
  //   - Previous two-argument usage (file, optionsObject|stringId) still works.
  // Optional detail containers (place anywhere after the map):
  //   {% crmap_rdetails 'map1' %}    -> region details target div
  //   {% crmap_udetails 'map1' %}    -> unit details target div
  //   {% crmap_commands 'map1' %}    -> unit commands target div
  // Notes:
  //   - crid must be lowercase a-z 0-9 _ -
  //   - Duplicate custom crid returns an inline error.
  //   - details:false omits region/unit descriptions and links but keeps tooltips.
  eleventyConfig.addShortcode('crmap', function (file, idArg, detailsArg, layerArg, captionArg) {
    // file is relative to the project root or input dir
    try {
      let requestedCrid; // explicit id
      let detailsOption = true; // default include details
      let zOption = 0; // default layer 0
      let captionOption; // undefined -> auto, string -> custom, false -> omit

      // Backward compatibility: if idArg is a JSON-like options string or object, treat as options
      if (idArg && typeof idArg === 'string' && idArg.trim().startsWith('{')) {
        let raw = idArg.trim();
        try {
          const normalized = raw
            .replace(/([,{]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
            .replace(/'/g, '"');
          idArg = JSON.parse(normalized);
        } catch (e) {
          return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">Invalid options object: ${e.message}</div>`;
        }
      }
      if (idArg && typeof idArg === 'object') {
        requestedCrid = idArg.crid || idArg.id || '';
        if (Object.prototype.hasOwnProperty.call(idArg, 'details')) {
          detailsOption = idArg.details !== false;
        }
        if (Object.prototype.hasOwnProperty.call(idArg, 'z')) {
          const zv = idArg.z;
          if (/^-?\d+$/.test(zv.toString())) zOption = parseInt(zv, 10);
        }
        if (Object.prototype.hasOwnProperty.call(idArg, 'caption')) {
          const c = idArg.caption;
          if (c === false) captionOption = false; else if (typeof c === 'string') captionOption = c;
        }
      } else {
        // Positional parsing: file, id, details, layer
        if (typeof idArg === 'string') {
          requestedCrid = idArg; // may be '' meaning auto
        } else if (idArg === false) {
          detailsOption = false;
        }
        // details argument
        if (typeof detailsArg !== 'undefined') {
          if (detailsArg === false || detailsArg === 'false') detailsOption = false;
          else if (detailsArg === true || detailsArg === 'true') detailsOption = true;
          else if (typeof detailsArg === 'number') {
            // If number given in details slot, treat as layer when layerArg missing
            zOption = parseInt(detailsArg, 10) || 0;
          } else if (typeof detailsArg === 'string' && !/^-?\d+$/.test(detailsArg) && detailsArg !== 'true' && detailsArg !== 'false') {
            // Treat as caption if a free-form string
            captionOption = detailsArg;
          }
        }
        // layer argument
        if (typeof layerArg !== 'undefined') {
          if (/^-?\d+$/.test(layerArg.toString())) zOption = parseInt(layerArg, 10);
          else if (layerArg === false) captionOption = false;
          else if (typeof layerArg === 'string') captionOption = layerArg;
        }
        // explicit caption fifth param
        if (typeof captionArg !== 'undefined') {
          if (captionArg === false) captionOption = false;
          else if (typeof captionArg === 'string') captionOption = captionArg;
        }
      }
      if (requestedCrid === '') {
        requestedCrid = undefined; // force auto
      }

      let crid;
      if (requestedCrid) {
        crid = requestedCrid.toString();
        const valid = validateCrid(crid);
        if (!valid.ok) {
          console.warn(valid.message);
          return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">${valid.message}</div>`;
        }
        if (crids.includes(crid)) {
          const owner = cridOwners[crid];
          const current = this && this.page ? this.page.inputPath : 'unknown';
          if (owner && owner !== current) {
            const msg = `Duplicate crid '${crid}' already used by ${owner} (current: ${current})`;
            console.warn(msg);
            return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">${msg}</div>`;
          }
          // Same template rebuilding: allow silently
        }
        console.log(`Processing CR file with provided crid=${crid}: ${file}`);
      } else {
        crid = (++cridCounter).toString();
        console.log(`Processing CR file ${crid}: ${file}`);
      }
      if (!crids.includes(crid)) crids.push(crid);
      if (this && this.page) {
        cridOwners[crid] = this.page.inputPath;
      }
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return `<div style="max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;">File not found: ${file}</div>`;
      }
      const reportName = path.basename(filePath, path.extname(filePath));
      const report = Report.parse(filePath, crid, reportName, detailsOption, zOption);
      const svg = report.toSVG();
      let caption = '';
      if (captionOption === false) {
        caption = null;
      } else if (typeof captionOption === 'string') {
        caption = captionOption;
      } else {
        caption = report.name + (report.owner ? `, ${report.owner.tags.Parteiname} (${report.owner.id})` : '');
      }

      return `<script>window.crids = ${JSON.stringify(crids)};<\/script>\n` +
        `<figure class=\"cr-report\" data-crid=\"${crid}\">` +
        `<div class=\"cr-svg-wrapper\" style=\"max-width:100%; max-height:600px; overflow:auto; position:relative;\">${svg}</div>` +
        (caption ? `<figcaption class=\"cr-caption\">${caption}</figcaption>` : '') +
        `<div id=\"tooltip_${crid}\" class=\"cr-tooltip\" style=\"display:none; position:fixed; pointer-events:none; background:rgba(30,30,30,0.85); color:#fff; padding:2px 6px; border-radius:4px; font:12px/1.2 monospace; z-index:9999;\"></div>` +
        `</figure>`;
    } catch (e) {
      console.log(`Error processing file: ${filePath} `);
      return `< div style = "max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;" > Error: ${e.message}</div > `;
    }
  });

  // Shortcode to output region details container for a given crid
  eleventyConfig.addShortcode('crmap_rdetails', function (crid) {
    if (!crid) return '<div class="cr-error" style="color:#a00">crmap_rdetails: missing crid</div>';
    const v = validateCrid(crid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
    if (!crids.includes(crid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${crid}' (render map first)</div>`;
    }
    return `<div id=\"rdetails_${crid}\" class=\"cr-region-details\">Select a region.</div>`;
  });

  // Shortcode to output unit details container for a given crid
  eleventyConfig.addShortcode('crmap_udetails', function (crid) {
    if (!crid) return '<div class="cr-error" style="color:#a00">crmap_udetails: missing crid</div>';
    const v = validateCrid(crid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
    if (!crids.includes(crid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${crid}' (render map first)</div>`;
    }
    return `<div id=\"udetails_${crid}\" class=\"cr-unit-details\">Select a unit.</div>`;
  });

  // Shortcode to output unit commands container for a given crid
  eleventyConfig.addShortcode('crmap_commands', function (crid) {
    if (!crid) return '<div class="cr-error" style="color:#a00">crmap_commands: missing crid</div>';
    const v = validateCrid(crid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
    if (!crids.includes(crid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${crid}' (render map first)</div>`;
    }
    return `<div id=\"ucommands_${crid}\" class=\"cr-unit-commands\">Select a unit for commands.</div>`;
  });

  eleventyConfig.addPassthroughCopy("crs/crs-passthrough.js");

};
