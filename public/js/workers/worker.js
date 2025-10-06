// worker for UCWG generation - chunked, reports progress, returns result in chunks to main thread
self.onmessage = function(e){
  const cfg = e.data;
  if(!cfg) return;
  const bases = cfg.bases || [];
  const maxWords = Math.min(cfg.maxWords || 50000, cfg.hardLimit || 500000);
  const digitsSelections = cfg.digitsSelections || [];
  const includeSymbols = cfg.symbols || [];
  const caseOptions = cfg.caseOptions || [];
  const leetLevel = cfg.leetLevel || 0;
  const patterns = cfg.patterns || {};
  const dedupe = cfg.dedupe;
  const exclusion = (cfg.exclusion || '').split(',').map(s=>s.trim()).filter(Boolean);
  const CHUNK = 2000;
  let produced = 0;
  const out = [];
  const seen = dedupe ? new Set() : null;

  function applyCaseVariants(word){
    const res = new Set();
    if(caseOptions.includes('lower')) res.add(word.toLowerCase());
    if(caseOptions.includes('upper')) res.add(word.toUpperCase());
    if(caseOptions.includes('capitalize')) res.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    if(caseOptions.includes('camel')) res.add(word.replace(/\b(\w)/g, s=>s.toUpperCase()));
    if(caseOptions.includes('alt')){
      let a=''; for(let i=0;i<word.length;i++){ a += (i%2?word[i].toLowerCase():word[i].toUpperCase()); } res.add(a);
    }
    return Array.from(res);
  }

  function applyLeet(word){
    if(leetLevel===0) return [word];
    const maps = {
      1: {a:'4',e:'3',i:'1',o:'0',s:'$'},
      2: {a:'4',e:'3',i:'1',o:'0',s:'$',t:'7',g:'9',l:'1'},
      3: {a:'4',e:'3',i:'1',o:'0',s:'$',t:'7',g:'9',l:'1',b:'8',z:'2',c:'(',d:'|)'} 
    };
    const map = maps[leetLevel] || maps[1];
    let v='';
    for(const ch of word) v += (map[ch.toLowerCase()]||ch);
    return [word, v];
  }

  function passesExclusion(w){
    if(!exclusion.length) return true;
    for(const ex of exclusion){ if(!ex) continue; if(w.includes(ex)) return false; }
    return true;
  }

  function pushIfAllowed(w){
    if(produced >= maxWords) return false;
    if(!passesExclusion(w)) return true;
    if(dedupe){
      if(seen.has(w)) return true;
      seen.add(w);
    }
    out.push(w);
    produced++;
    return produced < maxWords;
  }

  // symbol sets
  const symbolSets = {
    basic: ['!','@','#','$','%'],
    extended: ['^','&','*','(',')','_','+','-','=','[',']','{','}','|',';',':',',','.','<','>','?','~'],
    complex: ['`','"',"'",'\','/','€','£','¥','¢','§','¶','•','ª','º','«','»','¿','¡']
  };
  const activeSymbols = [];
  includeSymbols.forEach(s => { if(symbolSets[s]) activeSymbols.push(...symbolSets[s]); });

  for(const base of bases){
    if(produced >= maxWords) break;
    const caseVars = applyCaseVariants(base);
    for(const cv of caseVars){
      const leetVars = applyLeet(cv);
      for(const lv of leetVars){
        if(!pushIfAllowed(lv)) break;
        for(const d of digitsSelections){
          if(d === 'year'){
            for(let y=1900;y<=2029 && produced < maxWords;y++){
              if(!pushIfAllowed(lv + y)) break;
            }
          } else {
            const maxNum = Math.pow(10, Number(d)) - 1;
            for(let n=0;n<=maxNum && produced < maxWords;n++){
              const pad = String(n).padStart(Number(d), '0');
              if(!pushIfAllowed(lv + pad)) break;
            }
          }
        }
        // symbols single and pairs
        for(const s of activeSymbols){
          if(!pushIfAllowed(lv + s)) break;
        }
        for(let i=0;i<activeSymbols.length;i++){
          for(let j=0;j<activeSymbols.length;j++){
            if(!pushIfAllowed(lv + activeSymbols[i] + activeSymbols[j])) break;
          }
        }
        if(patterns.complex){
          for(let n=0;n<10 && produced < maxWords;n++){
            const w = '!' + lv + n + '@';
            if(!pushIfAllowed(w)) break;
          }
        }
        if(out.length >= CHUNK){
          self.postMessage({type:'progress', produced, chunk: out.splice(0, out.length)});
        }
      }
      if(produced >= maxWords) break;
    }
  }

  if(out.length) self.postMessage({type:'progress', produced, chunk: out.splice(0, out.length)});
  self.postMessage({type:'done', produced});
};
