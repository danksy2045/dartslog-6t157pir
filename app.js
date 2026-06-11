'use strict';

/* ================= 定数 ================= */
const COUNTERS = [
  { k: 'hat',      label: 'ハットトリック',        auto: '1Rでブル3本' },
  { k: 'black',    label: 'BLACK（D-BULL×3）',     auto: '1RでD-BULL3本（ハットにも+1）' },
  { k: 'm9',       label: '9マーク',               auto: 'クリケットCUで1R9マーク' },
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
const TYPE_LABEL = { cu: 'カウントアップ', cri: 'クリケットCU' };
const WDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const METRICS = [
  { k: 'cuAvg',   label: 'カウントアップ 平均',   kind: 'line', color: '#4f8cff' },
  { k: 'cuBest',  label: 'カウントアップ ベスト', kind: 'line', color: '#4f8cff' },
  { k: 'criAvg',  label: 'クリケットCU 平均',     kind: 'line', color: '#3dba6f' },
  { k: 'criBest', label: 'クリケットCU ベスト',   kind: 'line', color: '#3dba6f' },
  { k: 'mpr',     label: 'MPR',                   kind: 'line', color: '#f4b63f' },
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
  };
}
function loadDB() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY));
    if (!d || !d.settings || !d.games) return initDB();
    d.settings.goals = d.settings.goals || { cuBest: 0, criBest: 0, counters: {} };
    d.settings.goals.counters = d.settings.goals.counters || {};
    d.days = d.days || {};
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
function todayStr() { return ymd(new Date()); }
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
  return c;
}

/* ================= レーティング（ダーツライブ換算・目安） ================= */
function rt01FromPPR(p) {
  let r = 1;
  for (let n = 2; n <= 18; n++) { if (p >= 40 + (n - 2) * 20 / 3 - 1e-9) r = n; }
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
  let total = null;
  if (r01 != null && rcri != null) total = Math.round((r01 + rcri) / 2);
  else total = r01 != null ? r01 : rcri;
  return { r01, rcri, ppr, mpr, total };
}
function recentGames(type, n) {
  return DB.games.filter(g => g.type === type).sort((a, b) => a.ts - b.ts).slice(-n);
}

/* ================= 目標 ================= */
function goalList(ds) {
  const g = DB.settings.goals, out = [];
  if (g.cuBest > 0) {
    const s = scoreStats(gamesOn(ds, 'cu'));
    out.push({ label: `カウントアップ ${g.cuBest}点`, met: !!s && s.best >= g.cuBest });
  }
  if (g.criBest > 0) {
    const s = scoreStats(gamesOn(ds, 'cri'));
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
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === PAGE));
  // プレイ中: 広い画面では2カラム化、さらに1画面固定レイアウト（スクロール無効・ナビ非表示）
  const inGame = PAGE === 'play' && !!G && !G.fin && G.type !== 'free';
  $('#view').classList.toggle('wide', inGame);
  $('#view').classList.toggle('game', inGame);
  document.body.classList.toggle('ingame', inGame);
  ({ home: renderHome, play: renderPlay, hist: renderHist, cal: renderCal, set: renderSet })[PAGE]();
  window.scrollTo(0, 0);
}

/* ================= ホーム ================= */
function renderHome() {
  const ds = todayStr();
  const cuS = scoreStats(gamesOn(ds, 'cu'));
  const crG = gamesOn(ds, 'cri');
  const crS = scoreStats(crG);
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
    <div class="sub center" style="margin-top:6px">${s.n}ゲーム${extra || ''}</div>`
    : '<div class="sub">まだ記録がありません</div>'}`;

  const ratingBlock = r => r.total == null
    ? '<div class="sub center">ゲームをプレイすると表示されます</div>'
    : `<div class="rt-main"><span class="rt-num">Rt.${r.total}</span><span class="rt-fl">${flightOf(r.total)}フライト</span></div>
       <div class="rt-detail">
         01: ${r.ppr != null ? `PPR ${r.ppr.toFixed(2)}（Rt.${r.r01}）` : '—'}<br>
         CRICKET: ${r.mpr != null ? `MPR ${r.mpr.toFixed(2)}（Rt.${r.rcri}）` : '—'}
       </div>`;

  $('#view').innerHTML = `
  <h2>ホーム</h2>

  <div class="card">
    <button class="btn primary big" onclick="startGame('cu')">🎯 カウントアップ</button>
    <button class="btn green big" style="margin-bottom:0" onclick="startGame('cri')">🎯 クリケットカウントアップ</button>
  </div>

  <div class="card">
    <h3>レーティング（ダーツライブ換算・目安 / 直近30G）</h3>
    ${ratingBlock(rAll)}
    ${rToday.total != null ? `<div class="sub center" style="margin-top:8px">今日のみ: Rt.${rToday.total}（${flightOf(rToday.total)}）</div>` : ''}
    <div class="sub center" style="margin-top:6px">※ファットブル基準の換算値です</div>
  </div>

  <div class="card">${statBlock('カウントアップ（今日）', cuS, cuS ? ` / 1R平均スタッツ ${(cuS.avg / 8).toFixed(2)}` : '')}</div>
  <div class="card">${statBlock('クリケットCU（今日）', crS, mpr != null ? ` / 1R平均マーク(MPR) ${mpr.toFixed(2)}` : '')}</div>

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
  return `<div class="ctr-row ${goal > 0 && v >= goal ? 'met' : ''}">
    <span class="name">${escHtml(c.label)}</span>
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

/* プレイ中にカウンター・メモを開くシート（閉じた画面用） */
let MODAL_KIND = null;
function openGamePanel() {
  if (!G || G.fin) return;
  MODAL_KIND = 'panel';
  const ds = todayStr();
  const live = detectAwards(G.darts, G.type);
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
  if (G && !G.fin && G.darts.length && !confirm('進行中のゲームを破棄して新しく始めますか？')) return;
  G = { type, darts: [], confirmed: 0, fin: null };
  M = 1;
  PAGE = 'play';
  render();
}
function setM(m) { M = m; render(); }
function hit(seg, mult) {
  if (!G || G.fin) return;
  if (G.darts.length - G.confirmed >= 3) return;  // 3投入力済み→確定待ち
  G.darts.push({ seg, mult: mult !== undefined ? mult : (seg === 0 ? 0 : M) });
  M = 1;
  render();
}
function confirmRound() {
  if (!G || G.fin) return;
  if (G.darts.length - G.confirmed !== 3) return;
  G.confirmed += 3;
  if (G.confirmed >= 24) finishGame(); else render();
}
function undoDart() {
  if (!G || G.fin || !G.darts.length) return;
  // 現在ラウンドが空なら直前の確定済みラウンドを開き直す
  if (G.darts.length === G.confirmed) G.confirmed = Math.max(0, G.confirmed - 3);
  G.darts.pop();
  render();
}
function quitGame() {
  if (!G) return;
  if (!G.darts.length || confirm('このゲームを破棄しますか？')) { G = null; render(); }
}
function finishGame() {
  const bullMode = DB.settings.bullMode;
  const total = G.darts.reduce((s, d) => s + dartPoint(d, G.type, bullMode), 0);
  const marks = G.type === 'cri' ? G.darts.reduce((s, d) => s + criMark(d), 0) : 0;
  // LOW TON: カウントアップで1ラウンド100点以上（結果画面にのみ表示）
  let lowTon = 0;
  if (G.type === 'cu') {
    for (let i = 0; i + 3 <= G.darts.length; i += 3) {
      const pts = G.darts.slice(i, i + 3).reduce((s, d) => s + cuPoint(d, bullMode), 0);
      if (pts >= 100) lowTon++;
    }
  }
  const game = {
    id: Date.now() + '-' + Math.floor(Math.random() * 10000),
    date: todayStr(), ts: Date.now(),
    type: G.type, total, marks, lowTon,
    awards: detectAwards(G.darts, G.type),
    darts: G.darts,
  };
  DB.games.push(game);
  saveDB();
  G.fin = game;
  render();
}

// クリケットCUのラウンド別ターゲット（R1〜R6: 20→15、R7: ブル、R8: 全対象）
const CRI_TGT = [20, 19, 18, 17, 16, 15, 25, 0];
const CRI_TGT_LABEL = ['20', '19', '18', '17', '16', '15', 'BULL', 'ALL'];

function renderPlaySelect(v, ds) {
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  v.innerHTML = `
  <h2>${fmtDate(ds)} のプレイ</h2>
  <div class="card">
    <button class="btn primary big" onclick="startGame('cu')">カウントアップ</button>
    <div class="sub" style="margin-bottom:14px">8ラウンド×3投。ブルは${DB.settings.bullMode === 'fat' ? 'ファットブル（50点）' : 'セパレート（25/50点）'}。</div>
    <button class="btn green big" onclick="startGame('cri')">クリケットカウントアップ</button>
    <div class="sub" style="margin-bottom:14px">R1〜R6は20→15、R7はブル、R8は15〜20とブルすべてが対象。</div>
    <button class="btn big" onclick="startGame('free')">フリースロー</button>
    <div class="sub" style="margin-bottom:0">スコア入力なし。アワードカウンターとメモだけの画面で練習。</div>
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

function renderFreeThrow(v, ds) {
  const ctr = countersOn(ds);
  const memo = (DB.days[ds] && DB.days[ds].memo) || '';
  v.innerHTML = `
  <div class="playhead">
    <span style="font-weight:700">フリースロー　<span class="sub">${fmtDate(ds)}</span></span>
    <button class="btn small" onclick="G=null;render()">終了</button>
  </div>
  <div class="card">
    <h3>アワードカウンター（今日）</h3>
    ${COUNTERS.map(c => counterRow(ds, c, ctr)).join('')}
    <div class="sub" style="margin-top:8px">出たアワードを +/− でカウントしてください。</div>
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
  if (G.type === 'free') { renderFreeThrow(v, ds0); return; }
  if (G.fin) { renderResult(v); return; }

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

  const mrowHTML = `<div class="mrow">
      <button class="${M === 1 ? 'on' : ''}" onclick="setM(1)">SINGLE</button>
      <button class="${M === 2 ? 'on' : ''}" onclick="setM(2)">DOUBLE</button>
      <button class="${M === 3 ? 'on' : ''}" onclick="setM(3)">TRIPLE</button>
    </div>`;
  let pad;
  if (type === 'cu') {
    pad = mrowHTML + `<div class="padgrid">${Array.from({ length: 20 }, (_, i) => `<button onclick="hit(${i + 1})">${i + 1}</button>`).join('')}</div>
       <div class="brow">
         <button class="bull" onclick="hit(25,1)">BULL${bullMode === 'fat' ? '' : ' 25'}</button>
         <button class="bull" onclick="hit(25,2)">D-BULL${bullMode === 'fat' ? '' : ' 50'}</button>
         <button onclick="hit(0,0)">MISS</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
  } else {
    const tgt = CRI_TGT[Math.min(rIdx, 7)];
    if (tgt === 25) {
      pad = `<div class="padgrid cri" style="grid-template-columns:1fr 1fr">
         <button class="bullbtn" onclick="hit(25,1)">BULL 25</button>
         <button class="bullbtn" onclick="hit(25,2)">D-BULL 50</button>
       </div>
       <div class="brow" style="grid-template-columns:1fr 1fr">
         <button onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    } else if (tgt === 0) {
      pad = mrowHTML + `<div class="padgrid cri">${[20, 19, 18, 17, 16, 15].map(n => `<button onclick="hit(${n})">${n}</button>`).join('')}</div>
       <div class="brow">
         <button class="bull" onclick="hit(25,1)">BULL 25</button>
         <button class="bull" onclick="hit(25,2)">D-BULL 50</button>
         <button onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    } else {
      pad = `<div class="padgrid cri">
         <button onclick="hit(${tgt},1)">${tgt}</button>
         <button onclick="hit(${tgt},2)">D${tgt}</button>
         <button onclick="hit(${tgt},3)">T${tgt}</button>
       </div>
       <div class="brow" style="grid-template-columns:1fr 1fr">
         <button onclick="hit(0,0)">MISS 0</button>
         <button class="undo" onclick="undoDart()">⌫ 戻す</button>
       </div>`;
    }
  }

  // 右カラム用: 今日の確定分 + プレイ中ゲームの自動判定分（保存時に確定）を合算して表示
  const ds = todayStr();
  const liveAwards = detectAwards(G.darts, type);
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
        <button class="btn ${inRound.length === 3 ? 'primary' : ''} big" style="margin:10px 0 0" ${inRound.length === 3 ? '' : 'disabled'} onclick="confirmRound()">${rIdx === 7 ? '✔ ゲーム終了（保存）' : '✔ ラウンド確定'}</button>
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

function renderResult(v) {
  const g = G.fin;
  const ds = g.date;
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
function setHTab(t) { HTAB = t; render(); }
function setMetric(m) { HM = m; render(); }
function setPeriod(p) { HP = p; render(); }

function allDates() {
  const s = new Set(DB.games.map(g => g.date));
  Object.keys(DB.days).forEach(ds => {
    const e = DB.days[ds];
    if ((e.memo && e.memo.trim()) || Object.values(e.adj || {}).some(v => v) || (e.dlImages || []).length || e.dl) s.add(ds);
  });
  return [...s].sort().reverse();
}

function metricValue(ds, mk) {
  if (mk.startsWith('c_')) return countersOn(ds)[mk.slice(2)] || 0;
  const cu = scoreStats(gamesOn(ds, 'cu'));
  const crG = gamesOn(ds, 'cri');
  const cr = scoreStats(crG);
  switch (mk) {
    case 'cuAvg': return cu ? +cu.avg.toFixed(1) : null;
    case 'cuBest': return cu ? cu.best : null;
    case 'criAvg': return cr ? +cr.avg.toFixed(1) : null;
    case 'criBest': return cr ? cr.best : null;
    case 'mpr': { const m = mprOf(crG); return m != null ? +m.toFixed(2) : null; }
  }
  return null;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) { if (v <= m * p) return m * p; }
  return 10 * p;
}

function chartSVG(dates, vals, kind, color) {
  const W = 360, H = 210, L = 40, R = 8, T = 12, B = 26;
  const n = dates.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return '<div class="sub center" style="padding:30px 0">この期間のデータがありません</div>';
  const max = niceMax(Math.max(...nums));
  const X = i => n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2;
  const Y = v => T + (H - T - B) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" xmlns="http://www.w3.org/2000/svg">`;
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
  if (kind === 'bar') {
    const bw = Math.max(2.5, (W - L - R) / n * 0.6);
    vals.forEach((v, i) => {
      if (v == null || v === 0) return;
      const y = Y(v);
      s += `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - B - y).toFixed(1)}" rx="2" fill="${color}"/>`;
    });
  } else {
    let path = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      path += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      pen = true;
    });
    s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>`;
    vals.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" fill="${color}"/>`; });
  }
  return s + '</svg>';
}

function renderHist() {
  const v = $('#view');
  let body = '';
  if (HTAB === 'days') {
    const dates = allDates();
    body = dates.length ? dates.map(ds => {
      const st = dayStatus(ds);
      const cu = scoreStats(gamesOn(ds, 'cu'));
      const crG = gamesOn(ds, 'cri');
      const cr = scoreStats(crG);
      const mpr = mprOf(crG);
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
        ${cu ? `<div class="line">カウントアップ: ${cu.n}G / 最高 ${cu.best} / 最低 ${cu.min} / 平均 ${cu.avg.toFixed(1)}</div>` : ''}
        ${cr ? `<div class="line">クリケットCU: ${cr.n}G / 最高 ${cr.best} / 平均 ${cr.avg.toFixed(1)} / MPR ${mpr.toFixed(2)}</div>` : ''}
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${memo ? `<div class="line">📝 ${escHtml(memo)}</div>` : ''}
      </div>`;
    }).join('') : '<div class="card sub center">まだ記録がありません</div>';
  } else {
    const m = METRICS.find(x => x.k === HM) || METRICS[0];
    const dates = lastNDates(HP);
    const vals = dates.map(ds => metricValue(ds, m.k));
    body = `<div class="card">
      <select onchange="setMetric(this.value)">
        ${METRICS.map(x => `<option value="${x.k}" ${x.k === HM ? 'selected' : ''}>${escHtml(x.label)}</option>`).join('')}
      </select>
      <div class="pbtns">
        ${[14, 30, 90].map(p => `<button class="btn small ${HP === p ? 'primary' : ''}" onclick="setPeriod(${p})">${p}日</button>`).join('')}
      </div>
      ${chartSVG(dates, vals, m.kind, m.color)}
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
  const cu = scoreStats(gamesOn(ds, 'cu'));
  const crG = gamesOn(ds, 'cri');
  const cr = scoreStats(crG);
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
        ${cu ? `<div class="line" style="font-size:13px;margin-bottom:4px">カウントアップ: ${cu.n}G / 最高 ${cu.best} / 最低 ${cu.min} / 平均 ${cu.avg.toFixed(1)}</div>` : ''}
        ${cr ? `<div class="line" style="font-size:13px">クリケットCU: ${cr.n}G / 最高 ${cr.best} / 最低 ${cr.min} / 平均 ${cr.avg.toFixed(1)} / MPR ${mpr.toFixed(2)}</div>` : ''}
        ${!cu && !cr ? '<div class="sub">ゲーム記録なし</div>' : ''}
      </div>

      ${games.length ? `<div class="card"><h3>ゲーム一覧</h3>
        ${games.map(g => `<div class="game-row">
          <span class="tm">${g.src === 'dl' ? '<span class="badge dl">DL</span>' : tm(g.ts)}</span>
          <span class="ty">${TYPE_LABEL[g.type]}</span>
          <span class="sc">${g.total}<span class="sub" style="font-weight:400"> ${g.type === 'cri' ? (g.marks != null ? 'R平均 ' + (g.marks / 8).toFixed(2) : '') : 'R平均 ' + (g.total / 8).toFixed(2)}</span></span>
          <button class="del" onclick="delGame('${g.id}','${ds}')">削除</button>
        </div>`).join('')}
      </div>` : ''}

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
        ${dlGames.length ? `<div class="sub" style="margin-top:8px">取り込みスコア: ${dlGames.map(g => `${TYPE_LABEL[g.type]} ${g.total}`).join(' / ')}</div>` : ''}
        <div class="sub" style="margin-top:8px">取り込んだアワードは下のカウンターに、スコアは集計・レーティングに反映されます。</div>
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

/* ================= 設定 ================= */
function renderSet() {
  const g = DB.settings.goals;
  $('#view').innerHTML = `
  <h2>設定</h2>

  <div class="card">
    <h3>1日の目標スコア</h3>
    <div class="set-row"><label>カウントアップ（その日のベスト）</label>
      <input type="number" min="0" value="${g.cuBest || 0}" onchange="setGoal('cuBest',this.value)"></div>
    <div class="set-row"><label>クリケットCU（その日のベスト）</label>
      <input type="number" min="0" value="${g.criBest || 0}" onchange="setGoal('criBest',this.value)"></div>
    <div class="sub" style="margin-top:6px">0 にすると目標の対象外になります</div>
  </div>

  <div class="card">
    <h3>1日の目標カウント数</h3>
    ${COUNTERS.map(c => `<div class="set-row"><label>${escHtml(c.label)}</label>
      <input type="number" min="0" value="${g.counters[c.k] || 0}" onchange="setGoalCounter('${c.k}',this.value)"></div>`).join('')}
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
function setGoal(k, v) { DB.settings.goals[k] = Math.max(0, parseInt(v, 10) || 0); saveDB(); }
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
];
function parseDLText(text) {
  const awards = {};
  for (const ln of text.split(/\n+/)) {
    for (const [re, k] of DL_OCR_MAP) {
      if (!re.test(ln)) continue;
      const m = ln.match(/[x×]\s*(\d+)/i) || ln.match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0 && n < 1000) awards[k] = n;
      }
    }
  }
  // スコア候補: 100〜1440 の数値（カウントアップ/クリケットCUのスコアらしきもの）
  const nums = (text.match(/\d{3,4}/g) || []).map(Number).filter(n => n >= 100 && n <= 1440);
  return { awards, scoreHints: [...new Set(nums)], raw: text };
}
async function ocrDay(ds, btn) {
  const e = DB.days[ds];
  const ids = (e && e.dlImages) || [];
  if (!ids.length) { alert('先に「スクショ追加」で画像を登録してください'); return; }
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
    openDLForm(ds, parseDLText(text));
  } catch (err) {
    alert('読み取りに失敗しました（オフラインの可能性があります）。手動入力をご利用ください。');
    btn.disabled = false;
    btn.textContent = orig;
  }
}

/* --- 取り込みフォーム --- */
function openDLForm(ds, parsed) {
  const e = DB.days[ds] || {};
  const cur = (e.dl && e.dl.awards) || {};
  const pre = (parsed && parsed.awards) || {};
  const dlG = DB.games.filter(g => g.date === ds && g.src === 'dl');
  const cuTxt = dlG.filter(g => g.type === 'cu').map(g => g.total).join('\n');
  const criTxt = dlG.filter(g => g.type === 'cri').map(g => g.total).join('\n');
  const hint = parsed && parsed.scoreHints && parsed.scoreHints.length
    ? `<div class="sub" style="margin:6px 0">画像内で見つかった数値: ${parsed.scoreHints.join(', ')}</div>` : '';
  $('#modal-root').innerHTML = `
  <div class="ovl">
    <div class="modal">
      <div class="modal-head"><span class="ttl">DARTSLIVE記録の入力（${fmtDate(ds)}）</span><button onclick="openDay('${ds}')">戻る</button></div>
      ${parsed ? '<div class="sub" style="margin-bottom:10px">⚠ 自動読み取りの結果です。<b>必ず実際の記録と見比べて修正</b>してから反映してください。</div>' : ''}
      <div class="card">
        <h3>アワード（この日のダーツライブでの回数）</h3>
        ${COUNTERS.map(c => `<div class="set-row"><label>${escHtml(c.label)}</label>
          <input type="number" min="0" id="dl_${c.k}" value="${pre[c.k] != null ? pre[c.k] : (cur[c.k] || 0)}"></div>`).join('')}
      </div>
      <div class="card">
        <h3>カウントアップのスコア（1行に1ゲーム）</h3>
        ${hint}
        <textarea class="memo" id="dl_cu" placeholder="例:&#10;612&#10;580">${escHtml(cuTxt)}</textarea>
      </div>
      <div class="card">
        <h3>クリケットCUのスコア（1行に1ゲーム）</h3>
        <textarea class="memo" id="dl_cri" placeholder="例:&#10;410">${escHtml(criTxt)}</textarea>
        <div class="sub" style="margin-top:6px">※スコアのみ取り込み。MPRには影響しません。</div>
      </div>
      ${parsed && parsed.raw ? `<div class="card"><details><summary class="sub">読み取った生テキストを確認</summary><pre class="ocrtext">${escHtml(parsed.raw.trim())}</pre></details></div>` : ''}
      <div class="card">
        <button class="btn primary big" onclick="applyDLForm('${ds}')">この内容で反映する</button>
        <button class="btn big" style="margin-bottom:0" onclick="openDay('${ds}')">キャンセル</button>
        <div class="sub" style="margin-top:8px">反映すると、この日のダーツライブ記録（アワード・スコア）が上書き保存されます。同じスクショを2回反映しても二重計上にはなりません。</div>
      </div>
    </div>
  </div>`;
}
function applyDLForm(ds) {
  const d = day(ds);
  const awards = {};
  COUNTERS.forEach(c => {
    const el = document.getElementById('dl_' + c.k);
    const v = el ? Math.max(0, parseInt(el.value, 10) || 0) : 0;
    if (v > 0) awards[c.k] = v;
  });
  d.dl = { awards };
  const parseScores = id => {
    const el = document.getElementById(id);
    return (el ? el.value : '').split(/[\s,、]+/).map(x => parseInt(x, 10)).filter(n => !isNaN(n) && n > 0 && n <= 1440);
  };
  const cu = parseScores('dl_cu');
  const cri = parseScores('dl_cri');
  // ダーツライブ由来ゲームは入れ替え（再反映しても二重にならない）
  DB.games = DB.games.filter(g => !(g.date === ds && g.src === 'dl'));
  let ts = parseYmd(ds).getTime() + 12 * 3600 * 1000;
  cu.forEach(t => { DB.games.push({ id: 'dl-' + ts, date: ds, ts: ts++, type: 'cu', total: t, marks: 0, awards: {}, src: 'dl' }); });
  cri.forEach(t => { DB.games.push({ id: 'dl-' + ts, date: ds, ts: ts++, type: 'cri', total: t, marks: null, awards: {}, src: 'dl' }); });
  saveDB();
  openDay(ds);
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

/* ================= 起動 ================= */
render();
checkImportHash();
