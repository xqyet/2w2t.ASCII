(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function readClipboardOrPrompt() {
    try { const t = await navigator.clipboard.readText(); if (t?.trim()) return t; } catch {}
    return prompt('Paste your text here:') || '';
  }

  // ---------- SETTINGS ----------
  const PER_CHAR_MS = 54;   // typing cadence
  const STEP_MS     = 64;   // between key presses
  const BURST_N     = 180;  // throttle bursts
  const BURST_MS    = 160;

  // Auto-pan: drag the canvas a bit after each UP move
  const PAN_AFTER_EACH_LINE   = true;  // turn panning on/off
  const PAN_PIXELS_PER_LINE   = 22;    // how much to drag per line
  const PAN_INVERT_DIRECTION  = false; // flip if it pans the wrong way
  const PAN_BUTTON            = 2;     // 0=left, 1=middle, 2=right (most boards use right)
  // --------------------------------

  // Key dispatcher
  function keydown(key) {
    const code =
      /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` :
      key === ' ' ? 'Space' :
      key === 'Enter' ? 'Enter' :
      key.startsWith('Arrow') ? key :
      'Unidentified';
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles:true, cancelable:true }));
  }
  const pressUp   = () => keydown('ArrowUp');
  const pressLeft = () => keydown('ArrowLeft');

  const moveLeft = async (n) => { for (let i = 0; i < n; i++) { pressLeft(); await sleep(STEP_MS); } };

  // Prevent context menu popping up during simulated right-drag
  window.addEventListener('contextmenu', e => e.preventDefault(), { capture:true });

  // Pointer drag pan on the canvas
  async function panCanvas(dyPx) {
    const cv = document.querySelector('canvas');
    if (!cv) return;

    const rect = cv.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top  + rect.height / 2);

    const buttonsMask = PAN_BUTTON === 0 ? 1 : PAN_BUTTON === 1 ? 4 : 2;

    const ev = (type, x, y, extra={}) => {
      cv.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true,
        pointerId: 1, pointerType: 'mouse', isPrimary: true,
        clientX: x, clientY: y,
        button: PAN_BUTTON, buttons: type === 'pointerup' ? 0 : buttonsMask,
        ...extra
      }));
    };

    // Press-drag-release
    ev('pointerdown', cx, cy);
    await sleep(4);

    // Drag vertically (positive dy moves cursor down on screen)
    const dir = PAN_INVERT_DIRECTION ? -1 : 1;
    const y2 = cy + (dyPx * dir);
    ev('pointermove', cx, y2);
    await sleep(8);

    ev('pointerup', cx, y2);
    await sleep(8);
  }

  function waitForCanvasClick(timeoutMs = 10000) {
    const cv = document.querySelector('canvas');
    if (!cv) return Promise.resolve();
    console.log('Click the cell where the BOTTOM line should start…');
    return new Promise(res => {
      let done = false;
      const on = () => { if (done) return; done = true; cv.removeEventListener('click', on, true); res(); };
      cv.addEventListener('click', on, true);
      setTimeout(() => { if (!done) { cv.removeEventListener('click', on, true); res(); } }, timeoutMs);
    });
  }

  let stop = false;
  window.addEventListener('keydown', e => { if (e.key === 'Escape') stop = true; });

  async function typeLineLTR(str) {
    let burst = 0;
    for (const ch of Array.from(str)) {
      if (stop) return false;
      keydown(ch);
      await sleep(PER_CHAR_MS);
      if (++burst >= BURST_N) { await sleep(BURST_MS); burst = 0; }
    }
    return true;
  }

  // Type a whole block bottom → top, LTR only. After each line:
  // move back to start (ArrowLeft * length), ArrowUp, then (optionally) pan the canvas.
  async function typeBlockUpward(lines) {
    for (let li = lines.length - 1; li >= 0; li--) {
      const line = lines[li];
      const ok = await typeLineLTR(line);
      if (!ok) return false;

      if (line.length > 0) await moveLeft(line.length); // back to start of line

      if (li > 0) {
        pressUp(); await sleep(STEP_MS);                 // go to line above
        if (PAN_AFTER_EACH_LINE) await panCanvas(PAN_PIXELS_PER_LINE);
      }
    }
    return true;
  }

  (async () => {
    await waitForCanvasClick();
    await sleep(40);

    let text = await readClipboardOrPrompt();
    if (!text) return console.log('No text.');
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '  ');
    const lines = text.split('\n');

    console.log('Typing bottom→top (LTR only) with auto-pan. Press ESC to stop.');
    let loops = 0;
    while (!stop) {
      const ok = await typeBlockUpward(lines);
      if (!ok) break;

      // stack next copy immediately above and pan again so it stays centered
      pressUp(); await sleep(STEP_MS);
      if (PAN_AFTER_EACH_LINE) await panCanvas(PAN_PIXELS_PER_LINE);

      loops++;
      if (loops % 10 === 0) console.log(`Completed ${loops} repeats…`);
    }
    console.log(`Stopped after ${loops} repeats.`);
  })();
})();
