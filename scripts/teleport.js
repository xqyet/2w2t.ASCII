(() => {
  const ready = () => typeof window.tw2tTeleport === 'function';
  if (!ready()) { alert('Reload the page with the updated code first.'); return; }

  const coord = (prompt('Enter target as "x,y":', '0,0') || '0,0')
    .split(',').map(s => Number(s.trim()));
  if (coord.length !== 2 || coord.some(n => Number.isNaN(n))) { alert('Bad input'); return; }

  const unit = (prompt('Units? "unit" | "char" | "tile" (default unit):', 'unit') || 'unit')
    .toLowerCase();

  window.tw2tTeleport({
    x: coord[0],
    y: coord[1],
    units: (unit === 'char' || unit === 'tile') ? unit : 'unit',
    center: true,
    placeCaret: true,
    animateMs: 600
  });
})();
