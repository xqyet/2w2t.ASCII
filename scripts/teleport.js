(() => {
  if (typeof window.tw2tTeleport !== 'function') {
    alert('Reload the page with the updated code first.');
    return;
  }

  const coord = (prompt('Enter target as "x,y":', '0,0') || '0,0')
    .split(',')
    .map(s => Number(s.trim()));

  if (coord.length !== 2 || coord.some(Number.isNaN)) {
    alert('Bad input');
    return;
  }

  // Local clamp (hidden from users — just a big safe limit)
  const MAX = 1000000; // units (~matches your app’s safe range without revealing chars)
  const clamp = n => Math.max(-MAX, Math.min(MAX, Math.trunc(n)));

  const xClamped = clamp(coord[0]);
  const yClamped = clamp(coord[1]);

  if (xClamped !== coord[0] || yClamped !== coord[1]) {
    alert("You can scroll infinitely, but I've added a limit to this public teleport script to keep my database happy.");
  }

  window.tw2tTeleport({
    x: xClamped,
    y: yClamped,
    center: true,
    placeCaret: true,
    animateMs: 600
  });
})();
