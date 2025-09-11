(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function readClipboardOrPrompt() {
    try { const t = await navigator.clipboard.readText(); if (t?.trim()) return t; } catch {}
    return prompt('Paste your text here:') || '';
  }

  // ---------- SETTINGS ----------
  const PER_CHAR_MS = 54;    // typing cadence
  const STEP_MS     = 64;    // after arrow step
  const BURST_N     = 180;
  const BURST_MS    = 160;

  const EXTRA_BLANK_LINES = 0;   // extra blank lines between blocks

  // Auto-pan
  const PAN_AFTER_EACH_LINE   = true;
  const PAN_AFTER_EACH_BLOCK  = true;
  const PAN_PIXELS_PER_LINE   = 22;
  const PAN_INVERT_DIRECTION  = false;
  const PAN_BUTTON            = 2;
  // --------------------------------

  function keydown(key) {
    const code =
      /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` :
      key === ' ' ? 'Space' :
      key.startsWith('Arrow') ? key :
      'Unidentified';
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles:true, cancelable:true }));
  }
  const pressLeft  = () => keydown('ArrowLeft');
  const pressDown  = () => keydown('ArrowDown');

  const moveLeft = async n => { for (let i=0;i<n;i++){ pressLeft(); await sleep(STEP_MS); } };

  // Prevent context menu while doing right-drag pans
  window.addEventListener('contextmenu', e => e.preventDefault(), { capture:true });

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

    const dir = PAN_INVERT_DIRECTION ? -1 : 1;
    const y2 = cy + (dyPx * dir);

    ev('pointerdown', cx, cy);
    await sleep(4);
    ev('pointermove', cx, y2);
    await sleep(8);
    ev('pointerup',   cx, y2);
    await sleep(8);
  }

  function waitForCanvasClick(timeoutMs=10000){
    const cv = document.querySelector('canvas');
    if (!cv) return Promise.resolve();
    console.log('Click a start cell…');
    return new Promise(res => {
      let done=false; const on=()=>{ if(done) return; done=true; cv.removeEventListener('click',on,true); res(); };
      cv.addEventListener('click',on,true);
      setTimeout(()=>{ if(!done){ cv.removeEventListener('click',on,true); res(); } }, timeoutMs);
    });
  }

  let stop = false;
  window.addEventListener('keydown', e => { if (e.key === 'Escape') stop = true; });

  async function typeBlock(lines) {
    let burst = 0;
    for (let li = 0; li < lines.length; li++) {
      // type line
      for (const ch of Array.from(lines[li])) {
        if (stop) return false;
        keydown(ch);
        await sleep(PER_CHAR_MS);
        if (++burst >= BURST_N) { await sleep(BURST_MS); burst = 0; }
      }

      if (li < lines.length - 1) {
        // return caret to start of this line
        if (lines[li].length > 0) await moveLeft(lines[li].length);
        // move down to next line
        pressDown(); await sleep(STEP_MS);
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
    text = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\t/g,'  ');
    const lines = text.split('\n');

    console.log('Typing started (downward, Left+Down). Press ESC to stop.');
    let loops = 0;
    while (!stop) {
      const ok = await typeBlock(lines);
      if (!ok) break;

      // *** KEY FIX: after the LAST line of the block, go back to the start,
      // then go DOWN once to continue straight below (prevents sideways shift)
      const lastLen = lines[lines.length - 1]?.length ?? 0;
      if (lastLen > 0) await moveLeft(lastLen);
      pressDown(); await sleep(STEP_MS);
      if (PAN_AFTER_EACH_BLOCK) await panCanvas(PAN_PIXELS_PER_LINE);

      // Optional extra blank lines between blocks
      for (let i=0; i<EXTRA_BLANK_LINES && !stop; i++) {
        pressDown(); await sleep(STEP_MS);
        if (PAN_AFTER_EACH_BLOCK) await panCanvas(PAN_PIXELS_PER_LINE);
      }

      loops++;
      if (loops % 10 === 0) console.log(`Completed ${loops} repeats…`);
    }
    console.log(`Stopped after ${loops} repeats.`);
  })();
})();
