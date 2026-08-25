/* Practice Rating のテスト  実行: node tests/rating.test.js */
const R = require('../rating.js');

let pass = 0, fail = 0;
const log = [];
function eq(name, got, want, tol) {
  const ok = (want == null || got == null)
    ? got === want
    : Math.abs(got - want) <= (tol == null ? 1e-9 : tol);
  if (ok) { pass++; log.push('  ok   ' + name + '  = ' + got); }
  else { fail++; log.push('  FAIL ' + name + '  got ' + got + ' want ' + want); }
}
function is(name, got, want) {
  if (got === want) { pass++; log.push('  ok   ' + name + '  = ' + JSON.stringify(got)); }
  else { fail++; log.push('  FAIL ' + name + '  got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)); }
}
function head(t) { log.push('\n[' + t + ']'); }

const cfg = R.ratingCfg();
const T = R.RT_TABLES_DEFAULT;

/* 1. 1ゲームのスタッツ ---------------------------------------------------- */
head('1game stats');
eq('COUNT-UP 800 -> PPR', R.cuPPR(800), 100);
eq('COUNT-UP 800 -> PPD', R.cuPPD(800), 33.3333, 1e-4);
eq('COUNT-UP 621 -> PPR', R.cuPPR(621), 77.625);
eq('marks 3+4+2+3+5+2+3+4=26 -> MPR', R.ccuMPR([3, 4, 2, 3, 5, 2, 3, 4].reduce((a, b) => a + b, 0)), 3.25);

/* 2. テーブル線形補間（仕様書の例） --------------------------------------- */
head('table interpolation');
eq('DL01 PPR 100 -> 13.714', R.rtFromTable(T.dl01, 100), 13 + 5 / 7, 1e-6);
eq('DLCri MPR 3.60 -> 13.40', R.rtFromTable(T.dlCri, 3.60), 13.40, 1e-9);
eq('DL01 PPR 95 (境界ちょうど) -> 13.00', R.rtFromTable(T.dl01, 95), 13);
eq('DL01 PPR 94.99 -> 12.99台', R.rtFromTable(T.dl01, 94.99), 12 + 4.99 / 5, 1e-9);
eq('DL01 PPR 80 -> 10.00', R.rtFromTable(T.dl01, 80), 10);
eq('DL01 PPR 82.5 -> 10.50', R.rtFromTable(T.dl01, 82.5), 10.5);
eq('DLCri MPR 2.90 -> 10.00', R.rtFromTable(T.dlCri, 2.90), 10);
eq('DL01 下限未満 0 -> 1.00', R.rtFromTable(T.dl01, 0), 1);
eq('DL01 上限超え 200 -> 18.00(clamp)', R.rtFromTable(T.dl01, 200), 18);
eq('DLCri 上限超え 9 -> 18.00(clamp)', R.rtFromTable(T.dlCri, 9), 18);
eq('PHX01 PPD 30.00 -> 17.00', R.rtFromTable(T.phx01, 30.00), 17);
eq('PHX01 PPD 30.90 -> 17.666', R.rtFromTable(T.phx01, 30.90), 17 + 0.90 / 1.35, 1e-6);
eq('PHXCri MPR 3.25 -> 16.93', R.rtFromTable(T.phxCri, 3.25), 16 + (3.25 - 3.11) / (3.26 - 3.11), 1e-6);
eq('PHX01 上限 48+ -> 30.00', R.rtFromTable(T.phx01, 60), 30);

/* 3. 重み付け ------------------------------------------------------------- */
head('weights');
is('1本目の重み', R.rtWeightAt(0, cfg), 1.00);
is('10本目の重み', R.rtWeightAt(9, cfg), 1.00);
is('11本目の重み', R.rtWeightAt(10, cfg), 0.75);
is('20本目の重み', R.rtWeightAt(19, cfg), 0.75);
is('21本目の重み', R.rtWeightAt(20, cfg), 0.50);
is('30本目の重み', R.rtWeightAt(29, cfg), 0.50);
{
  // 最新10G=100, 次10G=80, 最古10G=60 → (100*10 + 80*7.5 + 60*5)/22.5
  const v = [].concat(Array(10).fill(100), Array(10).fill(80), Array(10).fill(60));
  eq('加重平均 3段', R.rtWeightedAvg(v, cfg), (100 * 10 + 80 * 7.5 + 60 * 5) / 22.5, 1e-9);
  eq('単純平均との差（新しい方に寄る）', R.rtWeightedAvg(v, cfg) > R.rtMean(v), true ? R.rtWeightedAvg(v, cfg) : 0, 1e9);
}
eq('ゲーム数が5でも計算できる', R.rtWeightedAvg([10, 20, 30, 40, 50], cfg), 30);
is('0件は null', R.rtWeightedAvg([], cfg), null);

/* 4. 中央値と Skill Stat -------------------------------------------------- */
head('median / skill stat');
eq('中央値(奇数)', R.rtMedian([5, 1, 3]), 3);
eq('中央値(偶数)', R.rtMedian([1, 2, 3, 4]), 2.5);
{
  const v = [100, 90, 80];  // 全部 weight 1.00
  const wa = R.rtWeightedAvg(v, cfg), md = R.rtMedian(v);
  eq('Skill = wavg*0.7 + median*0.3', R.rtSkillStat(v, cfg), wa * 0.7 + md * 0.3, 1e-9);
}
{
  // 外れ値1つの影響が単純平均より小さいこと
  const v = [1000, 600, 600, 600, 600, 600, 600, 600, 600, 600];
  const skill = R.rtSkillStat(v, cfg);
  eq('外れ値の影響が平均より小さい', skill < R.rtMean(v), true ? skill : 0, 1e9);
  eq('中央値は600', R.rtMedian(v), 600);
}

/* 5. Consistency ---------------------------------------------------------- */
head('consistency');
{
  const A = [780, 820, 805, 790, 810];      // 安定
  const B = [1000, 550, 950, 600, 900];     // ムラあり
  const ca = R.rtConsistency(A, cfg), cb = R.rtConsistency(B, cfg);
  eq('A(安定) は高得点', ca >= 85, true ? ca : 0, 1e9);
  eq('B(ムラ) は低得点', cb <= 50, true ? cb : 0, 1e9);
  eq('A > B', ca > cb, true ? ca - cb : 0, 1e9);
  is('A のグレード', R.consistencyGrade(ca), 'S');
  is('2件以下は null', R.rtConsistency([700, 800], cfg), null);
  is('全ゲーム同点なら100', R.rtConsistency([600, 600, 600], cfg), 100);
}

/* 6. 種目集計 ------------------------------------------------------------- */
head('discipline');
{
  const ppr = [100, 90, 95, 85, 105];   // 新しい順
  const d = R.rtDiscipline(ppr, T.dl01, cfg);
  is('件数', d.n, 5);
  eq('平均', d.avg, 95);
  eq('中央値', d.median, 95);
  eq('best', d.best, 105);
  eq('worst', d.worst, 85);
  eq('rating は Skill から', d.rating, R.rtFromTable(T.dl01, d.skill), 1e-12);
  is('0件は null', R.rtDiscipline([], T.dl01, cfg), null);
}
{
  const many = Array.from({ length: 40 }, (_, i) => 80 + i);
  const d = R.rtDiscipline(many, T.dl01, cfg);
  is('直近30件だけ使う', d.n, 30);
  eq('31件目以降は無視（best=109）', d.best, 109);
}

/* 7. Trend ---------------------------------------------------------------- */
head('trend');
{
  const up = [].concat(Array(10).fill(95), Array(10).fill(85));   // 直近が上
  const t = R.rtTrend(up, T.dl01, cfg);
  eq('改善傾向は正', t.diff > 0, true ? t.diff : 0, 1e9);
  is('ラベル', R.trendLabel(t.diff).text, 'Improving');
  const down = [].concat(Array(10).fill(85), Array(10).fill(95));
  is('悪化ラベル', R.trendLabel(R.rtTrend(down, T.dl01, cfg).diff).text, 'Declining');
  const flat = Array(20).fill(90);
  is('横ばいラベル', R.trendLabel(R.rtTrend(flat, T.dl01, cfg).diff).text, 'Stable');
  is('前半の窓が足りなければ null', R.rtTrend(Array(11).fill(90), T.dl01, cfg), null);
}

/* 8. Practice Rating 総合 -------------------------------------------------- */
head('practice rating');
{
  const cu = Array.from({ length: 30 }, () => ({ ppr: 92.6, ppd: 92.6 / 3 }));
  const cri = Array.from({ length: 30 }, () => ({ mpr: 3.61 }));
  const r = R.practiceRatingFrom(cu, cri, cfg);
  eq('01 Rating', r.dl01.rating, R.rtFromTable(T.dl01, 92.6), 1e-12);
  eq('Cricket Rating', r.dlCri.rating, R.rtFromTable(T.dlCri, 3.61), 1e-12);
  eq('総合 = 50:50', r.dlPracticeRating, (r.dl01.rating + r.dlCri.rating) / 2, 1e-12);
  is('practiceRating は DL と同値', r.practiceRating, r.dlPracticeRating);
  eq('PHX も算出される', r.phxPracticeRating > 0, true ? r.phxPracticeRating : 0, 1e9);
  eq('PHX 01 は PPD ベース', r.phx01.rating, R.rtFromTable(T.phx01, 92.6 / 3), 1e-12);
}
{
  // 仕様書の例: 01=13.29 / Cricket=14.40 → 13.845 → 表示 13.85
  const mix = (13.29 + 14.40) / 2;
  eq('平均', mix, 13.845, 1e-12);
  is('表示(小数第2位)', R.rtFix(mix, 2), '13.85');
}
{
  const only01 = R.practiceRatingFrom([{ ppr: 80, ppd: 80 / 3 }, { ppr: 80, ppd: 80 / 3 }], [], cfg);
  eq('CRICKETが無ければ01のみ', only01.dlPracticeRating, R.rtFromTable(T.dl01, 80), 1e-12);
  const none = R.practiceRatingFrom([], [], cfg);
  is('記録なしは null', none.dlPracticeRating, null);
}
{
  // 比率を 01:70 / Cricket:30 に変えられること
  const c2 = R.ratingCfg({ mix01: 0.70, mixCri: 0.30 });
  const r = R.practiceRatingFrom([{ ppr: 80, ppd: 80 / 3 }], [{ mpr: 3.30 }], c2);
  eq('重み変更が効く', r.dlPracticeRating, (R.rtFromTable(T.dl01, 80) * 0.7 + R.rtFromTable(T.dlCri, 3.30) * 0.3), 1e-12);
}
{
  // ベストスコアはRatingに影響しない（同じ中身で1ゲームだけ超高得点でも別枠）
  const base = Array.from({ length: 10 }, () => ({ ppr: 75, ppd: 25 }));
  const withBest = [{ ppr: 120, ppd: 40 }].concat(base.slice(1));
  const r1 = R.practiceRatingFrom(base, [], cfg).dlPracticeRating;
  const r2 = R.practiceRatingFrom(withBest, [], cfg).dlPracticeRating;
  eq('ベスト1本での上昇は限定的(<1.0Rt)', r2 - r1 < 1.0, true ? r2 - r1 : 0, 1e9);
}

/* 9. Match Transfer -------------------------------------------------------- */
head('match transfer');
{
  const m = R.matchTransfer({ ppr: 95, mpr: 3.50 }, { a01: 78, mpr: 2.90 });
  eq('01 transfer', m.t01, 78 / 95 * 100, 1e-9);
  eq('cricket transfer', m.tCri, 2.90 / 3.50 * 100, 1e-9);
  eq('総合', m.total, (78 / 95 * 100 + 2.90 / 3.50 * 100) / 2, 1e-9);
  is('01 transfer 表示', R.rtFix(m.t01, 1), '82.1');
  is('cricket transfer 表示', R.rtFix(m.tCri, 1), '82.9');
  is('総合表示', R.rtFix(m.total, 1), '82.5');
  is('実戦記録なしは null', R.matchTransfer({ ppr: 95, mpr: 3.5 }, null), null);
}

/* 10. 逆変換（目標スタッツ） ---------------------------------------------- */
head('reverse');
eq('Rt13 に必要な PPR', R.rtStatForRating(T.dl01, 13), 95);
eq('Rt13.5 に必要な PPR', R.rtStatForRating(T.dl01, 13.5), 98.5);
eq('Rt10 に必要な MPR', R.rtStatForRating(T.dlCri, 10), 2.90);
eq('往復して一致', R.rtFromTable(T.dl01, R.rtStatForRating(T.dl01, 11.4)), 11.4, 1e-9);

console.log(log.join('\n'));
console.log('\n' + (fail ? 'FAILED' : 'ALL PASS') + '  pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
