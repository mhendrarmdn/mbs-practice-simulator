import { clamp } from './utils.js';

const DEFAULT_FACTORS = {
  marketSizeFactor: 1,
  shareFactor: 1,
  productionFactor: 1,
  unitCostFactor: 1,
  qualityShift: 0,
  imageShift: 0
};

function median(values=[]) {
  const clean=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!clean.length) return null;
  const mid=Math.floor(clean.length/2);
  return clean.length%2 ? clean[mid] : (clean[mid-1]+clean[mid])/2;
}

function pairedRounds(state) {
  const predicted=state.official?.predictions || {};
  const actuals=state.official?.actuals || {};
  return Object.keys(actuals)
    .map(Number)
    .filter(round=>predicted[String(round)] && actuals[String(round)]?.values)
    .sort((a,b)=>a-b);
}

function dampFactor(raw, weight, min, max) {
  if (!Number.isFinite(raw)) return 1;
  return clamp(1 + (clamp(raw,min,max)-1)*weight, min, max);
}

function dampShift(raw, weight, min, max) {
  if (!Number.isFinite(raw)) return 0;
  return clamp(clamp(raw,min,max)*weight,min,max);
}

function ratio(actual,predicted) {
  const a=Number(actual), p=Number(predicted);
  if (!Number.isFinite(a) || !Number.isFinite(p) || Math.abs(p)<1e-9) return null;
  return a/p;
}

function pctError(actual,predicted) {
  const a=Number(actual), p=Number(predicted);
  if (!Number.isFinite(a) || !Number.isFinite(p)) return null;
  if (Math.abs(a)<1e-9) return Math.abs(p)<1e-9 ? 0 : null;
  return (p-a)/Math.abs(a);
}

export function adaptiveCalibrationProfile(state) {
  const rounds=pairedRounds(state);
  const enabled=state.adaptiveCalibration?.enabled !== false;
  if (!rounds.length) {
    return {
      enabled,
      active:false,
      samples:0,
      confidence:0,
      uncertaintyPct:35,
      factors:{...DEFAULT_FACTORS},
      rounds:[],
      errors:[],
      recommendation:'Tambahkan official actual result agar adaptive calibration dapat belajar dari prediction error.'
    };
  }

  const marketSizeRatios=[];
  const shareRatios=[];
  const productionRatios=[];
  const unitCostRatios=[];
  const qualityShifts=[];
  const imageShifts=[];
  const errors=[];

  for (const round of rounds) {
    const p=state.official.predictions[String(round)] || {};
    const a=state.official.actuals[String(round)]?.values || {};

    const shareRatio=ratio(a.marketShare,p.marketShare);
    if (Number.isFinite(shareRatio)) shareRatios.push(shareRatio);

    if (
      Number.isFinite(Number(a.potentialDemand)) &&
      Number.isFinite(Number(p.potentialDemand)) &&
      Number(a.marketShare)>0 &&
      Number(p.marketShare)>0
    ) {
      const actualMarket=Number(a.potentialDemand)/Number(a.marketShare);
      const predictedMarket=Number(p.potentialDemand)/Number(p.marketShare);
      const r=ratio(actualMarket,predictedMarket);
      if (Number.isFinite(r)) marketSizeRatios.push(r);
    }

    const productionRatio=ratio(a.production,p.production);
    if (Number.isFinite(productionRatio)) productionRatios.push(productionRatio);

    const costRatio=ratio(a.unitCost,p.unitCost);
    if (Number.isFinite(costRatio)) unitCostRatios.push(costRatio);

    if (Number.isFinite(Number(a.quality)) && Number.isFinite(Number(p.quality))) {
      qualityShifts.push(Number(a.quality)-Number(p.quality));
    }
    if (Number.isFinite(Number(a.image)) && Number.isFinite(Number(p.image))) {
      imageShifts.push(Number(a.image)-Number(p.image));
    }

    for (const key of ['revenue','netProfit','sales','marketShare','unitCost','potentialDemand','production']) {
      const e=pctError(a[key],p[key]);
      if (e!==null) errors.push({round,key,errorPct:e*100});
    }
  }

  // Shrink corrections toward neutral when sample size is small.
  // n=1 => 33%, n=2 => 50%, n=3 => 60%, n=4 => 67%.
  const weight=rounds.length/(rounds.length+2);
  const factors={
    marketSizeFactor:dampFactor(median(marketSizeRatios),weight,0.80,1.25),
    shareFactor:dampFactor(median(shareRatios),weight,0.75,1.30),
    productionFactor:dampFactor(median(productionRatios),weight,0.90,1.10),
    unitCostFactor:dampFactor(median(unitCostRatios),weight,0.80,1.25),
    qualityShift:dampShift(median(qualityShifts),weight,-0.08,0.08),
    imageShift:dampShift(median(imageShifts),weight,-0.08,0.08)
  };

  const absErrors=errors.map(x=>Math.abs(x.errorPct)).filter(Number.isFinite);
  const mae=absErrors.length ? absErrors.reduce((a,b)=>a+b,0)/absErrors.length : 30;
  const sampleConfidence=[0,38,58,72,82,88][Math.min(rounds.length,5)] || 90;
  const errorPenalty=Math.min(35,mae*0.45);
  const confidence=clamp(Math.round(sampleConfidence-errorPenalty),15,92);
  const uncertaintyPct=clamp(Math.round((100-confidence)*0.42+8),10,38);

  let recommendation='Calibration aktif dengan shrinkage konservatif.';
  if (rounds.length===1) recommendation='Baru 1 official round: koreksi sengaja diredam untuk menghindari overfitting.';
  else if (rounds.length===2) recommendation='Dua official rounds tersedia. Gunakan calibrated forecast, tetapi tetap cek downside scenario.';
  else if (confidence>=70) recommendation='Calibration cukup matang untuk menjadi input utama decision-support, tetap bukan formula resmi TopBoss.';

  return {
    enabled,
    active:enabled && rounds.length>0,
    samples:rounds.length,
    confidence,
    uncertaintyPct,
    weight,
    factors,
    rounds,
    errors,
    meanAbsErrorPct:mae,
    recommendation
  };
}

export function calibrationFactorRows(state) {
  const p=adaptiveCalibrationProfile(state);
  return [
    {key:'marketSizeFactor',label:'Market Size',value:p.factors.marketSizeFactor,format:'factor',meaning:'Corrects total market demand scale.'},
    {key:'shareFactor',label:'Competitive Share Response',value:p.factors.shareFactor,format:'factor',meaning:'Corrects user-company attractiveness/share response.'},
    {key:'productionFactor',label:'Production Realization',value:p.factors.productionFactor,format:'factor',meaning:'Corrects realized production vs practice mechanics.'},
    {key:'unitCostFactor',label:'Unit Cost',value:p.factors.unitCostFactor,format:'factor',meaning:'Corrects user-company unit-cost model.'},
    {key:'qualityShift',label:'Quality',value:p.factors.qualityShift,format:'shift',meaning:'Adds a bounded quality response correction.'},
    {key:'imageShift',label:'Image',value:p.factors.imageShift,format:'shift',meaning:'Adds a bounded image response correction.'}
  ];
}

export function calibrationRoundRows(state) {
  const p=adaptiveCalibrationProfile(state);
  return p.rounds.map(round=>{
    const pred=state.official?.predictions?.[String(round)] || {};
    const actual=state.official?.actuals?.[String(round)]?.values || {};
    return {
      round,
      revenueError:pctError(actual.revenue,pred.revenue),
      profitError:pctError(actual.netProfit,pred.netProfit),
      salesError:pctError(actual.sales,pred.sales),
      shareError:Number.isFinite(Number(actual.marketShare)) && Number.isFinite(Number(pred.marketShare))
        ? Number(pred.marketShare)-Number(actual.marketShare)
        : null,
      costError:pctError(actual.unitCost,pred.unitCost)
    };
  });
}
