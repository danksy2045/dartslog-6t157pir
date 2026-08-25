/* =========================================================================
   旧レーティング算出方式のバックアップ（Practice Rating 導入前・2026-08-25 時点）
   ---------------------------------------------------------------------
   ・直近30ゲームの単純平均から PPR / MPR を出し、線形式で Rt に換算していた方式。
     PPR = 5*Rt + 30 / MPR = (Rt+4.5)/5 （Rt13 以上は実際の DARTSLIVE 表と乖離あり）
   ・01 と CRICKET の Rt を単純平均して総合 Rt としていた。

   戻し方
   1) アプリ内で戻す（推奨）: 設定 → レーティング算出方式 → 「旧方式（互換）」
   2) コードごと戻す: git checkout rating-v1 -- app.js style.css index.html sw.js
      （タグ rating-v1 が Practice Rating 導入直前のコミットを指しています）
   ========================================================================= */

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

