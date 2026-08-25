/* =========================================================================
   スロー品質評価「ラウンド単位で5項目まとめて記録」方式のバックアップ
   （項目単位の記録に変更する直前・2026-08-25 時点）
   ---------------------------------------------------------------------
   ・スライダーを1つでも動かしたラウンドは、触っていない項目も既定値6として
     5項目すべてを記録していた方式。
   戻し方
   1) アプリ内で戻す（推奨）: 設定 → スロー品質評価 → 記録方式 → 「ラウンドごと（旧仕様）」
   2) コードごと戻す: git checkout qual-v1 -- app.js style.css
      （タグ qual-v1 が変更直前のコミットを指しています）
   ========================================================================= */

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
function qSet(k, v) {
  if (!G || G.fin) return;
  const q = qVals();
  q[k] = +v;
  G.qTouched = true;
  if (k === 'foc') G.qFoc = true;
  document.querySelectorAll('.qv-' + k).forEach(el => { el.textContent = v; });
  if (G.qEditRound != null) qCommitTo(G.qEditRound);   // 確定後シートからの編集は即反映
  document.querySelectorAll('.qstate').forEach(el => { el.textContent = qStateText(); });
}
function qStateText() {
  const n = (G && G.qual ? G.qual.length : 0);
  const done = G && (G.qEditRound != null ? (G.qual || []).some(x => x.r === G.qEditRound + 1) : G.qTouched);
  const cur = done ? 'このラウンドを評価しました' : 'このラウンドは未評価（スライダーを動かすと記録されます）';
  return cur + '　/　' + n + 'R記録済み';
}
function qCommitTo(rIdx) {          // rIdx は0始まりのラウンド番号
  if (!G) return;
  const q = qVals();
  const rec = { r: rIdx + 1 };
  QUAL_ITEMS.forEach(i => rec[i.k] = q[i.k]);
  if (G.qFoc) rec.foc = q.foc;
  G.qual = (G.qual || []).filter(x => x.r !== rec.r);
  G.qual.push(rec);
  G.qual.sort((a, b) => a.r - b.r);
}
function qCommit(rIdx) {            // ラウンド確定時。触っていないラウンドは記録しない
  if (!G) return;
  if (G.qTouched) qCommitTo(rIdx);
  qReset();
}
function qReset() {                 // 次のラウンドは毎回まっさらな既定位置から評価する
  if (!G) return;
  G.q = qDefault();
  G.qTouched = false;
  G.qFoc = false;
}
function qRestore(rIdx) {           // 戻すで前ラウンドを開き直したときは評価も戻す
  if (!G || !G.qual) return;
  const i = G.qual.findIndex(x => x.r === rIdx + 1);
  if (i < 0) return;
  const rec = G.qual.splice(i, 1)[0];
  const q = qVals();
  QUAL_ITEMS.forEach(it => { if (rec[it.k] != null) q[it.k] = rec[it.k]; });
  if (rec.foc != null) q.foc = rec.foc;
  G.qTouched = true;
}
function qRow(k) {
  const it = QUAL_MAP[k], val = qVals()[k];
  return `<div class="qrow${k === 'foc' ? ' opt' : ''}">
    <div class="qhead">
      <span class="ql">${escHtml(it.label)}<span class="qs">（${escHtml(it.sub)}）</span></span>
      <button class="qhelp" onclick="qHelp('${k}')">?</button>
      <span class="qv qv-${k}">${val}</span>
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
  if (rIdx != null) G.qEditRound = rIdx;
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
  const out = { n: list.length };
  QUAL_ITEMS.forEach(i => { out[i.k] = list.reduce((s, r) => s + (r[i.k] || 0), 0) / list.length; });
  out.total = QUAL_ITEMS.reduce((s, i) => s + out[i.k], 0) / QUAL_ITEMS.length;
  const f = list.filter(r => r.foc != null);
  out.focN = f.length;
  out.foc = f.length ? f.reduce((s, r) => s + r.foc, 0) / f.length : null;
  return out;
}
function pentagonSVG(a) {
  const W = 300, H = 246, cx = 150, cy = 116, R = 80, n = 5;
  const pt = (i, r) => { const g = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(g), cy + r * Math.sin(g)]; };
  const ring = r => Array.from({ length: n }, (_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
  const grid = [2, 4, 6, 8, 10].map(v => `<polygon points="${ring(R * v / 10)}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const axes = Array.from({ length: n }, (_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`; }).join('');
  const poly = QUAL_ITEMS.map((it, i) => pt(i, R * (a[it.k] || 0) / 10).map(v => v.toFixed(1)).join(',')).join(' ');
  const dots = QUAL_ITEMS.map((it, i) => { const [x, y] = pt(i, R * (a[it.k] || 0) / 10); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="var(--yel)"/>`; }).join('');
  const labels = QUAL_ITEMS.map((it, i) => {
    const [x, y] = pt(i, R + 22);
    const an = Math.abs(x - cx) < 6 ? 'middle' : (x > cx ? 'start' : 'end');
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${an}" font-size="11" fill="var(--sub)">${it.short}</text>
      <text x="${x.toFixed(1)}" y="${(y + 16).toFixed(1)}" text-anchor="${an}" font-size="12" font-weight="700" fill="var(--yel)">${(a[it.k] || 0).toFixed(1)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="pentagon">${grid}${axes}
    <polygon points="${poly}" fill="rgba(244,182,63,.22)" stroke="var(--yel)" stroke-width="2"/>${dots}${labels}</svg>`;
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
      const av = QUAL_ITEMS.reduce((s, it) => s + (r[it.k] || 0), 0) / QUAL_ITEMS.length;
      return `<div class="qtr"><span class="r">R${r.r}</span>${QUAL_ITEMS.map(it => `<span>${r[it.k]}</span>`).join('')}${hasFoc ? `<span>${r.foc != null ? r.foc : '—'}</span>` : ''}<span class="av">${av.toFixed(1)}</span></div>`;
    }).join('')}
  </div>`;
}
function qualResultCard(g) {
  const a = qualAvg(g.qual);
  if (!a) return '';
  const row = (label, sub, v, extra) => `<div class="tgt-row">
    <span class="tl">${escHtml(label)}<span class="sub">（${escHtml(sub)}${extra || ''}）</span></span>
    <span class="tv">${v.toFixed(1)}</span>
    <span class="tc"><span class="qbar"><i style="width:${(v * 10).toFixed(0)}%"></i></span></span></div>`;
  const rounds = g.darts && g.darts.length ? Math.ceil(g.darts.length / 3) : null;
  return `<div class="card">
    <h3>スロー品質評価<span class="sub" style="font-weight:400">　${rounds ? `${rounds}R中 ${a.n}Rを評価` : `${a.n}ラウンド分`}</span></h3>
    <div class="center"><div class="bigscore" style="font-size:40px;color:var(--yel)">${a.total.toFixed(1)}<span class="sub" style="font-size:15px"> / 10</span></div>
    <div class="sub">5項目の全体平均</div></div>
    <div class="center">${pentagonSVG(a)}</div>
    ${QUAL_ITEMS.map(i => row(i.label, i.sub, a[i.k])).join('')}
    ${a.foc != null ? row(QUAL_OPT.label, QUAL_OPT.sub, a.foc, ' ' + a.focN + 'R') : ''}
    ${qualRoundTable(g.qual, rounds)}
    <div class="sub" style="margin-top:8px">平均は評価したラウンドだけで計算しています（未評価のラウンドは含みません）。結果（どこに刺さったか）とは無関係の、スローそのものの自己評価です。</div>
  </div>`;
}
function qualNoteCard(g) {          // 1ラウンドも評価しなかった場合の表示
  if (g.type !== 'cu' && g.type !== 'cri') return '';
  if (g.qual && g.qual.length) return '';
  return `<div class="card"><div class="sub">スロー品質評価：このゲームは記録なし（全ラウンド未評価）。各ラウンドでスライダーを動かすと、そのラウンドだけが記録されます。</div></div>`;
}
function qualBadge(g) {
  const a = qualAvg(g.qual);
  return a ? `<span class="qbadge">品質 ${a.total.toFixed(1)}</span>` : '';
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

