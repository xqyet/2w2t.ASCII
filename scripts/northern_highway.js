(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function readClipboardOrPrompt() {
    try { const t = await navigator.clipboard.readText(); if (t?.trim()) return t; } catch {}
    return prompt('Paste your text here:') || '';
  }

  // minimal key dispatcher
  function keydown(key) {
    const code =
      /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` :
      key === ' ' ? 'Space' :
      key === 'Enter' ? 'Enter' :
      key.startsWith('Arrow') ? key :
      'Unidentified';
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles:true, cancelable:true }));
  }
  const pressUp    = () => keydown('ArrowUp');
  const pressLeft  = () => keydown('ArrowLeft');

  const moveLeft = async (n, stepMs) => { for (let i = 0; i < n; i++) { pressLeft(); await sleep(stepMs); } };

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

  // pacing (tweak if rate-limited)
  const PER_CHAR_MS = 54;
  const STEP_MS     = 64;
  const BURST_N     = 180;
  const BURST_MS    = 160;

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

  // Type a whole block bottom → top, LTR only.
  async function typeBlockUpward(lines) {
    for (let li = lines.length - 1; li >= 0; li--) {
      const line = lines[li];
      const ok = await typeLineLTR(line);
      if (!ok) return false;

      // Return to line start, then go up
      if (line.length > 0) await moveLeft(line.length, STEP_MS);
      if (li > 0) { pressUp(); await sleep(STEP_MS); }
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

    console.log('Typing bottom→top (LTR only). Press ESC to stop.');
    let loops = 0;
    while (!stop) {
      const ok = await typeBlockUpward(lines);
      if (!ok) break;

      // Stack the next copy immediately above the block
      pressUp(); await sleep(STEP_MS);

      loops++;
      if (loops % 10 === 0) console.log(`Completed ${loops} repeats…`);
    }
    console.log(`Stopped after ${loops} repeats.`);
  })();
})();
