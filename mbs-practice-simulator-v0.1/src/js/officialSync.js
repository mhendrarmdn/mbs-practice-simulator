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

export const FINANCIAL_FIELDS = {
  balanceSheet: {
    cash: ['cash'],
    rawMaterialInventory: ['raw material inventory','raw materials inventory'],
    finishedGoodsInventory: ['finished goods inventory','finished goods'],
    currentAssets: ['current assets'],
    fixedAndOtherAssets: ['fixed and other assets','fixed assets','other assets'],
    totalAssets: ['total assets'],
    operatingLiabilities: ['operating liabilities','accounts payable'],
    overdraft: ['overdraft'],
    totalLiabilities: ['total liabilities'],
    ownersEquity: ['owners equity',"owner's equity",'stockholders equity','shareholders equity','equity'],
    totalLiabilitiesAndEquity: ['liabilities + equity','liabilities and equity','total liabilities and equity']
  },
  cashFlow: {
    beginningCash: ['beginning cash','opening cash'],
    revenue: ['revenue / receipts','revenue receipts','cash receipts','revenue'],
    cashExpenditure: ['cash expenditure','cash expenditures'],
    operatingCashFlow: ['operating cash flow','cash flow from operations'],
    rawMaterialPurchase: ['raw material purchase','raw material purchases','material purchase'],
    equipmentInvestment: ['equipment investment','equipment purchase','equipment'],
    dividend: ['dividend','dividends'],
    cashBeforeFinancing: ['cash before financing'],
    overdraft: ['overdraft financing','overdraft'],
    endingCash: ['ending cash','closing cash']
  },
  incomeStatement: {
    revenue: ['revenue','sales revenue'],
    costOfGoodsSold: ['cost of goods sold','cogs'],
    grossProfit: ['gross profit'],
    marketingExpense: ['marketing expense','marketing'],
    rdExpense: ['r&d expense','research and development','rd expense'],
    maintenanceExpense: ['maintenance expense','maintenance'],
    managementExpense: ['management expense','management'],
    warehouseExpense: ['warehouse expense','warehousing expense'],
    purchasingExpense: ['purchasing expense','purchase expense'],
    depreciation: ['depreciation'],
    operatingExpenses: ['operating expenses','total operating expenses'],
    operatingProfit: ['operating profit','operating income'],
    interestExpense: ['interest expense','interest'],
    earningsBeforeTax: ['earnings before tax','income before tax','profit before tax'],
    tax: ['tax','income tax'],
    netEarnings: ['net earnings','net profit','net income']
  }
};

function ensureOfficial(state) {
  state.official = state.official && typeof state.official === 'object' ? state.official : {};
  state.official.environments = state.official.environments && typeof state.official.environments === 'object' ? state.official.environments : {};
  state.official.actuals = state.official.actuals && typeof state.official.actuals === 'object' ? state.official.actuals : {};
  state.official.predictions = state.official.predictions && typeof state.official.predictions === 'object' ? state.official.predictions : {};
  state.official.evidence = state.official.evidence && typeof state.official.evidence === 'object' ? state.official.evidence : {};
  state.official.financials = state.official.financials && typeof state.official.financials === 'object' ? state.official.financials : {};
  state.official.ocr = state.official.ocr && typeof state.official.ocr === 'object' ? state.official.ocr : {};
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
    const match=line.match(/^(.{2,100}?)(?:\s*[:=]\s*|\t+|\s{2,})([-($€£Rp\s0-9.,%]+)\s*$/i);
    if (match) out.push([match[1].trim().toLowerCase(),match[2].trim()]);
  }
  return out;
}

function aliasesToValue(rows, aliases) {
  const ordered=[...aliases].sort((a,b)=>b.length-a.length);
  for (const alias of ordered) {
    const exact=rows.find(([label])=>label===alias);
    if (exact) {
      const value=cleanNumeric(exact[1]);
      if (value !== null) return {value,raw:exact[1],label:exact[0]};
    }
  }
  for (const alias of ordered.filter(alias=>alias.length>=5)) {
    const hit=rows.find(([label])=>label.includes(alias));
    if (hit) {
      const value=cleanNumeric(hit[1]);
      if (value !== null) return {value,raw:hit[1],label:hit[0]};
    }
  }
  return null;
}

function financialFromRows(rows) {
  const statement={ balanceSheet:{}, cashFlow:{}, incomeStatement:{} };
  let detected=0;
  for (const [section,fields] of Object.entries(FINANCIAL_FIELDS)) {
    for (const [key,aliases] of Object.entries(fields)) {
      const hit=aliasesToValue(rows,aliases);
      if (hit) {
        statement[section][key]=hit.value;
        detected++;
      }
    }
  }
  return {statement,detected};
}

export function classifyOfficialText(text) {
  const t=String(text||'').toLowerCase();
  const scores={
    environment:['economic growth','price index','raw material index','seasonal factor','market growth'].filter(x=>t.includes(x)).length,
    business:['potential demand','finished goods','production','capacity','raw material'].filter(x=>t.includes(x)).length,
    financial:['balance sheet','income statement','cash flow','gross profit','total assets','net earnings','operating profit'].filter(x=>t.includes(x)).length
  };
  const best=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return best && best[1]>0 ? best[0] : 'mixed';
}

export function parseOfficialText(text) {
  const trimmed=String(text||'').trim();
  if (!trimmed) return { environment:{}, actual:{}, financial:{balanceSheet:{},cashFlow:{},incomeStatement:{}}, detected:0, pageType:'empty', source:'empty' };

  try {
    const json=JSON.parse(trimmed);
    const environment=json.environment || json.economy || {};
    const actual=json.actual || json.result || json.results || {};
    const financial=json.financial || json.financialStatement || {};
    const sanitizedFinancial=sanitizeFinancial(financial);
    return {
      environment: sanitizeEnvironment(environment),
      actual: sanitizeActual(actual),
      financial: sanitizedFinancial,
      detected: Object.keys(environment||{}).length + Object.keys(actual||{}).length + countFinancialFields(sanitizedFinancial),
      pageType:'json',
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

  const financialParsed=financialFromRows(rows);

  return {
    environment:sanitizeEnvironment(environment),
    actual:sanitizeActual(actual),
    financial:sanitizeFinancial(financialParsed.statement),
    detected:Object.keys(environment).length+Object.keys(actual).length+financialParsed.detected,
    pageType:classifyOfficialText(trimmed),
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

export function sanitizeFinancial(input={}) {
  const out={balanceSheet:{},cashFlow:{},incomeStatement:{}};
  for (const [section,fields] of Object.entries(FINANCIAL_FIELDS)) {
    const source=input?.[section] || {};
    for (const key of Object.keys(fields)) {
      const value=Number(source[key]);
      if (Number.isFinite(value)) out[section][key]=value;
    }
  }
  return out;
}

export function countFinancialFields(statement={}) {
  return ['balanceSheet','cashFlow','incomeStatement']
    .reduce((sum,section)=>sum+Object.keys(statement?.[section]||{}).length,0);
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

export function saveOfficialFinancial(state, round, financial, meta={}) {
  const official=ensureOfficial(state);
  const statement=sanitizeFinancial(financial);
  const fieldCount=countFinancialFields(statement);
  if (!fieldCount) throw new Error('Tidak ada line item financial statement yang terdeteksi.');
  official.financials[String(round)]={
    statement,
    fieldCount,
    source:meta.source || 'manual',
    note:String(meta.note||'').slice(0,300),
    savedAt:new Date().toISOString()
  };
  const user=(state.companies||[]).find(company=>company.isUser);
  const target=snapshotForRound(user,round);
  if (target) target.officialFinancial=true;
  return official.financials[String(round)];
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

export function officialFinancialForRound(state,round) {
  const official=ensureOfficial(state);
  return official.financials[String(round)] || null;
}

export function recordEvidenceMeta(state, round, meta={}) {
  const official=ensureOfficial(state);
  const key=String(round);
  const existing=official.evidence[key];
  const list=Array.isArray(existing) ? existing : (existing ? [existing] : []);
  const item={
    name:String(meta.name||'').slice(0,160),
    type:String(meta.type||'').slice(0,80),
    size:Number(meta.size||0),
    pageType:String(meta.pageType||'').slice(0,40),
    confidence:Number.isFinite(Number(meta.confidence)) ? Number(meta.confidence) : null,
    addedAt:new Date().toISOString()
  };
  official.evidence[key]=[...list,item].slice(-12);
  return item;
}

export function saveOcrAudit(state, round, audit={}) {
  const official=ensureOfficial(state);
  official.ocr[String(round)]={
    confidence:Number.isFinite(Number(audit.confidence)) ? Number(audit.confidence) : null,
    files:Number(audit.files||0),
    detected:Number(audit.detected||0),
    pageTypes:Array.isArray(audit.pageTypes)?audit.pageTypes.slice(0,12):[],
    reviewed:Boolean(audit.reviewed),
    extractedAt:new Date().toISOString()
  };
  return official.ocr[String(round)];
}
