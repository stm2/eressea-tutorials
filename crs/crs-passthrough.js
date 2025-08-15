function unitShort(unit) {
  let uhtml = `<b>${unit.name} (${unit.id})</b>` + (unit.factionName ? `, <span class=\"faction\">${unit.factionName} (${unit.faction})</span>` : '') + `, ${unit.tags.Anzahl} ${unit.tags.Typ}`;
  return uhtml;
}

function unitSkills(unit) {
  if (!unit.skills || Object.keys(unit.skills).length === 0) return '';
  return '<span class="skills">' + Object.entries(unit.skills).map(([sk, val]) => `${sk} ${val}`).join(', ') + '</span>';
}

function showDescription(event, div_id, id, unitId) {
  if (event) event.preventDefault();
  if (!id) return false;
  const regionTarget = document.getElementById(div_id);
  if (!regionTarget) return false;
  const regionUse = document.getElementById(id);
  if (!regionUse) return false;

  const regionDataAttr = regionUse.getAttribute('data-region');
  let html = '';
  let units = [];
  if (regionDataAttr) {
    try {
      const regionData = JSON.parse(decodeURIComponent(regionDataAttr));
      if (regionData.tags) {
        html += `<b>${regionData.tags.Terrain} ${regionData.tags.Name}</b> (${regionData.x}, ${regionData.y})<div class="region_tags">`;
        for (const [k, v] of Object.entries(regionData.tags).filter(([k]) => k !== 'Name' && k !== 'id' && k !== 'Terrain')) {
          html += `<div><i>${k}</i>: ${v}</div>`;
        }
        html += '</div>';
      }
    } catch (e) {
      html += `<div class=\"error\">Failed to parse region data: ${e.message}</div>`;
    }
  }
  let unitsUse = regionUse.parentNode.querySelector('use[data-units]');
  if (unitsUse) {
    const unitsAttr = unitsUse.getAttribute('data-units');
    if (unitsAttr) {
      try {
        units = JSON.parse(decodeURIComponent(unitsAttr));
      } catch (e) {
        html += `<div class=\"error\">Failed to parse unit data: ${e.message}</div>`;
      }
    }
  }

  // If a specific unitId requested and unit details div exists, populate it separately
  if (unitId) {
    const unitDetails = document.getElementById('udetails_' + (regionUse.getAttribute('data-crid') || ''));
    if (unitDetails) {
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        let uhtml =
          '<div class=\"unit_detail\">' + unitShort(unit);

        if (unit.skills && Object.keys(unit.skills).length) {
          uhtml += '<div class="skills">' + Object.entries(unit.skills).map(([sk, val]) => `<span>${sk} ${val}</span>`).join(', ') + '</div>';
        }
        const omit = ['Name', 'id', 'Partei', 'Anzahl', 'Typ'];
        const rest = Object.entries(unit.tags).filter(([k]) => !omit.includes(k));
        if (rest.length) {
          uhtml += '<div class="unit_tags">' + rest.map(([k, v]) => `<div><i>${k}</i>: ${v}</div>`).join('') + '</div>';
        }
        uhtml += '</div>';
        unitDetails.innerHTML = uhtml;
      }
    }
  }

  // region + unit list (clickable)
  if (units.length) {
    html += '<div class="unit_block"><b>Units:</b><ul>';
    for (const u of units) {
      const cls = u.isOwner ? 'owner-unit' : 'other-unit';
      html += `<li class="${cls}" data-unit-id="${u.id}" onclick="showDescription(event,'${div_id}','${id}','${u.id}')">` + unitShort(u) + '</li>';
    }
    html += '</ul></div>';
  }

  regionTarget.innerHTML = html || 'No details';
  regionTarget.style.display = 'block';
  return false;
}

function showTooltip(event, id, text) {
  const tooltip = document.getElementById(id);
  tooltip.style.display = 'block';
  tooltip.innerHTML = text;
  tooltip.style.display = 'block';
  const x = event.clientX + 10;
  const y = event.clientY - 10;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip(id) {
  const tooltip = document.getElementById(id);
  tooltip.style.display = 'none';
}

function initDiv(element) {

  if (element.id === 'rdetails') {
    element.innerHTML = 'Select a region to see details here.';
  }
}

// document.addEventListener('DOMContentLoaded', function () {
//   const rdetails = document.getElementById('rdetails');
//   const udetails = document.getElementById('udetails');
//   if (rdetails) {
//     rdetails.innerHTML = 'Select a region to see details here.';
//   }
//   if (udetails) {
//     udetails.innerHTML = 'Select a unit to see details here.';
//   }
// });