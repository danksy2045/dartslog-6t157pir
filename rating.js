/* =============================================================================
   Practice Rating エンジン
   -----------------------------------------------------------------------------
   自宅練習の COUNT-UP / CRICKET COUNT-UP から、実力の目安となる独自指標
   「Practice Rating」を算出する。DARTSLIVE / PHOENIX の公式レーティングそのもの
   ではないため、表示名は必ず Practice Rating / DL Practice Rating /
   PHX Practice Rating を使う。

   このファイルは DOM に触れない純粋な計算モジュール（node からもテストできる）。
   境界テーブル・重み・比率はすべて設定値として外に出してある。
   ========================================================================== */

/* --- レーティング変換テーブル（下限値の配列。index 0 = Rating 1 の下限） ----
   DARTSLIVE: Rt13 までは 01が5点刻み / CRICKETが0.20刻み、Rt14 以降は
   01が7点刻み / CRICKETが0.25刻みに広がる（公式表どおり）。
   PHOENIX: Rating 1〜30。01は PPD（1投あたりの点数）で判定する。            */
const RT_TABLES_DEFAULT = {
  dl01: {
    name: 'DL Practice Rating (01)', unit: 'PPR', min: 1, max: 18,
    bounds: [0, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 102, 109, 116, 123, 130],
  },
  dlCri: {
    name: 'DL Practice Rating (CRICKET)', unit: 'MPR', min: 1, max: 18,
    bounds: [0, 1.30, 1.50, 1.70, 1.90, 2.10, 2.30, 2.50, 2.70, 2.90, 3.10, 3.30, 3.50, 3.75, 4.00, 4.25, 4.50, 4.75],
  },
  phx01: {
    name: 'PHX Practice Rating (01)', unit: 'PPD', min: 1, max: 30,
    bounds: [0, 10.65, 11.90, 13.15, 14.40, 15.65, 16.90, 18.15, 19.45, 20.75, 22.05, 23.35,
      24.65, 25.95, 27.30, 28.65, 30.00, 31.35, 32.70, 34.05, 35.40, 36.80, 38.20, 39.60,
      41.00, 42.40, 43.80, 45.20, 46.60, 48.00],
  },
  phxCri: {
    name: 'PHX Practice Rating (CRICKET)', unit: 'MPR', min: 1, max: 30,
    bounds: [0, 1.10, 1.20, 1.31, 1.46, 1.61, 1.76, 1.91, 2.06, 2.21, 2.36, 2.51,
      2.66, 2.81, 2.96, 3.11, 3.26, 3.41, 3.56, 3.71, 3.86, 4.07, 4.28, 4.49,
      4.70, 4.96, 5.22, 5.48, 5.74, 6.00],
  },
};

/* --- 算出パラメータ（設定画面から変更できる） ----------------------------- */
const RATING_DEFAULTS = {
  recentN: 30,          // 対象にする直近ゲーム数（COUNT-UP / CCU それぞれ別に保持）
  w1: 1.00,             // 最新1〜10ゲームの重み
  w2: 0.75,             // 11〜20ゲーム前の重み
  w3: 0.50,             // 21〜30ゲーム前の重み
  avgRatio: 0.70,       // Skill Stat における加重平均の比率
  medRatio: 0.30,       // Skill Stat における中央値の比率
  mix01: 0.50,          // 総合レーティングでの01の比率
  mixCri: 0.50,         // 総合レーティングでのCRICKETの比率
  cvZero: 0.35,         // Consistency が0点になる変動係数（小さいほど厳しい）
  trendWindow: 10,      // Trend の比較窓（直近N と その前のN）
  transferN: 5,         // Match Transfer に使う本番記録の件数
};

function ratingCfg(over) {
  const c = {};
  for (const k in RATING_DEFAULTS) c[k] = RATING_DEFAULTS[k];
  if (over) for (const k in over) { if (over[k] != null && over[k] !== '' && !isNaN(+over[k])) c[k] = +over[k]; }
  return c;
}

/* --- 基本統計 ------------------------------------------------------------- */
function rtMedian(vals) {
  if (!vals || !vals.length) return null;
  const a = vals.slice().sort((x, y) => x - y), m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function rtMean(vals) {
  if (!vals || !vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
function rtStdev(vals) {           // 母standard deviation（ばらつきの目安）
  if (!vals || vals.length < 2) return 0;
  const m = rtMean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) * (v - m), 0) / vals.length);
}
/* 新しい順に並んだ配列に対する重み（1〜10:w1, 11〜20:w2, 21〜30:w3） */
function rtWeightAt(i, cfg) {
  if (i < 10) return cfg.w1;
  if (i < 20) return cfg.w2;
  return cfg.w3;
}
function rtWeightedAvg(valsNewestFirst, cfg) {
  if (!valsNewestFirst || !valsNewestFirst.length) return null;
  let ws = 0, sum = 0;
  valsNewestFirst.forEach((v, i) => { const w = rtWeightAt(i, cfg); ws += w; sum += v * w; });
  return ws ? sum / ws : null;
}
/* Skill Stat = 加重平均×avgRatio + 中央値×medRatio */
function rtSkillStat(valsNewestFirst, cfg) {
  if (!valsNewestFirst || !valsNewestFirst.length) return null;
  const wa = rtWeightedAvg(valsNewestFirst, cfg);
  const md = rtMedian(valsNewestFirst);
  const a = cfg.avgRatio, m = cfg.medRatio, tot = a + m || 1;
  return (wa * a + md * m) / tot;
}

/* --- テーブル → 小数レーティング（線形補間） ------------------------------ */
function rtFromTable(table, stat) {
  if (stat == null || isNaN(stat)) return null;
  const b = table.bounds, n = b.length, EPS = 1e-9;   // 境界ちょうどを丸め誤差で取りこぼさない
  if (stat <= b[0]) return table.min;
  let i = 0;
  for (let k = 0; k < n; k++) { if (stat >= b[k] - EPS) i = k; }
  const lo = b[i];
  const hi = i + 1 < n ? b[i + 1] : lo + (lo - b[i - 1]);   // 最上位帯は直前の帯幅で外挿
  let frac = hi > lo ? (stat - lo) / (hi - lo) : 0;
  frac = Math.max(0, Math.min(frac, 0.9999999));
  return Math.max(table.min, Math.min(table.max, table.min + i + frac));
}
/* レーティング → そのレーティングに必要なスタッツ（目標表示用の逆変換） */
function rtStatForRating(table, rating) {
  if (rating == null) return null;
  const r = Math.max(table.min, Math.min(table.max, rating));
  const b = table.bounds;
  const i = Math.min(b.length - 1, Math.max(0, Math.floor(r - table.min)));
  const lo = b[i];
  const hi = i + 1 < b.length ? b[i + 1] : lo + (lo - b[i - 1]);
  return lo + (hi - lo) * (r - table.min - i);
}

/* --- 1ゲームのスタッツ ---------------------------------------------------- */
function cuPPR(score) { return score / 8; }         // COUNT-UP: 8ラウンド
function cuPPD(score) { return score / 24; }        // COUNT-UP: 24投
function ccuMPR(marks) { return marks / 8; }        // CRICKET COUNT-UP: 8ラウンド

/* --- Consistency（0〜100） ------------------------------------------------
   変動係数 CV = 標準偏差 ÷ 平均。CV=0 で100点、CV=cvZero で0点の線形。 */
function rtConsistency(vals, cfg) {
  if (!vals || vals.length < 3) return null;
  const m = rtMean(vals);
  if (!m) return null;
  const cv = rtStdev(vals) / m;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv / cfg.cvZero))));
}
function consistencyGrade(v) {
  if (v == null) return '—';
  return v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : v >= 40 ? 'C' : 'D';
}

/* --- 種目ごとの集計 -------------------------------------------------------
   statsNewestFirst: 新しい順のスタッツ配列（COUNT-UPならPPR、CCUならMPR）  */
function rtDiscipline(statsNewestFirst, table, cfg) {
  const vals = statsNewestFirst.slice(0, cfg.recentN);
  if (!vals.length) return null;
  const skill = rtSkillStat(vals, cfg);
  return {
    n: vals.length,
    skill,                                   // Skill Stat（Rating換算の元データ）
    avg: rtMean(vals),
    wavg: rtWeightedAvg(vals, cfg),
    median: rtMedian(vals),
    best: Math.max.apply(null, vals),
    worst: Math.min.apply(null, vals),
    stdev: rtStdev(vals),
    consistency: rtConsistency(vals, cfg),
    rating: rtFromTable(table, skill),
  };
}

/* --- Trend: 直近N と その前のN のレーティング差 --------------------------- */
function rtTrend(statsNewestFirst, table, cfg) {
  const w = cfg.trendWindow;
  const recent = statsNewestFirst.slice(0, w);
  const prev = statsNewestFirst.slice(w, w * 2);
  if (recent.length < 3 || prev.length < 3) return null;
  const f = a => rtFromTable(table, (rtMean(a) * cfg.avgRatio + rtMedian(a) * cfg.medRatio) / (cfg.avgRatio + cfg.medRatio));
  const now = f(recent), before = f(prev);
  if (now == null || before == null) return null;
  return { diff: now - before, now, before, nRecent: recent.length, nPrev: prev.length };
}
function trendLabel(diff) {
  if (diff == null) return { icon: '→', text: 'Stable' };
  if (diff >= 0.15) return { icon: '↑', text: 'Improving' };
  if (diff <= -0.15) return { icon: '↓', text: 'Declining' };
  return { icon: '→', text: 'Stable' };
}

/* --- Practice Rating 本体 -------------------------------------------------
   cuStats  : COUNT-UP の {ppr, ppd} を新しい順に並べた配列
   criStats : CRICKET COUNT-UP の {mpr} を新しい順に並べた配列              */
function practiceRatingFrom(cuStats, criStats, cfg, tables) {
  cfg = cfg || ratingCfg();
  tables = tables || RT_TABLES_DEFAULT;
  const ppr = cuStats.map(s => s.ppr), ppd = cuStats.map(s => s.ppd), mpr = criStats.map(s => s.mpr);

  const dl01 = rtDiscipline(ppr, tables.dl01, cfg);
  const dlCri = rtDiscipline(mpr, tables.dlCri, cfg);
  const phx01 = rtDiscipline(ppd, tables.phx01, cfg);
  const phxCri = rtDiscipline(mpr, tables.phxCri, cfg);

  const mixOf = (a, b) => {
    const ra = a ? a.rating : null, rb = b ? b.rating : null;
    if (ra == null && rb == null) return null;
    if (ra == null) return rb;
    if (rb == null) return ra;
    const w1 = cfg.mix01, w2 = cfg.mixCri, tot = w1 + w2 || 1;
    return (ra * w1 + rb * w2) / tot;
  };
  const dlTotal = mixOf(dl01, dlCri);
  const phxTotal = mixOf(phx01, phxCri);

  const cons = [dl01 && dl01.consistency, dlCri && dlCri.consistency].filter(v => v != null);
  const consistency = cons.length ? Math.round(rtMean(cons)) : null;

  const t01 = rtTrend(ppr, tables.dl01, cfg);
  const tCri = rtTrend(mpr, tables.dlCri, cfg);
  let trend = null;
  if (t01 || tCri) {
    const parts = [t01 && t01.diff, tCri && tCri.diff].filter(v => v != null);
    trend = { diff: rtMean(parts), t01, tCri };
  }

  return {
    practiceRating: dlTotal,          // メイン指標（現状は DL 仕様と同一）
    dlPracticeRating: dlTotal,
    phxPracticeRating: phxTotal,
    dl01, dlCri, phx01, phxCri,
    consistency, trend,
    cu: dl01, cri: dlCri,             // 参照しやすいエイリアス
    cfg,
  };
}

/* --- Match Transfer（自宅の能力が実戦でどれだけ出せているか） --------------
   home: {ppr, mpr}  actual: {a01, mpr}（実戦の平均スタッツ）              */
function matchTransfer(home, actual) {
  if (!home || !actual) return null;
  const t01 = (home.ppr && actual.a01 != null) ? actual.a01 / home.ppr * 100 : null;
  const tCri = (home.mpr && actual.mpr != null) ? actual.mpr / home.mpr * 100 : null;
  const parts = [t01, tCri].filter(v => v != null);
  if (!parts.length) return null;
  return { t01, tCri, total: rtMean(parts) };
}

/* --- 表示ヘルパ（0.005 の丸め誤差対策込み） ------------------------------- */
function rtFix(v, d) {
  if (v == null || isNaN(v)) return '—';
  const p = Math.pow(10, d == null ? 2 : d);
  return (Math.round(v * p + 1e-9) / p).toFixed(d == null ? 2 : d);
}
/* フライト表記は既存の flightOf(app.js) をそのまま使う */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RT_TABLES_DEFAULT, RATING_DEFAULTS, ratingCfg,
    rtMedian, rtMean, rtStdev, rtWeightAt, rtWeightedAvg, rtSkillStat,
    rtFromTable, rtStatForRating, cuPPR, cuPPD, ccuMPR,
    rtConsistency, consistencyGrade, rtDiscipline, rtTrend, trendLabel,
    practiceRatingFrom, matchTransfer, rtFix,
  };
}
