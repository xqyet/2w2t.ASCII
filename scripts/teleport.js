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

  const MAX = 1000000000000; // I have a loose limit server side, so changing this value won't do anything. But it should be easy to bypass if you'd like to go even further :)
  const clamp = n => Math.max(-MAX, Math.min(MAX, Math.trunc(n)));

  const xClamped = clamp(coord[0]);
  const yClamped = clamp(coord[1]);

  if (xClamped !== coord[0] || yClamped !== coord[1]) {
    alert("You can continue to scroll infinitely, but I've added a limit of 1 trillion to this public teleport script to keep my database happy :)");
  }

  window.tw2tTeleport({
    x: xClamped,
    y: yClamped,
    center: true,
    placeCaret: true,
    animateMs: 600
  });
})();
