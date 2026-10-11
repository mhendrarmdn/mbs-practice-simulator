const ENV_FIELDS = {
  priceIndex: ['price index','price_index','priceindex'],
  growth: ['economic growth factor','economic growth','growth factor','growth'],
  seasonal: ['seasonal factor','seasonal'],
  marketGrowth: ['market growth factor','market growth'],
  rawIndex: ['raw material index','raw index','material index'],
  demandFactor: ['demand factor','market demand factor'],
  capacityFactor: ['capacity factor','effective capacity factor']
};

const ACTUAL_FIELDS = {
  revenue: ['revenue','sales revenue'],
  netProfit: ['net profit','net earnings','profit after tax','net income'],
  sales: ['sales','actual sales','unit sales'],
  marketShare: ['market share','share'],
  price: ['selling price','price'],
  unitCost: ['unit cost','cost per unit'],
  cash: ['ending cash','cash'],
  overdraft: ['overdraft'],
  equity: ['owners equity',"owner's equity",'equity'],
  quality: ['quality'],
  image: ['image'],
  potentialDemand: ['potential demand','demand'],
  production: ['production','production output'],
  capacity: ['ending capacity','next capacity','capacity'],
  rawMaterial: ['ending raw material','raw material inventory','raw material'],
  finishedGoods: ['finished goods','finished goods inventory','fg inventory']
};

function ensureOfficial(state) {
  state.official = state.official && typeof state.official === 'object' ? state.official : {};
  state.official.environments = state.official.environments && typeof state.official.environments === 'object' ? state.official.environments : {};
  state.official.actuals = state.official.actuals && typeof state.official.actuals === 'object' ? state.official.actuals : {};
  state.official.predictions = state.official.predictions && typeof state.official.predictions === 'object' ? state.official.predictions : {};
  state.official.evidence = state.official.evidence && typeof state.official.evidence === 'object' ? state.official.evidence : {};
  return state.official;
}

export function normalizeOfficialState(state) {
  ensureOfficial(state);
  return state;
}

function cleanNumeric(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const negative = /^\s*\(/.test(text) || /-/.test(text);
  const cleaned = text
    .replace(/\((.*?)\)/g,'$1')
    .replace(/[%$€£Rp\s]/gi,'')
    .replace(/,/g,'')
    .replace(/[^0-9.]/g,'');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? (negative ? -Math.abs(value) : value) : null;
}

function parseLineMap(text) {
  const lines=String(text||'')
    .split(/\r?\n/)
    .map(line=>line.trim())
    .filter(Boolean);
  const out=[];
  for (const line of lines) {
    const match=line.match(/^(.{2,80}?)(?:\s*[:=]\s*|\t+|\s{2,})([-($€£Rp\s0-9.,%]+)\s*$/i);
    if (match) out.push([match[1].trim().toLowerCase(),match[2].trim()]);
  }
  return out;
}

function aliasesToValue(rows, aliases) {
  for (const [label,raw] of rows) {
    if (aliases.some(alias=>label===alias || label.includes(alias))) {
      const value=cleanNumeric(raw);
      if (value !== null) return {value,raw,label};
    }
  }
  return null;
}

export function parseOfficialText(text) {
  const trimmed=String(text||'').trim();
  if (!trimmed) return { environment:{}, actual:{}, detected:0, source:'empty' };

  try {
    const json=JSON.parse(trimmed);
    const environment=json.environment || json.economy || {};
    const actual=json.actual || json.result || json.results || json;
    return {
      environment: sanitizeEnvironment(environment),
      actual: sanitizeActual(actual),
      detected: Object.keys(environment||{}).length + Object.keys(actual||{}).length,
      source:'json'
    };
  } catch {}

  const rows=parseLineMap(trimmed);
  const environment={};
  const actual={};

  for (const [key,aliases] of Object.entries(ENV_FIELDS)) {
    const hit=aliasesToValue(rows,aliases);
    if (hit) environment[key]=hit.value;
  }

  for (const [key,aliases] of Object.entries(ACTUAL_FIELDS)) {
    const hit=aliasesToValue(rows,aliases);
    if (!hit) continue;
    let value=hit.value;
    if (key==='marketShare') {
      const raw=String(hit.raw);
      if (raw.includes('%') || Math.abs(value)>1) value=value/100;
    }
    actual[key]=value;
  }

  const eventLine=rows.find(([label])=>['scenario','event','scenario / event'].some(x=>label.includes(x)));
  if (eventLine) environment.eventTitle=String(eventLine[1]||'').trim();

  return {
    environment:sanitizeEnvironment(environment),
    actual:sanitizeActual(actual),
    detected:Object.keys(environment).length+Object.keys(actual).length,
    source:'text'
  };
}

export function sanitizeEnvironment(input={}) {
  const out={};
  for (const key of ['priceIndex','growth','seasonal','marketGrowth','rawIndex','demandFactor','capacityFactor']) {
    const value=Number(input[key]);
    if (Number.isFinite(value)) out[key]=value;
  }
  if (input.eventTitle) out.eventTitle=String(input.eventTitle).slice(0,120);
  if (input.eventText) out.eventText=String(input.eventText).slice(0,300);
  return out;
}

export function sanitizeActual(input={}) {
  const out={};
  for (const key of Object.keys(ACTUAL_FIELDS)) {
    const value=Number(input[key]);
    if (Number.isFinite(value)) out[key]=value;
  }
  return out;
}

export function saveOfficialEnvironment(state, round, environment, meta={}) {
  const official=ensureOfficial(state);
  const values=sanitizeEnvironment(environment);
  const growth=Number(values.growth ?? 1);
  const seasonal=Number(values.seasonal ?? 1);
  official.environments[String(round)]={
    ...values,
    demandFactor:Number.isFinite(Number(values.demandFactor)) ? Number(values.demandFactor) : growth*seasonal,
    confirmed:true,
    source:meta.source || 'manual',
    note:String(meta.note||'').slice(0,300),
    savedAt:new Date().toISOString()
  };
  return official.environments[String(round)];
}

function snapshotForRound(company,round) {
  return (company.history||[]).find(item=>Number(item.round)===Number(round)) || null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function saveOfficialActual(state, round, actual, meta={}) {
  const official=ensureOfficial(state);
  const values=sanitizeActual(actual);
  const user=(state.companies||[]).find(company=>company.isUser);
  if (!user) throw new Error('User company tidak ditemukan.');

  const predicted=snapshotForRound(user,round);
  if (predicted && !official.predictions[String(round)]) {
    official.predictions[String(round)]=clone(predicted);
  }

  official.actuals[String(round)]={
    values,
    source:meta.source || 'manual',
    note:String(meta.note||'').slice(0,300),
    savedAt:new Date().toISOString()
  };

  if (meta.applyToState !== false) {
    const target=predicted || {};
    Object.assign(target,values,{officialActual:true,officialSource:meta.source || 'manual'});
    if (!predicted) {
      target.round=Number(round);
      user.history=Array.isArray(user.history)?user.history:[];
      user.history.push(target);
      user.history.sort((a,b)=>Number(a.round)-Number(b.round));
    }
    Object.assign(user,values);
  }

  return official.actuals[String(round)];
}

export function reconciliationForRound(state,round) {
  const official=ensureOfficial(state);
  const predicted=official.predictions[String(round)] || null;
  const actual=official.actuals[String(round)]?.values || null;
  if (!predicted || !actual) return [];

  const fields=['revenue','netProfit','sales','marketShare','price','unitCost','cash','overdraft','equity','quality','image','potentialDemand','production','capacity','rawMaterial','finishedGoods'];
  return fields
    .filter(key=>Number.isFinite(Number(actual[key])) && Number.isFinite(Number(predicted[key])))
    .map(key=>{
      const p=Number(predicted[key]), a=Number(actual[key]);
      const diff=a-p;
      const pctError=Math.abs(p)>1e-9 ? diff/Math.abs(p) : null;
      return {key,predicted:p,actual:a,diff,pctError};
    });
}

export function officialEnvironmentForRound(state,round) {
  const official=ensureOfficial(state);
  return official.environments[String(round)] || null;
}

export function recordEvidenceMeta(state, round, meta={}) {
  const official=ensureOfficial(state);
  official.evidence[String(round)]={
    name:String(meta.name||'').slice(0,160),
    type:String(meta.type||'').slice(0,80),
    size:Number(meta.size||0),
    addedAt:new Date().toISOString()
  };
  return official.evidence[String(round)];
}
