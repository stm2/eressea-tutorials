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