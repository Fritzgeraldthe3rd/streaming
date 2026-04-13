// subtitle-settings.js
// Injects a small subtitle settings panel and binds controls to CSS variables
(function(){
  const defaults = {};
  const root = document.documentElement;

  function readVar(name){
    const val = getComputedStyle(root).getPropertyValue(name).trim();
    return val || null;
  }

  function setVar(name, value){
    root.style.setProperty(name, value);
  }

  function createSlider(labelText, varName, step, min, max){
    const row = document.createElement('div');
    row.className = 'ss-row';

    const label = document.createElement('label');
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.className = 'ss-range';
    const raw = readVar(varName) || '';
    // try parse float from raw
    const n = parseFloat(raw) || 1;
    input.value = n;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'ss-value';
    valueDisplay.textContent = input.value;

    input.addEventListener('input', ()=>{
      valueDisplay.textContent = input.value;
      // suffix for padding variables
      const suffix = varName.includes('padding') || varName.includes('margin') ? 'em' : '';
      setVar(varName, input.value + suffix);
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(valueDisplay);
    return row;
  }

  function init(){
    if(document.getElementById('ss-panel')) return;

    // capture defaults
    ['--subtitle-line-height','--subtitle-line-height-full','--subtitle-padding','--subtitle-padding-full','--subtitle-margin-bottom','--subtitle-margin-bottom-full'].forEach(k=>{
      defaults[k] = readVar(k) || '';
    });

    const btn = document.createElement('button');
    btn.id = 'ss-toggle-btn';
    btn.title = 'Subtitle Settings';
    btn.textContent = 'Subtitles';
    btn.className = 'ss-toggle';

    const panel = document.createElement('div');
    panel.id = 'ss-panel';
    panel.className = 'ss-panel';

    // sliders
    const lh = createSlider('Line height', '--subtitle-line-height', 0.01, 1.0, 2.0);
    const lhFull = createSlider('Line height (FS)', '--subtitle-line-height-full', 0.01, 0.8, 1.6);
    const pad = createSlider('Padding (em)', '--subtitle-padding', 0.01, 0.0, 1.0);
    const padFull = createSlider('Padding FS (em)', '--subtitle-padding-full', 0.01, 0.0, 0.8);

    const reset = document.createElement('button');
    reset.className = 'ss-reset';
    reset.textContent = 'Reset';
    reset.addEventListener('click', ()=>{
      Object.keys(defaults).forEach(k=>{
        if(defaults[k]) root.style.setProperty(k, defaults[k]); else root.style.removeProperty(k);
      });
      // refresh displayed values
      panel.querySelectorAll('.ss-range').forEach(inp=>{
        const name = inp.previousSibling && inp.previousSibling.textContent || '';
        // attempt to infer which variable this input controls by reading its current value via label
        const varName = inp === panel.querySelector('.ss-range') ? '--subtitle-line-height' : null;
        // best-effort: simply reload page style values into inputs
        const varMap = ['--subtitle-line-height','--subtitle-line-height-full','--subtitle-padding','--subtitle-padding-full'];
        panel.querySelectorAll('.ss-range').forEach((i, idx)=>{
          const v = readVar(varMap[idx]);
          if(v) i.value = parseFloat(v) || i.value;
          const disp = i.parentNode.querySelector('.ss-value'); if(disp) disp.textContent = i.value;
        });
      });
    });

    panel.appendChild(lh);
    panel.appendChild(lhFull);
    panel.appendChild(pad);
    panel.appendChild(padFull);
    panel.appendChild(reset);

    btn.addEventListener('click', ()=>{
      panel.classList.toggle('open');
    });

    // attach to player controls if exists else body
    const attachTo = document.querySelector('.player-controls') || document.body;
    attachTo.appendChild(btn);
    attachTo.appendChild(panel);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
