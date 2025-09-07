(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function readClipboardOrPrompt() {
    try { const t = await navigator.clipboard.readText(); if (t?.trim()) return t; } catch {}
    return prompt('Paste your text here:') || '';
  }

  function keydown(key) {
    const code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}`
               : key === ' ' ? 'Space'
               : key === 'Enter' ? 'Enter' : 'Unidentified';
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles:true, cancelable:true }));
  }
  const pressEnter = () => keydown('Enter');

  function waitForCanvasClick(timeoutMs=10000){
    const cv = document.querySelector('canvas');
    if (!cv) return Promise.resolve();
    console.log('Click a start cell (outside the gray plaza)…');
    return new Promise(res => {
      let done=false; const on=()=>{ if(done) return; done=true; cv.removeEventListener('click',on,true); res(); };
      cv.addEventListener('click',on,true);
      setTimeout(()=>{ if(!done){ cv.removeEventListener('click',on,true); res(); } }, timeoutMs);
    });
  }

  // pacing (tweak if you see 409s)
  const PER_CHAR_MS = 54;
  const ENTER_MS    = 64;
  const BURST_N     = 180;
  const BURST_MS    = 160;

  // Always advance 
  const EXTRA_BLANK_LINES = 0; 

  let stop = false;
  const stopHandler = e => { if (e.key === 'Escape') { stop = true; console.log('Stopping…'); } };
  window.addEventListener('keydown', stopHandler);

  async function typeBlock(lines) {
    let burst = 0;
    for (let li = 0; li < lines.length; li++) {
      for (const ch of Array.from(lines[li])) {
        if (stop) return false;
        keydown(ch);
        await sleep(PER_CHAR_MS);
        if (++burst >= BURST_N) { await sleep(BURST_MS); burst = 0; }
      }
      if (li < lines.length - 1) {
        if (stop) return false;
        pressEnter(); await sleep(ENTER_MS);
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

    console.log('Typing started. Press ESC to stop.');
    let loops = 0;
    while (!stop) {
      const ok = await typeBlock(lines);
      if (!ok) break;

      // *** KEY CHANGE: move to next line after each block ***
      pressEnter();                    
      await sleep(ENTER_MS);

      for (let i=0; i<EXTRA_BLANK_LINES && !stop; i++) {
        pressEnter(); await sleep(ENTER_MS);
      }

      loops++;
      if (loops % 10 === 0) console.log(`Completed ${loops} repeats…`);
    }
    window.removeEventListener('keydown', stopHandler);
    console.log(`Stopped after ${loops} repeats.`);
  })();
})();
