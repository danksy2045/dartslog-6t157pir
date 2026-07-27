'use strict';

/* ================= 定数 ================= */
const COUNTERS = [
  { k: 'hat',      label: 'ハットトリック',        auto: '1Rでブル3本' },
  { k: 'black',    label: 'BLACK（D-BULL×3）',     auto: '1RでD-BULL3本（ハットにも+1）' },
  { k: 'm9',       label: '9マーク',               auto: 'クリケットCUで1R9マーク' },
  { k: 'wh',       label: 'WHITE HORSE',           auto: '1Rで異なる3ナンバーのトリプル(15〜20)' },
  { k: 'irr7',     label: '変則7マーク',           auto: null },
  { k: 'bullmiss', label: 'Bull miss T20',         auto: null },
  { k: 'bed20',    label: 'T20 BED',               auto: '1RでT20×3' },
  { k: 'bed19',    label: 'T19 BED',               auto: '1RでT19×3' },
  { k: 'bed18',    label: 'T18 BED',               auto: '1RでT18×3' },
  { k: 'bed17',    label: 'T17 BED',               auto: '1RでT17×3' },
  { k: 'bed16',    label: 'T16 BED',               auto: '1RでT16×3' },
  { k: 'bed15',    label: 'T15 BED',               auto: '1RでT15×3' },
];
const COUNTER_LABEL = Object.fromEntries(COUNTERS.map(c => [c.k, c.label]));
const TYPE_LABEL = { cu: 'カウントアップ', cri: 'クリケットCU', bull: 'ブルチャレンジ', crk: 'クリケチャレンジ', cnu: 'クリケナンバーCU' };
const CRK_NUMS = [20, 19, 18, 17, 16, 15];
const WDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const METRICS = [
  { k: 'rating',  label: 'レーティング推移（日別）', kind: 'line', color: '#f4b63f' },
  { k: 'bulls',   label: 'ブル数 / インブル数（1日・CU）', kind: 'line2', color: '#4f8cff' },
  { k: 'bullRate', label: 'ブル率（1日・CU）',    kind: 'line', color: '#f4b63f' },
  { k: 'cuAvg',   label: 'カウントアップ 平均',   kind: 'line', color: '#4f8cff' },
  { k: 'cuBest',  label: 'カウントアップ ベスト', kind: 'line', color: '#4f8cff' },
  { k: 'criAvg',  label: 'クリケットCU 平均',     kind: 'line', color: '#3dba6f' },
  { k: 'criBest', label: 'クリケットCU ベスト',   kind: 'line', color: '#3dba6f' },
  { k: 'mpr',     label: 'MPR',                   kind: 'line', color: '#f4b63f' },
  { k: 'cnuAvg',  label: 'クリケナンバーCU 平均', kind: 'line', color: '#2ec5c5' },
  { k: 'cnuBest', label: 'クリケナンバーCU ベスト', kind: 'line', color: '#2ec5c5' },
  { k: 'cnuMpr',  label: 'クリケナンバーCU MPR',  kind: 'line', color: '#2ec5c5' },
  { k: 'cnuTriple', label: 'クリケナンバーCU トリプル率', kind: 'line', color: '#2ec5c5' },
  ...COUNTERS.map(c => ({ k: 'c_' + c.k, label: c.label, kind: 'bar', color: '#e8453c' })),
];

/* ================= ストレージ ================= */
const LS_KEY = 'dartslog_v1';
let DB = loadDB();

function initDB() {
  return {
    settings: { bullMode: 'fat', goals: { cuBest: 0, criBest: 0, counters: {} } },
    days: {},
    games: [],
    live: [],      // 本番（ダーツライブ実機）記録
    matches: [],   // ROBOT対戦の記録
  };
}
function loadDB() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY));
    if (!d || !d.settings || !d.games) return initDB();
    d.settings.goals = d.settings.goals || { cuBest: 0, criBest: 0, counters: {} };
    d.settings.goals.counters = d.settings.goals.counters || {};
    d.days = d.days || {};
    d.live = d.live || [];
    d.matches = d.matches || [];
    return d;
  } catch (e) { return initDB(); }
}
function saveDB() { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function day(ds) {
  if (!DB.days[ds]) DB.days[ds] = { memo: '', adj: {} };
  if (!DB.days[ds].adj) DB.days[ds].adj = {};
  return DB.days[ds];
}

/* ================= 日付ユーティリティ ================= */
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayStr() {
  // 手動で日付を変更している場合はその日付に記録する（0時の自動切替と併用）
  return (DB && DB.settings && DB.settings.dateOverride) || ymd(new Date());
}
function parseYmd(ds) { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtDate(ds) {
  const d = parseYmd(ds);
  return `${d.getMonth() + 1}/${d.getDate()}（${WDAYS[d.getDay()]}）`;
}
function lastNDates(n) {
  const out = [], base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(base); x.setDate(base.getDate() - i); out.push(ymd(x));
  }
  return out;
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= スコア計算 ================= */
function cuPoint(d, bullMode) {
  if (d.seg === 25) return bullMode === 'fat' ? 50 : 25 * d.mult;
  return d.seg * d.mult;
}
function criPoint(d) {
  if (d.seg === 25) return 25 * d.mult;
  if (d.seg >= 15 && d.seg <= 20) return d.seg * d.mult;
  return 0;
}
function criMark(d) {
  if (d.seg === 25) return d.mult;
  if (d.seg >= 15 && d.seg <= 20) return d.mult;
  return 0;
}
function dartPoint(d, type, bullMode) {
  return type === 'cu' ? cuPoint(d, bullMode) : criPoint(d);
}
function dartLabel(d) {
  if (d.seg === 0) return 'MISS';
  if (d.seg === 25) return d.mult === 2 ? 'D-BULL' : 'BULL';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : '') + d.seg;
}
// クリケットのマーク表記: 1本=／ 2本=✕ 3本=⊗
function criDartLabel(d) {
  if (d.seg === 0) return 'MISS';
  const m = criMark(d);
  return m === 3 ? '⊗' : m === 2 ? '✕' : m === 1 ? '／' : '0';
}

/* 自動アワード判定（ゲーム保存時に1回だけ実行して記録する） */
function detectAwards(darts, type) {
  const a = {};
  const add = k => { a[k] = (a[k] || 0) + 1; };
  for (let i = 0; i + 3 <= darts.length; i += 3) {
    const r = darts.slice(i, i + 3);
    if (r.every(d => d.seg === 25)) {
      add('hat');
      if (r.every(d => d.mult === 2)) add('black');
    }
    for (let n = 15; n <= 20; n++) {
      if (r.every(d => d.seg === n && d.mult === 3)) add('bed' + n);
    }
    // WHITE HORSE: 1Rで異なる3ナンバー(15〜20)のトリプル
    if (r.every(d => d.mult === 3 && d.seg >= 15 && d.seg <= 20) && new Set(r.map(d => d.seg)).size === 3) {
      add('wh');
    }
    if (type === 'cri') {
      const marks = r.reduce((s, d) => s + criMark(d), 0);
      if (marks === 9) add('m9');
    }
  }
  return a;
}

/* ================= 集計 ================= */
function gamesOn(ds, type) { return DB.games.filter(g => g.date === ds && g.type === type); }
function scoreStats(gs) {
  if (!gs.length) return null;
  const t = gs.map(g => g.total);
  return { n: gs.length, best: Math.max(...t), min: Math.min(...t), avg: t.reduce((a, b) => a + b, 0) / gs.length };
}
/* その日の統計 = アプリで記録したゲーム + ダーツライブ手動記録（最高/最低）の合算。
   DLの最高・最低はそれぞれ1ゲーム分のスコアとして平均の計算にも含める */
function dayStats(ds, type) {
  const s = scoreStats(gamesOn(ds, type));
  const rec = DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl[type];
  if (!rec || (rec.best == null && rec.min == null && rec.avg == null)) return s;
  const pts = [rec.best, rec.min, rec.avg].filter(v => v != null);  // avg は旧データ互換
  const best = Math.max(s ? s.best : -Infinity, ...pts);
  const min = Math.min(s ? s.min : Infinity, ...pts);
  const sum = (s ? s.avg * s.n : 0) + pts.reduce((a, b) => a + b, 0);
  const cnt = (s ? s.n : 0) + pts.length;
  return { n: s ? s.n : 0, dl: true, best, min, avg: cnt ? sum / cnt : 0 };
}
/* カウントアップのブル集計（ブル=イン・アウト両方、インブル=D-BULL） */
function cuBullStats(g) {
  if (g.type !== 'cu') return null;
  if (g.bulls != null) return { b: g.bulls, ib: g.dbulls || 0 };
  if (Array.isArray(g.darts) && g.darts.length) {
    let b = 0, ib = 0;
    g.darts.forEach(d => { if (d.seg === 25) { b++; if (d.mult === 2) ib++; } });
    return { b, ib };
  }
  return null;  // ダーツライブ取り込み分などは内訳不明
}
/* 1ゲームのブル率 = ブル本数 ÷ 24投（カウントアップ。内訳不明なら null） */
function gameBullRate(g) {
  const bs = cuBullStats(g);
  return bs ? bs.b / 24 * 100 : null;
}
/* ゲーム一覧の補足表示（R平均・ブル数・ブル率） */
function gameSub(g) {
  if (g.type === 'bull') return `${g.reached ? '達成' : '未達'} ${g.rounds}R/${g.dartCount}投・ブル率${(g.dartCount ? g.bulls / g.dartCount * 100 : 0).toFixed(1)}%`;
  if (g.type === 'crk') return `${g.reached ? '達成' : '未達'} No.${g.num}・${g.rounds}R/${g.dartCount}投・T率${(g.dartCount ? g.triples / g.dartCount * 100 : 0).toFixed(1)}%`;
  if (g.type === 'cnu') return `No.${g.num}・MPR ${(g.marks / 8).toFixed(2)}・T率${(g.dartCount ? g.triples / g.dartCount * 100 : 0).toFixed(1)}%`;
  if (g.type === 'cri') return g.marks != null ? 'R平均 ' + (g.marks / 8).toFixed(2) : '';
  const bs = cuBullStats(g);
  return 'R平均 ' + (g.total / 8).toFixed(2) + (bs ? `・ブル${bs.b}(イン${bs.ib})・率${(bs.b / 24 * 100).toFixed(1)}%` : '');
}
function dayBulls(ds) {
  let b = 0, ib = 0, rounds = 0;
  gamesOn(ds, 'cu').forEach(g => {
    const s = cuBullStats(g);
    if (s) { b += s.b; ib += s.ib; rounds += 8; }
  });
  // ダーツライブ読み取り分（S-BULL/D-BULL）を合算。ラウンド数は不明なので1R平均はアプリ記録分のみで計算
  const rec = DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl.bulls;
  const dlB = rec ? (rec.sb || 0) + (rec.db || 0) : 0;
  const dlIb = rec ? (rec.db || 0) : 0;
  if (!rounds && !dlB) return null;
  // ブル率 = ブル本数 ÷ 投擲数。投擲数が分かるアプリ記録分のみで算出（rounds*3本）
  const rate = rounds ? b / (rounds * 3) * 100 : null;
  return { b: b + dlB, ib: ib + dlIb, appB: b, appIb: ib, rounds, rate, dl: !!rec };
}
/* 全期間のブル率（アプリ記録のカウントアップ全ゲーム） */
function totalBullRate() {
  let b = 0, darts = 0;
  DB.games.forEach(g => {
    const s = cuBullStats(g);
    if (s) { b += s.b; darts += 24; }
  });
  return darts ? { b, darts, rate: b / darts * 100 } : null;
}
function mprOf(gs) {
  // ダーツライブ取り込み分などマーク数不明（marks=null）のゲームは除外
  const v = gs.filter(g => g.marks != null);
  if (!v.length) return null;
  return v.reduce((s, g) => s + g.marks, 0) / v.length / 8;
}
function countersOn(ds) {
  const c = {};
  COUNTERS.forEach(x => { c[x.k] = 0; });
  DB.games.forEach(g => {
    if (g.date !== ds) return;
    for (const k in (g.awards || {})) c[k] = (c[k] || 0) + g.awards[k];
  });
  const adj = (DB.days[ds] && DB.days[ds].adj) || {};
  for (const k in adj) c[k] = (c[k] || 0) + adj[k];
  const dl = (DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl.awards) || {};
  for (const k in dl) c[k] = (c[k] || 0) + dl[k];
  const rb = (DB.days[ds] && DB.days[ds].rbAwards) || {};   // ROBOT対戦で出たアワード
  for (const k in rb) c[k] = (c[k] || 0) + rb[k];
  return c;
}

/* ================= レーティング（ダーツライブ換算・目安） =================
   01側はDARTSLIVE公式基準: PPR = 5×Rt + 30（Rt2→PPR40, Rt6→PPR60=ブル率25%）
   クリケット側はMPR基準: MPR 1.3→Rt2.00、以降0.2刻み */
function rt01FromPPR(p) {
  let r = 1;
  for (let n = 2; n <= 18; n++) { if (p >= 5 * n + 30 - 1e-9) r = n; }
  return r;
}
function rtCriFromMPR(m) {
  let r = 1;
  for (let n = 2; n <= 18; n++) { if (m >= 1.3 + (n - 2) * 0.2 - 1e-9) r = n; }
  return r;
}
function flightOf(rt) {
  return rt >= 14 ? 'SA' : rt >= 12 ? 'AA' : rt >= 10 ? 'A' : rt >= 8 ? 'BB' : rt >= 6 ? 'B' : rt >= 4 ? 'CC' : 'C';
}
// 連続値レーティング（小数表示用）
function rt01Frac(p) { return Math.max(1, Math.min(18, p / 5 - 6)); }
function rtCriFrac(m) { return Math.max(1, Math.min(18, m * 5 - 4.5)); }

/* 目標レーティングからのボーダー値（DARTSLIVE基準・参照ページ準拠） */
function tgtPPR(rt) { return 5 * rt + 30; }                       // PPR
function tgtCountup(rt) { return tgtPPR(rt) * 8; }                // カウントアップ平均 = PPR×8
function tgtBull(rt) { return Math.max(0, Math.min(100, (tgtPPR(rt) - 30) / 1.2)); } // ブル率% =(PPR-30)/1.2
function tgtMPR(rt) { return (rt + 4.5) / 5; }                    // MPR（クリケット基準の逆算）
function tgtCricket(rt) { return rt <= 13 ? 30 * rt + 135 : 37.5 * rt + 37.5; } // クリケCUスコア（nayo-darts表）
function targetForMetric(mk, rt) {
  if (!rt) return null;
  switch (mk) {
    case 'rating': return { val: rt, label: '目標 Rt.' + rt.toFixed(1) };
    case 'cuAvg': case 'cuBest': return { val: tgtCountup(rt), label: '目標 ' + Math.round(tgtCountup(rt)) };
    case 'criAvg': case 'criBest': return { val: tgtCricket(rt), label: '目標 ' + Math.round(tgtCricket(rt)) };
    case 'mpr': return { val: tgtMPR(rt), label: '目標 ' + tgtMPR(rt).toFixed(2) };
    case 'bullRate': return { val: tgtBull(rt), label: '目標 ' + tgtBull(rt).toFixed(1) + '%' };
  }
  return null;
}
function ratingInfo(cuGames, criGames) {
  let r01 = null, rcri = null, ppr = null, mpr = null;
  if (cuGames.length) {
    const avg = cuGames.reduce((s, g) => s + g.total, 0) / cuGames.length;
    ppr = avg / 8;
    r01 = rt01FromPPR(ppr);
  }
  if (criGames.length) {
    mpr = mprOf(criGames);
    rcri = rtCriFromMPR(mpr);
  }
  const r01f = ppr != null ? rt01Frac(ppr) : null;
  const rcrif = mpr != null ? rtCriFrac(mpr) : null;
  let totalF = null;
  if (r01f != null && rcrif != null) totalF = (r01f + rcrif) / 2;
  else totalF = r01f != null ? r01f : rcrif;
  const total = totalF != null ? Math.round(totalF) : null;
  return { r01, rcri, ppr, mpr, total, totalF };
}
function recentGames(type, n) {
  return DB.games.filter(g => g.type === type).sort((a, b) => a.ts - b.ts).slice(-n);
}

/* ================= 本番推定レーティング（ダーツライブ実測でキャリブレーション） ================= */
function stdev(a) {
  if (!a || a.length < 2) return 0;
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
}
function parseNumList(s) {
  return (s || '').replace(/[^0-9.,\-]/g, ' ').split(/[\s,]+/).map(parseFloat).filter(x => !isNaN(x));
}
const LIVE_TARGET_N = 6;   // これだけ貯まると推定が安定する目安件数
// 練習ゲーム（ダーツライブ取り込み分 src:'dl' は除外）
function pcCu() { return DB.games.filter(g => g.type === 'cu' && g.src !== 'dl'); }
function pcCri() { return DB.games.filter(g => g.type === 'cri' && g.src !== 'dl'); }
function recentN(arr, n) { return arr.slice().sort((a, b) => a.ts - b.ts).slice(-n); }
function withinDays(games, dateStr, days) {
  const t = parseYmd(dateStr).getTime(), lo = t - days * 864e5, hi = t + days * 864e5;
  return games.filter(g => { const gt = parseYmd(g.date).getTime(); return gt >= lo && gt <= hi; });
}
// その本番日“当時”の練習Rt（±21日の練習ゲーム。無ければ直近30Gで代用）
function practiceRtAsOf(dateStr) {
  const cu = withinDays(pcCu(), dateStr, 21), cri = withinDays(pcCri(), dateStr, 21);
  let rt = (cu.length || cri.length) ? ratingInfo(cu, cri).totalF : null;
  if (rt == null) rt = ratingInfo(recentN(pcCu(), 30), recentN(pcCri(), 30)).totalF;
  return rt;
}
/* 本番想定Rt: 「基準となる練習Rt − 学習した落ち幅δ」を中央に、本番のムラσでレンジ化。
   基準は“今日の練習”があれば今日、無ければ直近の練習。目的＝今日の調子で本番だと何Rt出るか。 */
function liveEstimate() {
  const L = (DB.live || []).filter(r => r.rt != null && !isNaN(r.rt));
  if (!L.length) return null;
  // 基準となる練習Rt（今日 → 無ければ直近30G）
  const ds = todayStr();
  const tCu = pcCu().filter(g => g.date === ds), tCri = pcCri().filter(g => g.date === ds);
  let baseRt, baseLabel;
  if (tCu.length || tCri.length) { baseRt = ratingInfo(tCu, tCri).totalF; baseLabel = '今日の練習'; }
  else { baseRt = ratingInfo(recentN(pcCu(), 30), recentN(pcCri(), 30)).totalF; baseLabel = '直近の練習'; }
  // 落ち幅δ（当時の練習Rt − 本番Rt）を新しい記録ほど重く加重平均
  const recs = L.slice().sort((a, b) => (a.date < b.date ? 1 : -1));  // 新しい順
  let wsum = 0, dsum = 0;
  recs.forEach((r, k) => {
    const base = practiceRtAsOf(r.date);
    if (base == null) return;
    const w = Math.pow(0.75, k);
    wsum += w; dsum += w * (base - r.rt);
  });
  const avgDrop = wsum ? dsum / wsum : 0;
  const center = baseRt != null ? baseRt - avgDrop
    : recs.reduce((s, r) => s + r.rt, 0) / recs.length;
  // ブレ幅σ: 各LEGのばらつき（01÷5, クリケ×5でRt換算）＋3件以上でセッション間ばらつき＋件数が少ない不確実性
  let l01 = [], lc = [];
  recs.forEach(r => { l01 = l01.concat(r.legs01 || []); lc = lc.concat(r.legscri || []); });
  const parts = [];
  const s01 = stdev(l01) / 5, scr = stdev(lc) * 5;
  if (s01 > 0) parts.push(s01);
  if (scr > 0) parts.push(scr);
  if (recs.length >= 3) parts.push(stdev(recs.map(r => r.rt)));
  const sigLegs = parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : 0;
  const sigUnc = 1.2 / Math.sqrt(recs.length);   // 件数が少ないほど広く（不確実性）
  const sigma = sigLegs + 0.5 * sigUnc;
  const clamp = v => Math.max(1, Math.min(18, v));
  return {
    baseRt, baseLabel, avgDrop, center: clamp(center), sigma,
    down: clamp(center - 0.5 * sigma), up: clamp(center + 0.3 * sigma),
    n: recs.length, hasLegs: l01.length + lc.length > 0, target: LIVE_TARGET_N,
  };
}

/* ================= 目標 ================= */
function goalList(ds) {
  const g = DB.settings.goals, out = [];
  if (g.cuBest > 0) {
    const s = dayStats(ds, 'cu');
    out.push({ label: `カウントアップ ${g.cuBest}点`, met: !!s && s.best >= g.cuBest });
  }
  if (g.criBest > 0) {
    const s = dayStats(ds, 'cri');
    out.push({ label: `クリケットCU ${g.criBest}点`, met: !!s && s.best >= g.criBest });
  }
  const c = countersOn(ds);
  COUNTERS.forEach(x => {
    const t = g.counters[x.k] || 0;
    if (t > 0) out.push({ label: `${x.label} ×${t}`, met: (c[x.k] || 0) >= t });
  });
  return out;
}
function dayStatus(ds) {
  const played = DB.games.some(g => g.date === ds);
  const e = DB.days[ds];
  const memo = !!(e && e.memo);
  const adj = !!(e && e.adj && Object.values(e.adj).some(v => v));
  const goals = goalList(ds);
  return { activity: played || memo || adj, played, total: goals.length, met: goals.filter(x => x.met).length };
}

/* ================= 画面制御 ================= */
const $ = s => document.querySelector(s);
let PAGE = 'home';
let G = null;                 // 進行中のゲーム {type, darts:[], fin:savedGame|null}
let M = 1;                    // シングル/ダブル/トリプル
let HTAB = 'days';            // 履歴タブ
let HM = 'cuAvg';             // グラフ指標
let HP = 30;                  // グラフ期間
let CAL = { y: new Date().getFullYear(), m: new Date().getMonth() };

function nav(p) { PAGE = p; render(); }
function render() {
  checkBullRollover();   // プレイ日付を回った中断データを自動完了
  checkCrkRollover();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === PAGE));
  // プレイ中: 広い画面では2カラム化、さらに1画面固定レイアウト（スクロール無効・ナビ非表示）
  const inGame = (PAGE === 'play' && !!G && !G.fin) || (PAGE === 'robot' && !!RB && RB.stage === 'play');
  $('#view').classList.toggle('wide', inGame);
  $('#view').classList.toggle('game', inGame);
  document.body.classList.toggle('ingame', inGame);
  ({ home: renderHome, play: renderPlay, hist: renderHist, cal: renderCal, set: renderSet, robot: renderRobot })[PAGE]();
  window.scrollTo(0, 0);
}

/* ================= ホーム ================= */
function renderHome() {
  const ds = todayStr();
  const cuS = dayStats(ds, 'cu');
  const crG = gamesOn(ds, 'cri');
  const crS = dayStats(ds, 'cri');
  const mpr = mprOf(crG);
  const rAll = ratingInfo(recentGames('cu', 30), recentGames('cri', 30));
  const rToday = ratingInfo(gamesOn(ds, 'cu'), crG);
  const goals = goalList(ds);
  const met = goals.filter(g => g.met).length;

  const statBlock = (title, s, extra) => `
    <h3>${title}</h3>
    ${s ? `<div class="statgrid">
      <div><div class="v">${s.best}</div><div class="l">最高</div></div>
      <div><div class="v">${s.min}</div><div class="l">最低</div></div>
      <div><div class="v">${s.avg.toFixed(1)}</div><div class="l">平均</div></div>
    </div>
    <div class="sub center" style="margin-top:6px">${s.n}ゲーム${s.dl ? '＋DL記録' : ''}${extra || ''}</div>`
    : '<div class="sub">まだ記録がありません</div>'}`;

  const ratingBlock = r => r.totalF == null
    ? '<div class="sub center">ゲームをプレイすると表示されます</div>'
    : `<div class="rt-main"><span class="rt-num">Rt.${r.totalF.toFixed(2)}</span><span class="rt-fl">${flightOf(Math.floor(r.totalF))}フライト</span></div>
       <div class="rt-detail">
         01: ${r.ppr != null ? `PPR ${r.ppr.toFixed(2)}（Rt.${r.r01}）` : '—'}<br>
         CRICKET: ${r.mpr != null ? `MPR ${r.mpr.toFixed(2)}（Rt.${r.rcri}）` : '—'}
       </div>`;

  $('#view').innerHTML = `
  <h2>ホーム${DB.settings.dateOverride ? ` <span class="badge part">記録日: ${fmtDate(DB.settings.dateOverride)}（手動）</span>` : ''}</h2>

  <div class="card">
    <button class="btn primary big" onclick="startGame('cu')">🎯 カウントアップ</button>
    <button class="btn green big" style="margin-bottom:0" onclick="startGame('cri')">🎯 クリケットカウントアップ</button>
  </div>

  <div class="card">
    <h3>レーティング（ダーツライブ換算・目安 / 直近30G）</h3>
    ${ratingBlock(rAll)}
    ${rToday.totalF != null ? `<div class="rt-today" style="margin-top:10px"><span class="lbl">今日のみ</span><span class="rt-today-num">Rt.${rToday.totalF.toFixed(2)}</span><span class="rt-today-fl">${flightOf(Math.floor(rToday.totalF))}</span></div>
    <div class="rt-detail" style="margin-top:6px">
      01: ${rToday.ppr != null ? `PPR ${rToday.ppr.toFixed(2)}（Rt.${rToday.r01}）` : '—'}<br>
      CRICKET: ${rToday.mpr != null ? `MPR ${rToday.mpr.toFixed(2)}（Rt.${rToday.rcri}）` : '—'}
    </div>` : ''}
    ${(() => {
      const e = liveEstimate();
      if (!e) return '';
      return `<div class="rt-today" style="margin-top:8px"><span class="lbl">本番想定<br><span style="font-size:9px">${e.baseLabel}から</span></span><span class="rt-today-num" style="font-size:20px">Rt.${e.down.toFixed(1)}〜${e.up.toFixed(1)}</span><span class="rt-today-fl">${flightOf(Math.floor(e.center))}</span></div>`;
    })()}
    <div class="sub center" style="margin-top:6px">※ファットブル基準の換算値です</div>
  </div>

  ${(() => {
    const tgt = +DB.settings.goals.bullTarget || 0;
    const bests = DB.games.filter(x => x.type === 'bull' && x.reached && x.target === tgt).map(x => x.dartCount);
    const best = bests.length ? Math.min(...bests) : null;
    return `<div class="card">
      <button class="btn blue big" style="margin-bottom:0" onclick="startGame('bull')">🎯 ブルチャレンジ</button>
      <div class="sub center" style="margin-top:8px">ダブルブル+2 / シングルブル+1 / その他−1 で${tgt > 0 ? ` 目標 ${tgt}点` : '目標点'}を目指す${best != null ? `<br>自己ベスト: ${best}投（目標${tgt}点）` : ''}</div>
    </div>`;
  })()}

  ${(() => {
    const tgt = +DB.settings.goals.crkTarget || 0;
    return `<div class="card">
      <button class="btn purple big" style="margin-bottom:0" onclick="startGame('crk')">🎯 クリケチャレンジ</button>
      <div class="sub center" style="margin-top:8px">指定ナンバーの T+3 / D+2 / S+1 / その他−2 で${tgt > 0 ? ` 目標 ${tgt}点` : '目標点'}を目指す（開始時にナンバー選択）</div>
    </div>`;
  })()}

  <div class="card">
    <button class="btn teal big" style="margin-bottom:0" onclick="startGame('cnu')">🎯 クリケナンバーCU</button>
    <div class="sub center" style="margin-top:8px">選んだナンバーのトリプルを狙い、実点数を8ラウンド累計（開始時にナンバー選択）</div>
  </div>

  <div class="card">
    <button class="btn robot big" style="margin-bottom:0" onclick="openRobot()">🤖 ROBOT対戦</button>
    <div class="sub center" style="margin-top:8px">レーティングで強さを設定したCPUと 01 / クリケット / メドレー で対戦</div>
  </div>

  ${(() => {
    const rt = +DB.settings.goals.targetRt || 0;
    if (!rt) return '';
    const avgOf = gs => gs.length ? gs.reduce((s, g) => s + g.total, 0) / gs.length : null;
    const rc = recentGames('cu', 30), rr = recentGames('cri', 30);
    const curCuAvg = avgOf(rc), curPPR = curCuAvg != null ? curCuAvg / 8 : null;
    const curCriAvg = avgOf(rr), curMPR = mprOf(rr);
    const tot = totalBullRate(), curBull = tot ? tot.rate : null;
    const cmp = (label, cur, tgt, unit, dec) => {
      const f = v => v == null ? '—' : (dec ? v.toFixed(dec) : Math.round(v)) + unit;
      let cls = '', gap = '';
      if (cur != null) {
        const met = cur >= tgt - 1e-9, d = cur - tgt;
        cls = met ? 'met' : 'short';
        gap = met ? ' ✓' : `（${d > 0 ? '+' : ''}${dec ? d.toFixed(dec) : Math.round(d)}${unit}）`;
      }
      return `<div class="tgt-row ${cls}"><span class="tl">${label}</span><span class="tv">目標 ${f(tgt)}</span><span class="tc">今 ${f(cur)}${gap}</span></div>`;
    };
    return `<div class="card">
      <h3>🎯 目標 Rt.${rt.toFixed(1)}（${flightOf(Math.floor(rt))}）のボーダー</h3>
      ${cmp('カウントアップ', curCuAvg, tgtCountup(rt), '点')}
      ${cmp('PPR', curPPR, tgtPPR(rt), '', 2)}
      ${cmp('ブル率', curBull, tgtBull(rt), '%', 1)}
      ${cmp('クリケットCU', curCriAvg, tgtCricket(rt), '点')}
      ${cmp('MPR', curMPR, tgtMPR(rt), '', 2)}
      <div class="sub" style="margin-top:8px">「今」は直近30ゲーム平均（ブル率はトータル）。DARTSLIVE基準の目安です。</div>
    </div>`;
  })()}

  <div class="card">${statBlock('カウントアップ（今日）', cuS, (() => {
    if (!cuS) return '';
    const db = dayBulls(ds);
    const tot = totalBullRate();
    let extra = ` / 1R平均スタッツ ${(cuS.avg / 8).toFixed(2)}`;
    if (db && db.rounds) extra += `<br>1R平均ブル ${(db.appB / db.rounds).toFixed(2)}本（アウト・イン含む）`;
    const parts = [];
    if (db && db.rate != null) parts.push(`今日のブル率 ${db.rate.toFixed(1)}%`);
    if (tot) parts.push(`トータル ${tot.rate.toFixed(1)}%`);
    if (parts.length) extra += `<br>${parts.join(' / ')}`;
    return extra;
  })())}</div>
  <div class="card">${statBlock('クリケットCU（今日）', crS, mpr != null ? ` / 1R平均マーク(MPR) ${mpr.toFixed(2)}` : '')}</div>

  ${(() => {
    const d = cnuDayStats(ds);
    if (!d) return '';
    const gs = gamesOn(ds, 'cnu');
    const byNum = {};
    gs.forEach(g => { (byNum[g.num] = byNum[g.num] || []).push(g.total); });
    const rows = Object.keys(byNum).map(Number).sort((a, b) => b - a).map(n => {
      const t = byNum[n], best = Math.max(...t), min = Math.min(...t), avg = t.reduce((s, x) => s + x, 0) / t.length;
      return `<div class="sub" style="font-size:13px;padding:3px 0;color:var(--tx)">No.${n}：最高 ${best} / 最低 ${min} / 平均 ${avg.toFixed(1)}<span class="sub">（${t.length}G）</span></div>`;
    }).join('');
    return `<div class="card">
      <h3>クリケナンバーCU（今日）</h3>
      <div class="sub center" style="margin-bottom:6px">全${d.n}ゲーム / MPR ${d.mpr.toFixed(2)} / トリプル率 ${d.tripleRate.toFixed(1)}%</div>
      ${rows}
      <div class="sub" style="margin-top:6px">最高・最低・平均はナンバー別。MPR・トリプル率は全ナンバー合算。</div>
    </div>`;
  })()}

  ${DB.games.some(g => g.type === 'cnu') ? cnuRankingCard() : ''}

  ${(() => {
    const bs = DB.bullSuspend, cs = DB.crkSuspend;
    const bActive = bs && bs.date === ds && (bs.darts || []).length;
    const cActive = cs && cs.date === ds && (cs.darts || []).length;
    if (!bActive && !cActive) return '';
    const rows = [];
    if (bActive) {
      const st = bullStats(bs.darts), total = bullChScore(bs.darts);
      rows.push(`<div class="ctr-row"><span class="name">🔵 ブルチャレンジ<br><span class="sub">${total}点${bs.target > 0 ? ' / 目標' + bs.target : ''}・${st.n}投（${st.rounds}R）</span></span><button class="btn small blue" onclick="startGame('bull')">再開</button></div>`);
    }
    if (cActive) {
      const st = crkStats(cs.darts, cs.num), total = crkScore(cs.darts, cs.num);
      rows.push(`<div class="ctr-row"><span class="name">🟣 クリケチャレンジ No.${cs.num}<br><span class="sub">${total}点${cs.target > 0 ? ' / 目標' + cs.target : ''}・${st.n}投（${st.rounds}R）</span></span><button class="btn small purple" onclick="startGame('crk')">再開</button></div>`);
    }
    return `<div class="card">
      <h3>中断中のチャレンジ（今日）</h3>
      ${rows.join('')}
      <div class="sub" style="margin-top:8px">日付が変わると自動的に記録が完了します。</div>
    </div>`;
  })()}

  <div class="card">
    <h3>今日の目標 ${goals.length ? `（${met} / ${goals.length} 達成）` : ''}</h3>
    ${goals.length ? `
      <div class="gbar"><i style="width:${Math.round(met / goals.length * 100)}%"></i></div>
      ${goals.map(g => `<div class="goal-row ${g.met ? 'met' : 'unmet'}"><span class="mk">${g.met ? '✓' : '○'}</span>${escHtml(g.label)}</div>`).join('')}`
    : '<div class="sub">設定画面で1日の目標を設定できます</div>'}
  </div>`;
}

function counterRow(ds, c, ctr) {
  const goal = DB.settings.goals.counters[c.k] || 0;
  const v = ctr[c.k] || 0;
  const dl = (DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl.awards) || {};
  const dlNote = dl[c.k] > 0 ? `<br><span class="sub">うちDARTSLIVE ${dl[c.k]}</span>` : '';
  return `<div class="ctr-row ${goal > 0 && v >= goal ? 'met' : ''}">
    <span class="name">${escHtml(c.label)}${dlNote}</span>
    <span class="goal">${goal > 0 ? '目標' + goal : ''}</span>
    <button onclick="adjCounter('${ds}','${c.k}',-1)">−</button>
    <span class="cnt">${v}</span>
    <button onclick="adjCounter('${ds}','${c.k}',1)">＋</button>
  </div>`;
}
function adjCounter(ds, k, v) {
  const cur = countersOn(ds)[k] || 0;
  if (v < 0 && cur <= 0) return;
  const d = day(ds);
  d.adj[k] = (d.adj[k] || 0) + v;
  if (k === 'black' && v > 0) d.adj.hat = (d.adj.hat || 0) + 1;   // BLACK手動+1はハットにも+1
  saveDB();
  if ($('#modal-root').innerHTML) { MODAL_KIND === 'panel' ? openGamePanel() : openDay(ds); } else render();
}

/* 記録日の手動変更（0時の自動切替と併用。目標設定は共通設定なのでそのまま適用される） */
function openDateChange() {
  MODAL_KIND = 'date';
  const ds = todayStr();
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">記録する日付の変更</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="sub" style="margin-bottom:10px">深夜0時をまたぐ練習を同じ日として記録したい場合などに使います。スコア・アワードカウンター・メモは選んだ日付に記録されます。目標設定はそのまま適用されます。</div>
        <input type="date" id="dateov" class="dateinput" value="${ds}">
        <button class="btn primary big" style="margin-top:12px" onclick="applyDateOverride(document.getElementById('dateov').value)">この日付で記録する</button>
        <button class="btn big" style="margin-bottom:0" onclick="applyDateOverride(null)">実際の日付（自動）に戻す</button>
        <div class="sub center" style="margin-top:10px">現在: ${DB.settings.dateOverride ? `手動設定中（${fmtDate(DB.settings.dateOverride)}）` : '自動（実際の日付で0時に切替）'}</div>
      </div>
    </div>
  </div>`;
}
function applyDateOverride(v) {
  DB.settings.dateOverride = (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : null;
  saveDB();
  closeModal();
}

/* プレイ中にカウンター・メモを開くシート（閉じた画面用） */
let MODAL_KIND = null;
function openGamePanel() {
  if (!G || G.fin) return;
  MODAL_KIND = 'panel';
  const ds = todayStr();
  const live = detectAwards(G.darts.slice(0, G.confirmed || 0), G.type);
  const disp = { ...countersOn(ds) };
  for (const k in live) disp[k] = (disp[k] || 0) + live[k];
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">アワード・メモ</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, disp)).join('')}
        <div class="sub" style="margin-top:8px">プレイ中の自動判定分も表示に含めています（保存時に確定）。</div>
      </div>
      <div class="card">
        <h3>今日のメモ</h3>
        <textarea class="memo" placeholder="調子・気づきなど" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
}
function memoInput(ds, val) { day(ds).memo = val; saveDB(); }

/* ================= プレイ ================= */
function startGame(type) {
  if (type === 'bull') { openBullStart(); return; }
  if (type === 'crk') { openCrkStart(); return; }
  if (type === 'cnu') { openCnuNumberSelect(); return; }
  if (G && !G.fin && G.darts.length && !confirm('進行中のゲームを破棄して新しく始めますか？')) return;
  G = { type, darts: [], confirmed: 0, fin: null };
  M = 1;
  PAGE = 'play';
  render();
}

/* ブルチャレンジ開始: その日の中断データがあれば新規/再開を選択、なければ新規のみ */
function openBullStart() {
  checkBullRollover();
  const sus = DB.bullSuspend;
  if (sus && sus.date === todayStr() && sus.darts && sus.darts.length) { openBullChooser(); return; }
  startBull('new');
}
function openBullChooser() {
  const sus = DB.bullSuspend;
  const total = bullChScore(sus.darts), st = bullStats(sus.darts);
  const tgt = +DB.settings.goals.bullTarget || 0;
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">ブルチャレンジ</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="sub" style="margin-bottom:10px">今日の中断データがあります。</div>
        <div class="tgt-row"><span class="tl">中断時点</span><span class="tc">${total}点${tgt > 0 ? ' / 目標 ' + tgt : ''}・${st.n}投（${st.rounds}R）</span></div>
      </div>
      <div class="card">
        <button class="btn primary big" onclick="startBull('resume')">▶ 続きから再開</button>
        <button class="btn big" style="margin-bottom:0" onclick="if(confirm('今日の中断データを破棄して新規で始めますか？'))startBull('new')">＋ 新規で始める</button>
      </div>
    </div>
  </div>`;
}
function startBull(mode) {
  closeModal();
  if (mode === 'resume' && DB.bullSuspend && DB.bullSuspend.date === todayStr()) {
    G = { type: 'bull', gdate: DB.bullSuspend.date, darts: DB.bullSuspend.darts.slice(), fin: null };
  } else {
    DB.bullSuspend = null;
    G = { type: 'bull', gdate: todayStr(), darts: [], fin: null };
    saveDB();
  }
  PAGE = 'play';
  render();
}

/* クリケチャレンジ開始: その日の中断があれば新規/再開を選択、新規はナンバー選択へ */
function openCrkStart() {
  checkCrkRollover();
  const sus = DB.crkSuspend;
  if (sus && sus.date === todayStr() && sus.darts && sus.darts.length) { openCrkChooser(); return; }
  openCrkNumberSelect();
}
function openCrkChooser() {
  const sus = DB.crkSuspend;
  const total = crkScore(sus.darts, sus.num), st = crkStats(sus.darts, sus.num);
  const tgt = +DB.settings.goals.crkTarget || 0;
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">クリケチャレンジ</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="sub" style="margin-bottom:10px">今日の中断データがあります。</div>
        <div class="tgt-row"><span class="tl">中断時点</span><span class="tc">ナンバー${sus.num}・${total}点${tgt > 0 ? ' / 目標 ' + tgt : ''}・${st.n}投（${st.rounds}R）</span></div>
      </div>
      <div class="card">
        <button class="btn primary big" onclick="startCrk('resume')">▶ 続きから再開</button>
        <button class="btn big" style="margin-bottom:0" onclick="if(confirm('今日の中断データを破棄して新規で始めますか？'))openCrkNumberSelect()">＋ 新規で始める</button>
      </div>
    </div>
  </div>`;
}
function openCrkNumberSelect() {
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">狙うナンバーを選択</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="padgrid cri">${[20, 19, 18, 17, 16, 15].map(n => `<button onclick="startCrk('new',${n})">${n}</button>`).join('')}</div>
        <div class="sub" style="margin-top:8px">選んだナンバーの トリプル+3 / ダブル+2 / シングル+1 / それ以外−2 で目標点を目指します。</div>
      </div>
    </div>
  </div>`;
}
function startCrk(mode, num) {
  closeModal();
  if (mode === 'resume' && DB.crkSuspend && DB.crkSuspend.date === todayStr()) {
    G = { type: 'crk', gdate: DB.crkSuspend.date, num: DB.crkSuspend.num, darts: DB.crkSuspend.darts.slice(), fin: null };
  } else {
    DB.crkSuspend = null;
    G = { type: 'crk', gdate: todayStr(), num, darts: [], fin: null };
    saveDB();
  }
  PAGE = 'play';
  render();
}
/* クリケナンバーCU開始: ナンバー選択 → 8ラウンドのカウントアップ */
function openCnuNumberSelect() {
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">狙うナンバーを選択</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="padgrid cri">${CRK_NUMS.map(n => `<button onclick="startCnu(${n})">${n}</button>`).join('')}</div>
        <div class="sub" style="margin-top:8px">選んだナンバーのトリプルを狙い、S=${'ナンバー'}/D=2倍/T=3倍の実点数を8ラウンド累計します。</div>
      </div>
    </div>
  </div>`;
}
function startCnu(num) {
  closeModal();
  G = { type: 'cnu', num, darts: [], confirmed: 0, fin: null };
  M = 1;
  PAGE = 'play';
  render();
}
function setM(m) { M = m; render(); }
let FLASH = null;  // 直前に入力したボタンを光らせるための情報
function hit(seg, mult) {
  if (!G || G.fin) return;
  if (G.type === 'bull') {
    // ブルチャレンジ: 1投ずつ累計、目標到達で自動終了
    G.darts.push({ seg, mult });
    FLASH = { seg, mult };
    persistBull();
    const tgt = +DB.settings.goals.bullTarget || 0;
    if (tgt > 0 && bullChScore(G.darts) >= tgt) { finishGame(); return; }
    render();
    return;
  }
  if (G.type === 'crk') {
    G.darts.push({ seg, mult });
    FLASH = { seg, mult };
    persistCrk();
    const tgt = +DB.settings.goals.crkTarget || 0;
    if (tgt > 0 && crkScore(G.darts, G.num) >= tgt) { finishGame(); return; }
    render();
    return;
  }
  if (G.darts.length - G.confirmed >= 3) return;  // 3投入力済み→確定待ち
  const m = mult !== undefined ? mult : (seg === 0 ? 0 : M);
  G.darts.push({ seg, mult: m });
  FLASH = { seg, mult: m };
  M = 1;
  render();
}
function confirmRound() {
  if (!G || G.fin) return;
  const inCnt = G.darts.length - G.confirmed;
  if (G.type === 'cri' || G.type === 'cnu') {
    // クリケットCU / クリケナンバーCU は空きを自動的にMISSで埋めて確定できる
    for (let i = inCnt; i < 3; i++) G.darts.push({ seg: 0, mult: 0 });
  } else if (inCnt !== 3) {
    return;
  }
  G.confirmed += 3;
  if (G.confirmed >= 24) finishGame(); else render();
}
function undoDart() {
  if (!G || G.fin || !G.darts.length) return;
  if (G.type === 'bull') { G.darts.pop(); persistBull(); render(); return; }
  if (G.type === 'crk') { G.darts.pop(); persistCrk(); render(); return; }
  // 現在ラウンドが空なら直前の確定済みラウンドを開き直す
  if (G.darts.length === G.confirmed) G.confirmed = Math.max(0, G.confirmed - 3);
  G.darts.pop();
  render();
}
function quitGame() {
  if (!G) return;
  if (!G.darts.length || confirm('このゲームを破棄しますか？')) {
    if (G.type === 'bull') { DB.bullSuspend = null; saveDB(); }
    if (G.type === 'crk') { DB.crkSuspend = null; saveDB(); }
    G = null; render();
  }
}
/* ブルチャレンジの中断（進行中データを日付付きで保存。破棄・完了時にクリア） */
function persistBull() {
  if (!G || G.type !== 'bull') return;
  DB.bullSuspend = { date: G.gdate || todayStr(), darts: G.darts, target: +DB.settings.goals.bullTarget || 0 };
  saveDB();
}
/* プレイ日付を回った中断データを自動的に完了・記録する（ゲーム未実行時のみ） */
function checkBullRollover() {
  const sus = DB.bullSuspend;
  if (!sus || G) return;
  if (sus.date === todayStr()) return;
  if (sus.darts && sus.darts.length) {
    const st = bullStats(sus.darts), total = bullChScore(sus.darts);
    DB.games.push({
      id: 'bull-' + Date.parse(sus.date) + '-' + Math.floor(Math.random() * 10000),
      date: sus.date, ts: parseYmd(sus.date).getTime() + 12 * 3600 * 1000,
      type: 'bull', total, target: sus.target || 0, reached: sus.target > 0 && total >= sus.target,
      rounds: st.rounds, dartCount: st.n, bulls: st.bulls, dbulls: st.dbulls, awards: {}, darts: sus.darts, auto: true,
    });
  }
  DB.bullSuspend = null;
  saveDB();
}
function suspendBull() { persistBull(); G = null; render(); }

/* クリケチャレンジの中断・ロールオーバー（ブルチャレンジと同じ仕組み） */
function persistCrk() {
  if (!G || G.type !== 'crk') return;
  DB.crkSuspend = { date: G.gdate || todayStr(), num: G.num, darts: G.darts, target: +DB.settings.goals.crkTarget || 0 };
  saveDB();
}
function checkCrkRollover() {
  const sus = DB.crkSuspend;
  if (!sus || G) return;
  if (sus.date === todayStr()) return;
  if (sus.darts && sus.darts.length) {
    const st = crkStats(sus.darts, sus.num), total = crkScore(sus.darts, sus.num);
    DB.games.push({
      id: 'crk-' + Date.parse(sus.date) + '-' + Math.floor(Math.random() * 10000),
      date: sus.date, ts: parseYmd(sus.date).getTime() + 12 * 3600 * 1000,
      type: 'crk', num: sus.num, total, target: sus.target || 0, reached: sus.target > 0 && total >= sus.target,
      rounds: st.rounds, dartCount: st.n, triples: st.triples, doubles: st.doubles, singles: st.singles, hits: st.hits,
      awards: {}, darts: sus.darts, auto: true,
    });
  }
  DB.crkSuspend = null;
  saveDB();
}
function suspendCrk() { persistCrk(); G = null; render(); }
function finishGame() {
  if (G.type === 'bull') {
    const st = bullStats(G.darts);
    const total = bullChScore(G.darts);
    const target = +DB.settings.goals.bullTarget || 0;
    const gdate = G.gdate || todayStr();
    const game = {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      date: gdate, ts: Date.now(),
      type: 'bull', total, target, reached: target > 0 && total >= target,
      rounds: st.rounds, dartCount: st.n, bulls: st.bulls, dbulls: st.dbulls,
      awards: {}, darts: G.darts,
    };
    DB.games.push(game);
    DB.bullSuspend = null;   // 完了したので中断データをクリア
    saveDB();
    G.fin = game;
    render();
    return;
  }
  if (G.type === 'crk') {
    const num = G.num, st = crkStats(G.darts, num), total = crkScore(G.darts, num);
    const target = +DB.settings.goals.crkTarget || 0;
    const game = {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      date: G.gdate || todayStr(), ts: Date.now(),
      type: 'crk', num, total, target, reached: target > 0 && total >= target,
      rounds: st.rounds, dartCount: st.n, triples: st.triples, doubles: st.doubles, singles: st.singles, hits: st.hits,
      awards: {}, darts: G.darts,
    };
    DB.games.push(game);
    DB.crkSuspend = null;
    saveDB();
    G.fin = game;
    render();
    return;
  }
  if (G.type === 'cnu') {
    const num = G.num, st = cnuStats(G.darts, num);
    const game = {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      date: todayStr(), ts: Date.now(),
      type: 'cnu', num, total: st.total, marks: st.marks, triples: st.triples,
      dartCount: st.n, target: cnuTarget(num), awards: {}, darts: G.darts,
    };
    DB.games.push(game);
    saveDB();
    G.fin = game;
    render();
    return;
  }
  const bullMode = DB.settings.bullMode;
  const total = G.darts.reduce((s, d) => s + dartPoint(d, G.type, bullMode), 0);
  const marks = G.type === 'cri' ? G.darts.reduce((s, d) => s + criMark(d), 0) : 0;
  // LOW TON: カウントアップで1ラウンド100点以上（結果画面にのみ表示）
  let lowTon = 0, bulls = 0, dbulls = 0;
  if (G.type === 'cu') {
    for (let i = 0; i + 3 <= G.darts.length; i += 3) {
      const pts = G.darts.slice(i, i + 3).reduce((s, d) => s + cuPoint(d, bullMode), 0);
      if (pts >= 100) lowTon++;
    }
    // ブル数・インブル数（アワードカウンターには含めない集計用）
    G.darts.forEach(d => { if (d.seg === 25) { bulls++; if (d.mult === 2) dbulls++; } });
  }
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: G.type, total, marks, lowTon, bulls, dbulls,
    awards: detectAwards(G.darts, G.type),
    darts: G.darts,
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}

/* ブルチャレンジ: ダブルブル+2 / シングルブル+1 / その他-1 の累計で目標点を目指す */
function bullChPoint(d) { return d.seg === 25 ? (d.mult === 2 ? 2 : 1) : -1; }
function bullChScore(darts) { return darts.reduce((s, d) => s + bullChPoint(d), 0); }
function bullStats(darts) {
  let bulls = 0, dbulls = 0;
  darts.forEach(d => { if (d.seg === 25) { bulls++; if (d.mult === 2) dbulls++; } });
  const n = darts.length;
  return {
    bulls, dbulls, n, rounds: Math.ceil(n / 3),
    bullRate: n ? bulls / n * 100 : 0, ibRate: n ? dbulls / n * 100 : 0,
  };
}

/* クリケチャレンジ: 指定ナンバーの T+3 / D+2 / S+1 / それ以外-2 の累計で目標点を目指す */
function crkPoint(d, num) {
  if (d.seg === num) return d.mult === 3 ? 3 : d.mult === 2 ? 2 : 1;
  return -2;
}
function crkScore(darts, num) { return darts.reduce((s, d) => s + crkPoint(d, num), 0); }
function crkStats(darts, num) {
  let triples = 0, doubles = 0, singles = 0, hits = 0;
  darts.forEach(d => { if (d.seg === num) { hits++; if (d.mult === 3) triples++; else if (d.mult === 2) doubles++; else singles++; } });
  const n = darts.length;
  return { triples, doubles, singles, hits, n, rounds: Math.ceil(n / 3), tripleRate: n ? triples / n * 100 : 0 };
}
function crkDartLabel(d, num) { return d.seg === num ? (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S') : 'ミス'; }

/* クリケナンバーCU: 選んだナンバーの実点数を累計（S=N/D=2N/T=3N・それ以外0）。8ラウンド固定 */
function cnuPoint(d, num) { return d.seg === num ? num * d.mult : 0; }
function cnuMark(d, num) { return d.seg === num ? d.mult : 0; }
function cnuScore(darts, num) { return darts.reduce((s, d) => s + cnuPoint(d, num), 0); }
function cnuStats(darts, num) {
  let triples = 0, marks = 0, hits = 0;
  darts.forEach(d => { if (d.seg === num) { hits++; marks += d.mult; if (d.mult === 3) triples++; } });
  const n = darts.length;
  return { total: cnuScore(darts, num), marks, triples, hits, n, mpr: marks / 8, tripleRate: n ? triples / n * 100 : 0 };
}
// 目標点数 = 目標MPR × 8ラウンド × ナンバー（目標Rt未設定なら0）
function cnuTarget(num) {
  const rt = +DB.settings.goals.targetRt || 0;
  return rt > 0 ? Math.round(tgtMPR(rt) * 8 * num) : 0;
}
// その日のクリケナンバーCU集計（最高/最低/平均・MPR・トリプル率）
function cnuDayStats(ds) {
  const gs = gamesOn(ds, 'cnu');
  if (!gs.length) return null;
  const s = scoreStats(gs);
  const mpr = gs.reduce((a, g) => a + g.marks, 0) / gs.length / 8;
  const tri = gs.reduce((a, g) => a + (g.triples || 0), 0);
  const darts = gs.reduce((a, g) => a + (g.dartCount || 24), 0);
  return { n: s.n, best: s.best, min: s.min, avg: s.avg, mpr, tripleRate: darts ? tri / darts * 100 : 0 };
}
// 各ナンバー(15〜20)の平均トリプル率ランキング（全cnuゲーム）
function cnuNumberRanking() {
  const map = {};
  CRK_NUMS.forEach(n => { map[n] = { num: n, games: 0, tri: 0, darts: 0 }; });
  DB.games.filter(g => g.type === 'cnu').forEach(g => {
    const m = map[g.num]; if (!m) return;
    m.games++; m.tri += g.triples || 0; m.darts += g.dartCount || 24;
  });
  return CRK_NUMS.map(n => { const m = map[n]; return { num: n, games: m.games, tripleRate: m.darts ? m.tri / m.darts * 100 : null }; });
}
function cnuRankingCard() {
  const rows = cnuNumberRanking();
  const notYet = rows.filter(r => r.games === 0).map(r => r.num);
  if (notYet.length) {
    return `<div class="card"><h3>得意・不得意ナンバー</h3>
      <div class="sub">全6ナンバーをプレイすると表示されます（あと${notYet.length}：${notYet.join(', ')}）</div></div>`;
  }
  const sorted = rows.slice().sort((a, b) => b.tripleRate - a.tripleRate);
  return `<div class="card"><h3>得意・不得意ナンバー（トリプル率）</h3>
    ${sorted.map((r, i) => `<div class="tgt-row"><span class="tl">${i === 0 ? '🎯 得意　' : i === sorted.length - 1 ? '💧 不得意　' : '　'}No.${r.num}<span class="sub">（${r.games}G）</span></span><span class="tc" style="color:${i === 0 ? 'var(--green)' : i === sorted.length - 1 ? '#ff9d96' : 'var(--tx)'}">${r.tripleRate.toFixed(1)}%</span></div>`).join('')}
    <div class="sub" style="margin-top:6px">各ナンバーの全ゲーム平均トリプル率</div>
  </div>`;
}

// クリケットCUのラウンド別ターゲット（R1〜R6: 20→15、R7: ブル、R8: 全対象）
const CRI_TGT = [20, 19, 18, 17, 16, 15, 25, 0];
const CRI_TGT_LABEL = ['20', '19', '18', '17', '16', '15', 'BULL', 'ALL'];

function renderPlaySelect(v, ds) {
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  v.innerHTML = `
  <h2 style="display:flex;align-items:center;justify-content:space-between;gap:8px">
    <span>${fmtDate(ds)} のプレイ${DB.settings.dateOverride ? ' <span class="badge part">手動日付</span>' : ''}</span>
    <button class="btn small" onclick="openDateChange()">📅 日付変更</button>
  </h2>
  <div class="card">
    <button class="btn primary big" onclick="startGame('cu')">カウントアップ</button>
    <div class="sub" style="margin-bottom:14px">8ラウンド×3投。ブルは${DB.settings.bullMode === 'fat' ? 'ファットブル（50点）' : 'セパレート（25/50点）'}。</div>
    <button class="btn green big" onclick="startGame('cri')">クリケットカウントアップ</button>
    <div class="sub" style="margin-bottom:14px">R1〜R6は20→15、R7はブル、R8は15〜20とブルすべてが対象。</div>
    <button class="btn big" onclick="startGame('bull')">ブルチャレンジ${DB.bullSuspend && DB.bullSuspend.date === ds && (DB.bullSuspend.darts || []).length ? '（中断あり）' : ''}</button>
    <div class="sub" style="margin-bottom:14px">ダブルブル+2 / シングルブル+1 / その他−1 で目標点。新規/再開を選べます。</div>
    <button class="btn big" onclick="startGame('crk')">クリケチャレンジ${DB.crkSuspend && DB.crkSuspend.date === ds && (DB.crkSuspend.darts || []).length ? '（中断あり）' : ''}</button>
    <div class="sub" style="margin-bottom:14px">指定ナンバーの T+3/D+2/S+1/その他−2 で目標点。開始時にナンバー選択、新規/再開も選べます。</div>
    <button class="btn big" style="margin-bottom:0" onclick="startGame('cnu')">クリケナンバーCU</button>
    <div class="sub" style="margin-bottom:0">選んだナンバーのトリプルを狙い、実点数を8ラウンド累計。ナンバー別の得意/不得意も表示。</div>
  </div>
  <div class="card">
    <h3>アワードカウンター（今日）</h3>
    ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
    <div class="sub" style="margin-top:8px">自動判定分も含む合計。+/− で手動調整できます。</div>
  </div>
  <div class="card">
    <h3>今日のメモ</h3>
    <textarea class="memo" placeholder="調子・気づき・練習内容など" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
  </div>`;
}

function renderPlay() {
  const v = $('#view');
  const ds0 = todayStr();
  if (!G) { renderPlaySelect(v, ds0); return; }
  if (G.fin) { renderResult(v); return; }
  if (G.type === 'bull') { renderBull(v, ds0); return; }
  if (G.type === 'crk') { renderCrk(v, ds0); return; }
  if (G.type === 'cnu') { renderCnu(v, ds0); return; }

  const type = G.type, bullMode = DB.settings.bullMode;
  const total = G.darts.reduce((s, d) => s + dartPoint(d, type, bullMode), 0);
  const marks = type === 'cri' ? G.darts.reduce((s, d) => s + criMark(d), 0) : 0;
  G.confirmed = G.confirmed || 0;
  const rIdx = Math.floor(G.confirmed / 3);
  const inRound = G.darts.slice(G.confirmed);

  const chips = [0, 1, 2].map(i =>
    inRound[i] ? `<span>${type === 'cri' ? criDartLabel(inRound[i]) : dartLabel(inRound[i])}</span>` : '<span class="empty">・</span>').join('');

  const roundCells = [];
  for (let r = 0; r < 8; r++) {
    const rd = G.darts.slice(r * 3, r * 3 + 3);
    const pts = rd.length ? rd.reduce((s, d) => s + dartPoint(d, type, bullMode), 0) : '–';
    roundCells.push(`<div class="${r === rIdx ? 'cur' : ''}">${type === 'cri' ? CRI_TGT_LABEL[r] : 'R' + (r + 1)}<br>${pts}</div>`);
  }

  // 直前に入力したボタンに flash クラスを付けてふちを光らせる
  const fl = (seg, mult) => (FLASH && FLASH.seg === seg && (mult === undefined || FLASH.mult === mult)) ? ' flash' : '';
  const mrowHTML = `<div class="mrow">
      <button class="${M === 1 ? 'on' : ''}" onclick="setM(1)">SINGLE</button>
      <button class="${M === 2 ? 'on' : ''}" onclick="setM(2)">DOUBLE</button>
      <button class="${M === 3 ? 'on' : ''}" onclick="setM(3)">TRIPLE</button>
    </div>`;
  let pad;
  if (type === 'cu') {
    pad = mrowHTML + `<div class="padgrid">${Array.from({ length: 20 }, (_, i) => `<button class="${fl(i + 1)}" onclick="hit(${i + 1})">${i + 1}</button>`).join('')}</div>
       <div class="brow">
         <button class="bull${fl(25, 1)}" onclick="hit(25,1)">BULL${bullMode === 'fat' ? '' : ' 25'}</button>
         <button class="bull${fl(25, 2)}" onclick="hit(25,2)">D-BULL${bullMode === 'fat' ? '' : ' 50'}</button>
         <button class="${fl(0, 0)}" onclick="hit(0,0)">MISS</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
  } else {
    const tgt = CRI_TGT[Math.min(rIdx, 7)];
    if (tgt === 25) {
      pad = `<div class="padgrid cri" style="grid-template-columns:1fr 1fr">
         <button class="bullbtn${fl(25, 1)}" onclick="hit(25,1)">BULL 25</button>
         <button class="bullbtn${fl(25, 2)}" onclick="hit(25,2)">D-BULL 50</button>
       </div>
       <div class="brow" style="grid-template-columns:1fr 1fr">
         <button class="${fl(0, 0)}" onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    } else if (tgt === 0) {
      pad = mrowHTML + `<div class="padgrid cri">${[20, 19, 18, 17, 16, 15].map(n => `<button class="${fl(n)}" onclick="hit(${n})">${n}</button>`).join('')}</div>
       <div class="brow">
         <button class="bull${fl(25, 1)}" onclick="hit(25,1)">BULL 25</button>
         <button class="bull${fl(25, 2)}" onclick="hit(25,2)">D-BULL 50</button>
         <button class="${fl(0, 0)}" onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    } else {
      pad = `<div class="padgrid cri">
         <button class="${fl(tgt, 1)}" onclick="hit(${tgt},1)">${tgt}</button>
         <button class="${fl(tgt, 2)}" onclick="hit(${tgt},2)">D${tgt}</button>
         <button class="${fl(tgt, 3)}" onclick="hit(${tgt},3)">T${tgt}</button>
       </div>
       <div class="brow" style="grid-template-columns:1fr 1fr">
         <button class="${fl(0, 0)}" onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    }
  }
  FLASH = null;

  // 右カラム用: 今日の確定分 + プレイ中ゲームの確定済みラウンドの自動判定分を合算して表示
  const ds = todayStr();
  const liveAwards = detectAwards(G.darts.slice(0, G.confirmed), type);
  const ctr = countersOn(ds);
  const disp = { ...ctr };
  for (const k in liveAwards) disp[k] = (disp[k] || 0) + liveAwards[k];
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';

  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">${TYPE_LABEL[type]}　<span class="sub">R${rIdx + 1}/8${type === 'cri' ? '・狙い ' + CRI_TGT_LABEL[Math.min(rIdx, 7)] : ''}・${fmtDate(ds)}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small panelbtn" onclick="openGamePanel()">📋 メモ</button>
      <button class="btn small danger" onclick="quitGame()">破棄</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="bigscore">${total}</div>
        ${type === 'cri' ? `<div class="sub center">${marks}マーク / MPR ${(G.darts.length ? marks / (G.darts.length / 3) : 0).toFixed(2)}</div>` : ''}
        <div class="dartchips">${chips}</div>
        <div class="roundbar">${roundCells.join('')}</div>
      </div>
      <div class="card padwrap">
        ${pad}
        <button class="btn ${(type === 'cri' || inRound.length === 3) ? 'primary' : ''} big confirmbtn" ${(type === 'cri' || inRound.length === 3) ? '' : 'disabled'} onclick="confirmRound()">${rIdx === 7 ? '✔ ゲーム終了（保存）' : '✔ ラウンド確定'}${type === 'cri' && inRound.length < 3 ? '<span class="sub" style="font-weight:400">（空きはMISS）</span>' : ''}</button>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, disp)).join('')}
        <div class="sub" style="margin-top:8px">プレイ中の自動判定分も表示に含めています（保存時に確定）。+/− は手動分の調整です。</div>
      </div>
      <div class="card">
        <h3>今日のメモ</h3>
        <textarea class="memo" placeholder="調子・気づきなど" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
}

function bullDartLabel(d) { return d.seg === 25 ? (d.mult === 2 ? 'ダブル' : 'シングル') : 'ミス'; }
function renderBull(v, ds) {
  const tgt = +DB.settings.goals.bullTarget || 0;
  const total = bullChScore(G.darts);
  const st = bullStats(G.darts);
  const last = G.darts.slice(-3);
  const chips = [0, 1, 2].map(i => last[i] ? `<span>${bullDartLabel(last[i])}</span>` : '<span class="empty">・</span>').join('');
  const prog = tgt > 0 ? Math.max(0, Math.min(100, total / tgt * 100)) : 0;
  const fl = (seg, mult) => (FLASH && FLASH.seg === seg && FLASH.mult === mult) ? ' flash' : '';
  const pad = `
    <div class="padgrid" style="grid-template-columns:1fr 1fr 1fr">
      <button class="bullbtn${fl(25, 2)}" onclick="hit(25,2)">ダブルブル<br>+2</button>
      <button class="bullbtn${fl(25, 1)}" onclick="hit(25,1)">シングルブル<br>+1</button>
      <button class="${fl(0, 0)}" onclick="hit(0,0)">その他<br>−1</button>
    </div>
    <div class="brow" style="grid-template-columns:1fr 1fr 1fr">
      <button class="undo" onclick="undoDart()">⌫ 戻す</button>
      <button onclick="suspendBull()">⏸ 中断</button>
      <button onclick="finishGame()">■ 終了</button>
    </div>`;
  FLASH = null;
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">ブルチャレンジ　<span class="sub">${st.rounds}R / ${st.n}投${tgt > 0 ? '・目標 ' + tgt + '点' : ''}・${fmtDate(ds)}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small panelbtn" onclick="openGamePanel()">📋 メモ</button>
      <button class="btn small danger" onclick="quitGame()">破棄</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="bigscore">${total}${tgt > 0 ? `<span class="sub" style="font-size:16px;font-weight:400"> / ${tgt}</span>` : ''}</div>
        ${tgt > 0 ? `<div class="gbar"><i style="width:${prog.toFixed(0)}%"></i></div>` : '<div class="sub center">設定で目標点数を決めると達成判定できます</div>'}
        <div class="statgrid" style="margin-top:6px">
          <div><div class="v">${st.bulls}</div><div class="l">ブル数<br>率${st.bullRate.toFixed(1)}%</div></div>
          <div><div class="v" style="color:var(--red)">${st.dbulls}</div><div class="l">インブル数<br>率${st.ibRate.toFixed(1)}%</div></div>
          <div><div class="v">${st.n}</div><div class="l">投数<br>${st.rounds}R</div></div>
        </div>
        <div class="dartchips">${chips}</div>
      </div>
      <div class="card padwrap">${pad}</div>
    </div>
    <div>
      <div class="card">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
      </div>
      <div class="card">
        <h3>今日のメモ</h3>
        <textarea class="memo" placeholder="調子・気づきなど" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
}

function renderBullResult(v, g) {
  const bullRate = g.dartCount ? g.bulls / g.dartCount * 100 : 0;
  const ibRate = g.dartCount ? g.dbulls / g.dartCount * 100 : 0;
  const bests = DB.games.filter(x => x.type === 'bull' && x.reached && x.target === g.target).map(x => x.dartCount);
  const best = bests.length ? Math.min(...bests) : null;
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>ブルチャレンジ</h3>
    <div class="bigscore" style="color:${g.reached ? 'var(--green)' : 'var(--tx)'}">${g.reached ? '達成！' : g.total + '点'}</div>
    <div class="sub">${g.target > 0 ? `目標 ${g.target}点 / 到達 ${g.total}点` : '目標未設定'}</div>
    <div class="statgrid" style="margin-top:12px;grid-template-columns:1fr 1fr">
      <div><div class="v">${g.rounds}</div><div class="l">ラウンド数</div></div>
      <div><div class="v">${g.dartCount}</div><div class="l">投数</div></div>
    </div>
    <div class="statgrid" style="margin-top:8px;grid-template-columns:1fr 1fr">
      <div><div class="v">${g.bulls} <span class="sub" style="font-size:13px">/ ${bullRate.toFixed(1)}%</span></div><div class="l">ブル数 / ブル率</div></div>
      <div><div class="v" style="color:var(--red)">${g.dbulls} <span class="sub" style="font-size:13px">/ ${ibRate.toFixed(1)}%</span></div><div class="l">インブル数 / インブル率</div></div>
    </div>
    ${g.reached && best != null ? `<div class="sub" style="margin-top:8px">自己ベスト（目標${g.target}点）: ${best}投${best === g.dartCount ? ' 🎉更新!' : ''}</div>` : ''}
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startGame('bull')">もう1回</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

function renderCrk(v, ds) {
  const num = G.num;
  const tgt = +DB.settings.goals.crkTarget || 0;
  const total = crkScore(G.darts, num);
  const st = crkStats(G.darts, num);
  const last = G.darts.slice(-3);
  const chips = [0, 1, 2].map(i => last[i] ? `<span>${crkDartLabel(last[i], num)}</span>` : '<span class="empty">・</span>').join('');
  const prog = tgt > 0 ? Math.max(0, Math.min(100, total / tgt * 100)) : 0;
  const fl = (mult) => (FLASH && FLASH.seg === num && FLASH.mult === mult) ? ' flash' : '';
  const pad = `
    <div class="padgrid cri">
      <button class="${fl(3)}" onclick="hit(${num},3)">T${num}<br>+3</button>
      <button class="${fl(2)}" onclick="hit(${num},2)">D${num}<br>+2</button>
      <button class="${fl(1)}" onclick="hit(${num},1)">S${num}<br>+1</button>
    </div>
    <div class="brow">
      <button class="${FLASH && FLASH.seg === 0 ? 'flash' : ''}" onclick="hit(0,0)">その他<br>−2</button>
      <button class="undo" onclick="undoDart()">⌫ 戻す</button>
      <button onclick="suspendCrk()">⏸ 中断</button>
      <button onclick="finishGame()">■ 終了</button>
    </div>`;
  FLASH = null;
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">クリケチャレンジ　<span class="sub">ナンバー${num}・${st.rounds}R / ${st.n}投${tgt > 0 ? '・目標 ' + tgt : ''}・${fmtDate(ds)}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small panelbtn" onclick="openGamePanel()">📋 メモ</button>
      <button class="btn small danger" onclick="quitGame()">破棄</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="bigscore">${total}${tgt > 0 ? `<span class="sub" style="font-size:16px;font-weight:400"> / ${tgt}</span>` : ''}</div>
        ${tgt > 0 ? `<div class="gbar"><i style="width:${prog.toFixed(0)}%"></i></div>` : '<div class="sub center">設定で目標点数を決めると達成判定できます</div>'}
        <div class="statgrid" style="margin-top:6px">
          <div><div class="v">${st.n}</div><div class="l">投数</div></div>
          <div><div class="v" style="color:var(--yel)">${st.tripleRate.toFixed(1)}%</div><div class="l">トリプル率</div></div>
          <div><div class="v">${st.rounds}</div><div class="l">ラウンド数</div></div>
        </div>
        <div class="sub center" style="margin-top:6px">T${num} ${st.triples} / D${num} ${st.doubles} / S${num} ${st.singles}</div>
        <div class="dartchips">${chips}</div>
      </div>
      <div class="card padwrap">${pad}</div>
    </div>
    <div>
      <div class="card">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
      </div>
      <div class="card">
        <h3>今日のメモ</h3>
        <textarea class="memo" placeholder="調子・気づきなど" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
}
function renderCrkResult(v, g) {
  const tripleRate = g.dartCount ? g.triples / g.dartCount * 100 : 0;
  const bests = DB.games.filter(x => x.type === 'crk' && x.reached && x.num === g.num && x.target === g.target).map(x => x.dartCount);
  const best = bests.length ? Math.min(...bests) : null;
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>クリケチャレンジ（ナンバー${g.num}）</h3>
    <div class="bigscore" style="color:${g.reached ? 'var(--green)' : 'var(--tx)'}">${g.reached ? '達成！' : g.total + '点'}</div>
    <div class="sub">${g.target > 0 ? `目標 ${g.target}点 / 到達 ${g.total}点` : '目標未設定'}</div>
    <div class="statgrid" style="margin-top:12px">
      <div><div class="v">${g.rounds}</div><div class="l">ラウンド数</div></div>
      <div><div class="v">${g.dartCount}</div><div class="l">投数</div></div>
      <div><div class="v" style="color:var(--yel)">${tripleRate.toFixed(1)}%</div><div class="l">トリプル率</div></div>
    </div>
    <div class="sub" style="margin-top:8px">T${g.num} ${g.triples} / D${g.num} ${g.doubles} / S${g.num} ${g.singles}</div>
    ${g.reached && best != null ? `<div class="sub" style="margin-top:8px">自己ベスト（${g.num}・目標${g.target}点）: ${best}投${best === g.dartCount ? ' 🎉更新!' : ''}</div>` : ''}
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startGame('crk')">もう1回</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

function renderCnu(v, ds) {
  const num = G.num;
  const target = cnuTarget(num);
  G.confirmed = G.confirmed || 0;
  const rIdx = Math.floor(G.confirmed / 3);
  const inRound = G.darts.slice(G.confirmed);
  const total = cnuScore(G.darts, num);
  const st = cnuStats(G.darts, num);
  const chips = [0, 1, 2].map(i => inRound[i] ? `<span>${crkDartLabel(inRound[i], num)}</span>` : '<span class="empty">・</span>').join('');
  const roundCells = [];
  for (let r = 0; r < 8; r++) {
    const rd = G.darts.slice(r * 3, r * 3 + 3);
    const pts = rd.length ? cnuScore(rd, num) : '–';
    roundCells.push(`<div class="${r === rIdx ? 'cur' : ''}">R${r + 1}<br>${pts}</div>`);
  }
  const prog = target > 0 ? Math.max(0, Math.min(100, total / target * 100)) : 0;
  const fl = (mult) => (FLASH && FLASH.seg === num && FLASH.mult === mult) ? ' flash' : '';
  const pad = `
    <div class="padgrid cri">
      <button class="${fl(3)}" onclick="hit(${num},3)">T${num}<br>+${num * 3}</button>
      <button class="${fl(2)}" onclick="hit(${num},2)">D${num}<br>+${num * 2}</button>
      <button class="${fl(1)}" onclick="hit(${num},1)">S${num}<br>+${num}</button>
    </div>
    <div class="brow" style="grid-template-columns:1fr 1fr">
      <button class="${FLASH && FLASH.seg === 0 ? 'flash' : ''}" onclick="hit(0,0)">その他<br>0</button>
      <button class="undo" onclick="undoDart()">⌫ 戻す</button>
    </div>`;
  FLASH = null;
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  const mpr = G.darts.length ? st.marks / (G.darts.length / 3) : 0;
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">クリケナンバーCU　<span class="sub">ナンバー${num}・R${rIdx + 1}/8${target > 0 ? '・目標 ' + target : ''}・${fmtDate(ds)}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small panelbtn" onclick="openGamePanel()">📋 メモ</button>
      <button class="btn small danger" onclick="quitGame()">破棄</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="bigscore">${total}${target > 0 ? `<span class="sub" style="font-size:16px;font-weight:400"> / ${target}</span>` : ''}</div>
        ${target > 0 ? `<div class="gbar"><i style="width:${prog.toFixed(0)}%"></i></div>` : ''}
        <div class="statgrid" style="margin-top:6px">
          <div><div class="v">${st.marks}</div><div class="l">マーク</div></div>
          <div><div class="v" style="color:var(--yel)">${mpr.toFixed(2)}</div><div class="l">MPR</div></div>
          <div><div class="v" style="color:var(--yel)">${st.tripleRate.toFixed(1)}%</div><div class="l">トリプル率</div></div>
        </div>
        <div class="dartchips">${chips}</div>
        <div class="roundbar">${roundCells.join('')}</div>
      </div>
      <div class="card padwrap">
        ${pad}
        <button class="btn primary big confirmbtn" onclick="confirmRound()">${rIdx === 7 ? '✔ ゲーム終了（保存）' : '✔ ラウンド確定'}${inRound.length < 3 ? '<span class="sub" style="font-weight:400">（空きはミス）</span>' : ''}</button>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
      </div>
      <div class="card">
        <h3>今日のメモ</h3>
        <textarea class="memo" placeholder="調子・気づきなど" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
}
function renderCnuResult(v, g) {
  const tripleRate = g.dartCount ? g.triples / g.dartCount * 100 : 0;
  const sameToday = gamesOn(g.date, 'cnu').filter(x => x.num === g.num);
  const s = scoreStats(sameToday);
  const bestSame = DB.games.filter(x => x.type === 'cnu' && x.num === g.num).map(x => x.total);
  const best = bestSame.length ? Math.max(...bestSame) : g.total;
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>クリケナンバーCU（ナンバー${g.num}）</h3>
    <div class="bigscore">${g.total}${g.target > 0 ? `<span class="sub" style="font-size:16px;font-weight:400"> / ${g.target}</span>` : ''}</div>
    <div class="statgrid" style="margin-top:12px">
      <div><div class="v" style="color:var(--yel)">${(g.marks / 8).toFixed(2)}</div><div class="l">MPR</div></div>
      <div><div class="v" style="color:var(--yel)">${tripleRate.toFixed(1)}%</div><div class="l">トリプル率</div></div>
      <div><div class="v">${g.marks}</div><div class="l">マーク</div></div>
    </div>
    <div class="sub" style="margin-top:8px">今日のNo.${g.num}: ${s.n}ゲーム目 / 最高 ${s.best} / 最低 ${s.min} / 平均 ${s.avg.toFixed(1)}</div>
    <div class="sub" style="margin-top:4px">ナンバー${g.num}の自己ベスト: ${best}点${best === g.total && bestSame.length > 1 ? ' 🎉更新!' : ''}</div>
  </div>
  ${cnuRankingCard()}
  <div class="card">
    <button class="btn primary big" onclick="startGame('cnu')">もう1回（ナンバー選択）</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

function renderResult(v) {
  const g = G.fin;
  const ds = g.date;
  if (g.type === 'bull') { renderBullResult(v, g); return; }
  if (g.type === 'crk') { renderCrkResult(v, g); return; }
  if (g.type === 'cnu') { renderCnuResult(v, g); return; }
  const todays = gamesOn(ds, g.type);
  const s = scoreStats(todays);
  const awards = Object.entries(g.awards || {});
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>${TYPE_LABEL[g.type]}</h3>
    <div class="bigscore">${g.total}</div>
    ${g.type === 'cri' ? `<div class="sub">${g.marks}マーク / MPR ${(g.marks / 8).toFixed(2)}</div>` : ''}
    ${g.type === 'cu' ? `<div class="statgrid" style="margin-top:12px">
      <div><div class="v">${(g.total / 8).toFixed(1)}</div><div class="l">1R平均スタッツ</div></div>
      <div><div class="v" style="color:var(--yel)">${g.lowTon || 0}</div><div class="l">LOW TON</div></div>
      <div><div class="v" style="color:var(--red)">${(g.awards && g.awards.hat) || 0}</div><div class="l">ハットトリック</div></div>
    </div>
    <div class="statgrid" style="margin-top:8px">
      <div><div class="v">${g.bulls || 0}</div><div class="l">ブル数</div></div>
      <div><div class="v">${g.dbulls || 0}</div><div class="l">インブル数</div></div>
      <div><div class="v" style="color:var(--yel)">${((g.bulls || 0) / 24 * 100).toFixed(1)}%</div><div class="l">ブル率</div></div>
    </div>` : ''}
    <div class="sub" style="margin-top:8px">今日${s.n}ゲーム目 / ベスト ${s.best} / 平均 ${s.avg.toFixed(1)}</div>
  </div>
  ${awards.length ? `<div class="card">
    <h3>🏆 このゲームのアワード</h3>
    ${awards.map(([k, n]) => `<div class="goal-row met"><span class="mk">✓</span>${escHtml(COUNTER_LABEL[k] || k)} × ${n}</div>`).join('')}
  </div>` : ''}
  <div class="card">
    <button class="btn primary big" onclick="startGame('${g.type}')">もう1ゲーム</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= 履歴 ================= */
let GPICK = -1;      // グラフで選択中のデータ点インデックス（-1=なし）
let GPOINTS = [];    // 各インデックスの { ds, text }（タップ表示用）
function setHTab(t) { HTAB = t; GPICK = -1; render(); }
function setMetric(m) { HM = m; GPICK = -1; render(); }
function setPeriod(p) { HP = p; GPICK = -1; render(); }
function pickGraph(i) { GPICK = (GPICK === i ? -1 : i); render(); }

function allDates() {
  const s = new Set(DB.games.map(g => g.date));
  (DB.matches || []).forEach(m => s.add(m.date));
  Object.keys(DB.days).forEach(ds => {
    const e = DB.days[ds];
    if ((e.memo && e.memo.trim()) || Object.values(e.adj || {}).some(v => v) || (e.dlImages || []).length || e.dl) s.add(ds);
  });
  return [...s].sort().reverse();
}

function metricValue(ds, mk) {
  if (mk.startsWith('c_')) return countersOn(ds)[mk.slice(2)] || 0;
  const cu = dayStats(ds, 'cu');
  const crG = gamesOn(ds, 'cri');
  const cr = dayStats(ds, 'cri');
  switch (mk) {
    case 'cuAvg': return cu ? +cu.avg.toFixed(1) : null;
    case 'cuBest': return cu ? cu.best : null;
    case 'criAvg': return cr ? +cr.avg.toFixed(1) : null;
    case 'criBest': return cr ? cr.best : null;
    case 'mpr': { const m = mprOf(crG); return m != null ? +m.toFixed(2) : null; }
    case 'rating': {
      const r = ratingInfo(gamesOn(ds, 'cu'), crG);
      return r.totalF != null ? +r.totalF.toFixed(2) : null;
    }
    case 'bullRate': { const db = dayBulls(ds); return db && db.rate != null ? +db.rate.toFixed(1) : null; }
    case 'cnuAvg': { const d = cnuDayStats(ds); return d ? +d.avg.toFixed(1) : null; }
    case 'cnuBest': { const d = cnuDayStats(ds); return d ? d.best : null; }
    case 'cnuMpr': { const d = cnuDayStats(ds); return d ? +d.mpr.toFixed(2) : null; }
    case 'cnuTriple': { const d = cnuDayStats(ds); return d ? +d.tripleRate.toFixed(1) : null; }
  }
  return null;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) { if (v <= m * p) return m * p; }
  return 10 * p;
}

function chartSVG(dates, vals, kind, color, sel, target) {
  const W = 360, H = 210, L = 40, R = 8, T = 12, B = 26;
  const n = dates.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return '<div class="sub center" style="padding:30px 0">この期間のデータがありません</div>';
  const tv = target && target.val != null ? target.val : null;
  const max = niceMax(Math.max(...nums, tv != null ? tv : 0));
  const X = i => n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2;
  const Y = v => T + (H - T - B) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" xmlns="http://www.w3.org/2000/svg">`;
  for (let g = 0; g <= 2; g++) {
    const val = max * g / 2, y = Y(val);
    s += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="#2c3a55" stroke-width="1"/>`;
    s += `<text x="${L - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#93a0b8">${+val.toFixed(2)}</text>`;
  }
  // 目標ボーダーライン
  if (tv != null) {
    const yt = Y(tv);
    if (yt >= T - 1 && yt <= H - B + 1) {
      s += `<line x1="${L}" y1="${yt.toFixed(1)}" x2="${W - R}" y2="${yt.toFixed(1)}" stroke="#3dba6f" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      s += `<text x="${W - R}" y="${(yt - 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#3dba6f">${escHtml(target.label)}</text>`;
    }
  }
  const step = Math.max(1, Math.ceil(n / 6));
  dates.forEach((ds, i) => {
    if (i % step === 0 || i === n - 1) {
      s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#93a0b8">${ds.slice(5).replace('-', '/')}</text>`;
    }
  });
  // 選択中ポイントの縦ガイド線
  if (sel != null && sel >= 0 && vals[sel] != null) {
    s += `<line x1="${X(sel).toFixed(1)}" y1="${T}" x2="${X(sel).toFixed(1)}" y2="${H - B}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`;
  }
  if (kind === 'bar') {
    const bw = Math.max(2.5, (W - L - R) / n * 0.6);
    vals.forEach((v, i) => {
      if (v == null || v === 0) return;
      const y = Y(v);
      s += `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - B - y).toFixed(1)}" rx="2" fill="${color}" opacity="${sel === i ? 1 : 0.85}"/>`;
    });
  } else {
    let path = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      path += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      pen = true;
    });
    s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`;
    vals.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${sel === i ? 5 : 3}" fill="${color}" ${sel === i ? 'stroke="#fff" stroke-width="1.5"' : ''}/>`; });
  }
  s += chartTapTargets(dates, vals, X, T, H - B);
  return s + '</svg>';
}

/* 各データ点に縦帯の透明なタップ領域を重ねる（指で押しやすくする） */
function chartTapTargets(dates, vals, X, top, bottom) {
  const n = dates.length;
  let s = '';
  for (let i = 0; i < n; i++) {
    if (vals[i] == null) continue;
    const x0 = i === 0 ? 0 : (X(i - 1) + X(i)) / 2;
    const x1 = i === n - 1 ? 400 : (X(i) + X(i + 1)) / 2;
    s += `<rect x="${x0.toFixed(1)}" y="${top}" width="${(x1 - x0).toFixed(1)}" height="${(bottom - top).toFixed(1)}" fill="transparent" style="cursor:pointer" onclick="pickGraph(${i})"/>`;
  }
  return s;
}

/* 2系列の折れ線グラフ（ブル数/インブル数用） */
function chartSVG2(dates, va, vb, la, lb, ca, cb, sel) {
  const W = 360, H = 220, L = 40, R = 8, T = 26, B = 26;
  const n = dates.length;
  const nums = [...va, ...vb].filter(v => v != null);
  if (!nums.length) return '<div class="sub center" style="padding:30px 0">この期間のデータがありません</div>';
  const max = niceMax(Math.max(...nums));
  const X = i => n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2;
  const Y = v => T + (H - T - B) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" xmlns="http://www.w3.org/2000/svg">`;
  s += `<circle cx="${L + 6}" cy="10" r="4" fill="${ca}"/><text x="${L + 14}" y="14" font-size="10" fill="#93a0b8">${la}</text>`;
  s += `<circle cx="${L + 86}" cy="10" r="4" fill="${cb}"/><text x="${L + 94}" y="14" font-size="10" fill="#93a0b8">${lb}</text>`;
  for (let g = 0; g <= 2; g++) {
    const val = max * g / 2, y = Y(val);
    s += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="#2c3a55" stroke-width="1"/>`;
    s += `<text x="${L - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#93a0b8">${+val.toFixed(2)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 6));
  dates.forEach((ds, i) => {
    if (i % step === 0 || i === n - 1) {
      s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#93a0b8">${ds.slice(5).replace('-', '/')}</text>`;
    }
  });
  if (sel != null && sel >= 0 && (va[sel] != null || vb[sel] != null)) {
    s += `<line x1="${X(sel).toFixed(1)}" y1="${T}" x2="${X(sel).toFixed(1)}" y2="${H - B}" stroke="#93a0b8" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`;
  }
  const drawLine = (vals, color) => {
    let path = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      path += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      pen = true;
    });
    s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`;
    vals.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${sel === i ? 5 : 3}" fill="${color}" ${sel === i ? 'stroke="#fff" stroke-width="1.5"' : ''}/>`; });
  };
  drawLine(va, ca);
  drawLine(vb, cb);
  const both = dates.map((_, i) => (va[i] != null || vb[i] != null) ? 1 : null);
  s += chartTapTargets(dates, both, X, T, H - B);
  return s + '</svg>';
}

function renderHist() {
  const v = $('#view');
  let body = '';
  if (HTAB === 'days') {
    const dates = allDates();
    body = dates.length ? dates.map(ds => {
      const st = dayStatus(ds);
      const cu = dayStats(ds, 'cu');
      const crG = gamesOn(ds, 'cri');
      const cr = dayStats(ds, 'cri');
      const mpr = mprOf(crG);
      const db = dayBulls(ds);
      const ctr = countersOn(ds);
      const hasDL = DB.days[ds] && ((DB.days[ds].dlImages || []).length || DB.days[ds].dl);
      const chips = (hasDL ? '<span class="badge dl">DARTSLIVE</span>' : '')
        + COUNTERS.filter(c => ctr[c.k] > 0).map(c => `<span>${escHtml(c.label)} ${ctr[c.k]}</span>`).join('');
      const memo = (DB.days[ds] && DB.days[ds].memo || '').split('\n')[0];
      const badge = st.total > 0
        ? (st.met === st.total ? '<span class="badge ok">目標達成</span>' : st.met > 0 ? `<span class="badge part">目標 ${st.met}/${st.total}</span>` : `<span class="badge">目標 0/${st.total}</span>`)
        : '';
      return `<div class="card daycard" onclick="openDay('${ds}')">
        <div class="dt"><span>${fmtDate(ds)}</span>${badge}</div>
        ${cu ? `<div class="line">カウントアップ: ${cu.n}G${cu.dl ? '＋DL' : ''} / 最高 ${cu.best} / 最低 ${cu.min} / 平均 ${cu.avg.toFixed(1)}</div>` : ''}
        ${cr ? `<div class="line">クリケットCU: ${cr.n}G${cr.dl ? '＋DL' : ''} / 最高 ${cr.best} / 平均 ${cr.avg.toFixed(1)}${mpr != null ? ` / MPR ${mpr.toFixed(2)}` : ''}</div>` : ''}
        ${db ? `<div class="line">🎯 ブル ${db.b}本${db.b - db.appB > 0 ? `（うちDL ${db.b - db.appB}）` : ''} / インブル ${db.ib}本${db.ib - db.appIb > 0 ? `（うちDL ${db.ib - db.appIb}）` : ''}${db.rounds ? ` / 1R平均 ${(db.appB / db.rounds).toFixed(2)}本 / ブル率 ${db.rate.toFixed(1)}%` : ''}</div>` : ''}
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${memo ? `<div class="line">📝 ${escHtml(memo)}</div>` : ''}
      </div>`;
    }).join('') : '<div class="card sub center">まだ記録がありません</div>';
  } else {
    const m = METRICS.find(x => x.k === HM) || METRICS[0];
    const range = lastNDates(HP);
    let chart;
    GPOINTS = [];
    if (m.k === 'bulls') {
      // 記録のある日だけを抽出し、詰めて連続表示する
      const dates = [], va = [], vb = [];
      range.forEach(ds => {
        const d = dayBulls(ds);
        if (!d) return;
        dates.push(ds); va.push(d.b); vb.push(d.ib);
        GPOINTS.push({ ds, text: `ブル ${d.b}本 / インブル ${d.ib}本` });
      });
      chart = chartSVG2(dates, va, vb, 'ブル', 'インブル', '#4f8cff', '#e8453c', GPICK);
    } else {
      const unit = m.k === 'bullRate' ? '%' : '';
      const dates = [], vals = [];
      range.forEach(ds => {
        const v = metricValue(ds, m.k);
        if (v == null) return;
        dates.push(ds); vals.push(v);
        GPOINTS.push({ ds, text: `${m.label}: ${v}${unit}` });
      });
      const target = targetForMetric(m.k, +DB.settings.goals.targetRt || 0);
      chart = chartSVG(dates, vals, m.kind, m.color, GPICK, target);
    }
    const sp = (GPICK >= 0 && GPOINTS[GPICK]) ? GPOINTS[GPICK] : null;
    const readout = sp
      ? `<div class="graph-readout"><b>${fmtDate(sp.ds)}</b>　${escHtml(sp.text)}</div>`
      : '<div class="graph-readout sub">グラフのポイントをタップすると、その日の数値を表示します</div>';
    body = `<div class="card">
      <select onchange="setMetric(this.value)">
        ${METRICS.map(x => `<option value="${x.k}" ${x.k === HM ? 'selected' : ''}>${escHtml(x.label)}</option>`).join('')}
      </select>
      <div class="pbtns">
        ${[14, 30, 90].map(p => `<button class="btn small ${HP === p ? 'primary' : ''}" onclick="setPeriod(${p})">${p}日</button>`).join('')}
      </div>
      ${readout}
      ${chart}
    </div>`;
  }
  v.innerHTML = `
  <h2>履歴</h2>
  <div class="tabs">
    <button class="${HTAB === 'days' ? 'on' : ''}" onclick="setHTab('days')">日別</button>
    <button class="${HTAB === 'graph' ? 'on' : ''}" onclick="setHTab('graph')">グラフ</button>
  </div>
  ${body}`;
}

/* ================= カレンダー ================= */
function calMove(dv) {
  CAL.m += dv;
  if (CAL.m < 0) { CAL.m = 11; CAL.y--; }
  if (CAL.m > 11) { CAL.m = 0; CAL.y++; }
  render();
}
function renderCal() {
  const { y, m } = CAL;
  const startDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  let cells = WDAYS.map(w => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="cc empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = ymd(new Date(y, m, d));
    const st = dayStatus(ds);
    let cls = 'cc', sym = '';
    if (st.activity) {
      if (st.total > 0 && st.met === st.total) { cls += ' ok'; sym = '✓'; }
      else if (st.met > 0) { cls += ' part'; sym = '△'; }
      else { cls += ' act'; sym = '・'; }
    }
    if (ds === todayStr()) cls += ' today';
    cells += `<div class="${cls}" onclick="openDay('${ds}')"><span class="d">${d}</span><span class="m">${sym}</span></div>`;
  }
  $('#view').innerHTML = `
  <h2>カレンダー</h2>
  <div class="card">
    <div class="calhead">
      <button onclick="calMove(-1)">‹</button>
      <span class="ttl">${y}年 ${m + 1}月</span>
      <button onclick="calMove(1)">›</button>
    </div>
    <div class="calgrid">${cells}</div>
    <div class="legend">
      <span>✓ 目標すべて達成</span><span>△ 一部達成</span><span>・ 記録あり</span>
    </div>
  </div>
  <div class="sub center">日付をタップすると詳細・過去の修正ができます</div>`;
}

/* ================= 日詳細モーダル ================= */
function openDay(ds) {
  MODAL_KIND = 'day';
  const cu = dayStats(ds, 'cu');
  const crG = gamesOn(ds, 'cri');
  const cr = dayStats(ds, 'cri');
  const mpr = mprOf(crG);
  const ctr = countersOn(ds);
  const goals = goalList(ds);
  const games = DB.games.filter(g => g.date === ds).sort((a, b) => a.ts - b.ts);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  const tm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const e = DB.days[ds] || {};
  const shots = e.dlImages || [];
  const dlAw = (e.dl && e.dl.awards) || {};
  const dlGames = games.filter(g => g.src === 'dl');

  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">${fmtDate(ds)}</span><button onclick="closeModal()">閉じる</button></div>

      ${goals.length ? `<div class="card"><h3>目標 ${goals.filter(g => g.met).length}/${goals.length}</h3>
        ${goals.map(g => `<div class="goal-row ${g.met ? 'met' : 'unmet'}"><span class="mk">${g.met ? '✓' : '○'}</span>${escHtml(g.label)}</div>`).join('')}
      </div>` : ''}

      <div class="card">
        <h3>スコア</h3>
        ${cu ? `<div class="line" style="font-size:13px;margin-bottom:4px">カウントアップ: ${cu.n}G${cu.dl ? '＋DL' : ''} / 最高 ${cu.best} / 最低 ${cu.min} / 平均 ${cu.avg.toFixed(1)}</div>` : ''}
        ${cr ? `<div class="line" style="font-size:13px">クリケットCU: ${cr.n}G${cr.dl ? '＋DL' : ''} / 最高 ${cr.best} / 最低 ${cr.min} / 平均 ${cr.avg.toFixed(1)}${mpr != null ? ` / MPR ${mpr.toFixed(2)}` : ''}</div>` : ''}
        ${!cu && !cr ? '<div class="sub">ゲーム記録なし</div>' : ''}
      </div>

      ${(() => {
        const db = dayBulls(ds);
        if (!db) return '';
        return `<div class="card">
          <h3>🎯 ブル（カウントアップ）</h3>
          <div class="statgrid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div><div class="v">${db.b}</div><div class="l">ブル数${db.b - db.appB > 0 ? `<br>うちDL ${db.b - db.appB}` : ''}</div></div>
            <div><div class="v" style="color:var(--red)">${db.ib}</div><div class="l">インブル数${db.ib - db.appIb > 0 ? `<br>うちDL ${db.ib - db.appIb}` : ''}</div></div>
            <div><div class="v">${db.rounds ? (db.appB / db.rounds).toFixed(2) : '—'}</div><div class="l">1R平均ブル</div></div>
            <div><div class="v" style="color:var(--yel)">${db.rate != null ? db.rate.toFixed(1) + '%' : '—'}</div><div class="l">ブル率</div></div>
          </div>
          ${db.dl ? '<div class="sub" style="margin-top:6px">DL=ダーツライブ読み取り分。1R平均ブル・ブル率はアプリ記録分のみで計算しています。</div>' : ''}
        </div>`;
      })()}

      ${games.length ? `<div class="card"><h3>ゲーム一覧</h3>
        ${games.map(g => `<div class="game-row">
          <span class="tm">${g.src === 'dl' ? '<span class="badge dl">DL</span>' : tm(g.ts)}</span>
          <span class="ty"><span class="tybadge ${g.type}">${TYPE_LABEL[g.type]}</span></span>
          <span class="sc"><span class="sub" style="font-weight:400">${gameSub(g)}</span>　${g.total}</span>
          <button class="del" onclick="delGame('${g.id}','${ds}')">削除</button>
        </div>`).join('')}
      </div>` : ''}

      ${(() => {
        const ms = (DB.matches || []).filter(m => m.date === ds);
        if (!ms.length) return '';
        return `<div class="card"><h3>🤖 ROBOT対戦</h3>
          ${ms.map((m, i) => `<div class="game-row">
            <span class="tm">${m.result === 'win' ? '<span class="badge ok">WIN</span>' : m.result === 'lose' ? '<span class="badge">LOSE</span>' : '<span class="badge part">DRAW</span>'}</span>
            <span class="ty">${m.mode === '01' ? m.start : m.mode === 'cricket' ? 'CRICKET' : 'MEDLEY'}</span>
            <span class="sc" style="font-size:13px">vs Rt.${(+m.cpuRt).toFixed(1)}　${m.wins.me}-${m.wins.cpu}${m.ppr != null ? '　PPR ' + m.ppr : ''}${m.mpr != null ? '　MPR ' + m.mpr : ''}</span>
            <button class="del" onclick="delMatch('${m.id}','${ds}')">削除</button>
          </div>`).join('')}
          <div class="sub" style="margin-top:8px">練習レーティングには影響しません。</div>
        </div>`;
      })()}

      <div class="card dlcard">
        <h3><span class="badge dl">DARTSLIVE</span>　ダーツライブの記録</h3>
        ${shots.length
          ? `<div class="thumbs">${shots.map(id => `<span class="th"><img id="th-${id}" alt="スクリーンショット" onclick="viewShot('${id}')"><button class="x" onclick="delShot('${ds}','${id}')">×</button></span>`).join('')}</div>`
          : '<div class="sub">スクリーンショットはまだありません</div>'}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          <button class="btn small" onclick="document.getElementById('shotin').click()">📷 スクショ追加</button>
          <button class="btn small" onclick="ocrDay('${ds}',this)">🔍 画像から読み取る</button>
          <button class="btn small" onclick="openDLForm('${ds}',null)">✏️ 手動で入力</button>
        </div>
        <input type="file" id="shotin" accept="image/*" multiple style="display:none" onchange="addShot('${ds}',this)">
        ${Object.keys(dlAw).length ? `<div class="chips" style="margin-top:10px">${COUNTERS.filter(c => dlAw[c.k] > 0).map(c => `<span>${escHtml(c.label)} ×${dlAw[c.k]}</span>`).join('')}</div>` : ''}
        ${e.dl && e.dl.bulls ? `<div class="sub" style="margin-top:8px">ブル: S-BULL ${e.dl.bulls.sb || 0}本 / D-BULL ${e.dl.bulls.db || 0}本</div>` : ''}
        ${e.dl && e.dl.cu ? `<div class="sub" style="margin-top:4px">カウントアップ: 最高 ${e.dl.cu.best != null ? e.dl.cu.best : '—'} / 最低 ${e.dl.cu.min != null ? e.dl.cu.min : '—'}</div>` : ''}
        ${e.dl && e.dl.cri ? `<div class="sub" style="margin-top:4px">クリケットCU: 最高 ${e.dl.cri.best != null ? e.dl.cri.best : '—'} / 最低 ${e.dl.cri.min != null ? e.dl.cri.min : '—'}</div>` : ''}
        ${dlGames.length ? `<div class="sub" style="margin-top:4px">旧形式の取り込みスコア: ${dlGames.map(g => `${TYPE_LABEL[g.type]} ${g.total}`).join(' / ')}</div>` : ''}
        <div class="sub" style="margin-top:8px">アワードはカウンター合計に（内訳表示付き）、ブルはブル集計に、スコアはその日の最高・最低・平均に反映されます。</div>
      </div>

      <div class="card">
        <h3>アワードカウンター</h3>
        ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
      </div>

      <div class="card">
        <h3>メモ</h3>
        <textarea class="memo" placeholder="この日のメモ" oninput="memoInput('${ds}', this.value)">${escHtml(memo)}</textarea>
      </div>
    </div>
  </div>`;
  loadThumbs(ds);
}
function closeModal() { MODAL_KIND = null; $('#modal-root').innerHTML = ''; render(); }
function delGame(id, ds) {
  if (!confirm('このゲームを削除しますか？')) return;
  DB.games = DB.games.filter(g => g.id !== id);
  saveDB();
  openDay(ds);
}
function delMatch(id, ds) {
  if (!confirm('この対戦記録を削除しますか？')) return;
  const m = (DB.matches || []).find(x => x.id === id);
  if (m && m.awards) {   // カウンターに足した分も取り消す
    const d = day(ds); d.rbAwards = d.rbAwards || {};
    for (const k in m.awards) d.rbAwards[k] = Math.max(0, (d.rbAwards[k] || 0) - m.awards[k]);
  }
  DB.matches = (DB.matches || []).filter(x => x.id !== id);
  saveDB();
  openDay(ds);
}

/* ================= 設定 ================= */
function renderSet() {
  const g = DB.settings.goals;
  $('#view').innerHTML = `
  <h2>設定</h2>

  <div class="card">
    <h3>目標レーティング（DARTSLIVE基準）</h3>
    <div class="set-row"><label>目標 Rt（1.0〜18.0、0で非表示）</label>
      <input type="number" min="0" max="18" step="0.1" value="${g.targetRt || 0}" onchange="setGoal('targetRt',this.value,true)"></div>
    ${g.targetRt > 0 ? `<div class="sub" style="margin-top:8px;line-height:1.8">
      Rt.${(+g.targetRt).toFixed(1)} のボーダー目安：<br>
      ・カウントアップ 平均 ${Math.round(tgtCountup(+g.targetRt))}点（PPR ${tgtPPR(+g.targetRt).toFixed(1)}）<br>
      ・クリケットCU ${Math.round(tgtCricket(+g.targetRt))}点（MPR ${tgtMPR(+g.targetRt).toFixed(2)}）<br>
      ・ブル率 ${tgtBull(+g.targetRt).toFixed(1)}%
    </div>` : '<div class="sub" style="margin-top:6px">設定するとホームとグラフに目標ボーダーが表示されます</div>'}
  </div>

  <div class="card">
    <h3>1日の目標スコア</h3>
    <div class="set-row"><label>カウントアップ（その日のベスト）</label>
      <input type="number" min="0" value="${g.cuBest || 0}" onchange="setGoal('cuBest',this.value)"></div>
    <div class="set-row"><label>クリケットCU（その日のベスト）</label>
      <input type="number" min="0" value="${g.criBest || 0}" onchange="setGoal('criBest',this.value)"></div>
    <div class="sub" style="margin-top:6px">0 にすると目標の対象外になります</div>
  </div>

  <div class="card">
    <h3>ブルチャレンジ</h3>
    <div class="set-row"><label>目標点数</label>
      <input type="number" min="0" value="${g.bullTarget || 0}" onchange="setGoal('bullTarget',this.value)"></div>
    <div class="sub" style="margin-top:6px">ダブルブル+2 / シングルブル+1 / その他−1 の累計がこの点数に達したら達成。0 で未設定（手動終了のみ）。</div>
  </div>

  <div class="card">
    <h3>クリケチャレンジ</h3>
    <div class="set-row"><label>クリケナンバーの目標点数</label>
      <input type="number" min="0" value="${g.crkTarget || 0}" onchange="setGoal('crkTarget',this.value)"></div>
    <div class="sub" style="margin-top:6px">指定ナンバーの トリプル+3 / ダブル+2 / シングル+1 / それ以外−2 の累計がこの点数に達したら達成。0 で未設定（手動終了のみ）。</div>
  </div>

  <div class="card">
    <h3>1日の目標カウント数</h3>
    ${COUNTERS.map(c => `<div class="set-row"><label>${escHtml(c.label)}</label>
      <input type="number" min="0" value="${g.counters[c.k] || 0}" onchange="setGoalCounter('${c.k}',this.value)"></div>`).join('')}
  </div>

  <div class="card">
    <h3>本番（ダーツライブ）記録</h3>
    ${(() => {
      const L = DB.live || [];
      const e = liveEstimate();
      const list = L.length
        ? L.map((r, i) => `<div class="game-row">
            <span class="tm">${escHtml(r.date || '—')}</span>
            <span class="ty">Rt.${r.rt != null ? (+r.rt).toFixed(2) : '—'}</span>
            <span class="sc" style="font-size:13px">01 ${r.a01 != null ? r.a01 : '—'} / MPR ${r.mpr != null ? r.mpr : '—'}${(r.legs01 || []).length || (r.legscri || []).length ? ' <span class="badge dl">LEG</span>' : ''}</span>
            <button class="del" onclick="delLive(${i})">削除</button>
          </div>`).join('')
        : '<div class="sub">まだ本番記録がありません</div>';
      const status = e ? `<div class="sub" style="margin-top:8px;line-height:1.8">
        本番記録 ${e.n} / ${e.target} 件${e.n < e.target ? `（あと${e.target - e.n}件で安定）` : '（十分たまりました）'}<br>
        学習した落ち幅 −${e.avgDrop.toFixed(2)} / 本番のムラ σ≈${e.sigma.toFixed(1)}<br>
        → 本番想定 Rt.${e.down.toFixed(1)}〜${e.up.toFixed(1)}（${e.baseLabel}ベース・ホームに表示）</div>` : '';
      return list + status + `
        <button class="btn big" style="margin-top:10px;margin-bottom:0" onclick="openLiveForm(null)">＋ 本番記録を追加</button>
        <div class="sub" style="margin-top:8px">ダーツライブの成績（レーティング・01平均・クリケMPR・各LEG）を入れると、練習との差から本番想定Rt（レンジ）を算出します。スクショ読み取りも可。</div>`;
    })()}
  </div>

  <div class="card">
    <h3>ブル設定（カウントアップ）</h3>
    <div class="radio-row">
      <button class="${DB.settings.bullMode === 'fat' ? 'on' : ''}" onclick="setBull('fat')">ファットブル（50/50）</button>
      <button class="${DB.settings.bullMode === 'separate' ? 'on' : ''}" onclick="setBull('separate')">セパレート（25/50）</button>
    </div>
    <div class="sub" style="margin-top:8px">保存済みのゲームには影響しません。レーティングはファットブル基準です。</div>
  </div>

  <div class="card">
    <h3>自動カウントのルール</h3>
    <ul class="rules">
      ${COUNTERS.map(c => `<li>${escHtml(c.label)}: ${c.auto ? escHtml(c.auto) : '手動カウントのみ'}</li>`).join('')}
      <li>BLACK は自動・手動ともハットトリックにも +1 されます</li>
    </ul>
  </div>

  <div class="card">
    <h3>データ管理</h3>
    ${location.origin !== new URL(APP_HOME_URL).origin ? '<button class="btn primary big" onclick="migrateToGithub()">📦 GitHub版アプリへデータを引き継ぐ</button>' : ''}
    <button class="btn big" onclick="exportData()">📤 バックアップをダウンロード</button>
    <button class="btn big" onclick="document.getElementById('imp').click()">📥 バックアップから復元</button>
    <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="importData(this)">
    <button class="btn big danger" style="margin-bottom:0" onclick="wipeData()">🗑 全データを削除</button>
    <div class="sub" style="margin-top:8px">データはこの端末のブラウザ内に保存されています。機種変更前などにバックアップしてください。</div>
  </div>`;
}
function setGoal(k, v, dec) {
  DB.settings.goals[k] = dec ? Math.max(0, Math.min(18, parseFloat(v) || 0)) : Math.max(0, parseInt(v, 10) || 0);
  saveDB();
  if (k === 'targetRt') render();   // ボーダー表示を即更新
}
function setGoalCounter(k, v) { DB.settings.goals.counters[k] = Math.max(0, parseInt(v, 10) || 0); saveDB(); }
function setBull(m) { DB.settings.bullMode = m; saveDB(); render(); }

function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dartslog-backup-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.settings || !Array.isArray(d.games)) throw new Error('format');
      if (confirm('現在のデータをバックアップの内容で置き換えます。よろしいですか？')) {
        DB = d; saveDB(); DB = loadDB(); render();
        alert('復元しました');
      }
    } catch (e) { alert('ファイルを読み込めませんでした'); }
    inp.value = '';
  };
  r.readAsText(f);
}
function wipeData() {
  if (!confirm('すべての記録・設定を削除します。よろしいですか？')) return;
  if (!confirm('本当に削除しますか？この操作は元に戻せません。')) return;
  DB = initDB(); saveDB(); render();
}

/* ================= ダーツライブ記録（スクショ・OCR取り込み） ================= */
/* 画像は容量が大きいため localStorage ではなく IndexedDB に保存する */
let IDB = null;
function idb() {
  return new Promise((res, rej) => {
    if (IDB) return res(IDB);
    const q = indexedDB.open('dartslog', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('imgs');
    q.onsuccess = () => { IDB = q.result; res(IDB); };
    q.onerror = () => rej(q.error);
  });
}
function imgPut(id, blob) {
  return idb().then(d => new Promise((res, rej) => {
    const t = d.transaction('imgs', 'readwrite');
    t.objectStore('imgs').put(blob, id);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  }));
}
function imgGet(id) {
  return idb().then(d => new Promise((res, rej) => {
    const r = d.transaction('imgs').objectStore('imgs').get(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
function imgDel(id) {
  return idb().then(d => new Promise((res, rej) => {
    const t = d.transaction('imgs', 'readwrite');
    t.objectStore('imgs').delete(id);
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  }));
}

function shrinkImage(file) {
  // 保存容量節約のため長辺1280pxのJPEGに縮小
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sc));
      c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image load failed')); };
    img.src = url;
  });
}

async function addShot(ds, inp) {
  const files = [...inp.files];
  inp.value = '';
  if (!files.length) return;
  try {
    for (const f of files) {
      const blob = await shrinkImage(f);
      const id = 'img-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      await imgPut(id, blob);
      const d = day(ds);
      d.dlImages = d.dlImages || [];
      d.dlImages.push(id);
    }
    saveDB();
    openDay(ds);
  } catch (err) {
    alert('画像を保存できませんでした');
  }
}
async function delShot(ds, id) {
  if (!confirm('この画像を削除しますか？')) return;
  await imgDel(id).catch(() => {});
  const d = day(ds);
  d.dlImages = (d.dlImages || []).filter(x => x !== id);
  d.ocrRead = (d.ocrRead || []).filter(x => x !== id);
  saveDB();
  openDay(ds);
}
function loadThumbs(ds) {
  const e = DB.days[ds];
  if (!e || !e.dlImages) return;
  e.dlImages.forEach(async id => {
    const b = await imgGet(id).catch(() => null);
    const el = document.getElementById('th-' + id);
    if (b && el) el.src = URL.createObjectURL(b);
  });
}
async function viewShot(id) {
  const b = await imgGet(id).catch(() => null);
  if (!b) return;
  const u = URL.createObjectURL(b);
  const o = document.createElement('div');
  o.className = 'imgovl';
  o.onclick = () => { URL.revokeObjectURL(u); o.remove(); };
  o.innerHTML = `<img src="${u}" alt="スクリーンショット拡大">`;
  document.body.appendChild(o);
}

/* --- OCR（Tesseract.js を CDN から読み込み） --- */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('script load failed'));
    document.head.appendChild(s);
  });
}
const DL_OCR_MAP = [
  [/HAT\s*TRICK|ハット\s*トリック/i, 'hat'],
  [/BLACK/i, 'black'],
  [/9\s*MARK|NINE\s*MARK|９マーク|9マーク/i, 'm9'],
  [/WHITE\s*HORSE|ホワイト\s*ホース/i, 'wh'],
];
function parseDLText(text) {
  const awards = {};
  let sbull = null, dbull = null;
  for (const ln of text.split(/\n+/)) {
    for (const [re, k] of DL_OCR_MAP) {
      if (!re.test(ln)) continue;
      const m = ln.match(/[x×]\s*(\d+)/i) || ln.match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0 && n < 1000) awards[k] = n;
      }
    }
    // S-BULL / D-BULL の右の数値 = ブル数・インブル数
    const bm = ln.match(/([SD])\s*[-‐－ー]?\s*BULL\D*(\d+)/i);
    if (bm) {
      const n = parseInt(bm[2], 10);
      if (n >= 0 && n < 10000) {
        if (bm[1].toUpperCase() === 'S') sbull = n; else dbull = n;
      }
    }
  }
  return { awards, sbull, dbull, raw: text };
}
async function ocrDay(ds, btn) {
  const e = DB.days[ds];
  const all = (e && e.dlImages) || [];
  const read = (e && e.ocrRead) || [];
  const ids = all.filter(id => !read.includes(id));   // 反映済みの画像は読み直さない（重複防止）
  if (!all.length) { alert('先に「スクショ追加」で画像を登録してください'); return; }
  if (!ids.length) { alert('すべての画像は読み取り・反映済みです。\n新しいスクショを追加してから読み取ってください。'); return; }
  const orig = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = '読み取り中…（初回は時間がかかります）';
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const worker = await Tesseract.createWorker('eng+jpn');
    let text = '';
    for (const id of ids) {
      const b = await imgGet(id).catch(() => null);
      if (b) {
        const r = await worker.recognize(b);
        text += '\n' + r.data.text;
      }
    }
    await worker.terminate();
    const parsed = parseDLText(text);
    parsed.imgIds = ids;
    openDLForm(ds, parsed);
  } catch (err) {
    alert('読み取りに失敗しました（オフラインの可能性があります）。手動入力をご利用ください。');
    btn.disabled = false;
    btn.textContent = orig;
  }
}

/* --- 取り込みフォーム --- */
let OCR_PENDING = null;  // 今回の読み取りに使った画像ID（「反映」した時だけ既読にする）
function openDLForm(ds, parsed) {
  MODAL_KIND = 'dlform';
  OCR_PENDING = (parsed && parsed.imgIds) || null;
  const e = DB.days[ds] || {};
  const cur = (e.dl && e.dl.awards) || {};
  const curB = (e.dl && e.dl.bulls) || {};
  const curCu = (e.dl && e.dl.cu) || {};
  const curCri = (e.dl && e.dl.cri) || {};
  const pre = (parsed && parsed.awards) || {};
  const v = x => (x != null ? x : '');
  $('#modal-root').innerHTML = `
  <div class="ovl">
    <div class="modal">
      <div class="modal-head"><span class="ttl">DARTSLIVE記録の入力（${fmtDate(ds)}）</span><button onclick="cancelDLForm('${ds}')">キャンセル</button></div>
      ${parsed ? '<div class="sub" style="margin-bottom:10px">⚠ 自動読み取りの結果です。<b>必ず実際の記録と見比べて修正</b>してから反映してください。読み取れた項目は既存の値を置き換えています。</div>' : ''}
      <div class="card">
        <h3>アワード（この日のダーツライブでの回数）</h3>
        ${COUNTERS.map(c => `<div class="set-row"><label>${escHtml(c.label)}</label>
          <input type="number" min="0" id="dl_${c.k}" value="${pre[c.k] != null ? pre[c.k] : (cur[c.k] || 0)}"></div>`).join('')}
      </div>
      <div class="card">
        <h3>ブル（S-BULL / D-BULL の本数）</h3>
        <div class="set-row"><label>S-BULL（アウトブル）</label>
          <input type="number" min="0" id="dl_sb" value="${parsed && parsed.sbull != null ? parsed.sbull : (curB.sb || 0)}"></div>
        <div class="set-row"><label>D-BULL（インブル）</label>
          <input type="number" min="0" id="dl_db" value="${parsed && parsed.dbull != null ? parsed.dbull : (curB.db || 0)}"></div>
        <div class="sub" style="margin-top:6px">履歴のブル数（S+D）・インブル数（D）に加算されます。</div>
      </div>
      <div class="card">
        <h3>カウントアップ（手動入力のみ）</h3>
        <div class="set-row"><label>最高得点</label><input type="number" min="0" id="dl_cu_best" value="${v(curCu.best)}" placeholder="—"></div>
        <div class="set-row"><label>最低得点</label><input type="number" min="0" id="dl_cu_min" value="${v(curCu.min)}" placeholder="—"></div>
      </div>
      <div class="card">
        <h3>クリケットCU（手動入力のみ）</h3>
        <div class="set-row"><label>最高得点</label><input type="number" min="0" id="dl_cri_best" value="${v(curCri.best)}" placeholder="—"></div>
        <div class="set-row"><label>最低得点</label><input type="number" min="0" id="dl_cri_min" value="${v(curCri.min)}" placeholder="—"></div>
        <div class="sub" style="margin-top:6px">スコアは画像からは入力されません。最高・最低はその日の最高/最低に反映され、それぞれ1ゲーム分として平均の計算にも含まれます。</div>
      </div>
      ${parsed && parsed.raw ? `<div class="card"><details><summary class="sub">読み取った生テキストを確認</summary><pre class="ocrtext">${escHtml(parsed.raw.trim())}</pre></details></div>` : ''}
      <div class="card">
        <button class="btn primary big" onclick="applyDLForm('${ds}')">この内容で反映する</button>
        <button class="btn big" style="margin-bottom:0" onclick="cancelDLForm('${ds}')">キャンセル</button>
        <div class="sub" style="margin-top:8px">「反映」でこの日のダーツライブ記録を上書き保存し、使った画像を読み取り済みにします（重複計上なし）。キャンセルした場合は何も変更されず、画像も未読のままです。</div>
      </div>
    </div>
  </div>`;
}
function cancelDLForm(ds) {
  OCR_PENDING = null;
  openDay(ds);
}
function applyDLForm(ds) {
  const d = day(ds);
  const num = id => {
    const el = document.getElementById(id);
    if (!el || el.value === '') return null;
    const n = parseFloat(el.value);
    return (isNaN(n) || n < 0) ? null : n;
  };
  const awards = {};
  COUNTERS.forEach(c => {
    const n = Math.round(num('dl_' + c.k) || 0);
    if (n > 0) awards[c.k] = n;
  });
  const dl = { awards };
  const sb = Math.round(num('dl_sb') || 0), db = Math.round(num('dl_db') || 0);
  if (sb > 0 || db > 0) dl.bulls = { sb, db };
  const rec = p => {
    const best = num('dl_' + p + '_best'), min = num('dl_' + p + '_min');
    return (best != null || min != null) ? { best, min } : null;
  };
  const cu = rec('cu'); if (cu) dl.cu = cu;
  const cri = rec('cri'); if (cri) dl.cri = cri;
  d.dl = dl;
  // 旧形式（スコアをゲームとして取り込み）のデータが残っていれば除去
  DB.games = DB.games.filter(g => !(g.date === ds && g.src === 'dl'));
  // 読み取りに使った画像を既読にする（反映した時だけ）
  if (OCR_PENDING) {
    d.ocrRead = [...new Set([...(d.ocrRead || []), ...OCR_PENDING])];
    OCR_PENDING = null;
  }
  saveDB();
  openDay(ds);
}

/* ================= 本番記録の入力（設定） ================= */
function openLiveForm(idx) {
  MODAL_KIND = 'live';
  const L = DB.live || [];
  const r = (idx != null && L[idx]) ? L[idx] : {};
  const v = x => (x != null && x !== '') ? x : '';
  const legs = a => (a || []).join(', ');
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">本番記録の${idx != null ? '編集' : '追加'}</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <button class="btn small" id="live-ocr-btn" onclick="document.getElementById('liveshot').click()">📷 スクショから読み取る（DATA画面）</button>
        <input type="file" id="liveshot" accept="image/*" style="display:none" onchange="ocrLiveShot(this)">
        <div id="lf-ocrnote" class="sub" style="display:none;margin-top:8px;color:var(--yel)">⚠ 読み取り結果です。実際の値と見比べて修正してください（LEG明細は手入力）。</div>
      </div>
      <div class="card">
        <div class="set-row"><label>日付</label><input type="date" id="lf-date" class="dateinput" style="width:150px" value="${v(r.date) || todayStr()}"></div>
        <div class="set-row"><label>本番レーティング</label><input type="number" step="0.01" id="lf-rt" value="${v(r.rt)}" placeholder="8.98"></div>
        <div class="set-row"><label>01平均（1ラウンド）</label><input type="number" step="0.01" id="lf-01" value="${v(r.a01)}" placeholder="77.21"></div>
        <div class="set-row"><label>クリケMPR平均</label><input type="number" step="0.01" id="lf-mpr" value="${v(r.mpr)}" placeholder="2.40"></div>
        <div class="sub" style="margin-top:6px">80%STATS の値で統一して入力してください。</div>
      </div>
      <div class="card">
        <h3>各LEG明細（ブレ幅用・任意）</h3>
        <label class="sub">01（701）各LEGの自分のスタッツ（カンマ区切り）
          <textarea class="memo" id="lf-legs01" placeholder="91.14, 72.63, 97.75, 74.5, 48.5">${escHtml(legs(r.legs01))}</textarea>
        </label>
        <label class="sub" style="display:block;margin-top:8px">Cricket 各LEGの自分のMPR（カンマ区切り）
          <textarea class="memo" id="lf-legscri" placeholder="1.25, 2.2, 2.63, 2.5">${escHtml(legs(r.legscri))}</textarea>
        </label>
        <div class="sub" style="margin-top:6px">ゲームリザルトの各LEGの数値を入れると、本番でのムラ（下振れ・上振れ幅）を算出します。</div>
      </div>
      <div class="card">
        <button class="btn primary big" onclick="saveLiveForm(${idx != null ? idx : 'null'})">保存する</button>
        <button class="btn big ${idx != null ? '' : 'danger'}" style="margin-bottom:0" onclick="${idx != null ? `delLive(${idx})` : 'closeModal()'}">${idx != null ? '🗑 この記録を削除' : 'キャンセル'}</button>
      </div>
    </div>
  </div>`;
}
function numOrNull(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const n = parseFloat(el.value);
  return isNaN(n) ? null : n;
}
function saveLiveForm(idx) {
  const rec = {
    date: document.getElementById('lf-date').value || todayStr(),
    rt: numOrNull('lf-rt'),
    a01: numOrNull('lf-01'),
    mpr: numOrNull('lf-mpr'),
    legs01: parseNumList(document.getElementById('lf-legs01').value),
    legscri: parseNumList(document.getElementById('lf-legscri').value),
  };
  if (rec.rt == null) { alert('本番レーティングを入力してください'); return; }
  DB.live = DB.live || [];
  if (idx != null) DB.live[idx] = rec; else DB.live.push(rec);
  DB.live.sort((a, b) => (a.date < b.date ? 1 : -1));
  saveDB();
  closeModal();
}
function delLive(idx) {
  if (!confirm('この本番記録を削除しますか？')) return;
  DB.live.splice(idx, 1);
  saveDB();
  closeModal();
}
function parseLiveText(text) {
  const decs = (text.match(/\d{1,3}\.\d{1,2}/g) || []).map(Number);
  const out = {};
  const rtC = decs.filter(n => n >= 1 && n <= 18);
  if (rtC.length) out.rt = rtC[0];
  const a01C = decs.filter(n => n >= 40 && n <= 140);
  if (a01C.length) out.a01 = a01C[0];
  const mprC = decs.filter(n => n >= 0.5 && n <= 6 && n !== out.rt);
  if (mprC.length) out.mpr = mprC[0];
  return out;
}
async function ocrLiveShot(inp) {
  const f = inp.files[0]; inp.value = '';
  if (!f) return;
  const btn = document.getElementById('live-ocr-btn');
  const orig = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = '読み取り中…（初回は時間がかかります）'; }
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const worker = await Tesseract.createWorker('eng');
    const res = await worker.recognize(f);
    await worker.terminate();
    const p = parseLiveText(res.data.text);
    if (p.rt != null && document.getElementById('lf-rt')) document.getElementById('lf-rt').value = p.rt;
    if (p.a01 != null && document.getElementById('lf-01')) document.getElementById('lf-01').value = p.a01;
    if (p.mpr != null && document.getElementById('lf-mpr')) document.getElementById('lf-mpr').value = p.mpr;
    const note = document.getElementById('lf-ocrnote'); if (note) note.style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  } catch (e) {
    alert('読み取りに失敗しました。手入力してください。');
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

/* ================= 旧アプリからのデータ引き継ぎ ================= */
const APP_HOME_URL = 'https://danksy2045.github.io/dartslog-6t157pir/';

function migrateToGithub() {
  try {
    // 記録データをURLに載せてGitHub版を開く（画像以外すべて引き継がれる）
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(DB))));
    location.href = APP_HOME_URL + '#import=' + payload;
  } catch (e) { alert('データの変換に失敗しました'); }
}

function checkImportHash() {
  if (!location.hash.startsWith('#import=')) return;
  let d = null;
  try {
    d = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(8)))));
    if (!d.settings || !Array.isArray(d.games)) throw new Error('format');
  } catch (e) {
    history.replaceState(null, '', location.pathname + location.search);
    alert('引き継ぎデータを読み込めませんでした');
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  if (confirm(`旧アプリのデータ（${d.games.length}ゲーム分）を取り込みますか？\nこのアプリに今あるデータは上書きされます。`)) {
    DB = d;
    saveDB();
    DB = loadDB();
    render();
    alert('引き継ぎが完了しました！');
  }
}

/* ================= ROBOT（CPU）対戦 ================= */
const RB_NUMS = [20, 19, 18, 17, 16, 15, 25];                                  // クリケット対象（25=BULL）
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
let RB = null;        // 対戦状態
let RB_TIMER = null;  // CPU演出用タイマー

function rbClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function neighborOf(n) {
  const i = BOARD_ORDER.indexOf(n);
  if (i < 0) return 1;
  return BOARD_ORDER[(i + (Math.random() < 0.5 ? -1 : 1) + 20) % 20];
}
function rbOutRule() { return DB.settings.outRule === 'double' ? 'double' : 'open'; }
function rbRobotRt() { return +DB.settings.robotRt || 8; }
function rb01Pts(d) { return d.seg === 25 ? 50 : d.seg * d.mult; }             // 対戦01はファットブル
function rbLabel(d) {
  if (!d || d.seg === 0) return 'MISS';
  if (d.seg === 25) return d.mult === 2 ? 'D-BULL' : 'BULL';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S') + d.seg;
}

/* --- CPU の1投シミュレーション（レーティング→期待値を逆算して確率を解く） --- */
function cpuThrowTriple(rt, n) {
  const E = tgtPPR(rt) / 3;                                   // 1投の期待値
  const pT = rbClamp(0.03 + 0.027 * rt, 0.02, 0.55);
  const pMiss = rbClamp(0.25 - 0.012 * rt, 0.02, 0.25);
  const rest = Math.max(0, 1 - pT - pMiss);
  const pS = rbClamp((E - 60 * pT - 3 * rest) / 17, 0, rest); // 期待値が合うよう配分
  const x = Math.random();
  if (x < pT) return { seg: n, mult: 3 };
  if (x < pT + pS) return { seg: n, mult: 1 };
  if (x < pT + rest) return { seg: neighborOf(n), mult: 1 };
  return { seg: 0, mult: 0 };
}
function cpuThrowSingle(rt, n) {
  if (Math.random() < rbClamp(0.30 + 0.032 * rt, 0.25, 0.88)) return { seg: n, mult: 1 };
  const x = Math.random();
  if (x < 0.10) return { seg: n, mult: 2 };
  if (x < 0.16) return { seg: n, mult: 3 };
  if (x < 0.75) return { seg: neighborOf(n), mult: 1 };
  return { seg: 0, mult: 0 };
}
function cpuThrowDoubleAt(rt, n) {
  if (Math.random() < rbClamp(0.02 + 0.022 * rt, 0.02, 0.42)) return { seg: n, mult: 2 };
  const x = Math.random();
  if (x < 0.45) return { seg: n, mult: 1 };
  if (x < 0.72) return { seg: neighborOf(n), mult: 1 };
  return { seg: 0, mult: 0 };
}
function cpuThrowBull(rt) {
  const pD = rbClamp(0.02 + 0.018 * rt, 0.01, 0.35);
  const pS = rbClamp(0.10 + 0.030 * rt, 0.10, 0.55);
  const x = Math.random();
  if (x < pD) return { seg: 25, mult: 2 };
  if (x < pD + pS) return { seg: 25, mult: 1 };
  if (x < pD + pS + 0.28) return { seg: [20, 3, 19, 17, 1, 7][Math.floor(Math.random() * 6)], mult: 1 };
  return { seg: 0, mult: 0 };
}
/* 上がり目（CPUの狙い / 自分へのヒント表示にも使う） */
function pick01Aim(remain, rule) {
  if (rule === 'double') {
    if (remain === 50) return { kind: 'BULL' };
    if (remain <= 40 && remain % 2 === 0) return { kind: 'D', n: remain / 2 };
    for (const leave of [40, 32, 24, 16, 8]) {
      const need = remain - leave;
      if (need >= 1 && need <= 20) return { kind: 'S', n: need };
      if (need >= 21 && need <= 60 && need % 3 === 0) return { kind: 'T', n: need / 3 };
    }
    return { kind: 'T', n: 20 };
  }
  if (remain <= 20) return { kind: 'S', n: remain };
  if (remain === 50) return { kind: 'BULL' };
  if (remain <= 40 && remain % 2 === 0) return { kind: 'D', n: remain / 2 };
  if (remain <= 60 && remain % 3 === 0) return { kind: 'T', n: remain / 3 };
  if (remain < 60) {
    for (const leave of [20, 40, 16, 32]) {
      const need = remain - leave;
      if (need >= 1 && need <= 20) return { kind: 'S', n: need };
    }
    return { kind: 'S', n: 20 };
  }
  return { kind: 'T', n: 20 };
}
function aimText(a) { return a.kind === 'BULL' ? 'BULL' : a.kind + a.n; }
function cpuNext01(c) {
  const rt = RB.cpuRt, a = pick01Aim(c.cpuRemain, rbOutRule());
  if (a.kind === 'BULL') return cpuThrowBull(rt);
  if (a.kind === 'D') return cpuThrowDoubleAt(rt, a.n);
  if (a.kind === 'S') return cpuThrowSingle(rt, a.n);
  return cpuThrowTriple(rt, a.n);
}
function cpuCricketAim(c) {
  for (const n of RB_NUMS) if ((c.cpuMarks[n] || 0) < 3) return n;   // 未クローズの高い順
  for (const n of RB_NUMS) if ((c.myMarks[n] || 0) < 3) return n;    // 全閉じ後は得点稼ぎ
  return 20;
}
function cpuNextCricket(c) {
  const rt = RB.cpuRt, n = cpuCricketAim(c), m = tgtMPR(rt) / 3;   // 1投の期待マーク
  if (n === 25) {
    const pD = rbClamp(m / 4, 0.01, 0.35);
    const pS = rbClamp(m - 2 * pD, 0, Math.max(0, 1 - pD));
    const x = Math.random();
    if (x < pD) return { seg: 25, mult: 2 };
    if (x < pD + pS) return { seg: 25, mult: 1 };
    return { seg: [20, 3, 19, 17][Math.floor(Math.random() * 4)], mult: 1 };
  }
  // 期待マークが目標と一致するよう T/D/S を配分（T で超える場合は T 自体を下げる）
  let pT = rbClamp(0.02 + 0.025 * rt, 0.01, 0.50), pD = 0, pS = 0;
  const need = m - 3 * pT;
  if (need <= 0) pT = rbClamp(m / 3, 0.01, 1);
  else { pD = Math.min(0.08, need / 2); pS = rbClamp(need - 2 * pD, 0, Math.max(0, 1 - pT - pD)); }
  const x = Math.random();
  if (x < pT) return { seg: n, mult: 3 };
  if (x < pT + pD) return { seg: n, mult: 2 };
  if (x < pT + pD + pS) return { seg: n, mult: 1 };
  return { seg: neighborOf(n), mult: 1 };
}

/* --- 対戦の進行 --- */
function setRobotRt(v) { DB.settings.robotRt = rbClamp(parseFloat(v) || 8, 1, 18); saveDB(); render(); }
function setOutRule(r) { DB.settings.outRule = r; saveDB(); render(); }
function openRobot() { RB = null; PAGE = 'robot'; render(); }
function rbExit() {
  if (RB && RB.stage === 'play' && !confirm('対戦を中止しますか？（記録は残りません）')) return;
  clearTimeout(RB_TIMER); RB = null; PAGE = 'robot'; render();
}
function rbChoose(mode) {
  RB = { mode, cpuRt: rbRobotRt(), start: 701, wins: { me: 0, cpu: 0 }, legs: [], legIdx: 0, stage: 'sel', awards: {} };
  if (mode === 'cricket') { RB.stage = 'cork'; RB.cork = null; RB.corkKind = null; }
  render();
}
function rbSet01(start) { RB.start = start; RB.stage = 'cork'; RB.cork = null; RB.corkKind = null; render(); }
// メドレー構成: 01 → クリケット → 01
function rbLegType(i) { return RB.mode === 'medley' ? (i === 1 ? 'cricket' : '01') : (RB.mode === '01' ? '01' : 'cricket'); }

/* コーク: 種別（インナー/アウター/外し）＋ビット距離で比較。距離が近い方が先攻 */
const CORK_MAX = [3, 5, 12];   // 各種別で入力できるビット距離の目安上限
function corkKindLabel(k) { return k === 0 ? 'インナーブル' : k === 1 ? 'アウターブル' : '外し'; }
function corkDistLabel(k) { return k === 0 ? 'センタービットから' : k === 1 ? 'インブルラインから' : 'アウターブルラインから'; }
function corkText(t) { return `${corkKindLabel(t.kind)} ${t.bits}ビット`; }
function corkCmp(a, b) { return a.kind !== b.kind ? a.kind - b.kind : a.bits - b.bits; }  // 小さいほど良い
function cpuCorkThrow(rt) {
  const pIn = rbClamp(0.02 + 0.018 * rt, 0.01, 0.35);
  const pOut = rbClamp(0.10 + 0.030 * rt, 0.10, 0.55);
  const x = Math.random();
  const kind = x < pIn ? 0 : x < pIn + pOut ? 1 : 2;
  // レーティングが高いほど中心寄り（分布を 0 側へ強く歪ませる）
  const bits = Math.floor(Math.pow(Math.random(), 1 + rt / 6) * (CORK_MAX[kind] + 1));
  return { kind, bits };
}
function rbCorkKind(k) { RB.corkKind = k; render(); }
function rbCorkBits(bits) {
  const me = { kind: RB.corkKind, bits };
  const cpu = cpuCorkThrow(RB.cpuRt);
  const d = corkCmp(me, cpu);
  RB.cork = { me, cpu, tie: d === 0, winner: d === 0 ? null : (d < 0 ? 'me' : 'cpu') };
  RB.corkKind = null;
  render();
}
function rbCorkRetry() { RB.cork = null; RB.corkKind = null; render(); }
function rbStartMatch() {
  RB.first = RB.cork.winner;
  rbStartLeg();
}
function rbStartLeg() {
  const type = rbLegType(RB.legIdx);
  const marks = {}; RB_NUMS.forEach(n => { marks[n] = 0; });
  RB.cur = {
    type, start: RB.start,
    myRemain: RB.start, cpuRemain: RB.start,
    myMarks: { ...marks }, cpuMarks: { ...marks }, myScore: 0, cpuScore: 0,
    round: 1, first: RB.first, turn: RB.first,
    myDarts: [], cpuDarts: [], turnStart: RB.start,
    myRounds: 0, myScored: 0, turnScored: 0, myMarkCount: 0, myDartCount: 0,
    cpuTurnStart: RB.start, log: [], awards: {},
    over: false, winner: null, bust: false, msg: '',
  };
  RB.stage = 'play';
  render();
  if (RB.cur.turn === 'cpu') rbCpuTurn();
}

/* ラウンド履歴の記録（終わったラウンドのスコアと、どのナンバーに入ったか） */
function rbLogTurn(c, who) {
  const darts = who === 'me' ? c.myDarts : c.cpuDarts;
  if (!darts || !darts.length) return;
  let pts;
  if (c.type === '01') pts = who === 'me' ? c.turnScored : Math.max(0, c.cpuTurnStart - c.cpuRemain);
  else pts = darts.reduce((s, d) => s + (RB_NUMS.includes(d.seg) ? d.mult : 0), 0);
  c.log.push({
    r: c.round, who, labels: darts.map(rbLabel), pts,
    bust: c.type === '01' && pts === 0 && darts.length === 3 && c.bust,
    remain: c.type === '01' ? (who === 'me' ? c.myRemain : c.cpuRemain) : (who === 'me' ? c.myScore : c.cpuScore),
  });
}
/* 自分のラウンドからアワードを自動判定して蓄積（ROBOT対戦分もカウンターへ） */
function rbCollectAwards(c) {
  if (!c.myDarts || c.myDarts.length < 3) return;
  const a = detectAwards(c.myDarts, c.type === 'cricket' ? 'cri' : 'cu');
  for (const k in a) c.awards[k] = (c.awards[k] || 0) + a[k];
}

/* 自分の1投 */
function rbHit(seg, mult) {
  const c = RB && RB.cur;
  if (!c || c.over || c.turn !== 'me' || c.myDarts.length >= 3) return;
  const d = { seg, mult };
  RB.flash = { seg, mult };
  c.myDarts.push(d); c.myDartCount++;
  if (c.type === '01') {
    const rule = rbOutRule(), pts = rb01Pts(d), after = c.myRemain - pts;
    const isDbl = d.mult === 2;
    let bust = false, fin = false;
    if (after < 0) bust = true;
    else if (after === 0) { if (rule === 'double' && !isDbl) bust = true; else fin = true; }
    else if (after === 1 && rule === 'double') bust = true;
    if (bust) {
      c.myRemain = c.turnStart; c.myScored -= c.turnScored; c.turnScored = 0;   // このターン分は無効
      c.bust = true; c.msg = 'BUST!';
      render(); RB_TIMER = setTimeout(() => rbEndTurn('me'), 900); return;
    }
    c.myRemain = after; c.myScored += pts; c.turnScored += pts;
    if (fin) { c.over = true; c.winner = 'me'; render(); RB_TIMER = setTimeout(rbFinishLeg, 700); return; }
  } else {
    c.myMarkCount += rbApplyCricket(c, 'me', d);
    if (rbCricketWin(c, 'me')) { c.over = true; c.winner = 'me'; render(); RB_TIMER = setTimeout(rbFinishLeg, 700); return; }
  }
  if (c.myDarts.length >= 3) { render(); RB_TIMER = setTimeout(() => rbEndTurn('me'), 600); return; }
  render();
}
function rbUndo() {
  const c = RB && RB.cur;
  if (!c || c.over || c.turn !== 'me' || !c.myDarts.length) return;
  const d = c.myDarts.pop(); c.myDartCount--;
  if (c.type === '01') { const p = rb01Pts(d); c.myRemain += p; c.myScored -= p; c.turnScored -= p; }
  else { rbUndoCricket(c, 'me', d); }
  render();
}
/* クリケットのマーク適用（戻り値=獲得マーク数）。巻き戻せるよう内訳をダーツに記録する */
function rbApplyCricket(c, who, d) {
  const n = d.seg;
  d.used = 0; d.pts = 0;
  if (!RB_NUMS.includes(n)) return 0;
  const mine = who === 'me' ? c.myMarks : c.cpuMarks;
  const opp = who === 'me' ? c.cpuMarks : c.myMarks;
  const marks = d.mult;
  const used = Math.min(marks, Math.max(0, 3 - (mine[n] || 0)));
  mine[n] = (mine[n] || 0) + used;
  d.used = used;
  const excess = marks - used;
  if (excess > 0 && (opp[n] || 0) < 3) {
    d.pts = (n === 25 ? 25 : n) * excess;
    if (who === 'me') c.myScore += d.pts; else c.cpuScore += d.pts;
  }
  return marks;
}
function rbUndoCricket(c, who, d) {
  const n = d.seg;
  if (!RB_NUMS.includes(n)) return;
  const mine = who === 'me' ? c.myMarks : c.cpuMarks;
  mine[n] = Math.max(0, (mine[n] || 0) - (d.used || 0));
  if (d.pts) { if (who === 'me') c.myScore -= d.pts; else c.cpuScore -= d.pts; }
  if (who === 'me') c.myMarkCount -= d.mult;
}
function rbCricketWin(c, who) {
  const m = who === 'me' ? c.myMarks : c.cpuMarks;
  if (!RB_NUMS.every(n => (m[n] || 0) >= 3)) return false;
  return (who === 'me' ? c.myScore : c.cpuScore) >= (who === 'me' ? c.cpuScore : c.myScore);
}

/* CPUのターン（0.5秒間隔で1投ずつ） */
function rbCpuTurn() {
  const c = RB && RB.cur;
  if (!c || c.over) return;
  c.cpuDarts = []; c.msg = '';
  const turnStart = c.cpuRemain;
  c.cpuTurnStart = turnStart;
  let i = 0;
  const step = () => {
    if (!RB || RB.cur !== c || c.over) return;
    const d = c.type === '01' ? cpuNext01(c) : cpuNextCricket(c);
    c.cpuDarts.push(d);
    if (c.type === '01') {
      const rule = rbOutRule(), after = c.cpuRemain - rb01Pts(d);
      let bust = false, fin = false;
      if (after < 0) bust = true;
      else if (after === 0) { if (rule === 'double' && d.mult !== 2) bust = true; else fin = true; }
      else if (after === 1 && rule === 'double') bust = true;
      if (bust) {
        c.cpuRemain = turnStart; c.msg = 'ROBOT BUST!';
        render(); RB_TIMER = setTimeout(() => rbEndTurn('cpu'), 900); return;
      }
      c.cpuRemain = after;
      if (fin) { c.over = true; c.winner = 'cpu'; render(); RB_TIMER = setTimeout(rbFinishLeg, 900); return; }
    } else {
      rbApplyCricket(c, 'cpu', d);
      if (rbCricketWin(c, 'cpu')) { c.over = true; c.winner = 'cpu'; render(); RB_TIMER = setTimeout(rbFinishLeg, 900); return; }
    }
    render();
    i++;
    RB_TIMER = setTimeout(i < 3 ? step : () => rbEndTurn('cpu'), i < 3 ? 550 : 700);
  };
  RB_TIMER = setTimeout(step, 500);
}
function rbEndTurn(who) {
  const c = RB && RB.cur;
  if (!c || c.over) return;
  rbLogTurn(c, who);
  if (who === 'me') { rbCollectAwards(c); c.myRounds++; c.myDarts = []; } else { c.cpuDarts = []; }
  c.bust = false; c.msg = '';
  const other = who === 'me' ? 'cpu' : 'me';
  if (who === c.first) { c.turn = other; }
  else {
    c.round++; c.turn = c.first;
    if (c.round > 15) {   // 15R打ち切り
      if (c.type === '01') c.winner = c.myRemain < c.cpuRemain ? 'me' : c.cpuRemain < c.myRemain ? 'cpu' : 'draw';
      else c.winner = c.myScore > c.cpuScore ? 'me' : c.cpuScore > c.myScore ? 'cpu' : 'draw';
      c.over = true; render(); RB_TIMER = setTimeout(rbFinishLeg, 700); return;
    }
  }
  if (c.turn === 'me') { c.turnStart = c.myRemain; c.turnScored = 0; }
  render();
  if (c.turn === 'cpu') rbCpuTurn();
}
function rbFinishLeg() {
  const c = RB.cur;
  // 決着したターン（途中で上がった側）も履歴・アワードに残す
  if (c.myDarts && c.myDarts.length) { rbLogTurn(c, 'me'); rbCollectAwards(c); c.myDarts = []; }
  if (c.cpuDarts && c.cpuDarts.length) { rbLogTurn(c, 'cpu'); c.cpuDarts = []; }
  const rounds = Math.max(1, (c.myDartCount || 3) / 3);   // 投数ベース（上がりターンや端数も正しく反映）
  RB.legs.push({
    type: c.type, start: c.start, winner: c.winner,
    myRemain: c.myRemain, cpuRemain: c.cpuRemain, myScore: c.myScore, cpuScore: c.cpuScore,
    myPPR: c.type === '01' ? +(c.myScored / rounds).toFixed(2) : null,
    myMPR: c.type === 'cricket' ? +(c.myMarkCount / rounds).toFixed(2) : null,
    rounds: c.round, awards: { ...c.awards }, log: c.log,
  });
  for (const k in c.awards) RB.awards[k] = (RB.awards[k] || 0) + c.awards[k];
  if (c.winner === 'me') RB.wins.me++; else if (c.winner === 'cpu') RB.wins.cpu++;
  const need = RB.mode === 'medley' ? 2 : 1;
  RB.legIdx++;
  if (RB.wins.me >= need || RB.wins.cpu >= need || RB.legIdx >= (RB.mode === 'medley' ? 3 : 1)) {
    RB.stage = 'end';
    RB.result = RB.wins.me > RB.wins.cpu ? 'win' : RB.wins.cpu > RB.wins.me ? 'lose' : 'draw';
    rbSaveMatch();
  } else {
    RB.first = c.winner === 'me' ? 'cpu' : 'me';   // 次レッグは敗者が先攻
    RB.stage = 'legend';
  }
  render();
}
function rbSaveMatch() {
  const legs = RB.legs;
  const ppr = legs.filter(l => l.myPPR != null).map(l => l.myPPR);
  const mpr = legs.filter(l => l.myMPR != null).map(l => l.myMPR);
  DB.matches = DB.matches || [];
  DB.matches.push({
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    mode: RB.mode, cpuRt: RB.cpuRt, start: RB.start,
    result: RB.result, wins: { ...RB.wins }, legs, awards: { ...RB.awards },
    ppr: ppr.length ? +(ppr.reduce((s, x) => s + x, 0) / ppr.length).toFixed(2) : null,
    mpr: mpr.length ? +(mpr.reduce((s, x) => s + x, 0) / mpr.length).toFixed(2) : null,
  });
  // 対戦中に出たアワードをその日のカウンターへ反映
  const d = day(todayStr());
  d.rbAwards = d.rbAwards || {};
  for (const k in RB.awards) d.rbAwards[k] = (d.rbAwards[k] || 0) + RB.awards[k];
  saveDB();
}

/* --- 画面 --- */
function renderRobot() {
  const v = $('#view');
  if (!RB) return rbMenu(v);
  if (RB.stage === 'sel') return rbSel01(v);
  if (RB.stage === 'cork') return rbCorkScreen(v);
  if (RB.stage === 'play') return rbPlayScreen(v);
  if (RB.stage === 'legend') return rbLegEnd(v);
  return rbMatchEnd(v);
}
function rbMenu(v) {
  const rt = rbRobotRt(), rule = rbOutRule();
  const recent = (DB.matches || []).slice(-5).reverse();
  v.innerHTML = `
  <h2>🤖 ROBOT対戦</h2>
  <div class="card">
    <h3>ROBOTの強さ</h3>
    <div class="set-row"><label>レーティング（1.0〜18.0）</label>
      <input type="number" step="0.1" min="1" max="18" value="${rt.toFixed(1)}" onchange="setRobotRt(this.value)"></div>
    <div class="sub" style="margin-top:6px">Rt.${rt.toFixed(1)}（${flightOf(Math.floor(rt))}）相当 ／ 01: PPR ${tgtPPR(rt).toFixed(1)} ／ CRICKET: MPR ${tgtMPR(rt).toFixed(2)}</div>
  </div>
  <div class="card">
    <button class="btn primary big" onclick="rbChoose('01')">01対戦（701 / 501 / 301）</button>
    <button class="btn green big" onclick="rbChoose('cricket')">クリケット対戦（STANDARD）</button>
    <button class="btn purple big" style="margin-bottom:0" onclick="rbChoose('medley')">メドレー対戦（3レッグ）</button>
  </div>
  <div class="card">
    <h3>01のアウトルール</h3>
    <div class="radio-row">
      <button class="${rule === 'open' ? 'on' : ''}" onclick="setOutRule('open')">オープンアウト</button>
      <button class="${rule === 'double' ? 'on' : ''}" onclick="setOutRule('double')">ダブルアウト</button>
    </div>
    <div class="sub" style="margin-top:8px">15ラウンド打ち切り。ブルはファットブル（50点）。</div>
  </div>
  ${recent.length ? `<div class="card"><h3>最近の対戦</h3>
    ${recent.map(m => `<div class="game-row">
      <span class="tm">${m.date.slice(5)}</span>
      <span class="ty"><span class="tybadge ${m.result === 'win' ? 'cri' : 'cu'}">${m.result === 'win' ? 'WIN' : m.result === 'lose' ? 'LOSE' : 'DRAW'}</span></span>
      <span class="sc" style="font-size:13px">${m.mode === '01' ? m.start : m.mode === 'cricket' ? 'CRICKET' : 'MEDLEY'} vs Rt.${(+m.cpuRt).toFixed(1)}　${m.wins.me}-${m.wins.cpu}</span>
    </div>`).join('')}</div>` : ''}
  <div class="card"><button class="btn big" style="margin-bottom:0" onclick="nav('home')">ホームへ戻る</button></div>`;
}
function rbSel01(v) {
  v.innerHTML = `
  <h2>${RB.mode === 'medley' ? 'メドレーの01を選択' : '01対戦'}</h2>
  <div class="card">
    ${[701, 501, 301].map(s => `<button class="btn primary big" onclick="rbSet01(${s})">${s}</button>`).join('')}
    <div class="sub" style="margin-bottom:0">${RB.mode === 'medley' ? 'LEG1とLEG3で使う01です（LEG2はクリケット）' : `アウト: ${rbOutRule() === 'double' ? 'ダブルアウト' : 'オープンアウト'} / 15R打ち切り`}</div>
  </div>
  <div class="card"><button class="btn big" style="margin-bottom:0" onclick="rbExit()">戻る</button></div>`;
}
function rbCorkScreen(v) {
  const ck = RB.cork, kind = RB.corkKind;
  let body;
  if (ck) {
    body = `
      <div class="statgrid" style="grid-template-columns:1fr 1fr">
        <div><div class="v" style="font-size:15px">${corkText(ck.me)}</div><div class="l">あなた</div></div>
        <div><div class="v" style="font-size:15px">${corkText(ck.cpu)}</div><div class="l">ROBOT</div></div>
      </div>
      ${ck.tie
        ? `<div class="bigscore" style="font-size:20px;margin-top:12px;color:var(--yel)">引き分け — 投げ直し</div>
           <button class="btn primary big" style="margin-top:12px;margin-bottom:0" onclick="rbCorkRetry()">もう一度コーク</button>`
        : `<div class="bigscore" style="font-size:24px;margin-top:12px;color:${ck.winner === 'me' ? 'var(--green)' : 'var(--red)'}">${ck.winner === 'me' ? 'あなたの先攻' : 'ROBOTの先攻'}</div>
           <button class="btn primary big" style="margin-top:12px;margin-bottom:0" onclick="rbStartMatch()">対戦開始</button>`}`;
  } else if (kind == null) {
    body = `
      <div class="sub" style="margin-bottom:10px">ブルに1投して、どこに入ったか選んでください。</div>
      <button class="btn primary big" onclick="rbCorkKind(0)">インナーブル</button>
      <button class="btn green big" onclick="rbCorkKind(1)">アウターブル</button>
      <button class="btn big" style="margin-bottom:0" onclick="rbCorkKind(2)">外し</button>`;
  } else {
    body = `
      <div class="sub" style="margin-bottom:4px">${corkKindLabel(kind)}</div>
      <div style="margin-bottom:10px">${corkDistLabel(kind)}<b>何ビット</b>離れていますか？</div>
      <div class="padgrid" style="grid-template-columns:repeat(5,1fr)">
        ${Array.from({ length: 10 }, (_, i) => `<button onclick="rbCorkBits(${i})">${i}</button>`).join('')}
      </div>
      <div class="brow" style="grid-template-columns:1fr 1fr;margin-top:8px">
        <button onclick="rbCorkBits(Math.max(0,parseInt(prompt('ビット距離を入力','10'),10)||0))">10以上を入力</button>
        <button class="undo" onclick="rbCorkKind(null)">⌫ 選び直す</button>
      </div>
      <div class="sub" style="margin-top:8px">0＝${kind === 0 ? 'センタービットど真ん中' : 'ラインぴったり'}。近いほど先攻に有利です。</div>`;
  }
  v.innerHTML = `
  <h2>コーク</h2>
  <div class="card">${body}</div>
  <div class="card"><button class="btn big" style="margin-bottom:0" onclick="rbExit()">やめる</button></div>`;
}
function rbMarkSym(n) { return n >= 3 ? '⊗' : n === 2 ? '✕' : n === 1 ? '／' : ''; }
/* 直近ラウンドの1行サマリー（相手がどこに入れたかを常に見えるように） */
function rbLastLine(c) {
  const last = w => { for (let i = c.log.length - 1; i >= 0; i--) if (c.log[i].who === w) return c.log[i]; return null; };
  const me = last('me'), cpu = last('cpu');
  if (!me && !cpu) return '';
  const fmt = (e, nm) => e ? `<span class="sub">${nm}</span> ${e.labels.join(' ')} <b>${e.bust ? 'BUST' : e.pts}</b>` : '';
  return `<div class="rblast">${cpu ? fmt(cpu, 'ROBOT前R') : ''}${cpu && me ? '<br>' : ''}${me ? fmt(me, 'あなた前R') : ''}</div>`;
}
/* ラウンド履歴（新しい順） */
function rbLogRows(c, limit) {
  if (!c.log.length) return '<div class="sub">まだラウンドがありません</div>';
  const rows = c.log.slice().reverse().slice(0, limit || 99);
  const unit = c.type === '01' ? '' : 'mk';
  return rows.map(e => `<div class="rblogrow ${e.who}">
    <span class="rr">R${e.r}</span>
    <span class="wh">${e.who === 'me' ? 'あなた' : 'ROBOT'}</span>
    <span class="dl">${e.labels.join(' ')}</span>
    <span class="pt">${e.bust ? '<span style="color:var(--red)">BUST</span>' : '+' + e.pts + unit}</span>
    <span class="rm">${c.type === '01' ? '残' + e.remain : e.remain + '点'}</span>
  </div>`).join('');
}
function rbOpenLog() {
  const c = RB && RB.cur;
  if (!c) return;
  MODAL_KIND = 'rblog';
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeRbLog()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">ラウンド履歴</span><button onclick="closeRbLog()">閉じる</button></div>
      <div class="card"><div class="rblog">${rbLogRows(c)}</div></div>
    </div>
  </div>`;
}
function closeRbLog() { MODAL_KIND = null; $('#modal-root').innerHTML = ''; render(); }
function rbPlayScreen(v) {
  const c = RB.cur, mine = c.turn === 'me';
  const fl = (seg, mult) => (RB.flash && RB.flash.seg === seg && RB.flash.mult === mult) ? ' flash' : '';
  const chips = [0, 1, 2].map(i => c.myDarts[i] ? `<span>${rbLabel(c.myDarts[i])}</span>` : '<span class="empty">・</span>').join('');
  const cpuChips = c.cpuDarts.length ? c.cpuDarts.map(d => `<span>${rbLabel(d)}</span>`).join('') : '';
  let head, pad;
  if (c.type === '01') {
    const aim = pick01Aim(c.myRemain, rbOutRule());
    head = `
      <div class="rbscore">
        <div class="${mine ? 'on' : ''}"><div class="nm">あなた</div><div class="vv">${c.myRemain}</div></div>
        <div class="rbvs">R${c.round}/15</div>
        <div class="${!mine ? 'on' : ''}"><div class="nm">ROBOT <span class="sub">Rt.${RB.cpuRt.toFixed(1)}</span></div><div class="vv">${c.cpuRemain}</div></div>
      </div>
      ${c.myRemain <= 60 || (rbOutRule() === 'double' && c.myRemain <= 110) ? `<div class="sub center">上がり目: ${aimText(aim)}</div>` : ''}`;
    pad = `<div class="mrow">
        <button class="${M === 1 ? 'on' : ''}" onclick="setM(1)">SINGLE</button>
        <button class="${M === 2 ? 'on' : ''}" onclick="setM(2)">DOUBLE</button>
        <button class="${M === 3 ? 'on' : ''}" onclick="setM(3)">TRIPLE</button>
      </div>
      <div class="padgrid">${Array.from({ length: 20 }, (_, i) => `<button class="${fl(i + 1, M)}" onclick="rbHit(${i + 1},M)">${i + 1}</button>`).join('')}</div>
      <div class="brow">
        <button class="bull" onclick="rbHit(25,1)">BULL</button>
        <button class="bull" onclick="rbHit(25,2)">D-BULL</button>
        <button onclick="rbHit(0,0)">MISS</button>
        <button class="undo" onclick="rbUndo()">⌫ 戻す</button>
      </div>`;
  } else {
    head = `
      <div class="rbscore">
        <div class="${mine ? 'on' : ''}"><div class="nm">あなた</div><div class="vv">${c.myScore}</div></div>
        <div class="rbvs">R${c.round}/15</div>
        <div class="${!mine ? 'on' : ''}"><div class="nm">ROBOT <span class="sub">Rt.${RB.cpuRt.toFixed(1)}</span></div><div class="vv">${c.cpuScore}</div></div>
      </div>
      <table class="crkboard">
        ${RB_NUMS.map(n => `<tr>
          <td class="mk ${(c.myMarks[n] || 0) >= 3 ? 'cl' : ''}">${rbMarkSym(c.myMarks[n] || 0)}</td>
          <td class="nu">${n === 25 ? 'B' : n}</td>
          <td class="mk ${(c.cpuMarks[n] || 0) >= 3 ? 'cl' : ''}">${rbMarkSym(c.cpuMarks[n] || 0)}</td>
        </tr>`).join('')}
      </table>`;
    pad = `<div class="mrow">
        <button class="${M === 1 ? 'on' : ''}" onclick="setM(1)">SINGLE</button>
        <button class="${M === 2 ? 'on' : ''}" onclick="setM(2)">DOUBLE</button>
        <button class="${M === 3 ? 'on' : ''}" onclick="setM(3)">TRIPLE</button>
      </div>
      <div class="padgrid cri">${[20, 19, 18, 17, 16, 15].map(n => `<button class="${fl(n, M)}" onclick="rbHit(${n},M)">${n}</button>`).join('')}</div>
      <div class="brow">
        <button class="bull" onclick="rbHit(25,1)">BULL</button>
        <button class="bull" onclick="rbHit(25,2)">D-BULL</button>
        <button onclick="rbHit(0,0)">その他</button>
        <button class="undo" onclick="rbUndo()">⌫ 戻す</button>
      </div>`;
  }
  RB.flash = null;
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">${RB.mode === 'medley' ? `MEDLEY LEG${RB.legIdx + 1}/3　<span class="sub">${RB.wins.me}-${RB.wins.cpu}</span>` : c.type === '01' ? `${c.start}` : 'CRICKET'}　<span class="sub">${c.type === '01' ? (rbOutRule() === 'double' ? 'ダブルアウト' : 'オープンアウト') : 'STANDARD'}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small" onclick="rbOpenLog()">📜 履歴</button>
      <button class="btn small danger" onclick="rbExit()">中止</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        ${head}
        ${c.msg ? `<div class="bigscore" style="font-size:22px;color:var(--red)">${c.msg}</div>` : ''}
        <div class="sub center" style="margin-top:6px">${mine ? 'あなたのターン' : 'ROBOTのターン…'}</div>
        <div class="dartchips">${mine ? chips : (cpuChips || '<span class="empty">・</span>')}</div>
        ${rbLastLine(c)}
      </div>
      <div class="card padwrap" style="${mine ? '' : 'opacity:.45;pointer-events:none'}">${pad}</div>
    </div>
    <div>
      <div class="card">
        <h3>ラウンド履歴</h3>
        <div class="rblog">${rbLogRows(c)}</div>
      </div>
      <div class="card">
        <h3>スコア</h3>
        <div class="sub">${c.type === '01' ? `あなた 残り${c.myRemain} / ROBOT 残り${c.cpuRemain}` : `あなた ${c.myScore}点 / ROBOT ${c.cpuScore}点`}</div>
        <div class="sub" style="margin-top:6px">ラウンド ${c.round} / 15　先攻: ${c.first === 'me' ? 'あなた' : 'ROBOT'}</div>
      </div>
    </div>
  </div>`;
}
function rbLegEnd(v) {
  const l = RB.legs[RB.legs.length - 1];
  v.innerHTML = `
  <h2>LEG${RB.legs.length} 終了</h2>
  <div class="card center">
    <div class="bigscore" style="color:${l.winner === 'me' ? 'var(--green)' : 'var(--red)'}">${l.winner === 'me' ? 'WIN' : l.winner === 'cpu' ? 'LOSE' : 'DRAW'}</div>
    <div class="sub">${l.type === '01' ? `${l.start}　あなた残り ${l.myRemain} / ROBOT残り ${l.cpuRemain}` : `CRICKET　あなた ${l.myScore} / ROBOT ${l.cpuScore}`}</div>
    <div class="sub" style="margin-top:6px">${l.myPPR != null ? `あなたのPPR ${l.myPPR}` : `あなたのMPR ${l.myMPR}`}　/　${l.rounds}R</div>
    <div class="sub" style="margin-top:8px">レッグ ${RB.wins.me} - ${RB.wins.cpu}</div>
  </div>
  <div class="card">
    <button class="btn primary big" style="margin-bottom:0" onclick="rbStartLeg()">次のLEG（${rbLegType(RB.legIdx) === '01' ? RB.start : 'CRICKET'}）へ</button>
  </div>`;
}
function rbMatchEnd(v) {
  const r = RB.result;
  v.innerHTML = `
  <h2>対戦結果</h2>
  <div class="card center">
    <h3>vs ROBOT Rt.${RB.cpuRt.toFixed(1)}</h3>
    <div class="bigscore" style="color:${r === 'win' ? 'var(--green)' : r === 'lose' ? 'var(--red)' : 'var(--tx)'}">${r === 'win' ? 'WIN' : r === 'lose' ? 'LOSE' : 'DRAW'}</div>
    <div class="sub">${RB.wins.me} - ${RB.wins.cpu}</div>
  </div>
  <div class="card">
    <h3>レッグ内訳</h3>
    ${RB.legs.map((l, i) => `<div class="game-row">
      <span class="tm">LEG${i + 1}</span>
      <span class="ty">${l.type === '01' ? l.start : 'CRICKET'}</span>
      <span class="sc" style="font-size:13px">${l.winner === 'me' ? 'WIN' : l.winner === 'cpu' ? 'LOSE' : 'DRAW'}　${l.myPPR != null ? 'PPR ' + l.myPPR : 'MPR ' + l.myMPR}</span>
    </div>`).join('')}
    <div class="sub" style="margin-top:8px">この記録は履歴に保存されます（練習レーティングには影響しません）</div>
  </div>
  <div class="card">
    <button class="btn primary big" onclick="rbChoose('${RB.mode}')">もう1試合</button>
    <button class="btn big" style="margin-bottom:0" onclick="RB=null;render()">ROBOTメニューへ</button>
  </div>`;
}

/* ================= 起動 ================= */
render();
checkImportHash();
