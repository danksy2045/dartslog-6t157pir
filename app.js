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
const TYPE_LABEL = { cu: 'カウントアップ', cri: 'クリケットCU', bull: 'ブルチャレンジ', crk: 'クリケチャレンジ', cnu: 'クリケナンバーCU', arr: 'アレンジ練習', kik: '菊池山口練習法', bul: '連続ブルチャレンジ', rck: 'ランダムクリケ' };
const CRK_NUMS = [20, 19, 18, 17, 16, 15];
// プレイ画面に並ぶゲーム（設定で個別に表示/非表示できる）
const GAME_LIST = [
  { k: 'cu', label: 'カウントアップ' },
  { k: 'cri', label: 'クリケットカウントアップ' },
  { k: 'cnu', label: 'クリケナンバーCU' },
  { k: 'arr', label: 'アレンジ練習' },
  { k: 'bull', label: 'ブルチャレンジ' },
  { k: 'crk', label: 'クリケチャレンジ' },
  { k: 'kik', label: '菊池山口練習法' },
  { k: 'bul', label: '連続ブルチャレンジ' },
  { k: 'rck', label: 'ランダムクリケチャレンジ' },
  { k: 'robot', label: 'ROBOT対戦' },
];
const WDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/* グラフの指標。先頭がグラフタブを開いたときの初期表示になる */
const METRICS = [
  { k: 'cuAvg',   label: 'カウントアップ 平均',   kind: 'line', color: '#4f8cff' },
  { k: 'rating',  label: 'レーティング推移（日別）', kind: 'line', color: '#f4b63f' },
  { k: 'bulls',   label: 'ブル数 / インブル数（1日・CU）', kind: 'line2', color: '#4f8cff' },
  { k: 'bullRate', label: 'ブル率（1日・CU）',    kind: 'line', color: '#f4b63f' },
  { k: 'firstBull', label: '1投目ブル率（1日・CU）', kind: 'line', color: '#f4b63f' },
  { k: 'firstTriple', label: '1投目トリプル率（1日・クリケットCU）', kind: 'line', color: '#3dba6f' },
  { k: 'cuBest',  label: 'カウントアップ ベスト', kind: 'line', color: '#4f8cff' },
  { k: 'ppr',     label: 'PPR（1日・CU）',        kind: 'line', color: '#4f8cff' },
  { k: 'ppd',     label: 'PPD（1日・CU）',        kind: 'line', color: '#4f8cff' },
  { k: 'criAvg',  label: 'クリケットCU 平均',     kind: 'line', color: '#3dba6f' },
  { k: 'criBest', label: 'クリケットCU ベスト',   kind: 'line', color: '#3dba6f' },
  { k: 'mpr',     label: 'MPR',                   kind: 'line', color: '#f4b63f' },
  { k: 'cnuAvg',  label: 'クリケナンバーCU 平均', kind: 'line', color: '#2ec5c5' },
  { k: 'cnuBest', label: 'クリケナンバーCU ベスト', kind: 'line', color: '#2ec5c5' },
  { k: 'cnuMpr',  label: 'クリケナンバーCU MPR',  kind: 'line', color: '#2ec5c5' },
  { k: 'cnuTriple', label: 'クリケナンバーCU トリプル率', kind: 'line', color: '#2ec5c5' },
  { k: 'arrRate', label: 'アレンジ練習 成功率',      kind: 'line', color: '#e0922e' },
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
  if (g.type === 'arr') return `${ARR_RULE_LABEL[g.rule] || ''}・3投以内 ${g.total}/${g.tries}（${g.rate}%）${g.avgDarts != null ? '・平均' + g.avgDarts + '投' : ''}`;
  if (g.type === 'kik') return `${g.done ? '完走' : '途中'}・${g.total}投${g.target > 0 ? `（目標${g.target}投${g.reached ? ' ✓' : ''}）` : ''}`;
  if (g.type === 'bul') return `連続 ${g.total}本・D-BULL${g.ibull}/S-BULL${g.sbull != null ? g.sbull : g.total - g.ibull}`;
  if (g.type === 'rck') return `MPR ${g.mpr}・${g.total}マーク`;
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
/* ================= 各ラウンドの1投目のスタッツ =================
   1投目・2投目・3投目を正確に記録し始めたゲームには保存時に ord:1 を付けている。
   それが無い過去の記録は投順が信用できないので、1投目の集計からはすべて除外する。 */
function firstDarts(g) {
  if (!g || !g.ord || !Array.isArray(g.darts)) return [];
  const out = [];
  for (let i = 0; i + 3 <= g.darts.length; i += 3) out.push(g.darts[i]);
  return out;
}
/* カウントアップ: 1投目のブル率（アウトブル・インブルの両方をブルとして数える） */
function firstBullOf(g) {
  const f = firstDarts(g);
  if (!f.length) return null;
  const hit = f.filter(d => d.seg === 25).length;
  const ib = f.filter(d => d.seg === 25 && d.mult === 2).length;
  return { n: f.length, hit, ib, gn: 1, rate: hit / f.length * 100 };
}
/* クリケットCU: 1投目のトリプル率。ブル狙いのラウンドはトリプルが無いので母数から外す */
function firstTripleOf(g) {
  const f = firstDarts(g);
  if (!f.length) return null;
  let n = 0, hit = 0;
  f.forEach((d, r) => {
    if (CRI_TGT[Math.min(r, 7)] === 25) return;
    n++;
    if (d.seg !== 25 && d.mult === 3) hit++;
  });
  return n ? { n, hit, ib: 0, gn: 1, rate: hit / n * 100 } : null;
}
function firstOf(g) { return g.type === 'cri' ? firstTripleOf(g) : firstBullOf(g); }
/* 複数ゲームの合計（対象ゲームが1つも無ければ null） */
function firstAgg(games) {
  let n = 0, hit = 0, ib = 0, gn = 0;
  games.forEach(g => {
    const s = firstOf(g);
    if (!s) return;
    gn++; n += s.n; hit += s.hit; ib += s.ib;
  });
  return n ? { n, hit, ib, gn, rate: hit / n * 100 } : null;
}

/* 1ゲームで投げたブル・トリプルの本数（1本ごとの内訳を残していないゲームは null） */
function gameHits(g) {
  if (Array.isArray(g.darts) && g.darts.length) {          // カウントアップ / クリケットCU / 各チャレンジ
    let bull = 0, ibull = 0, tri = 0;
    g.darts.forEach(d => {
      if (d.seg === 25) { bull++; if (d.mult === 2) ibull++; }
      else if (d.mult === 3) tri++;
    });
    return { bull, ibull, tri, n: g.darts.length };
  }
  if (g.type === 'bul') return { bull: g.total || 0, ibull: g.ibull || 0, tri: 0, n: g.dartCount || 0 };
  if (g.type === 'rck' && g.per) {                         // ランダムクリケはナンバー別集計から復元
    let bull = 0, ibull = 0, tri = 0, n = 0;
    for (const k in g.per) {
      const m = g.per[k];
      n += m.att || 0;
      if (+k === 25) { bull += (m.att || 0) - (m.miss || 0); ibull += m.tri || 0; }
      else tri += m.tri || 0;
    }
    return { bull, ibull, tri, n };
  }
  if (g.bulls != null) return { bull: g.bulls, ibull: g.dbulls || 0, tri: 0, n: g.dartCount || 0 };
  return null;   // アレンジ練習・菊池山口練習法など（1本ごとの内訳を保存していない）
}
/* ROBOT対戦は自分が投げた分だけをターンログのラベルから数える */
function matchHits(m) {
  let bull = 0, ibull = 0, tri = 0, n = 0;
  (m.legs || []).forEach(l => (l.log || []).forEach(t => {
    if (t.who !== 'me') return;
    (t.labels || []).forEach(s => {
      n++;
      if (s === 'D-BULL') { bull++; ibull++; }
      else if (s === 'BULL') bull++;
      else if (s.charAt(0) === 'T') tri++;
    });
  }));
  return { bull, ibull, tri, n };
}
/* 今日1日のブル数・トリプル数（ゲーム種別を問わず全ゲーム累計） */
function dayHits(ds) {
  let bull = 0, ibull = 0, tri = 0, n = 0, games = 0;
  const skip = [];
  DB.games.forEach(g => {
    if (g.date !== ds) return;
    const h = gameHits(g);
    if (!h) { if (!skip.includes(g.type)) skip.push(g.type); return; }
    bull += h.bull; ibull += h.ibull; tri += h.tri; n += h.n; games++;
  });
  (DB.matches || []).forEach(m => {
    if (m.date !== ds) return;
    const h = matchHits(m);
    bull += h.bull; ibull += h.ibull; tri += h.tri; n += h.n; games++;
  });
  // DARTSLIVE 取り込み分のブル（トリプル・投数は記録されないのでブルだけ加算）
  const rec = DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl.bulls;
  const dl = rec ? (rec.sb || 0) + (rec.db || 0) : 0;
  return { bull: bull + dl, ibull: ibull + (rec ? rec.db || 0 : 0), tri, n, games, dl, skip };
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
function tgtPPR(rt) {                                              // PPR
  return isPracticeMode() ? rtStatForRating(RT_TABLES().dl01, rt) : 5 * rt + 30;
}
function tgtCountup(rt) { return tgtPPR(rt) * 8; }                // カウントアップ平均 = PPR×8
function tgtBull(rt) { return Math.max(0, Math.min(100, (tgtPPR(rt) - 30) / 1.2)); } // ブル率% =(PPR-30)/1.2
function tgtMPR(rt) {                                              // MPR（クリケット基準の逆算）
  return isPracticeMode() ? rtStatForRating(RT_TABLES().dlCri, rt) : (rt + 4.5) / 5;
}
function tgtCricket(rt) { return rt <= 13 ? 30 * rt + 135 : 37.5 * rt + 37.5; } // クリケCUスコア（nayo-darts表）
function targetForMetric(mk, rt) {
  if (!rt) return null;
  switch (mk) {
    case 'rating': return { val: rt, label: '目標 Rt.' + rt.toFixed(1) };
    case 'cuAvg': case 'cuBest': return { val: tgtCountup(rt), label: '目標 ' + Math.round(tgtCountup(rt)) };
    case 'criAvg': case 'criBest': return { val: tgtCricket(rt), label: '目標 ' + Math.round(tgtCricket(rt)) };
    case 'mpr': return { val: tgtMPR(rt), label: '目標 ' + tgtMPR(rt).toFixed(2) };
    case 'ppr': return { val: tgtPPR(rt), label: '目標 ' + tgtPPR(rt).toFixed(2) };
    case 'ppd': return { val: tgtPPR(rt) / 3, label: '目標 ' + (tgtPPR(rt) / 3).toFixed(2) };
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
  let rt = (cu.length || cri.length) ? ratingFor(cu, cri) : null;
  if (rt == null) rt = ratingFor(pcCu(), pcCri());
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
  if (tCu.length || tCri.length) { baseRt = ratingFor(tCu, tCri); baseLabel = '今日の練習'; }
  else { baseRt = ratingFor(pcCu(), pcCri()); baseLabel = '直近の練習'; }
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

/* ================= Practice Rating（アプリ側の橋渡し） =================
   計算本体は rating.js。ここでは DB のゲーム記録を rating.js が扱う形に直し、
   画面表示用のカードを組み立てる。旧方式は設定で切り替えて残してある。 */
function RT_TABLES() { return DB.settings.ratingTables || RT_TABLES_DEFAULT; }
function prCfg() { return ratingCfg(DB.settings.rating); }
function isPracticeMode() { return DB.settings.ratingMode !== 'legacy'; }

/* ゲーム配列 → 新しい順のスタッツ配列（保存済みの値を優先、無ければその場で計算） */
function gameTime(g) { return g.ts != null ? g.ts : (g.date ? parseYmd(g.date).getTime() : 0); }
function cuStatsOf(games) {
  return games.slice().sort((a, b) => gameTime(b) - gameTime(a)).map(g => ({
    ppr: g.ppr != null ? g.ppr : cuPPR(g.total),
    ppd: g.ppd != null ? g.ppd : cuPPD(g.total),
    score: g.total, date: g.date, ts: g.ts,
  }));
}
function criStatsOf(games) {
  return games.filter(g => g.marks != null).sort((a, b) => gameTime(b) - gameTime(a)).map(g => ({
    mpr: g.mpr != null ? g.mpr : ccuMPR(g.marks),
    marks: g.marks, score: g.total, date: g.date, ts: g.ts,
  }));
}
function practiceRatingOf(cuGames, criGames) {
  return practiceRatingFrom(cuStatsOf(cuGames), criStatsOf(criGames), prCfg(), RT_TABLES());
}
/* 総合Rt の共通窓口（グラフ・本番想定・日別詳細から呼ぶ。方式切替に追従する） */
function ratingFor(cuGames, criGames) {
  if (!isPracticeMode()) return ratingInfo(cuGames, criGames).totalF;
  return practiceRatingOf(cuGames, criGames).practiceRating;
}
/* 実戦転換率: 直近の本番記録の平均スタッツ ÷ 自宅の Skill Stat */
function matchTransferNow(pr) {
  if (!pr) return null;
  const cfg = prCfg();
  const L = (DB.live || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, cfg.transferN);
  if (!L.length) return null;
  const a01 = rtMean(L.map(r => r.a01).filter(v => v != null));
  const mpr = rtMean(L.map(r => r.mpr).filter(v => v != null));
  const t = matchTransfer({ ppr: pr.dl01 ? pr.dl01.skill : null, mpr: pr.dlCri ? pr.dlCri.skill : null }, { a01, mpr });
  return t ? Object.assign({}, t, { n: L.length, a01, mpr }) : null;
}
/* 既存ゲームに ppr/ppd/mpr とラウンド別の生データを補完（1回だけ走る） */
function roundScoresOf(g) {
  const bm = DB.settings.bullMode, out = [];
  for (let i = 0; i + 3 <= g.darts.length; i += 3) {
    out.push(g.darts.slice(i, i + 3).reduce((s, d) => s + cuPoint(d, bm), 0));
  }
  return out;
}
function roundMarksOf(g) {
  const out = [];
  for (let i = 0; i + 3 <= g.darts.length; i += 3) {
    out.push(g.darts.slice(i, i + 3).reduce((s, d) => s + criMark(d), 0));
  }
  return out;
}
function migrateGameStats() {
  let dirty = false;
  DB.games.forEach(g => {
    const hasDarts = Array.isArray(g.darts) && g.darts.length >= 3;
    if (g.type === 'cu') {
      if (g.ppr == null && g.total != null) { g.ppr = cuPPR(g.total); g.ppd = cuPPD(g.total); dirty = true; }
      if (!g.rounds && hasDarts) { g.rounds = roundScoresOf(g); dirty = true; }
    } else if (g.type === 'cri') {
      if (g.marks == null && hasDarts) {                       // 旧記録のマーク数を1投ごとの記録から復元
        g.marks = g.darts.reduce((s, d) => s + criMark(d), 0);
        dirty = true;
      }
      if (g.mpr == null && g.marks != null) { g.mpr = ccuMPR(g.marks); dirty = true; }
      if (!g.roundMarks && hasDarts) { g.roundMarks = roundMarksOf(g); dirty = true; }
    }
  });
  if (dirty) saveDB();
}

/* ---- ？をタップして出す説明（ホームの指標と設定項目） ---- */
const PR_HELP = {
  ppr: 'PPR＝カウントアップの1ラウンド（3投）あたりの平均点。スコア÷8で、DARTSLIVEの01スタッツと同じ単位です。DL Practice Rating の01側はこの値で判定します。例: 584点 → 73.00。単純平均ではなく Skill Stat（直近ほど重い加重平均×0.7＋中央値×0.3）です。',
  mpr: 'MPR＝クリケットCUの1ラウンドあたりの平均マーク数。総マーク数÷8。得点ではなくマーク数で見るのは、20〜15とBULLで1マークあたりの点数が違うためです。例: 24マーク → 3.00。こちらも Skill Stat（加重平均×0.7＋中央値×0.3）です。',
  ppd: 'PPD＝カウントアップの1投あたりの平均点。スコア÷24（＝PPR÷3）。PHOENIXは01をこの単位で判定するので、PHX Practice Rating の計算に使います。例: 584点 → 24.33。',
  cons: 'Consistency＝同じ水準をどれだけ繰り返せているかの再現性スコア（0〜100）。対象ゲームのばらつき（標準偏差÷平均）から算出し、ブレが小さいほど高くなります。目安は 85以上=S / 70以上=A / 55以上=B / 40以上=C。平均が同じでも「毎回800点前後」の方が「1000点と550点を行き来」より高く出ます。レーティング自体は上下させない別指標です。',
  trend: '直近10ゲームのレーティングと、その前の10ゲームのレーティングの差。+0.15以上で ↑ Improving、−0.15以下で ↓ Declining、その間は → Stable。1ゲームごとの上下ではなく10ゲーム単位の傾向を見ます。合計20ゲーム貯まると表示されます（比較するゲーム数は設定で変更可）。',
  mt: 'Match Transfer＝自宅で出せている力を本番でどれだけ再現できているか。「本番の01スタッツ÷自宅のPPR」と「本番のMPR÷自宅のMPR」の平均です。100%に近いほど本番でも普段どおり投げられている、低いほど本番で崩れている、という読み方。履歴のDARTSLIVE記録を入れると計算されます。',
  mode: 'Practice＝新しい算出方法（直近ほど重い加重平均＋中央値で Skill Stat を出し、DARTSLIVE/PHOENIXの実際の境界表に線形補間）。旧方式＝導入前の計算（直近30ゲームの単純平均、PPR=5×Rt+30の式）。記録は共通なので、いつでも切り替えて見比べられます。',
  recentN: 'レーティングの計算に使う直近ゲーム数。カウントアップとクリケットCUで別々に数えます。少なくすると今の調子に敏感になり、多くすると安定します（既定30）。',
  w1: '直近1〜10ゲームに掛ける重み。大きいほど最近の成績が強く反映されます（既定1.00）。',
  w2: '11〜20ゲーム前に掛ける重み（既定0.75）。',
  w3: '21〜30ゲーム前に掛ける重み（既定0.50）。0にするとその範囲を計算から除外できます。',
  avgRatio: 'Skill Stat のうち「加重平均」が占める割合（既定0.70）。大きくすると好調・不調がそのまま数値に出ます。',
  medRatio: 'Skill Stat のうち「中央値」が占める割合（既定0.30）。大きくすると、会心の1ゲームや大崩れ1ゲームの影響が小さくなります。',
  mix01: '総合レーティングでカウントアップ（01能力）が占める割合（既定0.50）。',
  mixCri: '総合レーティングでクリケットCUが占める割合（既定0.50）。01との合計が1.0になるようにするのが基本です（合計が1でなくても比率として扱います）。',
  cvZero: 'Consistency が0点になるばらつきの大きさ（変動係数＝標準偏差÷平均）。既定0.35。小さくすると採点が厳しく、大きくすると甘くなります。',
  trendWindow: 'Trend で比較するゲーム数（既定10＝「直近10G」と「その前の10G」を比較）。表示にはこの2倍のゲーム数が必要です。',
  transferN: 'Match Transfer に使う本番（DARTSLIVE）記録の件数を新しい順で指定します（既定5）。',
  qualMode: '項目ごと（既定）＝そのラウンドで実際に動かした項目だけを記録します。気づいた項目だけ評価でき、動かさなかった項目は「未評価」として平均から除外されます。各項目の平均は、その項目を評価したラウンドだけで計算します。／ラウンドごと（旧仕様）＝1つでも動かしたラウンドは、触っていない項目も6点（普通）として5項目すべてを記録します。',
};
function prHelpBtn(k) { return `<button class="qhelp" onclick="qHelp('pr_${k}')">?</button>`; }
function prTip(k) { return QHELP['pr_' + k] ? `<div class="qtip">${escHtml(PR_HELP[k])}</div>` : ''; }

/* ---- ホームのレーティングカード ---- */
function prNum(v, d) { return v == null ? '—' : rtFix(v, d == null ? 2 : d); }
function practiceCard(ds, after) {   // after: レーティング枠の直下に差し込むカード
  const pr = practiceRatingOf(pcCu(), pcCri());
  const today = practiceRatingOf(pcCu().filter(g => g.date === ds), pcCri().filter(g => g.date === ds));
  const mt = matchTransferNow(pr);
  const tr = pr.trend;
  const tl = tr ? trendLabel(tr.diff) : null;
  const cell = (v, l, color, hk) => `<div><div class="v"${color ? ` style="color:${color}"` : ''}>${v}</div><div class="l">${l}${hk ? prHelpBtn(hk) : ''}</div></div>`;
  if (pr.practiceRating == null) {
    return `<div class="card"><h3>Practice Rating</h3>
      <div class="sub center">COUNT-UP / CRICKET COUNT-UP をプレイすると表示されます</div></div>
      ${after || ''}`;
  }
  return `<div class="card">
    <h3>Practice Rating<span class="sub" style="font-weight:400">　直近${pr.cfg.recentN}G・自宅練習</span></h3>
    <div class="rt-main"><span class="rt-num">${prNum(pr.practiceRating)}</span><span class="rt-fl">${flightOf(Math.floor(pr.practiceRating))}フライト</span></div>
    <div class="prmix">
      <span><i>DL Practice Rating</i><b>${prNum(pr.dlPracticeRating)}</b></span>
      <span><i>PHX Practice Rating</i><b>${prNum(pr.phxPracticeRating)}</b></span>
    </div>
    <div class="statgrid" style="margin-top:10px">
      ${cell(pr.dl01 ? prNum(pr.dl01.skill, 2) : '—', `PPR<br>DL Rt ${pr.dl01 ? prNum(pr.dl01.rating) : '—'}`, 'var(--yel)', 'ppr')}
      ${cell(pr.dlCri ? prNum(pr.dlCri.skill, 2) : '—', `MPR<br>DL Rt ${pr.dlCri ? prNum(pr.dlCri.rating) : '—'}`, 'var(--yel)', 'mpr')}
      ${cell(pr.phx01 ? prNum(pr.phx01.skill, 2) : '—', `PPD<br>PHX Rt ${pr.phx01 ? prNum(pr.phx01.rating) : '—'}`, '', 'ppd')}
    </div>
    ${prTip('ppr')}${prTip('mpr')}${prTip('ppd')}
    <div class="statgrid" style="margin-top:8px">
      ${cell(pr.consistency != null ? pr.consistency : '—', `Consistency<br>/100${pr.consistency != null ? '（' + consistencyGrade(pr.consistency) + '）' : ''}`,
        pr.consistency != null && pr.consistency >= 70 ? 'var(--green)' : '', 'cons')}
      ${cell(tr ? (tr.diff >= 0 ? '+' : '') + prNum(tr.diff, 2) : '—', `${pr.cfg.trendWindow * 2}G Trend<br>${tl ? tl.icon + ' ' + tl.text : '記録が貯まると表示'}`,
        tr ? (tr.diff >= 0.15 ? 'var(--green)' : tr.diff <= -0.15 ? '#ff9d96' : '') : '', 'trend')}
      ${cell(mt ? prNum(mt.total, 0) + '%' : '—', `Match Transfer<br>${mt ? '本番' + mt.n + '件と比較' : '本番記録が必要'}`, '', 'mt')}
    </div>
    ${prTip('cons')}${prTip('trend')}${prTip('mt')}
    ${today.practiceRating != null ? `<div class="rt-today" style="margin-top:10px"><span class="lbl">今日のみ</span><span class="rt-today-num">${prNum(today.practiceRating)}</span><span class="rt-today-fl">${flightOf(Math.floor(today.practiceRating))}</span></div>
    <div class="rt-detail" style="margin-top:6px">
      01: ${today.dl01 ? `PPR ${prNum(today.dl01.skill)}（Rt.${prNum(today.dl01.rating)}）` : '—'}<br>
      CRICKET: ${today.dlCri ? `MPR ${prNum(today.dlCri.skill)}（Rt.${prNum(today.dlCri.rating)}）` : '—'}
    </div>` : ''}
    ${(() => {
      const e = liveEstimate();
      if (!e) return '';
      return `<div class="rt-today" style="margin-top:8px"><span class="lbl">本番想定<br><span style="font-size:9px">${e.baseLabel}から</span></span><span class="rt-today-num" style="font-size:20px">Rt.${e.down.toFixed(1)}〜${e.up.toFixed(1)}</span><span class="rt-today-fl">${flightOf(Math.floor(e.center))}</span></div>`;
    })()}
    <div class="sub center" style="margin-top:8px">※DARTSLIVE / PHOENIX の公式レーティングではなく、自宅練習用の独自指標です（ファットブル基準）</div>
  </div>
  ${after || ''}
  ${prDetailCard(pr)}`;
}
/* 直近30ゲームの内訳 */
function prDetailCard(pr) {
  if (!pr || (!pr.dl01 && !pr.dlCri)) return '';
  const row = (l, v) => `<div class="tgt-row"><span class="tl">${l}</span><span class="tv">${v}</span><span class="tc"></span></div>`;
  const cu = pr.dl01, cr = pr.dlCri;
  return `<div class="card">
    <h3>直近ゲームの内訳</h3>
    ${cu ? `<div class="prsec"><span class="tybadge cu">COUNT-UP</span><span class="sub">${cu.n}ゲーム</span></div>
      ${row('平均スコア / 中央値', `${prNum(cu.avg * 8, 1)} / ${prNum(cu.median * 8, 1)}`)}
      ${row('最高 / 最低', `${prNum(cu.best * 8, 0)} / ${prNum(cu.worst * 8, 0)}`)}
      ${row('PPR / PPD', `${prNum(cu.skill, 2)} / ${prNum(pr.phx01 ? pr.phx01.skill : null, 2)}`)}
      ${row('ばらつき（標準偏差）', `${prNum(cu.stdev * 8, 1)}点`)}
      ${row('Consistency', `${cu.consistency != null ? cu.consistency + ' / 100（' + consistencyGrade(cu.consistency) + '）' : '—'}`)}` : ''}
    ${cr ? `<div class="prsec" style="margin-top:10px"><span class="tybadge cri">CRICKET COUNT-UP</span><span class="sub">${cr.n}ゲーム</span></div>
      ${row('平均MPR / 中央値', `${prNum(cr.avg, 2)} / ${prNum(cr.median, 2)}`)}
      ${row('最高 / 最低 MPR', `${prNum(cr.best, 2)} / ${prNum(cr.worst, 2)}`)}
      ${row('MPR', prNum(cr.skill, 2))}
      ${row('ばらつき（標準偏差）', prNum(cr.stdev, 2))}
      ${row('Consistency', `${cr.consistency != null ? cr.consistency + ' / 100（' + consistencyGrade(cr.consistency) + '）' : '—'}`)}` : ''}
    <div class="sub" style="margin-top:8px">Skill Stat = 加重平均×${pr.cfg.avgRatio} + 中央値×${pr.cfg.medRatio}（重み 直近10G=${pr.cfg.w1} / 11〜20G=${pr.cfg.w2} / 21〜30G=${pr.cfg.w3}）。ベストスコアはRatingに影響しません。</div>
  </div>`;
}
/* 旧方式（互換）のカード */
function legacyRatingCard(ds, rAll, rToday) {
  const block = r => r.totalF == null
    ? '<div class="sub center">ゲームをプレイすると表示されます</div>'
    : `<div class="rt-main"><span class="rt-num">Rt.${r.totalF.toFixed(2)}</span><span class="rt-fl">${flightOf(Math.floor(r.totalF))}フライト</span></div>
       <div class="rt-detail">
         01: ${r.ppr != null ? `PPR ${r.ppr.toFixed(2)}（Rt.${r.r01}）` : '—'}<br>
         CRICKET: ${r.mpr != null ? `MPR ${r.mpr.toFixed(2)}（Rt.${r.rcri}）` : '—'}
       </div>`;
  return `<div class="card">
    <h3>レーティング（旧方式・直近30G）</h3>
    ${block(rAll)}
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
    <div class="sub center" style="margin-top:6px">※ファットブル基準の換算値です（設定で Practice Rating に戻せます）</div>
  </div>`;
}
function ratingCardHTML(ds, rAll, rToday, after) {
  return isPracticeMode() ? practiceCard(ds, after) : legacyRatingCard(ds, rAll, rToday) + (after || '');
}
/* 設定変更 */
function setRatingCfg(k, v) {
  DB.settings.rating = DB.settings.rating || {};
  const n = parseFloat(v);
  if (isNaN(n)) delete DB.settings.rating[k]; else DB.settings.rating[k] = n;
  saveDB(); render();
}
function setRatingMode(m) { DB.settings.ratingMode = m; saveDB(); render(); }
function resetRatingCfg() { DB.settings.rating = {}; saveDB(); render(); }

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
  return out;   // アワードカウンターは目標対象外（カウント機能のみ）
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
let HM = METRICS[0].k;        // グラフ指標（初期表示はプルダウン最上部の項目）
let HP = 30;                  // グラフ期間
let CAL = { y: new Date().getFullYear(), m: new Date().getMonth() };

let LAST_PAGE = null;
function nav(p) { timerStop(); PAGE = p; render(); }
function render() {
  checkBullRollover();   // プレイ日付を回った中断データを自動完了
  checkCrkRollover();
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === PAGE));
  // 同じ画面の再描画ではスクロール位置を保つ（カウンターの +/− で先頭に戻らないように）
  const samePage = PAGE === LAST_PAGE;
  const y = window.scrollY;
  const side = document.querySelector('#view .split>div:last-child');
  const sideY = side ? side.scrollTop : 0;
  // プレイ中: 広い画面では2カラム化、さらに1画面固定レイアウト（スクロール無効・ナビ非表示）
  const inGame = (PAGE === 'play' && !!G && !G.fin) || (PAGE === 'robot' && !!RB && RB.stage === 'play');
  $('#view').classList.toggle('wide', inGame);
  $('#view').classList.toggle('game', inGame);
  document.body.classList.toggle('ingame', inGame);
  ({ home: renderHome, play: renderPlay, hist: renderHist, cal: renderCal, set: renderSet, robot: renderRobot })[PAGE]();
  // カードが3枚以上ある画面だけ多段組みにする（1枚だけの画面は横幅いっぱいで見せる）
  $('#view').classList.toggle('cols', !inGame && document.querySelectorAll('#view > .card').length >= 3);
  if (samePage) {
    if (y) window.scrollTo(0, y);
    const side2 = document.querySelector('#view .split>div:last-child');
    if (side2 && sideY) side2.scrollTop = sideY;
  } else {
    window.scrollTo(0, 0);
  }
  LAST_PAGE = PAGE;
}

/* ================= ホーム ================= */
/* 今日のブル数・トリプル数（全ゲーム累計）のカード。
   広い画面（折り畳みを開いたときなど）は右カラムの先頭、狭い画面はレーティング枠の下に置く。
   同じカードを2か所に出して CSS で表示を切り替えている（.hide-wide / .only-wide） */
function todayHitsCardHTML(ds, cls) {
  const h = dayHits(ds);
  const note = [];
  if (h.games) note.push(`全${h.games}ゲーム${h.n ? ` / ${h.n}投` : ''}`);
  if (h.dl) note.push(`うちDARTSLIVE ${h.dl}本`);
  const skipLabel = h.skip.map(t => TYPE_LABEL[t] || t).join('・');
  return `<div class="card ${cls || ''}">
    <h3>今日のヒット（全ゲーム累計）</h3>
    <div class="statgrid" style="grid-template-columns:1fr 1fr">
      <div><div class="v" style="color:var(--red)">${h.bull}</div><div class="l">ブル<br>（アウト・イン含む）</div></div>
      <div><div class="v" style="color:var(--green)">${h.tri}</div><div class="l">トリプル<br>（ブル以外）</div></div>
    </div>
    <div class="sub center" style="margin-top:6px">うちインブル ${h.ibull}本${note.length ? `　/　${note.join('　/　')}` : ''}</div>
    ${skipLabel ? `<div class="sub" style="margin-top:6px">${skipLabel}は1本ごとの内訳を記録していないため含みません</div>` : ''}
  </div>`;
}
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

  $('#view').innerHTML = `
  <h2>ホーム${DB.settings.dateOverride ? ` <span class="badge part">記録日: ${fmtDate(DB.settings.dateOverride)}（手動）</span>` : ''}</h2>

  ${ratingCardHTML(ds, rAll, rToday, todayHitsCardHTML(ds, 'hide-wide'))}

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

  ${todayHitsCardHTML(ds, 'only-wide colstart')}

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

  ${(() => {
    const b = bulStats(ds);
    if (!b.allN) return '';
    return `<div class="card">
      <h3>連続ブルチャレンジ</h3>
      <div class="statgrid">
        <div><div class="v" style="color:var(--yel)">${b.best}</div><div class="l">最高連続<br>（通算）</div></div>
        <div><div class="v">${b.avg.toFixed(1)}</div><div class="l">平均<br>（${b.allN}回）</div></div>
        <div><div class="v" style="color:var(--green)">${b.todayBest != null ? b.todayBest : '—'}</div><div class="l">今日の最高${b.todayN ? `<br>（${b.todayN}回）` : ''}</div></div>
      </div>
      ${b.todayN ? `<div class="sub center" style="margin-top:6px">今日の平均 ${b.todayAvg.toFixed(1)}本</div>` : ''}
    </div>`;
  })()}

  ${(() => {
    const rc = rckStats(ds);
    if (!rc.allN) return '';
    const top = rc.miss.filter(m => m.miss > 0).slice(0, 3);
    return `<div class="card">
      <h3>ランダムクリケチャレンジ</h3>
      <div class="statgrid">
        <div><div class="v" style="color:var(--yel)">${rc.best.toFixed(2)}</div><div class="l">最高MPR</div></div>
        <div><div class="v">${rc.avg.toFixed(2)}</div><div class="l">平均MPR<br>（${rc.allN}G）</div></div>
        <div><div class="v" style="color:var(--green)">${rc.todayBest != null ? rc.todayBest.toFixed(2) : '—'}</div><div class="l">今日の最高</div></div>
      </div>
      ${top.length ? `<h3 style="margin-top:12px">ミスの傾向</h3>
        ${top.map((m, i) => `<div class="tgt-row"><span class="tl">${i === 0 ? '💧 ' : ''}${rcLabel(m.t)}<span class="sub">（${m.att}投）</span></span>
          <span class="tv" style="color:#ff9d96">ミス ${m.miss}</span><span class="tc">${m.missRate.toFixed(0)}%</span></div>`).join('')}`
        : '<div class="sub" style="margin-top:8px">ミスなし</div>'}
    </div>`;
  })()}

  ${(() => {
    const k = kikStats(ds);
    if (!k.allN) return '';
    const goal = +DB.settings.goals.kikTarget || 0;
    return `<div class="card">
      <h3>菊池山口練習法</h3>
      <div class="statgrid">
        <div><div class="v">${k.todayBest != null ? k.todayBest : '—'}</div><div class="l">今日の最少投数${k.todayN ? `<br>（${k.todayN}回）` : ''}</div></div>
        <div><div class="v">${k.todayAvg != null ? k.todayAvg.toFixed(1) : '—'}</div><div class="l">今日の平均</div></div>
        <div><div class="v" style="color:var(--yel)">${k.allAvg != null ? k.allAvg.toFixed(1) : '—'}</div><div class="l">通算平均<br>（${k.allN}回）</div></div>
      </div>
      <div class="sub center" style="margin-top:6px">自己ベスト ${k.allBest}投${goal ? `　/　目標 ${goal}投` : ''}</div>
      <h3 style="margin-top:12px">ナンバー別の平均投数</h3>
      ${KIK_NUMS.map(n => {
        const a = k.perAvg[n], t = k.perAvgToday[n];
        return `<div class="tgt-row"><span class="tl">${kikLabel(n)}</span>
          <span class="tv">${t != null ? t.toFixed(1) + '投' : '—'}</span>
          <span class="tc">${a != null ? '通算 ' + a.toFixed(1) + '投' : '—'}</span></div>`;
      }).join('')}
      <div class="sub" style="margin-top:6px">左が今日の平均、右が通算の平均（10マークに要した投数）</div>
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
    ${warnList(ds).map(w => `<div class="warn-row"><span class="mk">⚠</span>${escHtml(w.label)} 最低 ${w.min}（下限 ${w.lim} を下回りました）</div>`).join('')}
  </div>`;
}

function counterRow(ds, c, ctr) {
  const v = ctr[c.k] || 0;
  const dl = (DB.days[ds] && DB.days[ds].dl && DB.days[ds].dl.awards) || {};
  const dlNote = dl[c.k] > 0 ? `<br><span class="sub">うちDARTSLIVE ${dl[c.k]}</span>` : '';
  return `<div class="ctr-row">
    <span class="name">${escHtml(c.label)}${dlNote}</span>
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
  if ($('#modal-root').innerHTML) {
    const m = document.querySelector('#modal-root .modal');
    const top = m ? m.scrollTop : 0;                              // モーダルのスクロール位置も保つ
    MODAL_KIND === 'panel' ? openGamePanel() : openDay(ds);
    const m2 = document.querySelector('#modal-root .modal');
    if (m2 && top) m2.scrollTop = top;
  } else render();
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
  if (type === 'arr') { startArr(); return; }
  if (type === 'kik') { startKik(); return; }
  if (type === 'bul') { startBul(); return; }
  if (type === 'rck') { startRck(); return; }
  if (G && !G.fin && G.darts.length && !confirm('進行中のゲームを破棄して新しく始めますか？')) return;
  G = { type, darts: [], confirmed: 0, fin: null, q: qDefault(), qual: [], qTouched: false, qFoc: false, qEditRound: null };
  M = 1;
  timerStop();
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
  const rIdx = Math.floor(G.confirmed / 3);
  if (G.type === 'cu' || G.type === 'cri') qCommit(rIdx);
  G.confirmed += 3;
  if (G.confirmed >= 24) { finishGame(); return; }
  if (G.type === 'cu' || G.type === 'cri') {
    timerStart();                                   // 次に投げるまでのカウントダウン
    if (isNarrow() && DB.settings.qualSheet !== false) { render(); openQualSheet(rIdx); return; }
  }
  render();
}
function undoDart() {
  if (!G || G.fin || !G.darts.length) return;
  if (G.type === 'bull') { G.darts.pop(); persistBull(); render(); return; }
  if (G.type === 'crk') { G.darts.pop(); persistCrk(); render(); return; }
  // 現在ラウンドが空なら直前の確定済みラウンドを開き直す
  if (G.darts.length === G.confirmed) {
    G.confirmed = Math.max(0, G.confirmed - 3);
    if (G.type === 'cu' || G.type === 'cri') qRestore(Math.floor(G.confirmed / 3));
  }
  G.darts.pop();
  render();
}
function quitGame() {
  if (!G) return;
  if (!G.darts.length || confirm('このゲームを破棄しますか？')) {
    if (G.type === 'bull') { DB.bullSuspend = null; saveDB(); }
    if (G.type === 'crk') { DB.crkSuspend = null; saveDB(); }
    timerStop();
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
  timerStop();
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
  // Practice Rating 用: ラウンド別の生データとスタッツを保存する
  const roundScores = [], roundMarks = [];
  for (let i = 0; i + 3 <= G.darts.length; i += 3) {
    const r = G.darts.slice(i, i + 3);
    roundScores.push(r.reduce((s, dd) => s + dartPoint(dd, G.type, bullMode), 0));
    if (G.type === 'cri') roundMarks.push(r.reduce((s, dd) => s + criMark(dd), 0));
  }
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: G.type, total, marks, lowTon, bulls, dbulls,
    rounds: roundScores,
    ...(G.type === 'cri' ? { roundMarks, mpr: ccuMPR(marks) } : { ppr: cuPPR(total), ppd: cuPPD(total) }),
    awards: detectAwards(G.darts, G.type),
    qual: G.qual || [],
    darts: G.darts,
    ord: 1,                    // 1投目・2投目・3投目を投げた順に記録したゲームの目印（1投目スタッツの対象）
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
  CRK_NUMS.forEach(n => { map[n] = { num: n, games: 0, tri: 0, darts: 0, score: 0, marks: 0 }; });
  DB.games.filter(g => g.type === 'cnu').forEach(g => {
    const m = map[g.num]; if (!m) return;
    m.games++; m.tri += g.triples || 0; m.darts += g.dartCount || 24;
    m.score += g.total || 0; m.marks += g.marks || 0;
  });
  return CRK_NUMS.map(n => {
    const m = map[n];
    return {
      num: n, games: m.games,
      tripleRate: m.darts ? m.tri / m.darts * 100 : null,
      avgStats: m.games ? m.score / m.games / 8 : null,   // 1ラウンド平均スタッツ
      mpr: m.games ? m.marks / m.games / 8 : null,
    };
  });
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
    ${sorted.map((r, i) => `<div class="tgt-row">
      <span class="tl">${i === 0 ? '🎯 得意　' : i === sorted.length - 1 ? '💧 不得意　' : '　'}No.${r.num}<span class="sub">（${r.games}G）</span></span>
      <span class="tv" style="color:${i === 0 ? 'var(--green)' : i === sorted.length - 1 ? '#ff9d96' : 'var(--tx)'}">${r.tripleRate.toFixed(1)}%</span>
      <span class="tc">MPR ${r.mpr != null ? r.mpr.toFixed(2) : '—'}</span>
    </div>`).join('')}
    <div class="sub" style="margin-top:6px">左がトリプル率、右が平均MPR（全ゲーム平均）</div>
  </div>`;
}

/* ================= アレンジ練習 =================
   21〜180のランダムな残り数字を、選んだアウトルールで上がる練習。
   3投以内で上がれる最短ルートを全通り算出して表示する。 */
const ARR_RULE_LABEL = { single: 'シングルアウト', double: 'ダブルアウト', master: 'マスターアウト' };
function arrSegs() {
  const segs = [];
  for (let n = 1; n <= 20; n++) {
    segs.push({ label: 'S' + n, v: n, kind: 's' });
    segs.push({ label: 'D' + n, v: n * 2, kind: 'd' });
    segs.push({ label: 'T' + n, v: n * 3, kind: 't' });
  }
  if (DB.settings.bullMode === 'separate') {
    segs.push({ label: 'BULL', v: 25, kind: 's' });
    segs.push({ label: 'D-BULL', v: 50, kind: 'd' });
  } else {
    segs.push({ label: 'BULL', v: 50, kind: 'd' });   // ファットブルは50点・ダブル扱い
  }
  return segs;
}
function arrIsFinisher(s, rule) {
  if (rule === 'single') return true;
  if (rule === 'double') return s.kind === 'd';
  return s.kind === 'd' || s.kind === 't';            // マスターアウト
}
/* 最短本数で上がれるルートを全通り返す（順番違いの重複は除く） */
function arrangeOuts(target, rule) {
  const segs = arrSegs();
  const fins = segs.filter(s => arrIsFinisher(s, rule));
  const seen = new Set(), out = [];
  const push = (pre, f) => {
    const key = pre.map(x => x.label).sort().join(',') + '|' + f.label;
    if (seen.has(key)) return;
    seen.add(key);
    out.push([...pre, f]);
  };
  fins.forEach(f => { if (f.v === target) push([], f); });
  if (out.length) return { n: 1, routes: arrSort(out) };
  segs.forEach(a => fins.forEach(f => { if (a.v + f.v === target) push([a], f); }));
  if (out.length) return { n: 2, routes: arrSort(out) };
  segs.forEach(a => segs.forEach(b => fins.forEach(f => { if (a.v + b.v + f.v === target) push([a, b], f); })));
  return { n: out.length ? 3 : 0, routes: arrSort(out) };
}
function arrSort(routes) {   // 1投目が大きい順（実戦的な狙い方を上に）
  return routes.sort((a, b) => (b[0].v - a[0].v) || ((b[1] ? b[1].v : 0) - (a[1] ? a[1].v : 0)));
}
function arrNextTarget() { return 21 + Math.floor(Math.random() * 160); }   // 21〜180
/* 自分の上がりパターン登録（登録したルートは一覧の先頭に表示） */
function arrFavKey(target, rule, route) { return `${rule}:${target}:${route.map(s => s.label).join('-')}`; }
let FAV_CTX = null;   // 設定からパターン登録中の { rule, num }
function toggleArrFav(k) {
  const f = DB.settings.arrFav = DB.settings.arrFav || [];
  const i = f.indexOf(k);
  if (i >= 0) f.splice(i, 1); else f.push(k);
  saveDB();
  if (MODAL_KIND === 'favroutes' && FAV_CTX) openFavRoutes(FAV_CTX.rule, FAV_CTX.num);
  else if (MODAL_KIND === 'favlist') openFavSettings();
  else render();
}
/* 登録キー "rule:target:T20-D20" を分解 */
function favParse(k) {
  const i1 = k.indexOf(':'), i2 = k.indexOf(':', i1 + 1);
  return { rule: k.slice(0, i1), target: +k.slice(i1 + 1, i2), route: k.slice(i2 + 1) };
}
function favSorted() {
  return (DB.settings.arrFav || []).map(favParse).sort((a, b) => a.rule.localeCompare(b.rule) || b.target - a.target);
}
function favRow(f) {
  const k = `${f.rule}:${f.target}:${f.route}`;
  return `<div class="favrow">
    <span class="tg">${f.target}</span>
    <span class="rl">${favLabels(f.route).join(' → ')}</span>
    <span class="ru sub">${ARR_RULE_LABEL[f.rule] || f.rule}</span>
    <button class="del" onclick="toggleArrFav('${k}')">削除</button>
  </div>`;
}
/* 設定から: 登録済み一覧 → アウトルール選択 */
function openFavSettings() {
  MODAL_KIND = 'favlist'; FAV_CTX = null;
  const list = favSorted();
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">上がりパターンの登録</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <h3>登録済み（${list.length}件）</h3>
        ${list.length ? list.map(favRow).join('') : '<div class="sub">まだ登録がありません</div>'}
      </div>
      <div class="card">
        <h3>新しく登録する（アウトルールを選択）</h3>
        <button class="btn primary big" onclick="openFavNum('double')">ダブルアウト</button>
        <button class="btn green big" onclick="openFavNum('master')">マスターアウト</button>
        <button class="btn big" onclick="openFavNum('single')">シングルアウト</button>
        <div class="sub" style="margin-bottom:0">数字を選ぶと上がり方の一覧が出ます。一覧にない自分だけのパターンは手入力で追加できます。</div>
      </div>
    </div>
  </div>`;
}
/* 手入力でパターンを作る（数字を入れて 1投目→2投目→3投目） */
let FAVB = null;
function favSegOf(seg, mult) {
  const sepa = DB.settings.bullMode === 'separate';
  if (seg === 25) {
    if (sepa) return mult === 2 ? { label: 'D-BULL', v: 50, kind: 'd' } : { label: 'BULL', v: 25, kind: 's' };
    return { label: 'BULL', v: 50, kind: 'd' };
  }
  return { label: (mult === 3 ? 'T' : mult === 2 ? 'D' : 'S') + seg, v: seg * mult, kind: mult === 3 ? 't' : mult === 2 ? 'd' : 's' };
}
function openFavBuilder(rule, target) {
  FAVB = { rule, target: target || 0, darts: [] };
  M = 1;
  renderFavBuilder();
}
function favTargetInput(v) {   // 入力中はフォーカスを保つため状態表示だけ更新
  FAVB.target = Math.max(0, Math.min(180, parseInt(v, 10) || 0));
  const el = document.getElementById('favStatus');
  if (el) el.outerHTML = favStatusHtml();
}
function favAddDart(seg, mult) {
  if (!FAVB || FAVB.darts.length >= 3) return;
  FAVB.darts.push(favSegOf(seg, mult));
  M = 1;
  renderFavBuilder();
}
function favUndoDart() { if (FAVB && FAVB.darts.length) { FAVB.darts.pop(); renderFavBuilder(); } }
function favValidate() {
  const t = FAVB.target, ds = FAVB.darts;
  if (!t || t < 2) return { ok: false, msg: '上がる数字を入力してください' };
  if (!ds.length) return { ok: false, msg: '1投目を入力してください' };
  const sum = ds.reduce((s, d) => s + d.v, 0);
  if (sum !== t) return { ok: false, msg: `合計 ${sum} / ${t}　（${sum < t ? 'あと ' + (t - sum) : (sum - t) + ' オーバー'}）` };
  if (!arrIsFinisher({ kind: ds[ds.length - 1].kind }, FAVB.rule)) {
    return { ok: false, msg: `最後の1投が${ARR_RULE_LABEL[FAVB.rule]}の条件を満たしていません` };
  }
  return { ok: true, msg: `${t} を ${ds.length}投で上がり` };
}
function favStatusHtml() {
  const v = favValidate();
  return `<div id="favStatus" class="favstatus ${v.ok ? 'ok' : ''}">${v.ok ? '✓ ' : ''}${v.msg}</div>`;
}
function favSave() {
  const v = favValidate();
  if (!v.ok) { alert(v.msg); return; }
  const key = `${FAVB.rule}:${FAVB.target}:${FAVB.darts.map(d => d.label).join('-')}`;
  const f = DB.settings.arrFav = DB.settings.arrFav || [];
  if (!f.includes(key)) f.push(key);
  saveDB();
  openFavSettings();
}
function renderFavBuilder() {
  MODAL_KIND = 'favbuild';
  const sepa = DB.settings.bullMode === 'separate';
  const chips = [0, 1, 2].map(i => `<span class="${FAVB.darts[i] ? '' : 'empty'}">${FAVB.darts[i] ? `${FAVB.darts[i].label}<b>${FAVB.darts[i].v}</b>` : (i + 1) + '投目'}</span>`).join('');
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">パターンを手入力（${ARR_RULE_LABEL[FAVB.rule]}）</span><button onclick="${FAVB.target ? `openFavRoutes('${FAVB.rule}',${FAVB.target})` : `openFavNum('${FAVB.rule}')`}">戻る</button></div>
      <div class="card">
        <div class="set-row"><label>上がる数字（2〜180）</label>
          <input type="number" min="2" max="180" id="favTarget" value="${FAVB.target || ''}" placeholder="100" oninput="favTargetInput(this.value)"></div>
        <div class="dartchips favchips">${chips}</div>
        ${favStatusHtml()}
      </div>
      <div class="card padwrap">
        <div class="mrow">
          <button class="${M === 1 ? 'on' : ''}" onclick="setMFav(1)">SINGLE</button>
          <button class="${M === 2 ? 'on' : ''}" onclick="setMFav(2)">DOUBLE</button>
          <button class="${M === 3 ? 'on' : ''}" onclick="setMFav(3)">TRIPLE</button>
        </div>
        <div class="padgrid">${Array.from({ length: 20 }, (_, i) => `<button onclick="favAddDart(${i + 1},M)">${i + 1}</button>`).join('')}</div>
        <div class="brow" style="grid-template-columns:${sepa ? '1fr 1fr 1fr' : '1fr 1fr'}">
          <button class="bull" onclick="favAddDart(25,1)">BULL${sepa ? ' 25' : ' 50'}</button>
          ${sepa ? '<button class="bull" onclick="favAddDart(25,2)">D-BULL 50</button>' : ''}
          <button class="undo" onclick="favUndoDart()">⌫ 戻す</button>
        </div>
      </div>
      <div class="card">
        <button class="btn primary big" onclick="favSave()">このパターンを登録</button>
        <button class="btn big" style="margin-bottom:0" onclick="${FAVB.target ? `openFavRoutes('${FAVB.rule}',${FAVB.target})` : `openFavNum('${FAVB.rule}')`}">📋 上がり方の一覧に戻る</button>
      </div>
    </div>
  </div>`;
}
function setMFav(m) { M = m; renderFavBuilder(); }

/* 数字を選ぶ（アウト不可はグレーアウト） */
function openFavNum(rule) {
  MODAL_KIND = 'favnum';
  const reach = arrReachable(rule);
  const nums = [];
  for (let n = 180; n >= 20; n--) nums.push(n);
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">数字を選択（${ARR_RULE_LABEL[rule]}）</span><button onclick="openFavSettings()">戻る</button></div>
      <div class="card">
        <div class="numgrid">${nums.map(n => reach[n]
          ? `<button onclick="openFavRoutes('${rule}',${n})">${n}</button>`
          : `<button class="ng" disabled>${n}</button>`).join('')}</div>
        <div class="sub" style="margin-top:8px">グレーの数字は${ARR_RULE_LABEL[rule]}では3投以内に上がれません。</div>
      </div>
    </div>
  </div>`;
}
/* その数字の上がり方から★を選ぶ */
function openFavRoutes(rule, num) {
  MODAL_KIND = 'favroutes'; FAV_CTX = { rule, num };
  const res = arrangeOuts(num, rule);
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">${num}（${ARR_RULE_LABEL[rule]}）</span><button onclick="openFavNum('${rule}')">戻る</button></div>
      <div class="card">
        <div class="sub" style="margin-bottom:8px">★を付けたパターンは、アレンジ練習で一覧の先頭に表示されます。</div>
        ${res.n === 0 ? '<div class="arrng">アウト不可</div>' : arrRouteList(num, rule, res.routes)}
      </div>
      <div class="card">
        <button class="btn primary big" onclick="openFavBuilder('${rule}',${num})">✏️ 手入力でパターンを追加</button>
        <div class="sub" style="margin-bottom:10px">一覧にない上がり方（1投目・2投目・3投目を自分で指定）を登録できます。</div>
        <button class="btn big" style="margin-bottom:0" onclick="openFavSettings()">登録一覧に戻る</button>
      </div>
    </div>
  </div>`;
}
function favLabels(routeStr) {   // "T20-D-BULL" のような連結を正しく分解
  return routeStr.match(/D-BULL|BULL|[TDS]\d+/g) || [];
}
function arrRouteList(target, rule, routes) {
  const fav = DB.settings.arrFav || [];
  const list = routes.map(r => { const k = arrFavKey(target, rule, r); return { r, k, on: fav.includes(k) }; });
  // 手入力で登録した独自パターン（自動算出の一覧にないもの）も表示する
  const prefix = `${rule}:${target}:`;
  fav.filter(k => k.startsWith(prefix) && !list.some(x => x.k === k)).forEach(k => {
    list.push({ r: favLabels(k.slice(prefix.length)).map(l => ({ label: l })), k, on: true });
  });
  list.sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0));   // 登録済みを上に（それ以外の順序は維持）
  return `<div class="arrlist">${list.map(x => `<div class="arrroute${x.on ? ' fav' : ''}">
      <button class="favbtn" onclick="toggleArrFav('${x.k}')" title="自分のパターンに登録">${x.on ? '★' : '☆'}</button>
      <span class="rte">${x.r.map((s, i) => `<span class="${i === x.r.length - 1 ? 'fin' : ''}">${s.label}</span>`).join('<span class="ar">→</span>')}</span>
    </div>`).join('')}</div>`;
}
/* 3投以内で上がれる数字の一覧（グレーアウト判定用・ルールごとにキャッシュ） */
const ARR_REACH = {};
function arrReachable(rule) {
  const key = rule + '|' + DB.settings.bullMode;
  if (ARR_REACH[key]) return ARR_REACH[key];
  const segs = arrSegs();
  const V = [...new Set(segs.map(s => s.v))];
  const F = [...new Set(segs.filter(s => arrIsFinisher(s, rule)).map(s => s.v))];
  const ok = new Uint8Array(181);
  F.forEach(f => { if (f <= 180) ok[f] = 1; });
  V.forEach(a => F.forEach(f => { const t = a + f; if (t <= 180) ok[t] = 1; }));
  V.forEach(a => V.forEach(b => F.forEach(f => { const t = a + b + f; if (t <= 180) ok[t] = 1; })));
  return (ARR_REACH[key] = ok);
}
function arrDartPts(d) {
  if (d.seg === 25) return DB.settings.bullMode === 'separate' ? (d.mult === 2 ? 50 : 25) : 50;
  return d.seg * d.mult;
}
function arrDartKind(d) {
  if (d.seg === 25) return DB.settings.bullMode === 'separate' ? (d.mult === 2 ? 'd' : 's') : 'd';
  return d.mult === 3 ? 't' : d.mult === 2 ? 'd' : 's';
}
function arrDartLabel(d) {
  if (d.seg === 0) return 'MISS';
  if (d.seg === 25) return d.mult === 2 ? 'D-BULL' : 'BULL';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S') + d.seg;
}

/* 開始: ①アウトルール → ②数字（ランダム/指定） */
function startArr() {
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">アウトルールを選択</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <button class="btn primary big" onclick="arrPickNum('double')">ダブルアウト</button>
        <div class="sub" style="margin-bottom:12px">最後の1本がダブル（またはブル）で上がり。</div>
        <button class="btn green big" onclick="arrPickNum('master')">マスターアウト</button>
        <div class="sub" style="margin-bottom:12px">最後の1本がダブルかトリプル（またはブル）で上がり。</div>
        <button class="btn big" onclick="arrPickNum('single')">シングルアウト</button>
        <div class="sub" style="margin-bottom:12px">ちょうど0になれば上がり（DARTSLIVE標準）。</div>
        <button class="btn big" style="margin-bottom:0" onclick="openArrAnalysis()">📊 これまでの分析を見る</button>
      </div>
    </div>
  </div>`;
}
function arrPickNum(rule) {
  const reach = arrReachable(rule);
  const nums = [];
  for (let n = 180; n >= 20; n--) nums.push(n);
  const ng = nums.filter(n => !reach[n]).length;
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">数字を選択（${ARR_RULE_LABEL[rule]}）</span><button onclick="startArr()">戻る</button></div>
      <div class="card">
        <button class="btn primary big" style="margin-bottom:0" onclick="startArrGame('${rule}','random')">🎲 ランダム（21〜180）</button>
        <div class="sub" style="margin-bottom:0;margin-top:8px">毎回ちがう数字が出ます。</div>
      </div>
      <div class="card">
        <h3>数字を指定して練習</h3>
        <div class="numgrid">${nums.map(n => reach[n]
          ? `<button onclick="startArrGame('${rule}',${n})">${n}</button>`
          : `<button class="ng" disabled title="アウト不可">${n}</button>`).join('')}</div>
        <div class="sub" style="margin-top:8px">選んだ数字を繰り返し練習します。${ng ? `グレーの${ng}個は${ARR_RULE_LABEL[rule]}では3投以内に上がれない数字です。` : ''}</div>
      </div>
    </div>
  </div>`;
}
function startArrGame(rule, mode) {
  closeModal();
  G = { type: 'arr', rule, mode, attempts: [], fin: null };
  arrNewAttempt();
  PAGE = 'play';
  render();
}
function arrNewAttempt() {
  const t = G.mode === 'random' ? arrNextTarget() : G.mode;
  G.start = t; G.remain = t; G.darts = []; G.msg = ''; G.done = false;
}
/* 1投入力（上がり・バーストを判定し、残ればその残り数字のアレンジを再表示） */
function arrHit(seg, mult) {
  if (!G || G.type !== 'arr' || G.done) return;
  G.msg = '';
  const d = { seg, mult };
  const pts = arrDartPts(d);
  const after = G.remain - pts;
  G.darts.push(d);
  ARR_FLASH = { seg, mult };
  M = 1;   // 1投ごとに SINGLE に戻す
  let bust = false, fin = false;
  if (after < 0) bust = true;
  else if (after === 0) { if (arrIsFinisher({ kind: arrDartKind(d) }, G.rule)) fin = true; else bust = true; }
  else if (after === 1 && G.rule !== 'single') bust = true;   // ダブル/マスターは残り1で上がれない
  if (fin) {
    G.done = true; G.msg = `上がり！ ${G.darts.length}投`;
    G.attempts.push({ target: G.start, darts: G.darts.length, ok: true });
    render();
    setTimeout(() => { if (G && G.type === 'arr' && !G.fin) { arrNewAttempt(); render(); } }, 1100);
    return;
  }
  if (bust) {
    // バーストしても次の数字へは進まず、直前の残り数字から継続（この1投は投数に含める）
    d.bust = true;
    G.msg = 'BUST!';
    render();
    return;
  }
  G.remain = after;
  render();
}
function arrUndo() {
  if (!G || G.type !== 'arr' || G.done || !G.darts.length) return;
  const d = G.darts.pop();
  if (!d.bust) G.remain += arrDartPts(d);   // バースト分は減点していないので戻さない
  G.msg = '';
  render();
}
function arrGiveUp() {   // 上がれずに次へ（失敗として記録）
  if (!G || G.done) return;
  G.attempts.push({ target: G.start, darts: G.darts.length, ok: false });
  arrNewAttempt();
  render();
}
function arrSkip() { if (G) { arrNewAttempt(); render(); } }   // カウントしない
/* 上がり率は「3投以内で上がれた」場合のみ成功として計算する */
function arrStats(attempts) {
  const n = attempts.length;
  const ok = attempts.filter(a => a.ok && a.darts <= 3);   // 成功＝3投以内の上がり
  const fin = attempts.filter(a => a.ok).length;           // 参考：投数を問わない上がり
  const avg = ok.length ? ok.reduce((s, a) => s + a.darts, 0) / ok.length : null;
  return { n, ok: ok.length, fin, rate: n ? ok.length / n * 100 : 0, avg };
}
function arrFinish() {
  const st = arrStats(G.attempts);
  if (!st.n) { G = null; render(); return; }
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: 'arr', rule: G.rule, mode: G.mode, total: st.ok, tries: st.n,
    rate: +st.rate.toFixed(1), finished: st.fin,
    avgDarts: st.avg != null ? +st.avg.toFixed(2) : null,
    attempts: G.attempts, awards: {}, darts: [],
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}

/* --- 分析（上がり率・得意/苦手な上がり目） --- */
function arrAnalysis() {
  const all = [];
  DB.games.filter(g => g.type === 'arr').forEach(g => (g.attempts || []).forEach(a => all.push(a)));
  if (!all.length) return null;
  const st = arrStats(all);
  const byNum = {};
  all.forEach(a => {
    const m = byNum[a.target] = byNum[a.target] || { target: a.target, n: 0, ok: 0, darts: 0 };
    m.n++; if (a.ok) { m.ok++; m.darts += a.darts; }
  });
  const nums = Object.values(byNum).map(m => ({ ...m, rate: m.ok / m.n * 100, avg: m.ok ? m.darts / m.ok : null }));
  const enough = nums.filter(m => m.n >= 3).sort((a, b) => b.rate - a.rate || b.n - a.n);
  const ranges = [[21, 40], [41, 60], [61, 100], [101, 140], [141, 180]].map(([lo, hi]) => {
    const g = all.filter(a => a.target >= lo && a.target <= hi);
    const ok = g.filter(a => a.ok).length;
    return { label: `${lo}〜${hi}`, n: g.length, ok, rate: g.length ? ok / g.length * 100 : null };
  });
  // 得意/苦手が同じ数字で重複しないよう、上位・下位を半分ずつに分ける
  const half = Math.min(5, Math.floor(enough.length / 2));
  const best = half ? enough.slice(0, half) : enough.slice(0, 1);
  const worst = half ? enough.slice(-half).reverse() : [];
  return { st, best, worst, ranges, needMore: nums.length && !enough.length };
}
function openArrAnalysis() {
  const a = arrAnalysis();
  MODAL_KIND = 'arranalysis';
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">アレンジ分析</span><button onclick="closeModal()">閉じる</button></div>
      ${!a ? '<div class="card sub">まだアレンジ練習の記録がありません。</div>' : `
      <div class="card">
        <h3>通算の上がり率（3投以内）</h3>
        <div class="statgrid">
          <div><div class="v">${a.st.n}</div><div class="l">試行</div></div>
          <div><div class="v" style="color:var(--green)">${a.st.rate.toFixed(1)}%</div><div class="l">上がり率</div></div>
          <div><div class="v" style="color:var(--yel)">${a.st.avg != null ? a.st.avg.toFixed(2) : '—'}</div><div class="l">平均投数</div></div>
        </div>
        <div class="sub center" style="margin-top:6px">3投以内の上がりのみ成功として算出${a.st.fin > a.st.ok ? `（4投以上での上がり ${a.st.fin - a.st.ok}回は除外）` : ''}</div>
      </div>
      <div class="card">
        <h3>スコア帯別の上がり率</h3>
        ${a.ranges.map(r => `<div class="tgt-row"><span class="tl">${r.label}<span class="sub">（${r.n}回）</span></span><span class="tc">${r.rate == null ? '—' : r.rate.toFixed(0) + '%'}</span></div>`).join('')}
      </div>
      ${a.best.length ? `<div class="card">
        <h3>🎯 得意な上がり目</h3>
        ${a.best.map(m => `<div class="tgt-row met"><span class="tl">${m.target}<span class="sub">（${m.ok}/${m.n}）</span></span><span class="tc" style="color:var(--green)">${m.rate.toFixed(0)}%</span></div>`).join('')}
        ${a.worst.length ? `<h3 style="margin-top:12px">💧 苦手な上がり目</h3>
        ${a.worst.map(m => `<div class="tgt-row short"><span class="tl">${m.target}<span class="sub">（${m.ok}/${m.n}）</span></span><span class="tc" style="color:#ff9d96">${m.rate.toFixed(0)}%</span></div>`).join('')}` : ''}
        <div class="sub" style="margin-top:8px">3回以上挑戦した数字が対象です。</div>
      </div>` : `<div class="card sub">同じ数字に3回以上挑戦すると、得意・苦手な上がり目を表示します。</div>`}`}
    </div>
  </div>`;
}

let ARR_FLASH = null;
function renderArr(v, ds) {
  const st = arrStats(G.attempts);
  const res = arrangeOuts(G.remain, G.rule);
  const fl = (seg, mult) => (ARR_FLASH && ARR_FLASH.seg === seg && ARR_FLASH.mult === mult) ? ' flash' : '';
  const routeHtml = res.n === 0
    ? `<div class="arrng">アウト不可<span class="sub" style="display:block;font-size:11px;font-weight:400">（3投以内では上がれません）</span></div>`
    : arrRouteList(G.remain, G.rule, res.routes);
  const thrown = G.darts.length
    ? `<div class="arrthrown">${G.darts.map((d, i) => {
        const cls = [d.bust ? 'bust' : (d.seg === 0 ? 'miss' : ''), i === G.darts.length - 1 ? 'last' : ''].filter(Boolean).join(' ');
        return `<span class="${cls}">${i + 1}.${arrDartLabel(d)}${d.bust ? '✗' : ''}</span>`;
      }).join('')}</div>`
    : '<div class="sub center" style="margin-top:6px">投げたダーツを入力してください</div>';
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">アレンジ練習　<span class="sub">${ARR_RULE_LABEL[G.rule]}・${G.mode === 'random' ? 'ランダム' : G.mode + '固定'}</span></span>
    <span style="display:flex;gap:6px">
      <button class="btn small" onclick="openArrAnalysis()">📊 分析</button>
      <button class="btn small danger" onclick="arrFinish()">終了</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card center">
        <div class="sub">残りスコア${G.remain !== G.start ? `（開始 ${G.start} / ${G.darts.length}投目）` : ''}</div>
        <div class="bigscore" style="font-size:52px;${G.done ? 'color:var(--green)' : ''}">${G.done ? G.msg : G.remain}</div>
        ${!G.done && G.msg ? `<div class="arrbust">${G.msg}<span class="sub">　得点は無効・この1投もカウント</span></div>` : ''}
        ${G.done ? '' : `<div class="sub">${res.n === 0 ? '' : `残り ${res.n}本で上がり・${res.routes.length}通り`}</div>
        <div class="arr-narrow">${routeHtml}</div>`}
        ${thrown}
      </div>
      <div class="card padwrap" style="${G.done ? 'opacity:.4;pointer-events:none' : ''}">
        <div class="mrow">
          <button class="${M === 1 ? 'on' : ''}" onclick="setM(1)">SINGLE</button>
          <button class="${M === 2 ? 'on' : ''}" onclick="setM(2)">DOUBLE</button>
          <button class="${M === 3 ? 'on' : ''}" onclick="setM(3)">TRIPLE</button>
        </div>
        <div class="padgrid">${Array.from({ length: 20 }, (_, i) => `<button class="${fl(i + 1, M)}" onclick="arrHit(${i + 1},M)">${i + 1}</button>`).join('')}</div>
        <div class="brow">
          <button class="bull" onclick="arrHit(25,1)">BULL</button>
          <button class="bull" onclick="arrHit(25,2)">D-BULL</button>
          <button onclick="arrHit(0,0)">MISS</button>
          <button class="undo" onclick="arrUndo()">⌫ 戻す</button>
        </div>
        <div class="brow" style="grid-template-columns:1fr 1fr;margin-top:6px">
          <button onclick="arrGiveUp()">✗ 上がれず次へ</button>
          <button onclick="arrSkip()">↻ スキップ</button>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>今回の成績</h3>
        <div class="statgrid">
          <div><div class="v">${st.n}</div><div class="l">試行</div></div>
          <div><div class="v" style="color:var(--green)">${st.ok}</div><div class="l">上がり</div></div>
          <div><div class="v" style="color:var(--yel)">${st.rate.toFixed(0)}%</div><div class="l">上がり率</div></div>
        </div>
        <div class="sub center" style="margin-top:6px">${st.avg != null ? `平均 ${st.avg.toFixed(2)}投${st.fin > st.ok ? ` / 4投以上 ${st.fin - st.ok}回` : ''}` : 'まだ3投以内の上がりがありません'}</div>
      </div>
      ${G.done ? '' : `<div class="card arr-wide">
        <h3>上がり方（残り ${G.remain}）${res.n ? `<span class="sub">　${res.n}本・${res.routes.length}通り</span>` : ''}</h3>
        ${routeHtml}
      </div>`}
      ${st.n ? `<div class="card"><h3>直近の記録</h3>
        ${G.attempts.slice(-8).reverse().map(a => `<div class="rblogrow ${a.ok ? 'me' : ''}"><span class="rr">${a.target}</span><span class="dl">${a.ok ? '上がり' : '失敗'}</span><span class="pt" style="color:${a.ok ? 'var(--green)' : '#ff9d96'}">${a.darts}投</span></div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
  ARR_FLASH = null;
}
function renderArrResult(v, g) {
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>アレンジ練習（${ARR_RULE_LABEL[g.rule]}${g.mode !== 'random' ? ' / ' + g.mode + '固定' : ''}）</h3>
    <div class="bigscore">${g.rate}<span style="font-size:20px">%</span></div>
    <div class="sub">3投以内の上がり率（${g.total} / ${g.tries}）</div>
    <div class="statgrid" style="margin-top:12px">
      <div><div class="v">${g.tries}</div><div class="l">試行</div></div>
      <div><div class="v" style="color:var(--green)">${g.total}</div><div class="l">3投以内で上がり</div></div>
      <div><div class="v" style="color:var(--yel)">${g.avgDarts != null ? g.avgDarts : '—'}</div><div class="l">平均投数</div></div>
    </div>
    ${g.finished > g.total ? `<div class="sub" style="margin-top:8px">4投以上での上がり ${g.finished - g.total}回は上がり率に含みません</div>` : ''}
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startArr()">もう1セット</button>
    <button class="btn big" onclick="openArrAnalysis()">📊 分析を見る</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= 菊池山口練習法 =================
   20→19→18→17→16→15→BULL(セパレート) の順に、各10マーク入れるまでの投数を記録する。 */
const KIK_NUMS = [20, 19, 18, 17, 16, 15, 25];
const KIK_GOAL_MARKS = 10;
function kikLabel(n) { return n === 25 ? 'BULL' : String(n); }
function kikMarks(d, n) {          // その1投で入ったマーク数（BULLはセパレート: S=1 / D=2）
  if (d.seg !== n) return 0;
  return d.mult;
}
function kikDartLabel(d, n) {
  if (d.seg !== n || !d.mult) return 'MISS';
  if (n === 25) return d.mult === 2 ? 'D-BULL' : 'BULL';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S') + n;
}
function startKik() {
  G = {
    type: 'kik', idx: 0,
    marks: KIK_NUMS.map(() => 0), darts: KIK_NUMS.map(() => 0),
    total: 0, hist: [], fin: null,
  };
  PAGE = 'play';
  render();
}
function kikHit(seg, mult) {
  if (!G || G.type !== 'kik' || G.fin || G.idx >= KIK_NUMS.length) return;
  const n = KIK_NUMS[G.idx];
  const d = { seg, mult };
  KIK_FLASH = { seg, mult };
  G.hist.push({ idx: G.idx, d });
  G.darts[G.idx]++; G.total++;
  G.marks[G.idx] = Math.min(KIK_GOAL_MARKS, G.marks[G.idx] + kikMarks(d, n));
  M = 1;
  if (G.marks[G.idx] >= KIK_GOAL_MARKS) {
    G.idx++;
    if (G.idx >= KIK_NUMS.length) { kikFinish(); return; }
  }
  render();
}
function kikUndo() {
  if (!G || G.type !== 'kik' || G.fin || !G.hist.length) return;
  const h = G.hist.pop();
  G.idx = h.idx;
  G.darts[h.idx]--; G.total--;
  // その数字のマークを履歴から数え直す（上限で切り捨てた分も正しく戻る）
  let m = 0;
  G.hist.filter(x => x.idx === h.idx).forEach(x => { m = Math.min(KIK_GOAL_MARKS, m + kikMarks(x.d, KIK_NUMS[h.idx])); });
  G.marks[h.idx] = m;
  render();
}
function kikFinish() {
  const per = {};
  KIK_NUMS.forEach((n, i) => { per[n] = G.darts[i]; });
  const goal = +DB.settings.goals.kikTarget || 0;
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: 'kik', total: G.total, per, target: goal, reached: goal > 0 && G.total <= goal,
    done: G.idx >= KIK_NUMS.length, awards: {}, darts: [],
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}
function kikQuit() {
  if (!G) return;
  if (!G.total || confirm('途中でやめますか？（ここまでの投数で記録します）')) {
    if (G.total) kikFinish(); else { G = null; render(); }
  }
}
/* 集計: その日の投数（完走分）と通算平均 */
function kikStats(ds) {
  const all = DB.games.filter(g => g.type === 'kik' && g.done);
  const today = ds ? all.filter(g => g.date === ds) : [];
  const avgOf = a => a.length ? a.reduce((s, g) => s + g.total, 0) / a.length : null;
  // ナンバー別の平均投数（通算 / 今日）
  const perAvg = {}, perAvgToday = {};
  KIK_NUMS.forEach(n => {
    const v = all.map(g => g.per && g.per[n]).filter(x => x != null);
    const t = today.map(g => g.per && g.per[n]).filter(x => x != null);
    perAvg[n] = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    perAvgToday[n] = t.length ? t.reduce((s, x) => s + x, 0) / t.length : null;
  });
  return {
    perAvg, perAvgToday,
    todayN: today.length,
    todayBest: today.length ? Math.min(...today.map(g => g.total)) : null,
    todayLast: today.length ? today[today.length - 1].total : null,
    todayAvg: avgOf(today),
    allN: all.length, allAvg: avgOf(all),
    allBest: all.length ? Math.min(...all.map(g => g.total)) : null,
  };
}
let KIK_FLASH = null;
function renderKik(v, ds) {
  const i = G.idx, n = KIK_NUMS[i];
  const isBull = n === 25;
  const fl = (seg, mult) => (KIK_FLASH && KIK_FLASH.seg === seg && KIK_FLASH.mult === mult) ? ' flash' : '';
  const goal = +DB.settings.goals.kikTarget || 0;
  const rows = KIK_NUMS.map((num, k) => `<div class="kikrow ${k === i ? 'cur' : ''} ${G.marks[k] >= KIK_GOAL_MARKS ? 'done' : ''}">
      <span class="nu">${kikLabel(num)}</span>
      <span class="mk">${G.marks[k]} / ${KIK_GOAL_MARKS}</span>
      <span class="dt">${G.darts[k]}投</span>
    </div>`).join('');
  const pad = isBull
    ? `<div class="padgrid cri" style="grid-template-columns:1fr 1fr">
         <button class="bullbtn${fl(25, 1)}" onclick="kikHit(25,1)">BULL<br>1マーク</button>
         <button class="bullbtn${fl(25, 2)}" onclick="kikHit(25,2)">D-BULL<br>2マーク</button>
       </div>`
    : `<div class="padgrid cri">
         <button class="${fl(n, 1)}" onclick="kikHit(${n},1)">S${n}<br>1</button>
         <button class="${fl(n, 2)}" onclick="kikHit(${n},2)">D${n}<br>2</button>
         <button class="${fl(n, 3)}" onclick="kikHit(${n},3)">T${n}<br>3</button>
       </div>`;
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">菊池山口練習法　<span class="sub">${i + 1}/${KIK_NUMS.length}・${fmtDate(ds)}</span></span>
    <button class="btn small danger" onclick="kikQuit()">終了</button>
  </div>
  <div class="split">
    <div>
      <div class="card center">
        <div class="sub">狙うナンバー</div>
        <div class="bigscore" style="font-size:46px">${kikLabel(n)}</div>
        <div class="kikcount"><b>${G.marks[i]}</b><span>/ ${KIK_GOAL_MARKS} マーク</span></div>
        <div class="kikpips">${Array.from({ length: KIK_GOAL_MARKS }, (_, k) => `<i class="${k < G.marks[i] ? 'on' : ''}"></i>`).join('')}</div>
        <div class="sub">あと ${KIK_GOAL_MARKS - G.marks[i]} マーク　/　このナンバー ${G.darts[i]}投</div>
        ${(() => {
          const cur = G.hist.filter(h => h.idx === i);
          if (!cur.length) return '<div class="sub center" style="margin-top:8px">投げた結果をタップしてください</div>';
          const last6 = cur.slice(-6);
          return `<div class="dartchips kikchips">${last6.map((h, k) => {
            const lab = kikDartLabel(h.d, n);
            return `<span class="${k === last6.length - 1 ? 'last' : ''} ${lab === 'MISS' ? 'miss' : ''}">${lab}</span>`;
          }).join('')}</div>`;
        })()}
        <div class="statgrid" style="margin-top:8px">
          <div><div class="v">${G.total}</div><div class="l">総投数</div></div>
          <div><div class="v">${KIK_NUMS.length - i}</div><div class="l">残りナンバー</div></div>
          <div><div class="v" style="color:var(--yel)">${goal || '—'}</div><div class="l">目標投数</div></div>
        </div>
      </div>
      <div class="card padwrap">
        ${pad}
        <div class="brow" style="grid-template-columns:1fr 1fr">
          <button class="${fl(0, 0)}" onclick="kikHit(0,0)">MISS</button>
          <button class="undo" onclick="kikUndo()">⌫ 戻す</button>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>進行状況</h3>
        ${rows}
      </div>
    </div>
  </div>`;
  KIK_FLASH = null;   // 描画後にクリア（MISSなど後半の要素にも反映させるため）
}
function renderKikResult(v, g) {
  const st = kikStats(g.date);
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>菊池山口練習法</h3>
    <div class="bigscore" style="color:${g.target > 0 ? (g.reached ? 'var(--green)' : 'var(--tx)') : 'var(--tx)'}">${g.total}<span style="font-size:20px">投</span></div>
    <div class="sub">${g.done ? '全ナンバー10マーク達成' : '途中終了'}${g.target > 0 ? `　/　目標 ${g.target}投 ${g.reached ? '✓ 達成' : `（+${g.total - g.target}投）`}` : ''}</div>
    ${st.allBest != null ? `<div class="sub" style="margin-top:6px">自己ベスト ${st.allBest}投${g.done && g.total === st.allBest ? ' 🎉更新!' : ''}　/　通算平均 ${st.allAvg.toFixed(1)}投</div>` : ''}
  </div>
  <div class="card">
    <h3>ナンバー別の投数</h3>
    ${KIK_NUMS.map(n => `<div class="tgt-row"><span class="tl">${kikLabel(n)}</span><span class="tc">${g.per[n] != null ? g.per[n] + '投' : '—'}</span></div>`).join('')}
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startKik()">もう1回</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= 連続ブルチャレンジ =================
   ブル（アウター/インナーどちらでも）に連続で入った本数を数える。外したら終了。 */
function startBul() {
  G = { type: 'bul', count: 0, ib: 0, darts: [], fin: null };
  PAGE = 'play';
  render();
}
let BUL_FLASH = null;
function bulHit(mult) {   // 1=BULL, 2=D-BULL, 0=外し（終了）
  if (!G || G.type !== 'bul' || G.fin) return;
  BUL_FLASH = mult;
  if (mult === 0) { G.darts.push({ hit: false }); bulFinish(); return; }
  G.darts.push({ hit: true, ib: mult === 2 });
  G.count++; if (mult === 2) G.ib++;
  render();
}
function bulUndo() {
  if (!G || G.type !== 'bul' || G.fin || !G.darts.length) return;
  const d = G.darts.pop();
  if (d.hit) { G.count--; if (d.ib) G.ib--; }
  render();
}
function bulFinish() {
  // 連続3本ごとにハットトリック（3本ともインブルならBLACKも）としてカウンターに記録
  const hits = G.darts.filter(d => d.hit);
  const awards = {};
  for (let i = 0; i + 3 <= hits.length; i += 3) {
    awards.hat = (awards.hat || 0) + 1;
    if (hits[i].ib && hits[i + 1].ib && hits[i + 2].ib) awards.black = (awards.black || 0) + 1;
  }
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: 'bul', total: G.count, ibull: G.ib, sbull: G.count - G.ib, dartCount: G.darts.length,
    awards, darts: [],
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}
function bulStats(ds) {
  const all = DB.games.filter(g => g.type === 'bul');
  const today = ds ? all.filter(g => g.date === ds) : [];
  const avg = a => a.length ? a.reduce((s, g) => s + g.total, 0) / a.length : null;
  return {
    allN: all.length, best: all.length ? Math.max(...all.map(g => g.total)) : null, avg: avg(all),
    todayN: today.length, todayBest: today.length ? Math.max(...today.map(g => g.total)) : null, todayAvg: avg(today),
  };
}
function renderBul(v, ds) {
  const st = bulStats(ds);
  const fl = m => BUL_FLASH === m ? ' flash' : '';
  const recent = G.darts.slice(-14);
  BUL_FLASH = null;
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">連続ブルチャレンジ　<span class="sub">${fmtDate(ds)}</span></span>
    <button class="btn small danger" onclick="bulFinish()">終了</button>
  </div>
  <div class="split">
    <div>
      <div class="card center">
        <div class="sub">連続ブル</div>
        <div class="bulcount"><b>${G.count}</b><span>本</span></div>
        ${st.best != null ? `<div class="sub">自己ベスト ${st.best}本${G.count > st.best ? '　🎉更新中!' : ''}</div>` : ''}
        <div class="bulpips">${recent.map(d => `<i class="${d.hit ? (d.ib ? 'ib' : 'on') : 'ng'}"></i>`).join('')}</div>
        <div class="sub">D-BULL ${G.ib}本　/　S-BULL ${G.count - G.ib}本　/　投数 ${G.darts.length}</div>
        <div class="sub" style="margin-top:4px">ハットトリック ${Math.floor(G.count / 3)}${G.count >= 3 ? '（3本連続ごとにカウンターへ記録）' : ''}</div>
      </div>
      <div class="card padwrap">
        <div class="padgrid cri" style="grid-template-columns:1fr 1fr">
          <button class="bullbtn${fl(1)}" onclick="bulHit(1)">S-BULL<br>アウター</button>
          <button class="bullbtn${fl(2)}" onclick="bulHit(2)">D-BULL<br>インナー</button>
        </div>
        <div class="brow" style="grid-template-columns:2fr 1fr">
          <button class="${fl(0)}" onclick="bulHit(0)">✗ 外した（終了）</button>
          <button class="undo" onclick="bulUndo()">⌫ 戻す</button>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>記録</h3>
        <div class="statgrid">
          <div><div class="v" style="color:var(--yel)">${st.best != null ? st.best : '—'}</div><div class="l">自己ベスト</div></div>
          <div><div class="v">${st.avg != null ? st.avg.toFixed(1) : '—'}</div><div class="l">通算平均</div></div>
          <div><div class="v">${st.allN}</div><div class="l">回数</div></div>
        </div>
        <div class="sub center" style="margin-top:6px">${st.todayN ? `今日: 最高 ${st.todayBest}本 / 平均 ${st.todayAvg.toFixed(1)}本（${st.todayN}回）` : '今日はまだ記録がありません'}</div>
      </div>
    </div>
  </div>`;
}
function renderBulResult(v, g) {
  const st = bulStats(g.date);
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>連続ブルチャレンジ</h3>
    <div class="bigscore">${g.total}<span style="font-size:20px">本</span></div>
    <div class="statgrid" style="margin-top:12px">
      <div><div class="v" style="color:var(--red)">${g.ibull}</div><div class="l">インブル<br>（D-BULL）</div></div>
      <div><div class="v" style="color:var(--green)">${g.sbull != null ? g.sbull : g.total - g.ibull}</div><div class="l">シングルブル<br>（S-BULL）</div></div>
      <div><div class="v">${g.dartCount}</div><div class="l">投数</div></div>
    </div>
    ${(g.awards && (g.awards.hat || g.awards.black)) ? `<div class="sub" style="margin-top:8px">🏆 ハットトリック ${g.awards.hat || 0}${g.awards.black ? ` / BLACK ${g.awards.black}` : ''} をカウンターに記録しました</div>` : ''}
    ${st.best != null ? `<div class="sub" style="margin-top:8px">自己ベスト ${st.best}本${g.total === st.best ? ' 🎉更新!' : ''}　/　通算平均 ${st.avg.toFixed(1)}本</div>` : ''}
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startBul()">もう1回</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= ランダムクリケチャレンジ =================
   毎ラウンド、クリケナンバーとブルから3つの狙いをランダム表示（降順・3つ同じは不可、
   ブル始まりは後半2投を同じ数字に寄せる）。8ラウンドでMPRとミス傾向を集計。 */
const RC_ORDER = [25, 20, 19, 18, 17, 16, 15];   // 表示順の優先度（25=BULL）
function rcRank(v) { return RC_ORDER.indexOf(v); }
function rcPick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
function rcKey(a) { return a.join('-'); }        // 並びの識別子（同一ゲーム内の重複判定用）
function rcCombos(pool) {                        // pool から作れる並びを全列挙（3つとも同じは除く）
  const p = pool.slice().sort((x, y) => rcRank(x) - rcRank(y)), out = [];
  for (let i = 0; i < p.length; i++)
    for (let j = i; j < p.length; j++)
      for (let k = j; k < p.length; k++)
        if (!(i === j && j === k)) out.push([p[i], p[j], p[k]]);
  return out;
}
function rcRound(prev, used) {
  // 直前のラウンドで出た数字は続けて出さない（prev は前ラウンドの3つ）
  const ex = prev || [];
  const seen = used || [];                       // 同じゲームで既に出した並びは再出題しない
  let pool = RC_ORDER.filter(x => !ex.includes(x));
  if (pool.length < 2) pool = RC_ORDER.slice();
  for (let i = 0; i < 300; i++) {
    const a = [rcPick(pool), rcPick(pool), rcPick(pool)].sort((x, y) => rcRank(x) - rcRank(y));
    if (a[0] === a[2]) continue;                                             // 3つとも同じは出さない
    if (a[0] === 25 && a[1] !== a[2] && Math.random() < 0.7) a[2] = a[1];    // ブル始まりは後半を揃える
    if (a[0] === a[2]) continue;
    if (seen.includes(rcKey(a))) continue;                                   // 既出の並びは避ける
    return a;
  }
  // 引き当てられなかったときは未使用の並びから選ぶ（それも尽きたら直前除外を外す）
  const rest = rcCombos(pool).filter(a => !seen.includes(rcKey(a)));
  if (rest.length) return rcPick(rest);
  const all = rcCombos(RC_ORDER).filter(a => !seen.includes(rcKey(a)));
  return all.length ? rcPick(all) : rcCombos(pool)[0];
}
function rcLabel(t) { return t === 25 ? 'BULL' : 'T' + t; }
function startRck() {
  const first = rcRound();
  G = { type: 'rck', round: 1, targets: first, used: [rcKey(first)], res: [null, null, null], sel: 0, hist: [], marks: 0, fin: null };
  PAGE = 'play';
  render();
}
let RCK_FLASH = null;
function rckSel(i) { if (G && G.type === 'rck' && !G.fin) { G.sel = i; render(); } }
function rckSet(mult) {   // 選択中の投に結果を入れる（0=ミス, 1/2/3=マーク数）
  if (!G || G.type !== 'rck' || G.fin) return;
  RCK_FLASH = mult;
  G.res[G.sel] = mult;
  const next = G.res.findIndex(x => x == null);
  if (next >= 0) G.sel = next;
  render();
}
function rckUndo() {
  if (!G || G.type !== 'rck' || G.fin) return;
  const filled = G.res.map((x, i) => x == null ? -1 : i).filter(i => i >= 0);
  if (filled.length) {                        // 直近に入れた投を取り消す
    const i = filled[filled.length - 1];
    G.res[i] = null; G.sel = i;
  } else if (G.hist.length >= 3) {            // 前のラウンドへ戻る
    const back = G.hist.splice(-3, 3);
    const drop = G.used.lastIndexOf(rcKey(G.targets));   // 破棄するラウンドの並びは既出から外す
    if (drop >= 0) G.used.splice(drop, 1);
    G.marks -= back.reduce((s, h) => s + h.mult, 0);
    G.round = back[0].r;
    G.targets = back[0].tg.slice();
    G.res = back.map(h => h.mult);
    G.sel = 2;
  }
  render();
}
function rckConfirm() {     // 3投分そろってからラウンド確定
  if (!G || G.type !== 'rck' || G.fin || G.res.some(x => x == null)) return;
  G.res.forEach((m, i) => G.hist.push({ r: G.round, t: G.targets[i], mult: m, tg: G.targets.slice() }));
  G.marks += G.res.reduce((s, m) => s + m, 0);
  if (G.round >= 8) { rckFinish(); return; }
  G.round++; G.targets = rcRound(G.targets, G.used); G.used.push(rcKey(G.targets));
  G.res = [null, null, null]; G.sel = 0;
  render();
}
function rckPer(hist) {          // ナンバー別の集計
  const per = {};
  hist.forEach(h => {
    const m = per[h.t] = per[h.t] || { t: h.t, att: 0, miss: 0, marks: 0, tri: 0 };
    m.att++; m.marks += h.mult;
    if (h.mult === 0) m.miss++;
    if (h.t === 25 ? h.mult === 2 : h.mult === 3) m.tri++;
  });
  return Object.values(per).map(m => ({ ...m, missRate: m.att ? m.miss / m.att * 100 : 0, triRate: m.att ? m.tri / m.att * 100 : 0 }));
}
function rckLogRows(hist, limit) {   // ラウンド履歴（新しい順）
  const rounds = {};
  hist.forEach(h => { (rounds[h.r] = rounds[h.r] || []).push(h); });
  const keys = Object.keys(rounds).map(Number).sort((a, b) => b - a).slice(0, limit || 99);
  if (!keys.length) return '<div class="sub center">確定したラウンドがここに表示されます</div>';
  return keys.map(r => {
    const a = rounds[r], mk = a.reduce((s, h) => s + h.mult, 0);
    return `<div class="rckrow">
      <span class="rr">R${r}</span>
      <span class="tg">${a.map(h => `<i class="${h.mult ? 'hit' : 'miss'}">${rcLabel(h.t)}<b>${h.mult}</b></i>`).join('')}</span>
      <span class="mk">${mk}mk</span>
    </div>`;
  }).join('');
}
function rckFinish() {
  const per = {};
  rckPer(G.hist).forEach(m => { per[m.t] = { att: m.att, miss: m.miss, marks: m.marks, tri: m.tri }; });
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: 'rck', total: G.marks, mpr: +(G.marks / 8).toFixed(2), rounds: 8, dartCount: G.hist.length,
    per, awards: {}, darts: [],
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}
function rckStats(ds) {
  const all = DB.games.filter(g => g.type === 'rck');
  const today = ds ? all.filter(g => g.date === ds) : [];
  const avg = a => a.length ? a.reduce((s, g) => s + g.mpr, 0) / a.length : null;
  const per = {};
  all.forEach(g => {
    for (const k in (g.per || {})) {
      const m = per[k] = per[k] || { t: +k, att: 0, miss: 0, tri: 0 };
      m.att += g.per[k].att; m.miss += g.per[k].miss; m.tri += g.per[k].tri || 0;
    }
  });
  const list = Object.values(per).map(m => ({ ...m, missRate: m.att ? m.miss / m.att * 100 : 0, triRate: m.att ? m.tri / m.att * 100 : 0 }))
    .sort((a, b) => b.missRate - a.missRate || b.att - a.att);
  return {
    allN: all.length, best: all.length ? Math.max(...all.map(g => g.mpr)) : null, avg: avg(all),
    todayN: today.length, todayBest: today.length ? Math.max(...today.map(g => g.mpr)) : null, todayAvg: avg(today),
    miss: list,
  };
}
function renderRck(v, ds) {
  const fl = m => RCK_FLASH === m ? ' flash' : '';
  RCK_FLASH = null;
  const t = G.targets[G.sel];
  const isB = t === 25;
  const filled = G.res.filter(x => x != null).length;
  const chips = G.targets.map((x, i) => {
    const m = G.res[i];
    const cls = [i === G.sel ? 'cur' : '', m == null ? '' : (m ? 'hit' : 'miss')].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="rckSel(${i})">
      <span class="no">${i + 1}投目</span>
      <span class="tg">${rcLabel(x)}</span>
      <span class="mk">${m == null ? '—' : (m ? m + 'mk' : 'ミス')}</span>
    </button>`;
  }).join('');
  const pad = isB
    ? `<div class="padgrid cri" style="grid-template-columns:1fr 1fr">
         <button class="bullbtn${fl(1)}" onclick="rckSet(1)">S-BULL<br>1マーク</button>
         <button class="bullbtn${fl(2)}" onclick="rckSet(2)">D-BULL<br>2マーク</button>
       </div>`
    : `<div class="padgrid cri">
         <button class="${fl(1)}" onclick="rckSet(1)">S${t}<br>1</button>
         <button class="${fl(2)}" onclick="rckSet(2)">D${t}<br>2</button>
         <button class="${fl(3)}" onclick="rckSet(3)">T${t}<br>3</button>
       </div>`;
  const mpr = G.hist.length ? G.marks / (G.hist.length / 3) : 0;
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">ランダムクリケ　<span class="sub">R${G.round}/8・${fmtDate(ds)}</span></span>
    <button class="btn small danger" onclick="quitGame()">破棄</button>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="sub center">このラウンドの狙い（3投投げてから入力）</div>
        <div class="rctargets">${chips}</div>
        <div class="statgrid" style="margin-top:6px">
          <div><div class="v">${G.marks}</div><div class="l">マーク</div></div>
          <div><div class="v" style="color:var(--yel)">${mpr.toFixed(2)}</div><div class="l">MPR</div></div>
          <div><div class="v">${filled}/3</div><div class="l">入力済み</div></div>
        </div>
        <div class="arr-narrow"><div class="rcklog nr">${rckLogRows(G.hist, 3)}</div></div>
      </div>
      <div class="card padwrap">
        <div class="sub center" style="margin-bottom:6px">${G.sel + 1}投目：<b style="color:var(--yel)">${rcLabel(t)}</b> の結果を入力</div>
        ${pad}
        <div class="brow" style="grid-template-columns:2fr 1fr">
          <button class="${fl(0)}" onclick="rckSet(0)">✗ ミス</button>
          <button class="undo" onclick="rckUndo()">⌫ 戻す</button>
        </div>
        <button class="btn ${filled === 3 ? 'primary' : ''} big confirmbtn" style="margin-top:8px" ${filled === 3 ? '' : 'disabled'} onclick="rckConfirm()">${G.round >= 8 ? '✔ 終了して記録' : '✔ ラウンド確定'}</button>
      </div>
    </div>
    <div>
      <div class="card arr-wide">
        <h3>ラウンド履歴</h3>
        <div class="rcklog">${rckLogRows(G.hist)}</div>
      </div>
      <div class="card arr-wide">
        <h3>ナンバー別（今回）</h3>
        ${rckPer(G.hist).sort((a, b) => rcRank(a.t) - rcRank(b.t)).map(m => `<div class="tgt-row">
          <span class="tl">${rcLabel(m.t)}<span class="sub">（${m.att}投）</span></span>
          <span class="tv">${m.marks}mk</span>
          <span class="tc" style="color:${m.miss ? '#ff9d96' : 'var(--green)'}">ミス${m.miss}</span>
        </div>`).join('') || '<div class="sub">まだ投げていません</div>'}
      </div>
    </div>
  </div>`;
}
function renderRckResult(v, g) {
  const st = rckStats(g.date);
  const per = Object.keys(g.per || {}).map(k => ({ t: +k, ...g.per[k] }))
    .map(m => ({ ...m, missRate: m.att ? m.miss / m.att * 100 : 0 }))
    .sort((a, b) => b.missRate - a.missRate || b.miss - a.miss);
  v.innerHTML = `
  <h2>結果</h2>
  <div class="card center">
    <h3>ランダムクリケチャレンジ</h3>
    <div class="bigscore">${g.mpr}<span style="font-size:18px"> MPR</span></div>
    <div class="sub">${g.total}マーク / ${g.dartCount}投（8ラウンド）</div>
    ${st.best != null ? `<div class="sub" style="margin-top:8px">自己ベスト MPR ${st.best}${g.mpr === st.best ? ' 🎉更新!' : ''}　/　通算平均 ${st.avg.toFixed(2)}</div>` : ''}
  </div>
  <div class="card">
    <h3>ミスが多いナンバー</h3>
    ${per.map((m, i) => `<div class="tgt-row">
      <span class="tl">${i === 0 && m.miss ? '💧 ' : ''}${rcLabel(m.t)}<span class="sub">（${m.att}投）</span></span>
      <span class="tv" style="color:${m.miss ? '#ff9d96' : 'var(--green)'}">ミス ${m.miss}</span>
      <span class="tc">${m.missRate.toFixed(0)}%</span>
    </div>`).join('')}
    <div class="sub" style="margin-top:6px">ミス率の高い順。トリプル ${per.reduce((s, m) => s + (m.tri || 0), 0)}本</div>
  </div>
  <div class="card">
    <button class="btn primary big" onclick="startRck()">もう1ゲーム</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

// クリケットCUのラウンド別ターゲット（R1〜R6: 20→15、R7: ブル、R8: 全対象）
const CRI_TGT = [20, 19, 18, 17, 16, 15, 25, 0];
const CRI_TGT_LABEL = ['20', '19', '18', '17', '16', '15', 'BULL', 'ALL'];

function renderPlaySelect(v, ds) {
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  const hide = DB.settings.hide || {};
  v.innerHTML = `
  <h2 style="display:flex;align-items:center;justify-content:space-between;gap:8px">
    <span>${fmtDate(ds)} のプレイ${DB.settings.dateOverride ? ' <span class="badge part">手動日付</span>' : ''}</span>
    <button class="btn small" onclick="openDateChange()">📅 日付変更</button>
  </h2>
  <div class="card">
    ${(() => {
      const bs = DB.bullSuspend && DB.bullSuspend.date === ds && (DB.bullSuspend.darts || []).length ? '（中断あり）' : '';
      const cs = DB.crkSuspend && DB.crkSuspend.date === ds && (DB.crkSuspend.darts || []).length ? '（中断あり）' : '';
      const defs = {
        cu: ['primary', 'カウントアップ', `8ラウンド×3投。ブルは${DB.settings.bullMode === 'fat' ? 'ファットブル（50点）' : 'セパレート（25/50点）'}。`, "startGame('cu')"],
        cri: ['green', 'クリケットカウントアップ', 'R1〜R6は20→15、R7はブル、R8は15〜20とブルすべてが対象。', "startGame('cri')"],
        cnu: ['teal', 'クリケナンバーCU', '選んだナンバーのトリプルを狙い、実点数を8ラウンド累計。ナンバー別の得意/不得意も表示。', "startGame('cnu')"],
        arr: ['amber', 'アレンジ練習', '21〜180の残り数字を上がる練習。上がり方（アウトパターン）を全通り表示。', "startGame('arr')"],
        bull: ['blue', 'ブルチャレンジ' + bs, 'ダブルブル+2 / シングルブル+1 / その他−1 で目標点。新規/再開を選べます。', "startGame('bull')"],
        crk: ['purple', 'クリケチャレンジ' + cs, '指定ナンバーの T+3/D+2/S+1/その他−2 で目標点。開始時にナンバー選択、新規/再開も選べます。', "startGame('crk')"],
        kik: ['pink', '菊池山口練習法', '20→15→BULLの順に各10マーク。ナンバー別と全体の投数を記録。', "startGame('kik')"],
        bul: ['rose', '連続ブルチャレンジ', 'ブルに連続で入った本数を記録。外したら終了（インナー・アウターどちらもブル）。', "startGame('bul')"],
        rck: ['indigo', 'ランダムクリケチャレンジ', '毎ラウンド3つの狙いをランダム表示して8ラウンド。MPRとミス傾向を集計。', "startGame('rck')"],
        robot: ['robot', '🤖 ROBOT対戦', 'レーティングで強さを設定したCPUと 01 / クリケット / メドレー で対戦。', 'openRobot()'],
      };
      const shown = GAME_LIST.filter(x => !hide[x.k]);
      if (!shown.length) return '<div class="sub center">すべてのゲームが非表示です。設定 › ゲームの表示/非表示 で表示できます。</div>';
      return shown.map((x, i) => {
        const [color, label, desc, act] = defs[x.k];
        const last = i === shown.length - 1;
        return `<button class="btn ${color} big"${last ? ' style="margin-bottom:0"' : ''} onclick="${act}">${label}</button>
          <div class="sub" style="margin-bottom:${last ? '0' : '14px'}">${desc}</div>`;
      }).join('');
    })()}
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
  if (G.type === 'arr') { renderArr(v, ds0); return; }
  if (G.type === 'kik') { renderKik(v, ds0); return; }
  if (G.type === 'bul') { renderBul(v, ds0); return; }
  if (G.type === 'rck') { renderRck(v, ds0); return; }

  const type = G.type, bullMode = DB.settings.bullMode;
  const total = G.darts.reduce((s, d) => s + dartPoint(d, type, bullMode), 0);
  G.confirmed = G.confirmed || 0;
  const rIdx = Math.floor(G.confirmed / 3);
  const inRound = G.darts.slice(G.confirmed);

  // 確定したラウンドまでのリアルタイムスタッツ（保存後の結果画面と同じ基準で計算する）
  const cDarts = G.darts.slice(0, G.confirmed);
  const cRounds = Math.floor(G.confirmed / 3);
  const cTotal = cDarts.reduce((s, d) => s + dartPoint(d, type, bullMode), 0);
  const cMarks = type === 'cri' ? cDarts.reduce((s, d) => s + criMark(d), 0) : 0;
  const cBulls = cDarts.filter(d => d.seg === 25).length;
  const avgR = cRounds ? cTotal / cRounds : null;
  const nv = (x, dec, unit) => x == null ? '—' : x.toFixed(dec) + (unit || '');
  const liveStats = type === 'cri'
    ? [['MPR', nv(cRounds ? cMarks / cRounds : null, 2), 'var(--yel)'],
       ['マーク', cRounds ? cMarks : '—', ''],
       ['1R平均点', nv(avgR, 1), '']]
    : [['1R平均スタッツ', nv(avgR, 2), 'var(--yel)'],
       ['ブル率', nv(cRounds ? cBulls / (cRounds * 3) * 100 : null, 1, '%'), ''],
       ['予測（8R換算）', avgR == null ? '—' : Math.round(avgR * 8), 'var(--green)']];
  const liveStatHTML = `
        <div class="statgrid livestat">
          ${liveStats.map(([l, x, c]) => `<div><div class="v"${c ? ` style="color:${c}"` : ''}>${x}</div><div class="l">${l}</div></div>`).join('')}
        </div>
        <div class="sub center livenote">${cRounds ? `R1〜R${cRounds} の確定分` : 'ラウンドを確定すると表示されます'}</div>`;

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
      <button class="btn small panelbtn" onclick="openQualNow()">★ 評価</button>
      <button class="btn small panelbtn" onclick="openGamePanel()">📋 メモ</button>
      <button class="btn small danger" onclick="quitGame()">破棄</button>
    </span>
  </div>
  <div class="split">
    <div>
      <div class="card">
        <div class="bigscore">${total}</div>
        ${liveStatHTML}
        <div class="dartchips">${chips}</div>
        <div class="roundbar">${roundCells.join('')}</div>
      </div>
      <div class="card padwrap">
        ${pad}
        <div class="confirmrow">
          <button class="btn ${(type === 'cri' || inRound.length === 3) ? 'primary' : ''} big confirmbtn" ${(type === 'cri' || inRound.length === 3) ? '' : 'disabled'} onclick="confirmRound()">${rIdx === 7 ? '✔ ゲーム終了（保存）' : '✔ ラウンド確定'}${type === 'cri' && inRound.length < 3 ? '<span class="sub" style="font-weight:400">（空きはMISS）</span>' : ''}</button>
          ${timerChip()}
        </div>
      </div>
    </div>
    <div>
      ${qualCard()}
      <div class="card ctr-compact">
        <h3>アワードカウンター（今日）</h3>
        ${COUNTERS.map(c => counterRow(ds, c, disp)).join('')}
        <div class="sub">自動判定分も含めた表示です（保存時に確定）。+/− は手動分の調整。</div>
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
      <button class="${fl(1)}" onclick="hit(${num},1)">S${num}<br>+${num}</button>
      <button class="${fl(2)}" onclick="hit(${num},2)">D${num}<br>+${num * 2}</button>
      <button class="${fl(3)}" onclick="hit(${num},3)">T${num}<br>+${num * 3}</button>
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
  ${breakdownCard(g)}
  ${cnuRankingCard()}
  <div class="card">
    <button class="btn primary big" onclick="startGame('cnu')">もう1回（ナンバー選択）</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= ラウンド別・1投ごとの内訳 ================= */
// 保存時のブル設定を得点から逆算（設定を後から変えても内訳が合うように）
function inferBullMode(g) {
  if (g.type !== 'cu' || !g.darts || !g.darts.length) return DB.settings.bullMode;
  const sum = m => g.darts.reduce((s, d) => s + cuPoint(d, m), 0);
  if (sum('fat') === g.total) return 'fat';
  if (sum('separate') === g.total) return 'separate';
  return DB.settings.bullMode;
}
function segLabel(d) {
  if (!d || d.seg === 0) return 'MISS';
  if (d.seg === 25) return d.mult === 2 ? 'D-BULL' : 'BULL';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S') + d.seg;
}
/* ラウンド表: R番号（クリケは狙い）・3投それぞれの結果と得点・ラウンド計・累計 */
function roundBreakdown(g) {
  const darts = g.darts || [];
  if (darts.length < 3) return '';
  const bm = inferBullMode(g);
  const pts = d => g.type === 'cu' ? cuPoint(d, bm) : g.type === 'cri' ? criPoint(d) : cnuPoint(d, g.num);
  const mk = d => g.type === 'cri' ? criMark(d) : g.type === 'cnu' ? cnuMark(d, g.num) : 0;
  const showMarks = g.type === 'cri' || g.type === 'cnu';
  let cum = 0;
  const rows = [];
  for (let i = 0; i + 3 <= darts.length; i += 3) {
    const r = darts.slice(i, i + 3);
    const rp = r.reduce((s, d) => s + pts(d), 0);
    const rm = r.reduce((s, d) => s + mk(d), 0);
    cum += rp;
    const ri = i / 3;
    const tgt = g.type === 'cri' ? CRI_TGT_LABEL[ri] : g.type === 'cnu' ? String(g.num) : '';
    rows.push(`<div class="brdrow">
      <span class="rd">R${ri + 1}${tgt ? `<span class="tg">${tgt}</span>` : ''}</span>
      <span class="dts">${r.map(d => {
        const p = pts(d), zero = p === 0 && mk(d) === 0;
        return `<span class="dt${zero ? ' miss' : ''}">${segLabel(d)}<b>${p}</b></span>`;
      }).join('')}</span>
      <span class="rt">${rp}${showMarks ? `<span class="sub"> ${rm}mk</span>` : ''}</span>
      <span class="cum">${cum}</span>
    </div>`);
  }
  return `<div class="brdtable">
    <div class="brdhead"><span class="rd">R</span><span class="dts">1投目 / 2投目 / 3投目</span><span class="rt">R計</span><span class="cum">累計</span></div>
    ${rows.join('')}
  </div>`;
}
/* カウントアップ用: どのナンバーを何回・何点取ったか */
function numberBreakdown(g) {
  const darts = g.darts || [];
  if (!darts.length) return '';
  const bm = inferBullMode(g);
  const map = {};
  darts.forEach(d => {
    const k = d.seg === 0 ? 'MISS' : d.seg === 25 ? 'BULL' : String(d.seg);
    map[k] = map[k] || { k, n: 0, p: 0, s: 0, dd: 0, t: 0 };
    map[k].n++; map[k].p += cuPoint(d, bm);
    if (d.seg !== 0) { if (d.mult === 3) map[k].t++; else if (d.mult === 2) map[k].dd++; else map[k].s++; }
  });
  const list = Object.values(map).sort((a, b) => b.p - a.p || b.n - a.n);
  return `<div class="brdtable">
    ${list.map(m => `<div class="brdrow">
      <span class="rd">${m.k}</span>
      <span class="dts"><span class="sub">${m.n}投${m.k === 'MISS' ? '' : m.k === 'BULL'
        ? `（${[m.dd ? 'D-BULL ' + m.dd : '', m.s ? 'BULL ' + m.s : ''].filter(Boolean).join(' / ')}）`
        : `（${[m.t ? 'T' + m.t : '', m.dd ? 'D' + m.dd : '', m.s ? 'S' + m.s : ''].filter(Boolean).join(' ')}）`}</span></span>
      <span class="cum">${m.p}点</span>
    </div>`).join('')}
  </div>`;
}
function breakdownCard(g) {
  if (!g.darts || g.darts.length < 3) return '';
  return `<div class="card">
    <h3>ラウンド別の内訳</h3>
    ${roundBreakdown(g)}
    ${g.type === 'cu' ? `<h3 style="margin-top:14px">ナンバー別の内訳</h3>${numberBreakdown(g)}` : ''}
  </div>`;
}
/* 履歴のゲーム一覧から内訳を見る */
function openBreakdown(id) {
  const g = DB.games.find(x => x.id === id);
  if (!g || !g.darts || g.darts.length < 3) { alert('このゲームには1投ごとの記録がありません'); return; }
  MODAL_KIND = 'breakdown';
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">${TYPE_LABEL[g.type]}${g.num ? ' No.' + g.num : ''}　${g.total}点</span><button onclick="closeModal()">閉じる</button></div>
      ${qualResultCard(g)}
      ${breakdownCard(g)}
    </div>
  </div>`;
}

/* 結果画面の目標判定（このゲーム単体 と その日の到達状況） */
function resultGoalCard(g) {
  if (g.type !== 'cu' && g.type !== 'cri') return '';
  const gl = DB.settings.goals;
  const goal = +(g.type === 'cu' ? gl.cuBest : gl.criBest) || 0;
  const low = +(g.type === 'cu' ? gl.cuMin : gl.criMin) || 0;
  if (!goal && !low) return '';
  const s = dayStats(g.date, g.type);
  const rows = [];
  if (goal) {
    const hit = g.total >= goal;                       // このゲーム単体
    const dayHit = !!s && s.best >= goal;              // その日の達成状況
    rows.push(`<div class="goal-row ${hit ? 'met' : 'unmet'}"><span class="mk">${hit ? '✓' : '○'}</span>
      目標 ${goal}点：${hit ? 'このゲームで達成！' : `あと ${goal - g.total}点`}</div>`);
    if (!hit) rows.push(`<div class="goal-row ${dayHit ? 'met' : 'unmet'}"><span class="mk">${dayHit ? '✓' : '○'}</span>
      今日の目標：${dayHit ? `達成済み（ベスト ${s.best}）` : `未達（ベスト ${s ? s.best : 0}）`}</div>`);
  }
  if (low) {
    if (g.total < low) rows.push(`<div class="warn-row"><span class="mk">⚠</span>下限 ${low}点を下回りました（このゲーム ${g.total}点）</div>`);
    else if (s && s.min < low) rows.push(`<div class="warn-row"><span class="mk">⚠</span>今日は下限 ${low}点を下回ったゲームがあります（最低 ${s.min}点）</div>`);
    else rows.push(`<div class="goal-row met"><span class="mk">✓</span>下限 ${low}点をクリア</div>`);
  }
  return `<div class="card"><h3>目標の達成状況</h3>${rows.join('')}</div>`;
}

/* 結果画面: 各ラウンドの1投目だけを見たスタッツ（このゲーム / 今日 / 通算） */
function firstDartCard(g, ds) {
  if (g.type !== 'cu' && g.type !== 'cri') return '';
  const cri = g.type === 'cri';
  const name = cri ? '1投目トリプル率' : '1投目ブル率';
  const cur = firstOf(g);
  const note = cri
    ? 'ブル狙いのラウンドはトリプルが無いため母数から除いています。'
    : 'アウトブル・インブルの両方をブルとして数えています。';
  if (!cur) {
    return `<div class="card">
      <h3>${name}（各ラウンドの1投目）</h3>
      <div class="sub">このゲームは投順の記録がないため集計していません。</div>
    </div>`;
  }
  const row = (label, a, sub) => a
    ? `<div class="tgt-row">
         <span class="tl">${label}${sub ? `<span class="sub">（${sub}）</span>` : ''}</span>
         <span class="tv" style="color:var(--yel)">${a.rate.toFixed(1)}%</span>
         <span class="tc">${a.hit}/${a.n}本${cri ? '' : `（イン${a.ib}）`}</span>
       </div>`
    : `<div class="tgt-row"><span class="tl">${label}</span><span class="tv">—</span><span class="tc">記録なし</span></div>`;
  const today = firstAgg(gamesOn(ds, g.type));
  const all = firstAgg(DB.games.filter(x => x.type === g.type));
  return `<div class="card">
    <h3>${name}（各ラウンドの1投目）</h3>
    ${row('このゲーム', cur)}
    ${row('今日のトータル', today, today ? today.gn + 'G' : '')}
    ${row('通算トータル', all, all ? all.gn + 'G' : '')}
    <div class="sub" style="margin-top:8px">${note}投順を正確に記録し始めたゲームだけを集計しています。</div>
  </div>`;
}

function renderResult(v) {
  const g = G.fin;
  const ds = g.date;
  if (g.type === 'bull') { renderBullResult(v, g); return; }
  if (g.type === 'crk') { renderCrkResult(v, g); return; }
  if (g.type === 'cnu') { renderCnuResult(v, g); return; }
  if (g.type === 'arr') { renderArrResult(v, g); return; }
  if (g.type === 'kik') { renderKikResult(v, g); return; }
  if (g.type === 'bul') { renderBulResult(v, g); return; }
  if (g.type === 'rck') { renderRckResult(v, g); return; }
  const todays = gamesOn(ds, g.type);
  const s = scoreStats(todays);
  const awards = Object.entries(g.awards || {});
  const firstCard = firstDartCard(g, ds);
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
  ${firstCard}
  ${resultGoalCard(g)}
  ${qualResultCard(g)}
  ${qualNoteCard(g)}
  ${breakdownCard(g)}
  ${awards.length ? `<div class="card">
    <h3>🏆 このゲームのアワード</h3>
    ${awards.map(([k, n]) => `<div class="goal-row met"><span class="mk">✓</span>${escHtml(COUNTER_LABEL[k] || k)} × ${n}</div>`).join('')}
  </div>` : ''}
  <div class="card">
    <button class="btn primary big" onclick="startGame('${g.type}')">もう1ゲーム</button>
    <button class="btn big" style="margin-bottom:0" onclick="G=null;nav('home')">ホームへ</button>
  </div>`;
}

/* ================= スロー品質評価 & ラウンドタイマー =================
   結果（どこに刺さったか）とは切り離して、スローそのものを10点法で自己評価する。
   評価は2点刻み（10/8/6/4/2）で、スライダーを動かしたラウンドだけ記録する。 */
const QUAL_ITEMS = [
  { k: 'rel', label: 'リリース品質', sub: '手離れ', short: 'リリース',
    help: '10 指から自然に抜けた（押した感じゼロ・引っかかりゼロ）／8 少し違和感／6 押した／4 引っかかった／2 全然違う　※手離れだけを評価' },
  { k: 'form', label: 'フォーム再現性', sub: '3投の一致', short: '再現性',
    help: '10 3投とも同じ／8 ほぼ同じ／6 1投だけ違う／4 毎回違う／2 完全にバラバラ　※入ったかどうかは関係なし' },
  { k: 'rlx', label: '脱力', sub: '力み', short: '脱力',
    help: '10 かなり脱力／8 少し力が入った／6 普通／4 力んだ／2 がちがち　※肩・前腕・手首すべてを含めた力み' },
  { k: 'fol', label: 'フォロースルー', sub: '理想のフィニッシュ', short: 'フォロー',
    help: '10 自然に最後まで腕が伸びた／8 少し短い／6 普通／4 途中で止まった／2 全然出なかった' },
  { k: 'cnf', label: '自信', sub: '迷いのなさ', short: '自信',
    help: '10 これは入る（ほぼ確信）／8 入るかもなぁ／6 普通／4 怪しい／2 入る気配なし' },
];
const QUAL_OPT = { k: 'foc', label: 'フォーカス', sub: '集中・任意', short: '集中',
  help: '10 完全に集中できていた／8 ほぼ集中／6 普通／4 気が散った／2 全く集中できず　※任意項目。5項目の平均とは分けて集計します' };
const QUAL_ALL = QUAL_ITEMS.concat([QUAL_OPT]);
const QUAL_TIP = '評価するときは絶対に刺さった場所を見ないこと。投げ終わった瞬間に、自分なりに評価すること。';
const QUAL_MAP = Object.fromEntries(QUAL_ALL.map(i => [i.k, i]));

let QHELP = {};   // ？をタップして開いている項目
function qDefault() { return { rel: 6, form: 6, rlx: 6, fol: 6, cnf: 6, foc: 6 }; }
function qVals() { if (G && !G.q) G.q = qDefault(); return (G && G.q) || qDefault(); }
function qHelp(k) {                  // 開くのは常にひとつだけ（同じ？をもう一度押すと閉じる）
  const was = QHELP[k];
  QHELP = {};
  if (!was) QHELP[k] = true;
  qRefresh();
}
function qRefresh() {
  if (MODAL_KIND === 'qual') { openQualSheet(); return; }
  if (MODAL_KIND === 'panel') { openGamePanel(); return; }
  render();
}
/* スライダー操作。再描画するとドラッグが切れるので数値だけ直接書き換える */
/* 記録方式: item = 動かした項目だけ記録（既定） / round = 旧仕様（5項目まとめて記録） */
function qItemMode() { return DB.settings.qualMode !== 'round'; }
function qKeys() { if (G && !G.qKeys) G.qKeys = {}; return (G && G.qKeys) || {}; }
function qSet(k, v) {
  if (!G || G.fin) return;
  const q = qVals();
  q[k] = +v;
  qKeys()[k] = true;                                  // この項目はこのラウンドで評価した
  G.qTouched = true;
  if (k === 'foc') G.qFoc = true;
  document.querySelectorAll('.qv-' + k).forEach(el => { el.textContent = v; el.classList.remove('off'); });
  if (G.qEditRound != null) qCommitTo(G.qEditRound);   // 確定後シートからの編集は即反映
  document.querySelectorAll('.qstate').forEach(el => { el.textContent = qStateText(); });
}
function qStateText() {
  const n = (G && G.qual ? G.qual.length : 0);
  const tk = qKeys();
  const cnt = QUAL_ALL.filter(i => tk[i.k]).length;
  const cur = cnt ? `このラウンドは ${cnt}項目を評価` : 'このラウンドは未評価（動かした項目だけが記録されます）';
  return cur + '　/　' + n + 'R記録済み';
}
function qCommitTo(rIdx) {          // rIdx は0始まりのラウンド番号
  if (!G) return;
  const q = qVals(), tk = qKeys(), item = qItemMode();
  const prev = (G.qual || []).find(x => x.r === rIdx + 1) || {};
  const rec = Object.assign({}, prev, { r: rIdx + 1 });   // 既にあるラウンドには上書きせず足す
  QUAL_ITEMS.forEach(i => { if (!item || tk[i.k]) rec[i.k] = q[i.k]; });
  if (item ? tk.foc : G.qFoc) rec.foc = q.foc;
  if (!QUAL_ALL.some(i => rec[i.k] != null)) return;     // 1項目も無ければ記録しない
  G.qual = (G.qual || []).filter(x => x.r !== rec.r);
  G.qual.push(rec);
  G.qual.sort((a, b) => a.r - b.r);
}
function qCommit(rIdx) {            // ラウンド確定時。触っていない項目は記録しない
  if (!G) return;
  if (G.qTouched) qCommitTo(rIdx);
  qReset();
}
function qReset() {                 // 次のラウンドは毎回まっさらな既定位置から評価する
  if (!G) return;
  G.q = qDefault();
  G.qKeys = {};
  G.qTouched = false;
  G.qFoc = false;
}
function qRestore(rIdx) {           // 戻すで前ラウンドを開き直したときは評価も戻す
  if (!G || !G.qual) return;
  const i = G.qual.findIndex(x => x.r === rIdx + 1);
  if (i < 0) return;
  const rec = G.qual.splice(i, 1)[0];
  const q = qVals();
  G.qKeys = {};
  QUAL_ALL.forEach(it => { if (rec[it.k] != null) { q[it.k] = rec[it.k]; G.qKeys[it.k] = true; } });
  G.qTouched = QUAL_ALL.some(it => G.qKeys[it.k]);
  if (rec.foc != null) G.qFoc = true;
}
function qRow(k) {
  const it = QUAL_MAP[k], val = qVals()[k];
  const off = qItemMode() && !qKeys()[k] ? ' off' : '';
  return `<div class="qrow${k === 'foc' ? ' opt' : ''}">
    <div class="qhead">
      <span class="ql">${escHtml(it.label)}<span class="qs">（${escHtml(it.sub)}）</span></span>
      <button class="qhelp" onclick="qHelp('${k}')">?</button>
      <span class="qv qv-${k}${off}">${val}</span>
    </div>
    <input type="range" class="qsl" min="2" max="10" step="2" value="${val}" oninput="qSet('${k}',this.value)">
    <div class="qticks"><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span></div>
    ${QHELP[k] ? `<div class="qtip">${escHtml(it.help)}</div>` : ''}
  </div>`;
}
function qualCard(inSheet) {
  const r = G.qEditRound != null ? G.qEditRound : Math.floor((G.confirmed || 0) / 3);
  return `<div class="card qualcard">
    <h3>スロー品質評価<span class="sub" style="font-weight:400">　R${r + 1}</span><button class="qhelp tip" onclick="qHelp('_tip')">?</button></h3>
    ${QHELP._tip ? `<div class="qtip">${escHtml(QUAL_TIP)}</div>` : ''}
    <div class="sub qstate">${qStateText()}</div>
    ${QUAL_ITEMS.map(i => qRow(i.k)).join('')}
    ${qRow('foc')}
    ${inSheet ? '<button class="btn primary big" style="margin:10px 0 0" onclick="closeModal()">✔ 評価を閉じる</button>' : ''}
  </div>`;
}
/* 折りたたみ時は右カラムが出ないので、確定のたびに評価シートを開く */
function isNarrow() { return window.matchMedia('(max-width:639px)').matches; }
function openQualSheet(rIdx) {
  if (!G || G.fin) return;
  if (rIdx != null) {
    G.qEditRound = rIdx;
    const rec = (G.qual || []).find(x => x.r === rIdx + 1);   // すでに評価済みの項目を復元して表示
    const q = qVals();
    G.qKeys = {};
    if (rec) QUAL_ALL.forEach(it => { if (rec[it.k] != null) { q[it.k] = rec[it.k]; G.qKeys[it.k] = true; } });
  }
  MODAL_KIND = 'qual';
  const r = G.qEditRound != null ? G.qEditRound : Math.floor((G.confirmed || 0) / 3);
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head">
        <span class="ttl">スロー品質評価　<span class="sub">R${r + 1}のスロー</span></span>
        <span style="display:flex;gap:8px;align-items:center">${timerChip()}<button onclick="closeModal()">閉じる</button></span>
      </div>
      <div class="sub" style="margin-bottom:8px">${escHtml(QUAL_TIP)}</div>
      ${qualCard(true)}
    </div>
  </div>`;
}
function openQualNow() {          // ★評価ボタン: 進行中ラウンドの評価を開く
  if (!G || G.fin) return;
  G.qEditRound = null;
  openQualSheet();
}
/* ---- 集計 ---- */
function qualAvg(list) {
  if (!list || !list.length) return null;
  const out = { n: list.length, cnt: {} };
  QUAL_ALL.forEach(i => {
    const v = list.filter(r => r[i.k] != null).map(r => r[i.k]);
    out.cnt[i.k] = v.length;
    out[i.k] = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;   // 評価したラウンドだけの平均
  });
  const mains = QUAL_ITEMS.filter(i => out[i.k] != null);
  out.itemsRated = mains.length;
  out.total = mains.length ? mains.reduce((s, i) => s + out[i.k], 0) / mains.length : null;
  out.focN = out.cnt.foc;
  return out;
}
function pentagonSVG(a) {
  const W = 300, H = 246, cx = 150, cy = 116, R = 80, n = 5;
  const pt = (i, r) => { const g = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(g), cy + r * Math.sin(g)]; };
  const ring = r => Array.from({ length: n }, (_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
  const grid = [2, 4, 6, 8, 10].map(v => `<polygon points="${ring(R * v / 10)}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const axes = Array.from({ length: n }, (_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; }).join('');
  // 評価のある項目だけを結ぶ（未評価の軸は中心に落とさず、線を通さない）
  const rated = QUAL_ITEMS.map((it, i) => ({ it, i })).filter(o => a[o.it.k] != null);
  const pts = rated.map(o => pt(o.i, R * a[o.it.k] / 10));
  const str = ps => ps.map(v => v.map(x => x.toFixed(1)).join(',')).join(' ');
  const shape = pts.length >= 3
    ? `<polygon points="${str(pts)}" fill="rgba(244,182,63,.22)" stroke="var(--yel)" stroke-width="2"/>`
    : pts.length === 2 ? `<polyline points="${str(pts)}" fill="none" stroke="var(--yel)" stroke-width="2"/>` : '';
  const dots = pts.map(pp => `<circle cx="${pp[0].toFixed(1)}" cy="${pp[1].toFixed(1)}" r="3.2" fill="var(--yel)"/>`).join('');
  const labels = QUAL_ITEMS.map((it, i) => {
    const [x, y] = pt(i, R + 22);
    const an = Math.abs(x - cx) < 6 ? 'middle' : (x > cx ? 'start' : 'end');
    const has = a[it.k] != null;
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${an}" font-size="11" fill="var(--sub)">${it.short}</text>
      <text x="${x.toFixed(1)}" y="${(y + 16).toFixed(1)}" text-anchor="${an}" font-size="12" font-weight="700" fill="${has ? 'var(--yel)' : 'var(--sub)'}">${has ? a[it.k].toFixed(1) : '—'}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="pentagon">${grid}${axes}${shape}${dots}${labels}</svg>`;
}
function qualRoundTable(list, rounds) {
  if (!list || !list.length) return '';
  const byR = {};
  list.forEach(r => byR[r.r] = r);
  const max = rounds || Math.max.apply(null, list.map(r => r.r));
  const hasFoc = list.some(r => r.foc != null);
  const cols = QUAL_ITEMS.length + (hasFoc ? 1 : 0) + 1;
  return `<div class="qtable">
    <div class="qtr head"><span class="r">R</span>${QUAL_ITEMS.map(i => `<span>${i.short}</span>`).join('')}${hasFoc ? '<span>集中</span>' : ''}<span class="av">平均</span></div>
    ${Array.from({ length: max }, (_, i) => {
      const r = byR[i + 1];
      if (!r) return `<div class="qtr none"><span class="r">R${i + 1}</span><span class="na" style="flex:${cols};text-align:center">未評価</span></div>`;
      const vs = QUAL_ITEMS.filter(it => r[it.k] != null).map(it => r[it.k]);
      const av = vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
      return `<div class="qtr"><span class="r">R${r.r}</span>${QUAL_ITEMS.map(it => `<span${r[it.k] == null ? ' class="na"' : ''}>${r[it.k] != null ? r[it.k] : '—'}</span>`).join('')}${hasFoc ? `<span${r.foc == null ? ' class="na"' : ''}>${r.foc != null ? r.foc : '—'}</span>` : ''}<span class="av">${av != null ? av.toFixed(1) : '—'}</span></div>`;
    }).join('')}
  </div>`;
}
function qualResultCard(g) {
  const a = qualAvg(g.qual);
  if (!a) return '';
  const row = (label, sub, v, n) => `<div class="tgt-row">
    <span class="tl">${escHtml(label)}<span class="sub">（${escHtml(sub)}${n != null ? '・' + n + 'R' : ''}）</span></span>
    <span class="tv"${v == null ? ' style="color:var(--sub)"' : ''}>${v == null ? '—' : v.toFixed(1)}</span>
    <span class="tc"><span class="qbar"><i style="width:${v == null ? 0 : (v * 10).toFixed(0)}%"></i></span></span></div>`;
  const rounds = g.darts && g.darts.length ? Math.ceil(g.darts.length / 3) : null;
  return `<div class="card">
    <h3>スロー品質評価<span class="sub" style="font-weight:400">　${rounds ? `${rounds}R中 ${a.n}Rを評価` : `${a.n}ラウンド分`}</span></h3>
    <div class="center"><div class="bigscore" style="font-size:40px;color:var(--yel)">${a.total != null ? a.total.toFixed(1) : '—'}<span class="sub" style="font-size:15px"> / 10</span></div>
    <div class="sub">評価した${a.itemsRated}項目の平均</div></div>
    <div class="center">${pentagonSVG(a)}</div>
    ${QUAL_ITEMS.map(i => row(i.label, i.sub, a[i.k], a.cnt[i.k] || null)).join('')}
    ${a.foc != null ? row(QUAL_OPT.label, QUAL_OPT.sub, a.foc, a.focN) : ''}
    ${qualRoundTable(g.qual, rounds)}
    <div class="sub" style="margin-top:8px">各項目の平均は「その項目を評価したラウンド」だけで計算しています（項目名の横がその回数）。動かさなかった項目は記録されません。結果（どこに刺さったか）とは無関係の、スローそのものの自己評価です。</div>
  </div>`;
}
function qualNoteCard(g) {          // 1ラウンドも評価しなかった場合の表示
  if (g.type !== 'cu' && g.type !== 'cri') return '';
  if (g.qual && g.qual.length) return '';
  return `<div class="card"><div class="sub">スロー品質評価：このゲームは記録なし（全ラウンド未評価）。各ラウンドでスライダーを動かすと、そのラウンドだけが記録されます。</div></div>`;
}
function qualBadge(g) {
  const a = qualAvg(g.qual);
  return a && a.total != null ? `<span class="qbadge">品質 ${a.total.toFixed(1)}</span>` : '';
}

/* ---- ラウンドタイマー: ラウンド確定でスタート、0秒で「投げる！」 ---- */
let TMR = { id: null, end: 0, done: false, on: false, ac: null };
function timerSec() { const s = DB.settings.timerSec; return s == null ? 12 : Math.max(0, +s || 0); }
function timerStop() { if (TMR.id) clearInterval(TMR.id); TMR.id = null; TMR.on = false; TMR.done = false; }
function timerStart() {
  const s = timerSec();
  if (!s) return;
  if (TMR.id) clearInterval(TMR.id);
  TMR.on = true; TMR.done = false; TMR.end = Date.now() + s * 1000;
  TMR.id = setInterval(timerTick, 100);
  timerPaint();
}
function timerTick() {
  if (Date.now() >= TMR.end) { clearInterval(TMR.id); TMR.id = null; TMR.done = true; timerBeep(); }
  timerPaint();
}
function timerLeft() { return TMR.on ? Math.max(0, Math.ceil((TMR.end - Date.now()) / 1000)) : timerSec(); }
function timerClass() { return 'tmrchip' + (TMR.on && TMR.done ? ' go' : TMR.on ? ' run' : ''); }
function timerInner() { return TMR.on && TMR.done ? '<b>投げる！</b>' : `<b>${timerLeft()}</b><i>秒</i>`; }
function timerPaint() {
  document.querySelectorAll('.tmrchip').forEach(el => { el.className = timerClass(); el.innerHTML = timerInner(); });
}
function timerChip() {
  if (!timerSec()) return '';
  return `<button class="${timerClass()}" onclick="timerStart()">${timerInner()}</button>`;
}
function timerBeep() {
  if (DB.settings.timerSound === false) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    TMR.ac = TMR.ac || new AC();
    const ac = TMR.ac;
    if (ac.state === 'suspended') ac.resume();
    [[0, 880], [0.2, 1320]].forEach(pair => {
      const t = pair[0], f = pair[1];
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + t;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + 0.18);
    });
  } catch (e) { /* 音が出せない環境では表示のみ */ }
}
function setSetting(k, v) {
  DB.settings[k] = Math.max(0, Math.min(120, parseInt(v, 10) || 0));
  saveDB();
  render();
}
function toggleSetting(k) { DB.settings[k] = DB.settings[k] === false ? true : false; saveDB(); render(); }
function setQualMode(m) { DB.settings.qualMode = m; saveDB(); render(); }

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
    case 'ppr': return cu ? +(cu.avg / 8).toFixed(2) : null;
    case 'ppd': return cu ? +(cu.avg / 24).toFixed(2) : null;
    case 'criAvg': return cr ? +cr.avg.toFixed(1) : null;
    case 'criBest': return cr ? cr.best : null;
    case 'mpr': { const m = mprOf(crG); return m != null ? +m.toFixed(2) : null; }
    case 'rating': {
      const v = ratingFor(gamesOn(ds, 'cu'), crG);
      return v != null ? +v.toFixed(2) : null;
    }
    case 'bullRate': { const db = dayBulls(ds); return db && db.rate != null ? +db.rate.toFixed(1) : null; }
    case 'firstBull': { const a = firstAgg(gamesOn(ds, 'cu')); return a ? +a.rate.toFixed(1) : null; }
    case 'firstTriple': { const a = firstAgg(crG); return a ? +a.rate.toFixed(1) : null; }
    case 'cnuAvg': { const d = cnuDayStats(ds); return d ? +d.avg.toFixed(1) : null; }
    case 'cnuBest': { const d = cnuDayStats(ds); return d ? d.best : null; }
    case 'cnuMpr': { const d = cnuDayStats(ds); return d ? +d.mpr.toFixed(2) : null; }
    case 'cnuTriple': { const d = cnuDayStats(ds); return d ? +d.tripleRate.toFixed(1) : null; }
    case 'arrRate': {
      const gs = gamesOn(ds, 'arr');
      if (!gs.length) return null;
      let t = 0, ok = 0;
      gs.forEach(g => {                       // 試行明細があれば3投以内基準で再計算
        if (g.attempts && g.attempts.length) { t += g.attempts.length; ok += g.attempts.filter(a => a.ok && a.darts <= 3).length; }
        else { t += g.tries || 0; ok += g.total || 0; }
      });
      return t ? +(ok / t * 100).toFixed(1) : null;
    }
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
        ${(() => {
          // その日のスタッツ平均（カウントアップ PPR・PPD / クリケットCU MPR）
          const cells = [];
          if (cu) {
            cells.push(['PPR', (cu.avg / 8).toFixed(2), 'カウントアップ', 'var(--yel)']);
            cells.push(['PPD', (cu.avg / 24).toFixed(2), 'カウントアップ', '']);
          }
          if (mpr != null) cells.push(['MPR', mpr.toFixed(2), 'クリケットCU', 'var(--green)']);
          if (!cells.length) return '';
          return `<div class="daystats">${cells.map(([k, val, sub, c]) =>
            `<span><b${c ? ` style="color:${c}"` : ''}>${val}</b><i>${k}<br>${sub}</i></span>`).join('')}</div>`;
        })()}
        ${db ? `<div class="line">🎯 ブル ${db.b}本${db.b - db.appB > 0 ? `（うちDL ${db.b - db.appB}）` : ''} / インブル ${db.ib}本${db.ib - db.appIb > 0 ? `（うちDL ${db.ib - db.appIb}）` : ''}${db.rounds ? ` / 1R平均 ${(db.appB / db.rounds).toFixed(2)}本 / ブル率 ${db.rate.toFixed(1)}%` : ''}</div>` : ''}
        ${(() => {
          const ks = DB.games.filter(g => g.type === 'kik' && g.date === ds);
          if (!ks.length) return '';
          const done = ks.filter(g => g.done);
          return `<div class="line">🎯 菊池山口練習法: ${ks.length}回${done.length ? ` / 最少 ${Math.min(...done.map(g => g.total))}投・平均 ${(done.reduce((s, g) => s + g.total, 0) / done.length).toFixed(1)}投` : ''}</div>`;
        })()}
        ${(() => {
          const bs = DB.games.filter(g => g.type === 'bul' && g.date === ds);
          const rs = DB.games.filter(g => g.type === 'rck' && g.date === ds);
          const parts = [];
          if (bs.length) parts.push(`連続ブル 最高${Math.max(...bs.map(g => g.total))}本（${bs.length}回）`);
          if (rs.length) parts.push(`ランダムクリケ 最高MPR ${Math.max(...rs.map(g => g.mpr)).toFixed(2)}（${rs.length}G）`);
          return parts.length ? `<div class="line">🎯 ${parts.join(' / ')}</div>` : '';
        })()}
        ${warnList(ds).map(w => `<div class="line" style="color:#ff9d96">⚠ ${escHtml(w.label)} 最低 ${w.min}（下限 ${w.lim} 未満）</div>`).join('')}
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${memo ? `<div class="line">📝 ${escHtml(memo)}</div>` : ''}
      </div>`;
    }).join('') : '<div class="card sub center">まだ記録がありません</div>';
    body = `<div class="card"><button class="btn big" style="margin-bottom:0" onclick="openAddDate()">＋ 日付を選んで記録を追加</button></div>` + body;
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
      const unit = ['bullRate', 'firstBull', 'firstTriple'].includes(m.k) ? '%' : '';
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

/* 履歴から任意の日付の記録を開く（過去日の追加入力用） */
function openAddDate() {
  MODAL_KIND = 'adddate';
  $('#modal-root').innerHTML = `
  <div class="ovl" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-head"><span class="ttl">記録する日付を選択</span><button onclick="closeModal()">閉じる</button></div>
      <div class="card">
        <div class="sub" style="margin-bottom:10px">選んだ日の詳細を開きます。メモ・アワードカウンター・ダーツライブ記録をあとから入力できます。</div>
        <input type="date" id="adddate" class="dateinput" value="${todayStr()}">
        <button class="btn primary big" style="margin-top:12px;margin-bottom:0" onclick="openDay(document.getElementById('adddate').value||todayStr())">この日を開く</button>
      </div>
    </div>
  </div>`;
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
          <span class="sc" ${g.darts && g.darts.length >= 3 ? `onclick="openBreakdown('${g.id}')" style="cursor:pointer"` : ''}>${qualBadge(g)}<span class="sub" style="font-weight:400">${gameSub(g)}</span>　${g.total}${g.darts && g.darts.length >= 3 ? ' <span class="sub">›</span>' : ''}</span>
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
          ${(e.dl || shots.length) ? `<button class="btn small danger" onclick="clearDLDay('${ds}')">🗑 この日のDL記録を削除</button>` : ''}
        </div>
        <input type="file" id="shotin" accept="image/*" multiple style="display:none" onchange="addShot('${ds}',this)">
        ${Object.keys(dlAw).length ? `<div class="chips" style="margin-top:10px">${COUNTERS.filter(c => dlAw[c.k] > 0).map(c => `<span>${escHtml(c.label)} ×${dlAw[c.k]}</span>`).join('')}</div>` : ''}
        ${e.dl && e.dl.stats && (e.dl.stats.a01 != null || e.dl.stats.mpr != null) ? `<div class="sub" style="margin-top:8px">スタッツ平均: 01 ${e.dl.stats.a01 != null ? e.dl.stats.a01 : '—'} / CRICKET(MPR) ${e.dl.stats.mpr != null ? e.dl.stats.mpr : '—'}${e.dl.cu && e.dl.cu.avg != null ? ` / COUNT-UP ${e.dl.cu.avg}` : ''}</div>` : ''}
        ${e.dl && e.dl.memo ? `<div class="sub" style="margin-top:4px">📝 ${escHtml(e.dl.memo)}</div>` : ''}
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
function closeModal() {
  if (MODAL_KIND === 'qual' && G) {
    const was = G.qEditRound;
    G.qEditRound = null;
    if (was != null) qReset();          // 確定後シートを閉じた＝次のラウンドへ
  }
  MODAL_KIND = null; $('#modal-root').innerHTML = ''; render();
}
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
    <h3>目標下限スコア</h3>
    <div class="set-row"><label>カウントアップ（この点を下回ったら警告）</label>
      <input type="number" min="0" value="${g.cuMin || 0}" onchange="setGoal('cuMin',this.value)"></div>
    <div class="set-row"><label>クリケットCU（この点を下回ったら警告）</label>
      <input type="number" min="0" value="${g.criMin || 0}" onchange="setGoal('criMin',this.value)"></div>
    <div class="sub" style="margin-top:6px">その日の最低スコアが下限を下回ると「⚠」で警告表示します。0 で無効。</div>
  </div>

  <div class="card">
    <h3>Practice Rating</h3>
    ${(() => {
      const c = prCfg();
      const num = (label, k, step, min, max) => `<div class="set-row"><label>${label}${prHelpBtn(k)}</label>
        <input type="number" step="${step}" min="${min}" max="${max}" value="${c[k]}" onchange="setRatingCfg('${k}',this.value)"></div>${prTip(k)}`;
      return `<div class="set-row"><label>算出方式${prHelpBtn('mode')}</label>
        <span style="display:flex;gap:6px">
          <button class="btn small ${isPracticeMode() ? 'primary' : ''}" onclick="setRatingMode('practice')">Practice</button>
          <button class="btn small ${isPracticeMode() ? '' : 'primary'}" onclick="setRatingMode('legacy')">旧方式</button>
        </span></div>${prTip('mode')}
        ${num('対象にする直近ゲーム数', 'recentN', 1, 5, 200)}
        ${num('重み: 直近1〜10G', 'w1', 0.05, 0, 2)}
        ${num('重み: 11〜20G前', 'w2', 0.05, 0, 2)}
        ${num('重み: 21〜30G前', 'w3', 0.05, 0, 2)}
        ${num('Skill Stat の加重平均比率', 'avgRatio', 0.05, 0, 1)}
        ${num('Skill Stat の中央値比率', 'medRatio', 0.05, 0, 1)}
        ${num('総合での 01 の比率', 'mix01', 0.05, 0, 1)}
        ${num('総合での CRICKET の比率', 'mixCri', 0.05, 0, 1)}
        ${num('Consistency が0点になる変動係数', 'cvZero', 0.01, 0.05, 1)}
        ${num('Trend の比較窓（ゲーム数）', 'trendWindow', 1, 3, 50)}
        ${num('Match Transfer に使う本番記録の件数', 'transferN', 1, 1, 30)}
        <button class="btn" style="margin-top:8px;margin-bottom:0" onclick="resetRatingCfg()">既定値に戻す</button>
        <div class="sub" style="margin-top:8px">Practice Rating は公式レーティングではありません。境界表は DARTSLIVE 1〜18 / PHOENIX 1〜30 の実表を rating.js の RT_TABLES_DEFAULT で管理しています（DB.settings.ratingTables で上書き可）。<br>
        「旧方式」に切り替えると、Practice Rating 導入前の算出方法（単純平均・PPR=5Rt+30）に戻ります。</div>`;
    })()}
  </div>

  <div class="card">
    <h3>ラウンドタイマー</h3>
    <div class="set-row"><label>ラウンド確定からのカウントダウン（秒）<br><span class="sub">0にするとタイマーを表示しません</span></label>
      <input type="number" min="0" max="120" value="${DB.settings.timerSec == null ? 12 : DB.settings.timerSec}" onchange="setSetting('timerSec',this.value)"></div>
    <div class="set-row"><label>0秒になったら音で知らせる</label>
      <button class="btn small ${DB.settings.timerSound === false ? '' : 'primary'}" onclick="toggleSetting('timerSound')">${DB.settings.timerSound === false ? 'OFF' : 'ON'}</button></div>
    <div class="sub" style="margin-top:6px">カウントアップ / クリケットCU の入力画面の右下に表示します。ラウンド確定でスタートし、0秒で「投げる！」に変わります。タップで再スタートできます。</div>
  </div>

  <div class="card">
    <h3>スロー品質評価</h3>
    <div class="set-row"><label>記録方式${prHelpBtn('qualMode')}</label>
      <span style="display:flex;gap:6px">
        <button class="btn small ${qItemMode() ? 'primary' : ''}" onclick="setQualMode('item')">項目ごと</button>
        <button class="btn small ${qItemMode() ? '' : 'primary'}" onclick="setQualMode('round')">ラウンドごと</button>
      </span></div>${prTip('qualMode')}
    <div class="set-row"><label>ラウンド確定後に評価シートを自動で開く<br><span class="sub">折りたたみ（縦1画面）のときだけ。開いた状態では右カラムに常時表示します</span></label>
      <button class="btn small ${DB.settings.qualSheet === false ? '' : 'primary'}" onclick="toggleSetting('qualSheet')">${DB.settings.qualSheet === false ? 'OFF' : 'ON'}</button></div>
    <div class="sub" style="margin-top:6px">${escHtml(QUAL_TIP)}</div>
  </div>

  <div class="card">
    <h3>ゲームの表示/非表示</h3>
    ${GAME_LIST.map(x => `<div class="set-row"><label>${escHtml(x.label)}</label>
      <button class="btn small ${(DB.settings.hide||{})[x.k] ? '' : 'primary'}" onclick="toggleHide('${x.k}')">${(DB.settings.hide||{})[x.k] ? '非表示' : '表示'}</button></div>`).join('')}
    <div class="sub" style="margin-top:6px">非表示にするとプレイ画面のボタンが消えます（記録は残ります）。</div>
  </div>

  <div class="card">
    <h3>ブルチャレンジ</h3>
    <div class="set-row"><label>目標点数</label>
      <input type="number" min="0" value="${g.bullTarget || 0}" onchange="setGoal('bullTarget',this.value)"></div>
    <div class="sub" style="margin-top:6px">ダブルブル+2 / シングルブル+1 / その他−1 の累計がこの点数に達したら達成。0 で未設定（手動終了のみ）。</div>
  </div>

  <div class="card">
    <h3>アレンジ練習の上がりパターン</h3>
    ${(() => {
      const list = favSorted();
      return `${list.length ? list.slice(0, 5).map(favRow).join('') + (list.length > 5 ? `<div class="sub" style="margin-top:6px">ほか${list.length - 5}件</div>` : '')
        : '<div class="sub">よく使う上がり方を登録すると、アレンジ練習で一覧の先頭に表示されます。</div>'}
        <button class="btn big" style="margin-top:10px;margin-bottom:0" onclick="openFavSettings()">★ パターンを登録・編集（${list.length}件）</button>`;
    })()}
  </div>

  <div class="card">
    <h3>菊池山口練習法</h3>
    <div class="set-row"><label>目標投数（全ナンバー10マーク）</label>
      <input type="number" min="0" value="${g.kikTarget || 0}" onchange="setGoal('kikTarget',this.value)"></div>
    <div class="sub" style="margin-top:6px">20〜15とBULLで各10マークするまでの総投数の目標。少ないほど良い記録です。0 で未設定。</div>
  </div>

  <div class="card">
    <h3>クリケチャレンジ</h3>
    <div class="set-row"><label>クリケナンバーの目標点数</label>
      <input type="number" min="0" value="${g.crkTarget || 0}" onchange="setGoal('crkTarget',this.value)"></div>
    <div class="sub" style="margin-top:6px">指定ナンバーの トリプル+3 / ダブル+2 / シングル+1 / それ以外−2 の累計がこの点数に達したら達成。0 で未設定（手動終了のみ）。</div>
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
function toggleHide(k) {
  DB.settings.hide = DB.settings.hide || {};
  DB.settings.hide[k] = !DB.settings.hide[k];
  saveDB(); render();
}
/* 目標下限を下回っていないかの警告 */
function warnList(ds) {
  const g = DB.settings.goals, out = [];
  [['cu', 'カウントアップ', g.cuMin], ['cri', 'クリケットCU', g.criMin]].forEach(([t, label, lim]) => {
    if (!lim || lim <= 0) return;
    const s = dayStats(ds, t);
    if (s && s.min < lim) out.push({ label, min: s.min, lim });
  });
  return out;
}
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
/* その日のダーツライブ記録をまとめて削除（アワード・ブル・スコア・スクショ・読み取り済み印） */
async function clearDLDay(ds) {
  const d = day(ds);
  const shots = (d.dlImages || []).length;
  const aw = (d.dl && d.dl.awards) ? Object.keys(d.dl.awards).length : 0;
  const parts = [];
  if (aw) parts.push(`アワード${aw}種`);
  if (d.dl && d.dl.bulls) parts.push('ブル本数');
  if (d.dl && (d.dl.cu || d.dl.cri)) parts.push('スコア');
  if (shots) parts.push(`スクリーンショット${shots}枚`);
  if (!confirm(`${fmtDate(ds)} のダーツライブ記録を削除します。\n${parts.length ? '・' + parts.join('\n・') : ''}\n\nよろしいですか？`)) return;
  for (const id of (d.dlImages || [])) await imgDel(id).catch(() => {});
  d.dl = null; d.dlImages = []; d.ocrRead = [];
  DB.games = DB.games.filter(g => !(g.date === ds && g.src === 'dl'));   // 旧形式の取り込みスコアも除去
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
/* 「平均」行から 01 / CRICKET / COUNT-UP の3値を取り出す（"-.--" は null） */
function parseStatRow(line) {
  const toks = line.match(/\d+\.\d+|\d+|[-‐–—.]{2,}/g) || [];
  return toks.map(t => /\d/.test(t) ? parseFloat(t) : null).slice(0, 3);
}
function parseDLText(text) {
  const awards = {};
  let sbull = null, dbull = null, a01 = null, mpr = null, cuAvg = null, memo = null;
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  // STATS の平均行（01 GAMES / CRICKET / COUNT-UP の順）
  const avgIdx = lines.findIndex(l => /平均|AVERAGE|AVG/i.test(l));
  if (avgIdx >= 0) {
    let vals = parseStatRow(lines[avgIdx]);
    if (vals.filter(v => v != null).length === 0 && lines[avgIdx + 1]) vals = parseStatRow(lines[avgIdx + 1]);
    if (vals.length) {
      if (vals[0] != null && vals[0] >= 20 && vals[0] <= 200) a01 = vals[0];
      if (vals[1] != null && vals[1] >= 0.2 && vals[1] <= 8) mpr = vals[1];
      if (vals[2] != null && vals[2] >= 100 && vals[2] <= 1200) cuAvg = vals[2];
    }
  }
  // 「メモ」以降の行を本文として拾う（「メモを書く」は空欄なので除外）
  const memoIdx = lines.findIndex(l => /^メモ|MEMO/i.test(l));
  if (memoIdx >= 0) {
    const rest = lines.slice(memoIdx).join(' ').replace(/^メモ(を書く)?[:：]?/i, '').trim();
    if (rest && !/^を書く/.test(rest)) memo = rest.slice(0, 200);
  }
  for (const ln of lines) {
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
  return { awards, sbull, dbull, a01, mpr, cuAvg, memo, raw: text };
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
  const curSt = (e.dl && e.dl.stats) || {};
  const curMemo = (e.dl && e.dl.memo) || '';
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
          <input type="number" min="0" id="dl_${c.k}" value="${pre[c.k] != null ? pre[c.k] : v(cur[c.k])}" placeholder="0" onfocus="selAll(this)"></div>`).join('')}
      </div>
      <div class="card">
        <h3>ブル（S-BULL / D-BULL の本数）</h3>
        <div class="set-row"><label>S-BULL（アウトブル）</label>
          <input type="number" min="0" id="dl_sb" value="${parsed && parsed.sbull != null ? parsed.sbull : v(curB.sb)}" placeholder="0" onfocus="selAll(this)"></div>
        <div class="set-row"><label>D-BULL（インブル）</label>
          <input type="number" min="0" id="dl_db" value="${parsed && parsed.dbull != null ? parsed.dbull : v(curB.db)}" placeholder="0" onfocus="selAll(this)"></div>
        <div class="sub" style="margin-top:6px">履歴のブル数（S+D）・インブル数（D）に加算されます。空欄は0として扱います。</div>
      </div>
      <div class="card">
        <h3>DATA画面のスタッツ（平均）</h3>
        <div class="set-row"><label>01 GAMES 平均</label>
          <input type="number" step="0.01" min="0" id="dl_a01" value="${parsed && parsed.a01 != null ? parsed.a01 : v(curSt.a01)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="set-row"><label>CRICKET 平均（MPR）</label>
          <input type="number" step="0.01" min="0" id="dl_mpr" value="${parsed && parsed.mpr != null ? parsed.mpr : v(curSt.mpr)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="set-row"><label>COUNT-UP 平均</label>
          <input type="number" step="0.1" min="0" id="dl_cu_avg" value="${parsed && parsed.cuAvg != null ? parsed.cuAvg : v(curCu.avg)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="sub" style="margin-top:6px">スクショの「STATS」の平均行から自動入力されます（80%STATSで統一）。</div>
      </div>
      <div class="card">
        <h3>カウントアップ（手動入力のみ）</h3>
        <div class="set-row"><label>最高得点</label><input type="number" min="0" id="dl_cu_best" value="${v(curCu.best)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="set-row"><label>最低得点</label><input type="number" min="0" id="dl_cu_min" value="${v(curCu.min)}" placeholder="—" onfocus="selAll(this)"></div>
      </div>
      <div class="card">
        <h3>クリケットCU（手動入力のみ）</h3>
        <div class="set-row"><label>最高得点</label><input type="number" min="0" id="dl_cri_best" value="${v(curCri.best)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="set-row"><label>最低得点</label><input type="number" min="0" id="dl_cri_min" value="${v(curCri.min)}" placeholder="—" onfocus="selAll(this)"></div>
        <div class="sub" style="margin-top:6px">スコアは画像からは入力されません。最高・最低はその日の最高/最低に反映され、それぞれ1ゲーム分として平均の計算にも含まれます。</div>
      </div>
      <div class="card">
        <h3>DARTSLIVEのメモ</h3>
        <textarea class="memo" id="dl_memo" placeholder="ダーツライブに書いたメモ">${escHtml(parsed && parsed.memo != null ? parsed.memo : (curMemo || ''))}</textarea>
        <div class="sub" style="margin-top:6px">スクショにメモが写っていれば自動入力を試みます（認識精度は画像次第です）。</div>
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
/* 数値入力をタップしたら中身を選択状態にして、そのまま打ち替えられるようにする */
function selAll(el) { setTimeout(() => { try { el.select(); } catch (e) { /* number 型で未対応のブラウザは無視 */ } }, 0); }
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
  // DATA画面のスタッツ（01平均 / クリケMPR平均 / カウントアップ平均）とメモ
  const a01 = num('dl_a01'), mprv = num('dl_mpr'), cuAvg = num('dl_cu_avg');
  if (a01 != null || mprv != null) dl.stats = { a01, mpr: mprv };
  if (cuAvg != null) { dl.cu = dl.cu || {}; dl.cu.avg = cuAvg; }
  const memoEl = document.getElementById('dl_memo');
  const memoVal = memoEl ? memoEl.value.trim() : '';
  if (memoVal) dl.memo = memoVal;
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
migrateGameStats();
render();
checkImportHash();
