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

// Debug flag (enable with environment variable CRS_DEBUG=1)
const DEBUG = process.env.CRS_DEBUG === '1';
function debug(...args) { if (DEBUG) console.log('[crs]', ...args); }

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validation helper (stateless)
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
  debug("found faction", faction);

  return faction;
}

function parseRegion(line, matches) {
  const parts = line.trim().split(/\s+/);
  // Use plain objects for tags & units (units keyed by id)
  const region = { tags: {}, units: {} };
  region.x = parseInt(matches[1], 10);
  region.y = parseInt(matches[2], 10);
  if (matches[3]) region.z = parseInt(matches[3], 10); else region.z = 0;
  debug(`found region (${region.x},${region.y}, ${region.z})`);

  return region;
}

function parseUnit(line, matches) {
  const parts = line.trim().split(/\s+/);
  const unit = { id: itoa36(parseInt(matches[1], 10)), name: '???', tags: {}, skills: {}, items: {}, commands: [] };
  debug("found unit", unit.id);

  return unit;
}

function outputRegion(region, bounds, crid, withDetails, ownerFactionId) {
  debug('writing region ', region);
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

  // Prepare JSON payloads
  let regionData = {};
  if (withDetails) {
    regionData = { x: region.x, y: region.y, tags: region.tags };
  }

  let id = 'r_';
  id += xx < 0 ? `m${-xx}` : xx;
  id += yy < 0 ? `_m${-yy}` : `_${yy}`;
  id += `_${crid}`;

  bounds.xmin = Math.min(bounds.xmin, x);
  bounds.ymin = Math.min(bounds.ymin, y);
  bounds.xmax = Math.max(bounds.xmax, x);
  bounds.ymax = Math.max(bounds.ymax, y);

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
    // Keep a single <use> for units icon location
    unitsMarkup = `<use xlink:href="#units" x="${x}" y="${y}" data-units="${encodeURIComponent(JSON.stringify(unitsData))}"></use>`;
  }
  debug(`found units for region ${id}:`, unitsData);

  const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const regionDataAttr2 = withDetails ? ` data-region="${encodeURIComponent(JSON.stringify(regionData))}" data-region-target="rdetails_${crid}" data-region-id="${id}"` : '';
  return `<a href="#${id}" class="cr-region-link" data-tooltip-id="tooltip_${crid}" data-tooltip="${escAttr(tt)}" data-crid="${crid}"${regionDataAttr2}>` +
    `<use xlink:href="#${tag}" id="${id}" x="${x}" y="${y}" ${color} data-crid="${crid}"><title>${tt}</title></use>\n` +
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
  for (const terrain in images) {
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
    debug(`Processing CR file: ${filePath}`);
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
        debug(`parsing region (${reg.x},${reg.y}) with z=${reg.z}, needs to match ${zFilter}`);
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
  // Usage: SECOND ARGUMENT IS OPTIONAL JSON OPTIONS STRING.
  //   {% crmap 'path/to/file.cr' %}                                          -> defaults (auto crid, details true, z 0, auto caption)
  //   {% crmap 'path/to/file.cr' '{}' %}                                     -> same as defaults
  //   {% crmap 'path/to/file.cr' '{"crid":"map1"}' %}                    -> explicit crid
  //   {% crmap 'path/to/file.cr' '{"details":false}' %}                    -> no details (tooltips only)
  //   {% crmap 'path/to/file.cr' '{"layer":2}' %}                              -> layer z=2
  //   {% crmap 'path/to/file.cr' '{"caption":"My Caption"}' %}           -> custom caption
  //   {% crmap 'path/to/file.cr' '{"caption":false}' %}                    -> omit caption
  //   {% crmap 'path/to/file.cr' '{"crid":"m1","details":false,"layer":1,"caption":false}' %}
  // Option keys: crid (string), details (boolean), layer (integer), caption (string|false)
  // Rules:
  //   - crid must match /^[a-z0-9_-]+$/; if omitted => auto numeric.
  //   - details:false removes detail panels but keeps tooltips.
  //   - caption:false omits figcaption; caption:string sets custom text.
  //   - Unrecognized keys are ignored.
  // Optional detail containers (place anywhere after the map):
  //   {% crmap_rdetails 'map1' 'Optional placeholder text' %}    -> region details target div
  //   {% crmap_udetails 'map1' 'Optional placeholder text' %}    -> unit details target div
  //   {% crmap_commands 'map1' 'Optional placeholder text' %}    -> unit commands target div
  // Notes:
  //   - crid must be lowercase a-z 0-9 _ -
  //   - Duplicate custom crid returns an inline error.
  //   - details:false omits region/unit descriptions and links but keeps tooltips.
  eleventyConfig.addShortcode('crmap', function (file, optionsJson) {
    try {
      let requestedCrid; // explicit id
      let detailsOption = true; // default include details
      let zOption = 0; // default layer 0
      let captionOption; // undefined -> auto, string -> custom, false -> omit

      // Acquire per-page state (unique per template render)
      // Structure: { crids: Set, counter: number, lastCrid: string|null }
      let pageState;
      if (this && this.page) {
        this.ctx._crmapState = this.ctx._crmapState || {};
        pageState = this.ctx._crmapState;
        if (!pageState.crids) {
          pageState.crids = new Set();
          pageState.counter = 0;
          pageState.lastCrid = null;
        }
      } else {
        // Fallback isolated state (should be rare)
        pageState = { crids: new Set(), counter: 0, lastCrid: null };
      }

      // Treat missing or blank argument as '{}'
      if (typeof optionsJson === 'undefined' || (typeof optionsJson === 'string' && optionsJson.trim() === '')) {
        optionsJson = '{}';
      }
      if (typeof optionsJson === 'string') {
        try {
          const opts = JSON.parse(optionsJson);
          if (opts && typeof opts === 'object') {
            if (typeof opts.crid === 'string') requestedCrid = opts.crid;
            if (Object.prototype.hasOwnProperty.call(opts, 'details')) detailsOption = opts.details !== false;
            if (Object.prototype.hasOwnProperty.call(opts, 'layer')) {
              const layerValue = opts.layer;
              if (/^-?\d+$/.test(String(layerValue))) zOption = parseInt(layerValue, 10);
            }
            if (Object.prototype.hasOwnProperty.call(opts, 'caption')) {
              if (opts.caption === false) captionOption = false; else if (typeof opts.caption === 'string') captionOption = opts.caption;
            }
          }
        } catch (e) {
          return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">Invalid JSON options: ${escapeHtml(e.message)}</div>`;
        }
      } else {
        return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">Options must be a JSON string</div>`;
      }
      if (requestedCrid === '') requestedCrid = undefined; // force auto

      let crid;
      if (requestedCrid) {
        crid = requestedCrid.toString();
        const valid = validateCrid(crid);
        if (!valid.ok) {
          console.warn(valid.message);
          return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">${valid.message}</div>`;
        }
        if (pageState.crids.has(crid)) {
          const msg = `Duplicate crid '${crid}' already used on this page.`;
          console.warn(msg);
          return `<div class=\"cr-error\" style=\"color:#a00; font-family:monospace;\">${msg}</div>`;
        }
        debug(`Processing CR file with provided crid=${crid}: ${file}`);
      } else {
        // Incremental auto id per page
        crid = (++pageState.counter).toString();
        debug(`Processing CR file ${crid}: ${file}`);
      }
      pageState.crids.add(crid);
      pageState.lastCrid = crid;
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        debug(`File not found: ${filePath}`);
        return `<div style=\"max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;\">File not found: ${escapeHtml(file)}</div>`;
      }
      const reportName = path.basename(filePath, path.extname(filePath));
      const report = Report.parse(filePath, crid, reportName, detailsOption, zOption);
      const svg = report.toSVG();
      let caption = '';
      if (captionOption === false) {
        caption = null;
      } else if (typeof captionOption === 'string') {
        caption = captionOption; // keep raw for now, escape when injecting
      } else {
        caption = report.name + (report.owner ? `, ${report.owner.tags.Parteiname} (${report.owner.id})` : '');
      }

      // <class = "cr-report" is used as a marker to include css/js in layout!

  return `<script>window.crids = ${JSON.stringify(Array.from(pageState.crids))};<\/script>\n` +
        `<figure class=\"cr-report\" data-crid=\"${crid}\">` +
        `<div class=\"cr-svg-wrapper\">${svg}</div>` +
        (caption ? `<figcaption class=\"cr-caption\">${escapeHtml(caption)}</figcaption>` : '') +
        `<div id=\"tooltip_${crid}\" class=\"cr-tooltip\"></div>` +
        `</figure>`;
    } catch (e) {
      debug(`Error processing file: ${filePath} `, e);
      return `<div style=\"max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;\">Error: ${escapeHtml(e.message)}</div>`;
    }
  });

  // Shortcode to output region details container for a given crid

  eleventyConfig.addShortcode('crmap_rdetails', function (crid, placeholder = null) {
  // Access per-page state
  let pageState = this && this.ctx ? this.ctx._crmapState : null;
  let useCrid = crid;
  if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) return '<div class="cr-error" style="color:#a00">crmap_rdetails: missing crid (no crmap rendered yet)</div>';
  const v = validateCrid(useCrid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
  if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${useCrid}' (render map first)</div>`;
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a region for details.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"rdetails_${useCrid}\" class=\"cr-region-details\">${placeholder}</div>`;
  });

  // Shortcode to output unit details container for a given crid

  eleventyConfig.addShortcode('crmap_udetails', function (crid, placeholder = null) {
  let pageState = this && this.ctx ? this.ctx._crmapState : null;
  let useCrid = crid;
  if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) return '<div class="cr-error" style="color:#a00">crmap_udetails: missing crid (no crmap rendered yet)</div>';
  const v = validateCrid(useCrid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
  if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${useCrid}' (render map first)</div>`;
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a unit.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"udetails_${useCrid}\" class=\"cr-unit-details\">${placeholder}</div>`;
  });

  // Shortcode to output unit commands container for a given crid

  eleventyConfig.addShortcode('crmap_commands', function (crid, placeholder = null) {
  let pageState = this && this.ctx ? this.ctx._crmapState : null;
  let useCrid = crid;
  if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) return '<div class="cr-error" style="color:#a00">crmap_commands: missing crid (no crmap rendered yet)</div>';
  const v = validateCrid(useCrid.toString());
    if (!v.ok) return `<div class=\"cr-error\" style=\"color:#a00\">${v.message}</div>`;
  if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return `<div class=\"cr-error\" style=\"color:#a00\">Unknown crid '${useCrid}' (render map first)</div>`;
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a unit for commands.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"ucommands_${useCrid}\" class=\"cr-unit-commands\">${placeholder}</div>`;
  });

  eleventyConfig.addPassthroughCopy("crs/crs-passthrough.js");
  eleventyConfig.addPassthroughCopy({ "crs/crs.css": "css/crs.css" });

};
