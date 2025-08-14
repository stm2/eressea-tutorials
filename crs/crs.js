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

function parseRegion(line, matches) {
  const parts = line.trim().split(/\s+/);
  const region = { tags: [], units: [] };
  region.x = parseInt(matches[1], 10);
  region.y = parseInt(matches[2], 10);
  if (matches[3]) region.z = parseInt(matches[3], 10);
  console.log("found region ", region);

  return region;
}

function outputRegion(region, bounds) {
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
  let desc = '';
  console.log('tags ', region.tags);


  desc = Object.entries(region.tags)
    .map(([key, value]) => `<i>${key}</i>: ${value}<br>`)
    .join('\n');

  let id = 'r_';
  id += xx < 0 ? `m${-xx}` : xx;
  id += yy < 0 ? `_m${-yy}` : `_${yy}`;
  // Update bounds
  bounds.xmin = Math.min(bounds.xmin, x);
  bounds.ymin = Math.min(bounds.ymin, y);
  bounds.xmax = Math.max(bounds.xmax, x);
  bounds.ymax = Math.max(bounds.ymax, y);
  // console.log(region.units);
  let units = '';
  let udesc = '';
  if (region.units.length > 0) {
    desc += `<b>Units:</b><br>`;
    Object.entries(region.units).forEach(([id, unit]) => {
      console.log(`Unit ${id} skills:`, unit.skills);
      const uid = `u_${unit.id}`;
      udesc += `<desc id="${uid}"><div></div><div>`;
      desc += `<a href="#${uid}" onclick="showDescription(event, 'udetails', '${uid}');">${unit.tags.Name} (${unit.id})</a><br>`;
      udesc += `${unit.tags.Name} (${unit.id})`;
      if (unit.skills) {
        udesc += ' ' + Object.entries(unit.skills).map(([key, value]) => `${key} ${value}`).join(', ');
      }
      udesc += '<br>\n';
      udesc += Object.entries(unit.tags).filter(([key, value]) => key !== 'Name')
        .map(([key, value]) => `<i>${key}</i>: ${value}<br>`)
        .join('\n');
      udesc += `</div></desc>`;
    });

    units = `<use xlink:href="#units" x="${x}" y="${y}">${udesc}</use></a>`;
  }

  // onmousemove="showTooltip(evt, '${tt}');"
  // onmouseout="hideTooltip();"
  // onclick = "showDescription(event, '${desc}');" 
  return `<a href="#${id}" onclick = "showDescription(event, 'rdetails', '${id}');"  >` +
    `<use xlink:href="#${tag}" id="${id}" x="${x}" y="${y}" ${color}><title>${tt}</title><desc>${desc}</desc></use>\n` +
    units + `</a>`;

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

function parseCrFile(filePath) {
  console.log(`Processing CR file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const pregRegion = /^REGION (-?\d+) (-?\d+)(?: (-?\d+))?$/;
  const pregTagq = /^"(.*)";(.*)$/;
  const pregTag = /^(.*);(.*)$/;
  const pregBlock = /^([A-Z]+)\s*(.*)$/;
  const pregUnit = /^EINHEIT (\d+)$/;
  let region = null;
  let unit = null;
  let block = null;
  let svgContent = '';
  let bounds = { xmin: Infinity, ymin: Infinity, xmax: -Infinity, ymax: -Infinity };
  let regions = [];
  for (let line of lines) {
    let tag = null, value = null;
    let matches;
    if ((matches = pregRegion.exec(line))) {
      if (region) regions.push(region);
      block = 'REGION';
      region = parseRegion(line, matches);
    } else if (region && (matches = pregUnit.exec(line))) {
      block = 'UNIT';
      // Parse unit and add to current region
      region.units = region.units || [];
      let id = matches[1];
      unit = {
        id: matches[1],
        name: '???',
        tags: []
      };
      region.units[id] = unit;
      console.log(`Found unit ${unit.id} in region ${region.x}, ${region.y}`);
    } else if ((matches = pregTagq.exec(line))) {
      value = matches[1];
      tag = matches[2];
      console.log(`Found tag ${tag} with value ${value} in block ${block}`);
    } else if ((matches = pregTag.exec(line))) {
      value = matches[1];
      tag = matches[2];
      console.log(`Found tag ${tag} with value ${value} in block ${block}`);
    } else if ((matches = pregBlock.exec(line))) {
      block = matches[1];
      console.log(`Found block ${block}`);
    }

    if (tag) {
      if (block === "REGION" && region) {
        region.tags[tag] = value;
      } else if (block === "UNIT" && unit) {
        unit.tags[tag] = value;
        region.units[unit.id] = unit;
      }
      else if (block === "TALENTE" && region && unit) {
        unit.skills = unit.skills || {};
        unit.skills[tag] = parseSkill(value);
        // region.units[unit.id] = unit;
      }
    }
  }
  if (region) regions.push(region);
  // Output regions and units
  for (const reg of regions) {
    svgContent += outputRegion(reg, bounds);
  }
  // // Output units as icons on top of regions
  // for (const reg of regions) {
  //   if (reg.units && reg.units.length > 0) {
  //     console.log(`Outputting units for region: ${reg.Name}`);
  //     const x = transformx(reg);
  //     const y = transformy(reg);
  //     let ux = x + 50; // offset to center of hex
  //     let uy = y + 50;

  //     for (const unit of reg.units.filter(Boolean)) {
  //       console.log(`Outputting unit for region ${reg.Name}: ${unit.name} [${unit.num}]`);
  //     }
  //   }
  // }
  svgContent = outputFront(bounds) + svgContent + outputBack();
  // console.log(`returning ${svgContent}`);
  return svgContent;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode('crmap', function (file) {
    // file is relative to the project root or input dir
    try {
      console.log(`Processing CR file: ${file}`);
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return `<div style="max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;">File not found: ${file}</div>`;
      }
      const svg = parseCrFile(filePath);
      return `<div style="max-width:100%; max-height:600px; overflow:auto;">${svg}</div>\n` +
        `<div id="rdetails">You need to enable Javascript for this to work.</div>\n` +
        `<div id="udetails">You need to enable Javascript for this to work.</div>`;
    } catch (e) {
      console.log(`Error processing file: ${filePath} `);
      return `< div style = "max-width:100%; max-height:600px; overflow:auto; display:flex; align-items:center; justify-content:center; color:#a00; font-family:monospace; font-size:1.2em; min-height:200px;" > Error: ${e.message}</div > `;
    }
  });

  eleventyConfig.addPassthroughCopy("crs/crs-passthrough.js");

};
