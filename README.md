#  <p align="center"> ASCII Scripting Tool for 2w2t! </p>

<p align="center"> Automatically paste your art line by line into 2w2t directly from your clipboard using only the browser console - no extensions required.</p>

<p align="center">
  <img src="zero-two.gif" alt="Zero Two">
</p>

## How to use

1. Open [www.2w2t.org](https://2w2t.org/)

2. Press F12 → Console.

3. Paste a script below → Enter.

4. Click the start cell (outside the gray plaza).

5. It will begin pasting your ASCII Art line by line starting from the top. Enjoy!

   <p align="center">
  <img src="example.png" alt="Example">
</p>

<a id="ascii-script"></a>

# ASCII Art Pasting Script (no color)
[good site for braille](https://lachlanarthur.github.io/Braille-ASCII-Art/)

   ```js
   (() => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
  
    async function readClipboardOrPrompt() {
      try {
        const t = await navigator.clipboard.readText();
        if (t && t.trim()) return t;
      } catch {}
      return prompt('Paste your text here:') || '';
    }
  
    function keydown(key) {
      const ev = new KeyboardEvent('keydown', {
        key,
        code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` :
              key === ' ' ? 'Space' :
              key === 'Enter' ? 'Enter' : 'Unidentified',
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(ev);
    }
  
    function pressEnter() { keydown('Enter'); }
  
    function waitForCanvasClick(timeoutMs = 10000) {
      const cv = document.querySelector('canvas');
      if (!cv) return Promise.resolve();
      console.log('Click a target cell to set the caret (outside the gray plaza)…');
      return new Promise(resolve => {
        let done = false;
        const on = () => { if (done) return; done = true; cv.removeEventListener('click', on, true); resolve(); };
        cv.addEventListener('click', on, true);
        setTimeout(() => { if (!done) { cv.removeEventListener('click', on, true); resolve(); } }, timeoutMs);
      });
    }
  
    async function run() {
      await waitForCanvasClick();
      await sleep(40); 
  
      let text = await readClipboardOrPrompt();
      if (!text) { console.log('No text.'); return; }
  
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '  ');
      const lines = text.split('\n');
  
      // pacing to reduce 409 conflicts errors (tweak if you receive any on particularly long ASCII)
      const PER_CHAR_MS = 24;
      const ENTER_MS    = 18;
      const BURST_N     = 180; 
      const BURST_MS    = 160;
  
      let burst = 0;
      for (let li = 0; li < lines.length; li++) {
        for (const ch of Array.from(lines[li])) { 
          keydown(ch);
          await sleep(PER_CHAR_MS);
          if (++burst >= BURST_N) { await sleep(BURST_MS); burst = 0; }
        }
        if (li < lines.length - 1) {
          pressEnter();
          await sleep(ENTER_MS);
        }
      }
      console.log('Enjoy your new ASCII Art!');
    }
  
    run();
   })();
    
```
# ASCII Art Pasting Script (for pasting multi-color)
I convert art to color ASCII using [this site](https://folge.me/tools/image-to-ascii) - DO NOT PRESS THE COPY BUTTON! You will lose all formatting and it will paste in a straight line. Make sure to highlight your art and then copy :)

   ```js
   (() => {
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- HTML -> [{ch,color}] or '\n'
const BLOCKS = new Set(['DIV','P','PRE','SECTION','ARTICLE','H1','H2','H3','H4','H5','H6','UL','OL','LI']);
function flatten(node, inherited, out){
    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node;
        const color = el.style?.color || (el.hasAttribute('color') ? el.getAttribute('color') : inherited);
        const isBlock = BLOCKS.has(el.tagName);
        if (el.tagName === 'BR') { out.push('\n'); return; }
        if (isBlock && out.length && out[out.length-1] !== '\n') out.push('\n');
        for (const c of Array.from(el.childNodes)) flatten(c, color, out);
        if (isBlock && out.length && out[out.length-1] !== '\n') out.push('\n');
        return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '').replace(/\u00A0/g,' ');
        for (const ch of Array.from(text)) out.push({ ch, color: inherited });
    }
}
function htmlToStream(html){
    const div = document.createElement('div'); div.innerHTML = html;
    const out = []; for (const c of Array.from(div.childNodes)) flatten(c, undefined, out);
    while (out[0] === '\n') out.shift();
    while (out[out.length-1] === '\n') out.pop();
    return out;
}

// --- ANSI -> [{ch,color}] or '\n'
const BASE=['#000','#800000','#008000','#808000','#000080','#800080','#008080','#c0c0c0'];
const BRIGHT=['#808080','#ff0000','#00ff00','#ffff00','#0000ff','#ff00ff','#00ffff','#ffffff'];
const STEPS=[0,95,135,175,215,255];
const idx256 = (n) => n<=7?BASE[n]:n<=15?BRIGHT[n-8]:
n<=231?((i=n-16,r=STEPS[(i/36|0)%6],g=STEPS[(i/6|0)%6],b=STEPS[i%6],`rgb(${r},${g},${b})`)):
n<=255?((v=8+10*(n-232)),`rgb(${v},${v},${v})`):undefined;
function sgrToColor(codes){
    let color;
    for (let i=0;i<codes.length;i++){
        const c=codes[i];
        if (c===0||c===39) color=undefined;
        else if (c>=30&&c<=37) color=BASE[c-30];
        else if (c>=90&&c<=97) color=BRIGHT[c-90];
        else if (c===38){
            const mode=c[++i];
            if (mode===2){ const r=c[++i],g=c[++i],b=c[++i]; if ([r,g,b].every(Number.isFinite)) color=`rgb(${r},${g},${b})`; }
            else if (mode===5){ const n=c[++i]; const col=idx256(n); if (col) color=col; }
        }
    }
    return color;
}
function ansiToStream(text){
    const out=[]; let i=0, cur;
    while(i<text.length){
        const ch=text[i];
        if (ch=== '\r'){ i++; continue; }
        if (ch=== '\n'){ out.push('\n'); i++; continue; }
        if (ch=== '\x1b' && text[i+1]==='['){
            i+=2; let seq=''; while(i<text.length && text[i]!=='m') seq+=text[i++]; if (text[i]==='m') i++;
            const codes=seq.split(';').map(n=>parseInt(n,10)).filter(n=>!Number.isNaN(n));
            cur=sgrToColor(codes); continue;
        }
        out.push({ ch, color: cur }); i++;
    }
    return out;
}

function keydown(key) {
    const ev = new KeyboardEvent('keydown', {
        key, code: key==='Enter' ? 'Enter' : (/^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : 'Unidentified'),
        bubbles: true, cancelable: true
    });
    window.dispatchEvent(ev);
}
const pressEnter = () => keydown('Enter');

const cv = document.querySelector('canvas');
if (!cv) { console.warn('No <canvas> found.'); return; }
console.log('Click the canvas where you want the art to start…');

const onClick = (e) => {
    window.removeEventListener('click', onClick, true);

    let htmlPromise, textPromise;
    try {
        if (navigator.clipboard?.read) htmlPromise = navigator.clipboard.read();
        textPromise = navigator.clipboard?.readText ? navigator.clipboard.readText() : Promise.resolve('');
    } catch {}

    Promise.resolve(htmlPromise).then(async (items) => {
        let html = '';
        if (items && items.length) {
            for (const it of items) {
                try {
                    if (it.types.includes('text/html')) {
                        const blob = await it.getType('text/html');
                        html = await blob.text();
                        break;
                    }
                } catch {}
            }
        }
        const text = await Promise.resolve(textPromise).catch(() => '');
        let stream = [];
        if (html) stream = htmlToStream(html);
        else if (text) stream = ansiToStream(text.replace(/\r\n/g,'\n').replace(/\r/g,'\n'));
        else { console.log('Nothing on clipboard.'); return; }

        // --- SPEED SETTINGS (tweak if you get any 409 errors)
        const PER_CHAR_MS = 40;      // <- originally 10
        const ENTER_MS    = 25;      // <- originally 6
        const BURST_N     = 120;     // <- half the previous 240
        const BURST_MS    = 300;     // <- previously 120

        let burst=0;
        for (const tok of stream){
            if (tok === '\n'){
                pressEnter();
                await sleep(ENTER_MS);
                continue;
            }
            const { ch, color } = tok;
            if (typeof window.tw2tWriteChar === 'function') {
                window.tw2tWriteChar(ch, color);
            } else {
                keydown(ch);
            }
            await sleep(PER_CHAR_MS);

            if (++burst >= BURST_N){
                await sleep(BURST_MS);
                burst = 0;
            }
        }
        console.log("Done.");
    }).catch(err => {
        console.warn("Clipboard read failed, fallback to plain text.", err);
        Promise.resolve(navigator.clipboard?.readText?.()).then(async (text='')=>{
            const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
            for (let i=0;i<lines.length;i++){
                for (const ch of Array.from(lines[i])){ keydown(ch); await sleep(40); }
                if (i<lines.length-1){ pressEnter(); await sleep(25); }
            }
        });
    });
};

window.addEventListener('click', onClick, { capture: true, once: true });
})();

```
<a id="teleport-script"></a>
# Teleport Script 
> [!NOTE]
> Teleporting more than 1 trillion tiles at once in any direction can often cause your browser to crash. If you want to go absurdly far out to build, do it in 500 to 900 million increments. The furthest I have personally gone is over 1 quadrillion, but at a certain insane number even the tiles will begin to glitch before the webpage completely crashes. Enjoy!
```js
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
    alert("You can continue to scroll infinitely, but I've added a limit of 1 trillion to this public teleport script to keep your browser happy :) loading ~too many~ tiles at once can sometimes be too much for your browser to handle (and it will crash)");
  }

  window.tw2tTeleport({
    x: xClamped,
    y: yClamped,
    center: true,
    placeCaret: true,
    animateMs: 600
  });
})();
```
