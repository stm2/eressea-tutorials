function showDescription(event, div_id, id) {
  event.preventDefault();
  if (id) {
    let element = document.getElementById(div_id);
    let desc = document.getElementById(id).children[1].innerHTML;
    element.innerHTML = desc;
    element.style.display = "block";
  }
  return false;
}

function positionTooltip(event) {
  const tooltip = document.getElementById('tooltip');
  const x = event.clientX;
  const y = event.clientY;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function showTooltip(event, text) {
  const tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = text;
  tooltip.style.display = 'block';
  positionTooltip(event);
}

function hideTooltip() {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.display = 'none';
}