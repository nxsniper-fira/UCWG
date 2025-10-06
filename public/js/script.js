// UCWG main script - loads usernames.txt into baseWords, uses worker to generate
const $ = id => document.getElementById(id);
const baseWords = $('baseWords');
const generateBtn = $('generateBtn');
const stopBtn = $('stopBtn');
const clearBtn = $('clearBtn');
const downloadLink = $('downloadLink');
const previewBox = $('previewBox');
const wordCount = $('wordCount');
const estSize = $('estSize');
const genTime = $('genTime');
const progressBar = $('progressBar');
const maxWordsInput = $('maxWords');
const dedupe = $('dedupe');
const exclusion = $('exclusion');
const leetLevel = $('leetLevel');
const fileInput = $('fileInput');

let worker = null;
let producedTotal = 0;
let chunks = [];
let t0 = 0;
const HARD_CLIENT_CAP = 500000;

async function loadUsernames(){
  try{
    const res = await fetch('./data/usernames.txt');
    if(!res.ok) throw new Error('no usernames file');
    const txt = await res.text();
    // append additional generated usernames: create variations by adding numbers to each (limited)
    const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    // attach some common suffixes to expand
    const expanded = [];
    for(const l of lines){
      expanded.push(l);
      expanded.push(l + '1');
      expanded.push(l + '123');
      expanded.push('x' + l);
      expanded.push(l + '_01');
    }
    // dedupe and set
    const unique = Array.from(new Set(expanded));
    baseWords.value = unique.join('\n');
  }catch(err){
    console.warn('Could not load usernames.txt', err);
  }
}

loadUsernames();

fileInput.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    const txt = String(reader.result || '');
    const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    // append to textarea
    const current = baseWords.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const merged = Array.from(new Set([...current, ...lines]));
    baseWords.value = merged.join('\n');
  };
  reader.readAsText(f);
});

function collectConfig(){
  const bases = baseWords.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const numRanges = Array.from(document.querySelectorAll('.numRange:checked')).map(i=>i.value);
  const symSets = Array.from(document.querySelectorAll('.symSet:checked')).map(i=>i.value);
  const caseOptions = Array.from(document.querySelectorAll('.caseVar:checked')).map(i=>i.value);
  const patterns = { complex: document.getElementById('complexPattern').checked, kbWalk: document.getElementById('kbWalk').checked, seq: document.getElementById('seq').checked, rept: document.getElementById('rept').checked, dates: document.getElementById('dates').checked };
  const cfg = {
    bases,
    maxWords: Math.min(parseInt(maxWordsInput.value,10)||50000, 100000000),
    hardLimit: HARD_CLIENT_CAP,
    digitsSelections: numRanges,
    symbols: symSets,
    caseOptions,
    leetLevel: parseInt(leetLevel.value,10)||0,
    patterns,
    dedupe: dedupe.checked,
    exclusion: exclusion.value || ''
  };
  return cfg;
}

function startWorker(cfg){
  if(worker) worker.terminate();
  worker = new Worker('./js/workers/worker.js');
  producedTotal = 0;
  chunks = [];
  t0 = performance.now();
  previewBox.textContent = '';
  wordCount.textContent = '0';
  estSize.textContent = '0 MB';
  genTime.textContent = '-';
  progressBar.style.width = '0%';
  downloadLink.classList.add('disabled');
  downloadLink.removeAttribute('href');
  worker.postMessage(cfg);
  stopBtn.disabled = false;
  generateBtn.disabled = true;

  worker.onmessage = function(e){
    const msg = e.data;
    if(msg.type === 'progress'){
      const chunk = msg.chunk || [];
      producedTotal = msg.produced || producedTotal;
      chunks.push(...chunk);
      updatePreview(chunks);
      updateStats(producedTotal);
      const pct = Math.min(100, Math.round((producedTotal / cfg.maxWords) * 100));
      progressBar.style.width = pct + '%';
    } else if(msg.type === 'done'){
      producedTotal = msg.produced || producedTotal;
      finalize(chunks);
    } else if(msg.type === 'error'){
      alert('Worker error: ' + msg.message);
      stopGeneration();
    }
  };
}

function updatePreview(allChunks){
  const preview = allChunks.slice(0,500).join('\n');
  previewBox.textContent = preview;
}

function updateStats(count){
  wordCount.textContent = count.toLocaleString();
  const sizeMB = ((count * 8) / (1024*1024)).toFixed(2);
  estSize.textContent = sizeMB + ' MB';
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2) + ' s';
  genTime.textContent = elapsed;
}

function finalize(allChunks){
  const t1 = performance.now();
  generateBtn.disabled = false;
  stopBtn.disabled = true;
  const content = allChunks.join('\n');
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.classList.remove('disabled');
  downloadLink.download = 'ucwg_wordlist.txt';
  updateStats(producedTotal);
  progressBar.style.width = '100%';
  genTime.textContent = ((t1 - t0)/1000).toFixed(2) + ' s';
  alert('Generation complete: ' + producedTotal.toLocaleString() + ' words');
}

function stopGeneration(){
  if(worker){ worker.terminate(); worker = null; }
  generateBtn.disabled = false;
  stopBtn.disabled = true;
  progressBar.style.width = '0%';
  alert('Generation stopped');
}

generateBtn.addEventListener('click', ()=>{
  const cfg = collectConfig();
  if(!cfg.bases.length){ alert('Add at least one base word'); return; }
  if(cfg.maxWords > HARD_CLIENT_CAP && !confirm('Client cap is ' + HARD_CLIENT_CAP + ' items. For larger lists use Server mode. Continue?')){
    return;
  }
  startWorker(cfg);
});

stopBtn.addEventListener('click', ()=> stopGeneration());
clearBtn.addEventListener('click', ()=>{ baseWords.value = ''; previewBox.textContent = ''; wordCount.textContent='0'; estSize.textContent='0 MB'; });

document.getElementById('themeToggle').addEventListener('change', (e)=>{
  document.body.setAttribute('data-theme', e.target.checked ? 'light' : 'dark');
});

const exampleList = document.getElementById('exampleList');
const examples = [
  'admin, Admin, ADMIN, AdMiN',
  '4dm1n, @dm!n, 4dM!n, @dM!n',
  'admin1, admin2, ..., admin9999',
  'admin1900, admin1999, ..., admin2029',
  'admin!, admin@, admin#, admin$',
  '!admin123@, @Admin2023#, 4dm!n2024$',
  'qwerty123, asdf123, 1q2w3e4r'
];
examples.forEach(e => { const d = document.createElement('div'); d.className='example-item'; d.textContent = e; exampleList.appendChild(d); });

document.getElementById('year').textContent = new Date().getFullYear();
