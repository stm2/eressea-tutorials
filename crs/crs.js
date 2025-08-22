// crs.js
const fs = require('fs');
const path = require('path');
const { start } = require('repl');

// Library version (update when changing public shortcode behavior)
const CRS_VERSION = '0.2.2';
// Export version for external use (e.g., in layouts via require) and add as global data below
module.exports.CRS_VERSION = CRS_VERSION;

module.exports = function (eleventyConfig) {
  // Provide version to all templates as 'crmapVersion'
  if (eleventyConfig.addGlobalData) {
    eleventyConfig.addGlobalData('crmapVersion', CRS_VERSION);
  }

  // crmap: render a CR file to an interactive SVG map.
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
    return crmapShortcode.call(this, file, optionsJson);
  });

  // Shortcode to output region details container for a given (or last created) crid
  eleventyConfig.addShortcode('crmap_rdetails', function (crid, placeholder = null) {
    return crmapRdetailsShortcode.call(this, crid, placeholder);
  });

  // Shortcode to output unit details container for a given (or last created) crid
  eleventyConfig.addShortcode('crmap_udetails', function (crid, placeholder = null) {
    return crmapUdetailsShortcode.call(this, crid, placeholder);
  });

  // Shortcode to output command details container for a given (or last created) crid
  eleventyConfig.addShortcode('crmap_commands', function (crid, placeholder = null) {
    return crmapCommandsShortcode.call(this, crid, placeholder);
  });

  // Shortcode to output order file contents line by line
  // Usage: {% orderfile 'path/to/file.nr' %} or {% orderfile 'path' '{"markdownInComments":true}' %}
  //
  // Options (passed as JSON string, optional):
  //   markdownInComments: boolean (default: true)
  //     - When true, lines starting with ';' are rendered as comment lines and
  //       the comment text is processed with markdown-it (inline rendering)
  //       if available. When false, comments are escaped plain text.
  //   fileLink: boolean (default: true)
  //     - When true, the rendered block will include a small header linking to
  //       the source file (basename shown). Set to false to omit the file link.
  //   commentsAsOrders: boolean (default: false)
  //     - When true, lines that start with ';' are treated as orders instead of
  //       comment blocks. They will be rendered as order lines with class
  //       `order no-link` (escaped text, no wiki link on the first token).
  //   renderSpecial: boolean (default: false)
  //     - When true, lines that match specialPrefixes are rendered.
  //
  // Examples:
  //   {% orderfile 'reports/orcs/orders-demo-02.txt' %}
  //   {% orderfile 'reports/orcs/orders-demo-02.txt' '{"fileLink":false}' %}
  //   {% orderfile 'reports/orcs/orders-demo-02.txt' '{"commentsAsOrders":true}' %}
  eleventyConfig.addShortcode('orderfile', function (fileName, optionsJson) {
    return renderOrderFile.call(this, fileName, optionsJson);
  });

  // Usage examples for the .nr helpers:
  // {% readnr 'reports/orcs/orders-demo-02.nr' %}              -> registers file, auto nrid
  // {% readnr 'reports/orcs/orders-demo-02.nr' '{"nrid":"r1"}' %} -> register with explicit nrid
  // {% shownr 'list' %}                                        -> show a list of all bookmarks from last readnr
  // {% shownr 'header' %}                                      -> show 'header' bookmark from last readnr
  // {% shownr 'r1' 'battles' %}                                -> show 'battles' bookmark from nrid r1
  // {% shownr '10-20' %}                                       -> show lines 10..20 from last nrid
  // {% shownr '{"nrid":"r1","range":"5-15", "lineNumbers":true }' %}        -> JSON form
  // {% shownr 'r1' 'unit_abc123' %}                            -> show the unit with id 'abc123' inside region
  // {% shownr '{"bookmark":"heading_ereignisse","maxHeight":300}' %} -> show heading with max 300px height
  // Shortcodes for reading and showing .nr (order/report) files with bookmarks
  eleventyConfig.addShortcode('readnr', function (file, optionsJson) {
    return readnrShortcode.call(this, file, optionsJson);
  });
  eleventyConfig.addShortcode('shownr', function (arg1, arg2) {
    return shownrShortcode.call(this, arg1, arg2);
  });

  // Passthrough assets
  eleventyConfig.addPassthroughCopy("crs/crs-passthrough.js");
  eleventyConfig.addPassthroughCopy({ "crs/crs.css": "css/crs.css" });

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

  // warn(msg[, html_msg]) -> logs a console warning and returns an error HTML string.
  function warn(msg, html_msg) {
    try { console.warn('[crs]', msg); } catch (e) { /* ignore */ }
    html_msg = html_msg || String(msg);
    return `<div class="cr-error" style="color:#a00; font-family:monospace;">${escapeHtml(String(html_msg))}</div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Resolve a user-supplied path argument used in shortcodes.
  // Supports two forms:
  //   1. Root-relative (starts with '/'): resolved against project root (Eleventy's input dir)
  //   2. Relative: resolved against the directory of the calling template file
  // Returns { fsPath, publicPath, relPath } or { error }
  // publicPath is a root-relative path beginning with '/<relPath>' suitable for use in generated HTML.
  function resolveUserPath(spec, ctx) {
    if (!spec || typeof spec !== 'string') return { error: 'missing path' };
    // Normalize Windows backslashes just in case
    spec = spec.replace(/\\/g, '/').trim();
    const projectRoot = process.cwd();
    // Base directory derived from the template invoking the shortcode
    let baseDir = projectRoot;
    try {
      if (ctx && ctx.page && ctx.page.inputPath) {
        const tplPath = path.resolve(projectRoot, ctx.page.inputPath);
        baseDir = path.dirname(tplPath);
      }
    } catch (_) { /* ignore */ }

    const isRootRel = spec.startsWith('/');
    const cleaned = isRootRel ? spec.replace(/^\/+/, '') : spec;
    const candidateFs = path.resolve(isRootRel ? projectRoot : baseDir, cleaned);
    // Prevent escaping project root
    const rootWithSep = projectRoot.endsWith(path.sep) ? projectRoot : projectRoot + path.sep;
    if (!candidateFs.startsWith(rootWithSep)) {
      return { error: 'path escapes project root' };
    }
    const relPath = path.relative(projectRoot, candidateFs).split(path.sep).join('/');
    // publicPath: always root-relative and start with '/'
    const publicPath = spec;  // '/' + relPath;

    return { fsPath: candidateFs, publicPath, relPath };
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

  // ================= Shortcode function implementations =================

  function crmapShortcode(file, optionsJson) {
    try {
      let requestedCrid; // explicit id
      let detailsOption = true; // default include details
      let zOption = 0; // default layer 0
      let captionOption; // undefined -> auto, string -> custom, false -> omit
      let fileLinkOption = true; // include a link to the source file in the caption by default

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
            if (Object.prototype.hasOwnProperty.call(opts, 'fileLink')) {
              fileLinkOption = !!opts.fileLink;
            }
          }
        } catch (e) {
          return warn(`crmap: invalid JSON options: ${e.message}`);
        }
      } else {
        return warn('crmap: options must be a JSON string');
      }
      if (requestedCrid === '') requestedCrid = undefined; // force auto

      let crid;
      if (requestedCrid) {
        crid = requestedCrid.toString();
        const valid = validateCrid(crid);
        if (!valid.ok) {
          return warn('crmap: ' + valid.message);
        }
        if (pageState.crids.has(crid)) {
          const msg = `crmap: Duplicate crid '${crid}' already used on this page.`;
          return warn(msg);
        }
        debug(`Processing CR file with provided crid=${crid}: ${file}`);
      } else {
        // Incremental auto id per page
        crid = (++pageState.counter).toString();
        debug(`Processing CR file ${crid}: ${file}`);
      }
      pageState.crids.add(crid);
      pageState.lastCrid = crid;
      const resolved = resolveUserPath(file, this);
      if (resolved.error) {
        return warn(`crmap: path error: ${resolved.error} ${file}`);
      }
      if (!fs.existsSync(resolved.fsPath)) {
        return warn(`crmap: file not found: ${file} -> ${resolved.fsPath}`, `crmap: file not found: ${file}`);
      }
      const reportName = path.basename(resolved.fsPath, path.extname(resolved.fsPath));
      const report = Report.parse(resolved.fsPath, crid, reportName, detailsOption, zOption);
      const svg = report.toSVG();
      let caption = '';
      if (captionOption === false) {
        caption = null;
      } else if (typeof captionOption === 'string') {
        caption = captionOption; // keep raw for now, escape when injecting
      } else {
        caption = report.name + (report.owner ? `, ${report.owner.tags.Parteiname} (${report.owner.id})` : '');
      }

      // Build figcaption HTML (may include a link to the input file)
      let figcaptionHtml = '';
      if (caption !== null && typeof caption !== 'undefined') {
        const captionEsc = escapeHtml(caption);
        if (fileLinkOption) {
          const fileDisplay = escapeHtml(path.basename(file));
          const href = escapeHtml(encodeURI(resolved.publicPath));
          figcaptionHtml = `<figcaption class=\"cr-caption\">${captionEsc}, source: <a class=\"cr-filelink\" href=\"${href}\">${fileDisplay}</a></figcaption>`;
        } else {
          figcaptionHtml = `<figcaption class="cr-caption">${captionEsc}</figcaption>`;
        }
      }

      // <class = "cr-report" is used as a marker to include css/js in layout!

      return `<!-- crmap generated by crs.js version ${CRS_VERSION} -->\n` +
        // include marker classes so the layout can detect whether to add CSS/JS
        `<figure class="cr-report crs-requires-css crs-requires-js" data-crid="${crid}">` +
        `<div class="cr-svg-wrapper">${svg}</div>` +
        (figcaptionHtml ? figcaptionHtml : '') +
        `<div id="tooltip_${crid}" class="cr-tooltip"></div>` +
        `</figure>`;
    } catch (e) {
      return warn(`crmap: error processing file: ${file} ${e && e.message ? e.message : ''}`);
    }
  }

  function crmapRdetailsShortcode(crid, placeholder = null) {
    // Access per-page state
    let pageState = this && this.ctx ? this.ctx._crmapState : null;
    let useCrid = crid;
    if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) {
      return warn('crmap_rdetails: missing crid (no crmap rendered yet)');
    }
    const v = validateCrid(useCrid.toString());
    if (!v.ok) {
      return warn(`crmap_rdetails: ${v.message}`);
    }
    if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return warn(`crmap_rdetails: unknown crid '${useCrid}' (render map first)`);
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a region for details.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"rdetails_${useCrid}\" class=\"cr-region-details\">${placeholder}</div>`;
  }

  function crmapUdetailsShortcode(crid, placeholder = null) {
    let pageState = this && this.ctx ? this.ctx._crmapState : null;
    let useCrid = crid;
    if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) {
      return warn('crmap_udetails: missing crid (no crmap rendered yet)');
    }
    const v = validateCrid(useCrid.toString());
    if (!v.ok) {
      return warn(`crmap_udetails: ${v.message}`);
    }
    if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return warn(`crmap_udetails: unknown crid '${useCrid}' (render map first)`);
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a unit.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"udetails_${useCrid}\" class=\"cr-unit-details\">${placeholder}</div>`;
  }

  function crmapCommandsShortcode(crid, placeholder = null) {
    let pageState = this && this.ctx ? this.ctx._crmapState : null;
    let useCrid = crid;
    if (!useCrid && pageState) useCrid = pageState.lastCrid;
    if (!useCrid) {
      return warn('crmap_commands: missing crid (no crmap rendered yet)');
    }
    const v = validateCrid(useCrid.toString());
    if (!v.ok) {
      return warn(`crmap_commands: ${v.message}`);
    }
    if (!pageState || !pageState.crids.has(useCrid.toString())) {
      return warn(`crmap_commands: unknown crid '${useCrid}' (render map first)`);
    }
    if (placeholder === null || placeholder === true) {
      placeholder = 'Select a unit for commands.';
    } else if (placeholder === false) {
      placeholder = '';
    }
    return `<div id=\"ucommands_${useCrid}\" class=\"cr-unit-commands\">${placeholder}</div>`;
  }

  function renderOrderFile(fileName, optionsJson) {
    if (!fileName || typeof fileName !== 'string') {
      return warn('orderfile: missing file name');
    }
    // parse options
    const opts = { markdownInComments: true, fileLink: true, commentsAsOrders: false, renderSpecial: false };
    if (typeof optionsJson === 'string' && optionsJson.trim() !== '') {
      try {
        const parsed = JSON.parse(optionsJson);
        if (parsed && typeof parsed === 'object') {
          if (Object.prototype.hasOwnProperty.call(parsed, 'markdownInComments')) opts.markdownInComments = !!parsed.markdownInComments;
          if (Object.prototype.hasOwnProperty.call(parsed, 'fileLink')) opts.fileLink = !!parsed.fileLink;
          if (Object.prototype.hasOwnProperty.call(parsed, 'commentsAsOrders')) opts.commentsAsOrders = !!parsed.commentsAsOrders;
          if (Object.prototype.hasOwnProperty.call(parsed, 'renderSpecial')) opts.renderSpecial = !!parsed.renderSpecial;
        }
      } catch (e) {
        return warn(`orderfile: invalid options JSON: ${e.message}`);
      }
    }

    const resolved = resolveUserPath(fileName, this);
    if (resolved.error) {
      return warn(`orderfile : path error: ${resolved.error} ${fileName}`);
    }
    if (!fs.existsSync(resolved.fsPath)) {
      return warn(`orderfile: file not found: ${fileName} -> ${resolved.fsPath}`, `orderfile: file not found: ${fileName}`);
    }
    const content = fs.readFileSync(resolved.fsPath, 'utf8');
    const rawLines = content.split(/\r?\n/);
    // Detect locale from lines like: "en";locale  -- default to 'de' if not found
    let locale = 'de';
    for (const l of rawLines) {
      const m = l.match(/^locale\s*([a-z]{2})/i);
      if (m) { locale = m[1].toLowerCase(); break; }
    }

    // Translation table: map English keyword -> German wiki target
    // Edit this table as needed; shown here with likely translations.
    const translations = {
      // core nouns
      'ERESSEA': 'ERESSEA',
      'UNIT': 'EINHEIT',
      'REGION': 'REGION',

      // common commands (English -> German wiki page target)
      'WORK': 'ARBEITE',
      'ATTACK': 'ATTACKIERE',
      'BANNER': 'BANNER',
      'CLAIM': 'BEANSPRUCHE',
      'PROMOTE': 'BEFÖRDERE',
      'STEAL': 'BEKLAUE',
      'NAME': 'BENENNE',
      'USE': 'BENUTZE',
      'DESCRIBE': 'BESCHREIBE',
      'ENTER': 'BETRETE',
      'GUARD': 'BEWACHE',
      'PAY': 'BEZAHLE',
      'MESSAGE': 'BOTSCHAFT',
      'DEFAULT': 'DEFAULT',
      'EMAIL': 'EMAIL',
      'END': 'ENDE',
      'RIDE': 'FAHRE',
      'FOLLOW': 'FOLGE',
      'RESEARCH': 'FORSCHE',
      'GIVE': 'GIB',
      'GROUP': 'GRUPPE',
      'HELP': 'HELFE',
      'COMBAT': 'KÄMPFE',
      'BUY': 'KAUFE',
      'CONTACT': 'KONTAKTIERE',
      'TEACH': 'LEHRE',
      'LEARN': 'LERNE',
      'LOCALE': 'LOCALE',
      'MAKE': 'MACHE',
      'MOVE': 'NACH',
      'NEXT': 'NÄCHSTER',
      'NUMBER': 'NUMMER',
      'OPTION': 'OPTION',
      'PASSWORD': 'PASSWORT',
      'PLANT': 'PFLANZE',
      'PIRACY': 'PIRATERIE',
      'PREFIX': 'PRÄFIX',
      'RECRUIT': 'REKRUTIERE',
      'RESERVE': 'RESERVIERE',
      'ROUTE': 'ROUTE',
      'SPY': 'SPIONIERE',
      'LANGUAGE': 'SPRACHE',
      'QUIT': 'STIRB',
      'HIDE': 'TARNUNG',
      'CARRY': 'TRANSPORTIERE',
      'TAX': 'TREIBE',
      'ENTERTAIN': 'UNTERHALTE',
      'ORIGIN': 'URSPRUNG',
      'FORGET': 'VERGISS',
      'SELL': 'VERKAUFE',
      'LEAVE': 'VERLASSE',
      'CAST': 'ZAUBERE',
      'SHOW': 'ZEIGE',
      'DESTROY': 'ZERSTÖRE',
      'GROW': 'ZÜCHTE',

    };

    // Join lines that end with a backslash (continuation marker)
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i];
      // While this line ends with a backslash, remove it and append the next line (trimmed)
      while (/\\\s*$/.test(line) && i + 1 < rawLines.length) {
        line = line.replace(/\\\s*$/, '');
        i++;
        // append the next physical line trimmed, join with a single space
        line += rawLines[i].trim();
      }
      lines.push(line);
    }

    // try to load markdown-it for comment rendering; fall back to plain text
    let md = null;
    try { md = require('markdown-it')(); } catch (e) { md = null; }

    // Transform each (possibly-joined) line, wrap in div
    const inner = lines.map(rawLine => {
      let line = rawLine || '';
      if (line.trim() === '') return '<div class="order-line empty"></div>';
      // Special-case: treat certain diagnostic/comment prefixes as orders (no link)
      const specialPrefixes = [/^TIMESTAMP\b/i, /^Magellan version/i, /^ECheck\b/i, /^bestaetigt\s*$/];
      const pureLine = line.replace(/^;\s*/, '');
      const isSpecial = specialPrefixes.some(rx => rx.test(pureLine));

      if (isSpecial) {
        // render these special diagnostic lines in the same style as comment-as-order
        if (opts.renderSpecial) {
          const txt = escapeHtml(line);
          return `<div class=\"order-line order no-link\">${txt}</div>`;
        } else {
          return '';
        }
      }
      if (/^\/\//.test(line.trim())) {
        // lines beginning with // are a special "comment" command that should link to the
        // wiki page 'KOMMENTAR' — support both '//' and '//foo' as the first token.
        const parts = line.trim().split(/\s+/);
        const keyword = parts.shift();
        const rest = parts.join(' ');
        const kwEsc = escapeHtml(keyword);
        const wikiUrl = `https://wiki.eressea.de/KOMMENTAR`;
        const linked = `<a class="order-keyword" href="${wikiUrl}">${kwEsc}</a>`;
        const contentRest = rest ? ' ' + escapeHtml(rest) : '';
        return `<div class="order-line order">${linked}${contentRest}</div>`;
      }
      if (line.startsWith(';')) {
        if (opts.commentsAsOrders) {
          const commentText = opts.markdownInComments ? md.renderInline(line) : escapeHtml(line);
          return `<div class=\"order-line order no-link\">${(commentText)}</div>`;
        } else {
          const commentText = line; // .replace(/^;\s*/, '');
          // default behavior: comment line - render markdown if enabled
          if (opts.markdownInComments && md) {
            return `<div class=\"order-line comment\">${md.renderInline(commentText)}</div>`;
          } else {
            return `<div class=\"order-line comment\">${escapeHtml(commentText)}</div>`;
          }
        }
      }
      // order line: link first word to wiki
      const parts = line.trim().split(/\s+/);
      const keyword = parts.shift();
      const rest = parts.join(' ');
      const kwEsc = escapeHtml(keyword);
      const upper = keyword.toUpperCase();
      let target = upper;
      if (locale === 'en') {
        if (translations[upper]) target = translations[upper].toUpperCase();
        else {
          const joined = line.trim().toUpperCase();
          for (const k in translations) {
            if (Object.prototype.hasOwnProperty.call(translations, k)) {
              const keyUpper = k.toUpperCase();
              if (joined.startsWith(keyUpper)) { target = translations[k].toUpperCase(); break; }
            }
          }
        }
      }
      const wikiUrl = `https://wiki.eressea.de/${encodeURIComponent(target)}`;
      const linked = `<a class=\"order-keyword\" href=\"${wikiUrl}\">${kwEsc}</a>`;
      const contentRest = rest ? ' ' + escapeHtml(rest) : '';
      return `<div class=\"order-line order\">${linked}${contentRest}</div>`;
    }).join('');
    // Optional file link header
    const fileHeader = opts.fileLink ? `<div class=\"orderfile-file\">Source: <a href=\"${escapeHtml(encodeURI(resolved.publicPath))}\">${escapeHtml(path.basename(fileName))}</a></div>` : '';
    // include marker classes so the layout can detect whether to add CSS/JS
    return `<div class="orderfile crs-requires-css">${fileHeader}${inner}</div>`;
  }

  // ----------------- readnr / shownr implementations -----------------

  function _getPageNrState(ctxThis) {
    if (ctxThis && ctxThis.ctx) {
      ctxThis.ctx._nrState = ctxThis.ctx._nrState || {};
      const s = ctxThis.ctx._nrState;
      if (!s.nrids) { s.nrids = new Set(); s.counter = 0; s.lastNrid = null; s.nrFiles = {}; }
      return s;
    }
    return { nrids: new Set(), counter: 0, lastNrid: null, nrFiles: {} };
  }

  function readnrShortcode(file, optionsJson) {
    const separator = /^\s*-+\s*$/;

    const fs = require('fs');
    const path = require('path');
    let opts = {};
    if (typeof optionsJson === 'string' && optionsJson.trim() !== '') {
      try { opts = JSON.parse(optionsJson); } catch (e) {
        return warn(`readnr: invalid options JSON: ${e.message}`);
      }
    }
    const requestedNrid = opts && typeof opts.nrid === 'string' && opts.nrid !== '' ? opts.nrid : undefined;
    const pageState = _getPageNrState(this);
    // determine nrid
    let nrid;
    if (requestedNrid) {
      const v = validateCrid(requestedNrid);
      if (!v.ok) {
        return warn(`readnr: ${v.message}`);
      }
      if (pageState.nrids.has(requestedNrid)) {
        return warn(`readnr: duplicate id '${requestedNrid}' on this page`);
      }
      nrid = requestedNrid;
    } else {
      nrid = (++pageState.counter).toString();
    }
    const resolved = resolveUserPath(file, this);
    if (resolved.error) {
      return warn(`readnr: path error: ${resolved.error} ${file}`);
    }
    if (!fs.existsSync(resolved.fsPath)) {
      return warn(`readnr: File not found: ${resolved.fsPath}`);
    }
    const content = fs.readFileSync(resolved.fsPath, 'utf8');
    const rawLines = content.split(/\r?\n/);
    const bookmarks = {};
    const startIndices = [];

    const language = /.*Report for .*/.test(rawLines[0]) ? 'en' : 'de'; // crude language detection based on first line

    debug(`Scanning ${file} for language ${language}`);

    // Find the section separator (a line containing only hyphens) that marks the start of regions
    let regionSectionStart = null;
    for (let i = 0; i < rawLines.length; i++) {
      if (separator.test(rawLines[i])) { regionSectionStart = i; break; }
    }
    debug("region section start: ", regionSectionStart);

    // Header detection: detect only the specifically requested headings (exact match, case-insensitive)
    // These headers (if present) become bookmarks and capture the header line itself and everything
    // up to (but not including) the next header occurrence.
    const HEADER_TITLES = {
      // active sections:
      // events
      // errors
      // magic
      // production
      // study
      // economy
      // movement
      // battle
      // mail
      // nr
      //
      // newspells
      // newpotions

      de: [
        'Ereignisse',
        'Warnungen und Fehler',
        'Magie und Artefakte',
        'Rohstoffe und Produktion',
        'Lehren und Lernen',
        'Wirtschaft und Handel',
        'Reisen und Bewegung',
        'Kämpfe',
        'Botschaften',
        'Neue Zauber',
        'Neue Tränke',
        'Verschiedenes',
        'Hinweise'
      ],
      en: [
        'Events',
        'Warnings and Errors',
        'Magic and Artefacts',
        'Resources and Production',
        'Learning and Teaching',
        'Economy and Trade',
        'Movement and Travel',
        'Battles',
        'Dispatches',
        'New Spells',
        'New Potions',
        'Miscellaneous',
        'Notifications'
      ]


    };
    // helper to sanitize a header into a bookmark name
    function sanitizeToken(tok) {
      return String(tok).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\p{L}]/gu, '');
    }

    function startIndicesToBookmarks(startIndices, rawLines, bookmarks) {
      startIndices.sort((a, b) => a.index - b.index);
      for (let s = 0; s < startIndices.length; s++) {
        const cur = startIndices[s];
        const next = startIndices[s + 1];
        const start = cur.index;
        const end = next ? next.index - 1 : rawLines.length - 1;
        bookmarks[cur.name] = { start: start + 1, end: end + 1 };
      }
    }

    if (regionSectionStart !== null) {
      bookmarks['header'] = { start: 1, end: regionSectionStart };
    }

    let firstHeader = 0;
    for (let i = 0; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();
      if (!trimmed) continue;
      for (const ht of HEADER_TITLES[language]) {
        if (trimmed.toLowerCase() === ht.toLowerCase()) {
          const nm = `heading_${(sanitizeToken(ht))}`;
          debug(`Found pre-defined header ${ht} at ${i}`);
          startIndices.push({ name: nm, index: i });
          if (firstHeader === 0) firstHeader = i;
          break;
        }
      }
    }


    if (regionSectionStart !== null) {
      bookmarks['intro'] = { start: 1, end: firstHeader > 0 ? startIndices[0].index : regionSectionStart };
      startIndices.push({ name: 'regions', index: regionSectionStart });
    }
    startIndicesToBookmarks(startIndices, rawLines, bookmarks);
    startIndices.length = 0;

    // findAllHeaders
    if (firstHeader > 0) {
      for (let i = firstHeader; i <= regionSectionStart; i++) {
        const trimmed = rawLines[i].trim();
        if (!trimmed) continue;
        if (/^\s{5}.*/.test(rawLines[i])) {
          const nm = `heading_${(sanitizeToken(trimmed))}`;
          if (!bookmarks[nm]) {
            debug(`Found other header ${nm} at ${i}`);
            startIndices.push({ name: nm, index: i });
          }
        }
      }
      startIndices.push({ name: 'regions', index: regionSectionStart });
      startIndicesToBookmarks(startIndices, rawLines, bookmarks);
    }

    let regionSectionEnd = regionSectionStart;

    // Region detection: after the separator, parse region sections.
    // A region section starts with a line "Name (x,y)" or "Name (x,y,z)" and
    // continues until the next separator line (a line that contains only hyphens).
    if (regionSectionStart !== null) {
      for (let i = regionSectionStart + 1; i < rawLines.length;) {
        const raw = rawLines[i];
        // skip empty lines and repeated separators
        if (!raw || separator.test(raw) || raw.trim() === '') { i++; continue; }

        // match "Name (x,y)" or "Name (x,y,z)" -- assume name does not contain parentheses
        const m = raw.trim().match(/^([^()]+)\s*\(([^)]+)\)/);
        if (!m) { i++; continue; }

        const namePart = m[1].trim();
        const coords = m[2].split(',').map(s => s.trim());
        if (coords.length >= 2) {
          const x = parseInt(coords[0], 10);
          const y = parseInt(coords[1], 10);
          const ztok = coords[2] ? coords[2] : null;

          // find the end of this region: the next separator line (hyphens) or EOF
          let j = i + 1;
          while (j < rawLines.length && !separator.test(rawLines[j])) j++;
          const endIdx = j < rawLines.length ? j - 1 : rawLines.length - 1;

          const key = ztok ? `region_${x}_${y}_${sanitizeToken(ztok)}` : `region_${x}_${y}`;
          // store bookmark spanning from this header line through the line before the separator
          debug(`Found region ${key} from ${i + 1} to ${endIdx + 1}`);
          bookmarks[key] = { start: i + 1, end: endIdx + 1 };
          // startIndices.push({ name: key, index: i });

          // detect unit sub-sections inside this region and add unit bookmarks ---
          // Unit lines have the form (indented) "  - Name (ID)" (leading two spaces, a marker, name, then ID in parentheses).
          // They end at the next empty line or separator line (we stop at endIdx).
          for (let k = i + 1; k <= endIdx;) {
            const lineK = rawLines[k];
            if (!lineK || separator.test(lineK) || lineK.trim() === '') { k++; continue; }
            // Match unit header lines: two (or more) spaces, one of + * - marker, space, name (no parentheses), space, (ID)
            const um = lineK.match(/^\s{2,}[+\-*]\s+([^()]+)\s*\(([^()\s]+)\)/);
            if (!um) { k++; continue; }
            const unitName = um[1].trim();
            const unitIdRaw = um[2].trim();
            // sanitize unit id for bookmark key (keep readable and safe)
            const unitId = sanitizeToken(unitIdRaw) || unitIdRaw.replace(/[^a-z0-9_-]/ig, '_');
            // find unit end: next empty line or separator or endIdx
            let j2 = k + 1;
            while (j2 <= endIdx && rawLines[j2].trim() !== '' && !separator.test(rawLines[j2])) j2++;
            const unitEnd = j2 <= endIdx ? j2 : endIdx;
            const unitKey = `unit_${unitId}`;
            debug(`Found unit ${unitKey} from ${k + 1} to ${unitEnd + 1}`);
            bookmarks[unitKey] = { start: k + 1, end: unitEnd + 1 };
            // startIndices.push({ name: unitKey, index: k });
            // continue scanning after this unit block
            k = j2 + 1;
          }
          // --- end unit detection ---
          regionSectionEnd = j;

          // continue after the separator (if any)
          i = j + 1;
        } else {
          i++;
        }
      }
    }

    startIndicesToBookmarks(startIndices, rawLines, bookmarks);
    debug(`Found regions / outro at ${regionSectionStart} and ${regionSectionEnd}`);

    if (regionSectionStart != regionSectionEnd) {
      bookmarks.regions = {
        start: regionSectionStart + 2,
        end: regionSectionEnd + 1
      };
    }
    if (regionSectionEnd) {
      bookmarks.outro = {
        start: regionSectionEnd + 1,
        end: rawLines.length
      };
    }

    bookmarks.all = { start: 1, end: rawLines.length };

    // store
    pageState.nrids.add(nrid);
    pageState.lastNrid = nrid;
    pageState.nrFiles[nrid] = {
      fsPath: resolved.fsPath,
      publicPath: resolved.publicPath,
      relPath: resolved.relPath,
      lines: rawLines,
      bookmarks: bookmarks,
      sourceName: path.basename(resolved.fsPath)
    };
    return `<div class=\"nr-registered crs-requires-css\" data-nrid=\"${escapeHtml(nrid)}\">NR registered: ${escapeHtml(nrid)} (source: <a href=\"${escapeHtml(encodeURI(resolved.publicPath))}\">${escapeHtml(path.basename(resolved.fsPath))}</a>)</div>`;
  }

  function shownrShortcode(arg1, arg2) {
    const pageState = _getPageNrState(this);
    let opts = {};
    function parseRangeString(s) {
      const m = String(s).trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return null;
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      return { start: Math.min(a, b), end: Math.max(a, b) };
    }
    if (typeof arg2 === 'undefined') {
      if (typeof arg1 === 'string' && arg1.trim().startsWith('{')) {
        try { opts = JSON.parse(arg1); } catch (e) {
          return warn(`shownr: invalid options JSON: ${e.message}`);
        }
      } else if (typeof arg1 === 'string' && parseRangeString(arg1)) {
        opts.range = parseRangeString(arg1);
      } else if (typeof arg1 === 'string') {
        opts.bookmark = arg1;
      } else {
        warn(`shownr: Invalid arguments: ${arg1}, ${arg2}`);
        return `<div class=\"cr-error\">shownr: invalid arguments</div>`;
      }
    } else {
      if (typeof arg1 === 'string' && validateCrid(arg1).ok) {
        opts.nrid = arg1;
        if (typeof arg2 === 'string' && arg2.trim().startsWith('{')) {
          try { Object.assign(opts, JSON.parse(arg2)); } catch (e) {
            warn(`shownr: invalid options JSON: ${e.message}`);
          }
        } else if (parseRangeString(arg2)) {
          opts.range = parseRangeString(arg2);
        } else { opts.bookmark = arg2; }
      } else if (typeof arg2 === 'string' && validateCrid(arg2).ok) {
        opts.nrid = arg2;
        if (parseRangeString(arg1)) opts.range = parseRangeString(arg1); else opts.bookmark = arg1;
      } else {
        if (typeof arg2 === 'string' && arg2.trim().startsWith('{')) {
          try { Object.assign(opts, JSON.parse(arg2)); } catch (e) {
            warn(`shownr: invalid options JSON: ${e.message}`);
          }
          if (!opts.nrid && typeof arg1 === 'string') { if (parseRangeString(arg1)) opts.range = parseRangeString(arg1); else opts.bookmark = arg1; }
        } else {
          if (typeof arg1 === 'string' && validateCrid(arg1).ok) opts.nrid = arg1; else opts.bookmark = arg1;
          if (typeof arg2 === 'string' && parseRangeString(arg2)) opts.range = parseRangeString(arg2);
        }
      }
    }
    if (!opts.range && parseRangeString(opts.bookmark)) {
      opts.range = parseRangeString(opts.bookmark); opts.bookmark = undefined;
    }
    // parse maxHeight option (number -> px or CSS size string)
    let maxHeight = undefined;
    if (Object.prototype.hasOwnProperty.call(opts, 'maxHeight')) maxHeight = opts.maxHeight;
    else if (Object.prototype.hasOwnProperty.call(opts, 'max_height')) maxHeight = opts.max_height;
    if (typeof maxHeight === 'number' && !isNaN(maxHeight)) maxHeight = `${maxHeight}px`;
    if (typeof maxHeight === 'string') maxHeight = maxHeight.trim() || undefined;

    let nrid = opts.nrid;
    if (!nrid) nrid = pageState.lastNrid;
    if (!nrid) {
      return warn(`shownr: no nrid specified and no previous readnr on this page`);
    }
    if (!pageState.nrFiles || !pageState.nrFiles[nrid]) {
      return warn(`shownr: unknown nrid '${escapeHtml(nrid)}' (did you call readnr first?)`);
    }

    let lineNumbers = opts.lineNumbers || false;

    const fileInfo = pageState.nrFiles[nrid];
    const totalLines = fileInfo.lines.length;
    let start = 1, end = totalLines;
    if (opts.bookmark) {
      if (opts.bookmark === 'list') {
        const bookmarks = Object.keys(fileInfo.bookmarks || {});
        if (bookmarks.length === 0) {
          return warn(`shownr: no bookmarks available for nrid '${nrid}'`, `<div class=\"cr-error\">shownr: no bookmarks available for nrid '${escapeHtml(nrid)}'</div>`);
        }
        const listItems =
          bookmarks.map(bm => {
            const b = fileInfo.bookmarks[bm];
            return `<li><div class=\"cr-bookmark-link\" data-nrid=\"${escapeHtml(nrid)}\" data-bookmark=\"${escapeHtml(bm)}\">${escapeHtml(bm)}: ${b.start} - ${b.end}</div></li>`;
          }).join('');
        return `<div class=\"shownr-bookmarks crs-requires-css\" data-nrid=\"${escapeHtml(nrid)}\"><ul>${listItems}</ul></div>`;
      }
      const bm = fileInfo.bookmarks && fileInfo.bookmarks[opts.bookmark];
      if (!bm) {
        return warn(`shownr: unknown bookmark '${opts.bookmark}' for nrid '${nrid}'`);
      }
      start = bm.start; end = bm.end;
    } else if (opts.range) {
      start = Math.max(1, opts.range.start); end = Math.min(totalLines, opts.range.end);
      if (start > end) {
        return warn(`shownr: invalid range ${start}-${end} for nrid '${nrid}'`);
      }
    }
    const slice = fileInfo.lines.slice(start - 1, end);
    const inner = slice.map((ln, idx) => {
      const linenr = lineNumbers ? `<span class='shownr-linenr'>${start + idx}</span>` : '';
      return `<div class=\"shownr-line\" data-line=\"${start + idx}\">${linenr}${escapeHtml(ln)}</div>`;
    }).join('');
    const header = `<div class=\"shownr-file\">Source: <a href=\"${escapeHtml(encodeURI(fileInfo.publicPath))}\">${escapeHtml(fileInfo.sourceName)}</a> - lines ${start}-${end}</div>`;
    const shownrStyle = maxHeight ? ` style=\"max-height:${escapeHtml(maxHeight)}; overflow:auto;\"` : '';
    return `<div class=\"shownr-wrapper crs-requires-css\" data-nrid=\"${escapeHtml(nrid)}\">${header}<div class=\"shownr\"${shownrStyle}>${inner}</div></div>`;
  }

};
