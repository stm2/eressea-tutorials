// === Helpers ==============================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unitShort(unit) {
  let uhtml = `<b>${escapeHtml(unit.name)} (${escapeHtml(unit.id)})</b>` + (unit.factionName ? `, <span class="faction">${escapeHtml(unit.factionName)} (${escapeHtml(unit.faction)})</span>` : '');
  if (unit.tags && unit.tags.Anzahl) {
    uhtml += `, ${escapeHtml(unit.tags.Anzahl)}`;
  }
  if (unit.tags && unit.tags.Typ) {
    uhtml += ` ${escapeHtml(unit.tags.Typ)}`;
  }
  return uhtml;
}

function parseRegionData(regionUse) {
  const link = regionUse.closest('.cr-region-link') || regionUse;
  if (!link) return null;
  if (link._crRegionData) return link._crRegionData; // cache
  const attr = link.getAttribute('data-region');
  if (!attr) return null;
  try {
    link._crRegionData = JSON.parse(decodeURIComponent(attr));
    return link._crRegionData;
  } catch (e) {
    link._crRegionDataError = e;
    return null;
  }
}

function parseUnitsData(regionUse) {
  const parent = regionUse.parentNode;
  if (!parent) return [];
  const unitsUse = parent.querySelector('use[data-units]');
  if (!unitsUse) return [];
  if (unitsUse._crUnitsData) return unitsUse._crUnitsData;
  const attr = unitsUse.getAttribute('data-units');
  if (!attr) return [];
  try {
    unitsUse._crUnitsData = JSON.parse(decodeURIComponent(attr));
    return unitsUse._crUnitsData;
  } catch (e) {
    unitsUse._crUnitsDataError = e;
    return [];
  }
}

function buildRegionHtml(regionData) {
  if (!regionData || !regionData.tags) return '';
  let html = `<b>${escapeHtml(regionData.tags.Terrain || '')} ${escapeHtml(regionData.tags.Name || '')}</b> (${escapeHtml(regionData.x)}, ${escapeHtml(regionData.y)})`;
  const entries = Object.entries(regionData.tags).filter(([k]) => !['Name', 'id', 'Terrain'].includes(k));
  if (entries.length) {
    html += '<div class="region_tags">' + entries.map(([k, v]) => `<div><i>${escapeHtml(k)}</i>: ${escapeHtml(v)}</div>`).join('') + '</div>';
  }
  return html;
}

function buildUnitListHtml(units, regionDomId, targetId) {
  if (!units || !units.length) return '';
  let html = '<div class="unit_block"><b>Units:</b><ul>';
  for (const u of units) {
    const cls = u.isOwner ? 'owner-unit' : 'other-unit';
    html += `<li class="${cls} cr-unit-link" data-unit-id="${escapeHtml(u.id)}" data-region-id="${escapeHtml(regionDomId)}" data-region-target="${escapeHtml(targetId)}">` + unitShort(u) + '</li>';
  }
  html += '</ul></div>';
  return html;
}

function buildUnitDetailHtml(unit) {
  if (!unit) return '';
  let uhtml = '<div class="unit_detail">' + unitShort(unit);
  if (unit.skills && Object.keys(unit.skills).length) {
    uhtml += '<div class="skills">' + Object.entries(unit.skills).map(([sk, val]) => `<span>${escapeHtml(sk)} ${escapeHtml(val)}</span>`).join(', ') + '</div>';
  }
  if (unit.items && Object.keys(unit.items).length) {
    uhtml += '<div class="items">' + Object.entries(unit.items).map(([item, amount]) => `<span>${escapeHtml(amount)} ${escapeHtml(item)}</span>`).join(', ') + '</div>';
  }
  const omit = ['Name', 'id', 'Partei', 'Anzahl', 'Typ'];
  const rest = Object.entries(unit.tags || {}).filter(([k]) => !omit.includes(k));
  if (rest.length) {
    uhtml += '<div class="unit_tags">' + rest.map(([k, v]) => `<div><i>${escapeHtml(k)}</i>: ${escapeHtml(v)}</div>`).join('') + '</div>';
  }
  uhtml += '</div>';
  return uhtml;
}

function buildUnitCommandsHtml(unit) {
  if (!unit) return '';
  const commands = (unit.commands || []).join('\n');
  return '<textarea readonly style="width:100%;min-height:8em;">' + escapeHtml(commands) + '</textarea>';
}

function updateUnitPanels(regionUse, units, unitId) {
  if (!unitId) return; // nothing to do
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  const cridVal = (regionUse.getAttribute('data-crid') || '');
  const unitDetails = document.getElementById('udetails_' + cridVal);
  const unitCommands = document.getElementById('ucommands_' + cridVal);
  if (unitDetails) unitDetails.innerHTML = buildUnitDetailHtml(unit);
  if (unitCommands) unitCommands.innerHTML = buildUnitCommandsHtml(unit);
}

// === Orchestrator =========================================================
function showDescription(event, targetDivId, regionDomId, unitId) {
  if (event) event.preventDefault();
  if (!regionDomId) return false;
  const regionTarget = document.getElementById(targetDivId);
  if (!regionTarget) return false;
  const regionUse = document.getElementById(regionDomId);
  if (!regionUse) return false;

  const regionData = parseRegionData(regionUse);
  const units = parseUnitsData(regionUse);

  // Update side panels for a specific unit (details + commands) first so unit view stays in sync
  if (unitId) updateUnitPanels(regionUse, units, unitId);

  let html = '';
  html += buildRegionHtml(regionData);
  html += buildUnitListHtml(units, regionDomId, targetDivId);

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

// TODO: Accessibility: add keyboard listeners (Enter/Space) for .cr-region-link and .cr-unit-link
// and ARIA roles (button/list/listitem) in a subsequent enhancement.

(function initCRMapBindings() {
  if (window.__crMapBound) return; // avoid rebinding on partial reloads
  window.__crMapBound = true;
  document.addEventListener('mousemove', function (e) {
    const target = e.target?.closest?.('.cr-region-link') || null;
    if (target && target.dataset.tooltipId && target.dataset.tooltip) {
      showTooltip(e, target.dataset.tooltipId, target.dataset.tooltip);
    }
  }, true);
  document.addEventListener('mouseout', function (e) {
    const rel = e.relatedTarget;
    const link = e.target?.closest?.('.cr-region-link') || null;
    if (link && (!rel || !rel.closest('.cr-region-link')) && link.dataset.tooltipId) {
      hideTooltip(link.dataset.tooltipId);
    }
  }, true);
  document.addEventListener('click', function (e) {
    const regionLink = e.target?.closest?.('.cr-region-link') || null;
    if (regionLink && regionLink.dataset.regionId && regionLink.dataset.regionTarget) {
      showDescription(e, regionLink.dataset.regionTarget, regionLink.dataset.regionId);
      e.preventDefault();
      return;
    }
    const unitLink = e.target.closest('.cr-unit-link');
    if (unitLink) {
      const regionId = unitLink.dataset.regionId;
      const rtarget = unitLink.dataset.regionTarget;
      const uid = unitLink.dataset.unitId;
      showDescription(e, rtarget, regionId, uid);
      e.preventDefault();
    }
  });
})();