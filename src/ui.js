// HUD、对话框、商店、小游戏等全部 DOM 界面
import { CAST, TARGET } from './story.js';
import { Portraits } from './portrait.js';
import { NEED_INFO, CFG } from './game.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const BUY_ORDER = ['B', 'E', 'A', 'F'];
const ITEM_NAMES = { noodle_dry: '🍜 泡面（干）', noodle: '🍜 泡面（已泡）', drink: '🥤 饮料', headset: '🎧 耳机' };

function nextSlot(g) {
  for (const r of BUY_ORDER) {
    const s = g.cafe.seats.find((x) => x.row === r && !g.state.owned.includes(x.id));
    if (s) return s;
  }
  return null;
}
const ownedPCs = (g) => g.state.owned.length;

const SHOP = [
  {
    tab: '设备', items: [
      { id: 'pc', icon: '🖥️', name: '添置电脑', desc: '二手组装机：奔腾4 / 512M / GeForce MX440。每台增加一个机位。', price: () => 250, repeat: true, ok: (g) => !!nextSlot(g), buy: (g) => g.state.owned.push(nextSlot(g).id), stat: (g) => `当前 ${ownedPCs(g)} 台` },
      { id: 'lcd', icon: '📺', name: '全场换液晶', desc: '17寸液晶，告别“大屁股”。客人满意度上升，战队赛加成。', price: (g) => 150 * ownedPCs(g) },
      { id: 'gaming', icon: '💺', name: '全场电竞椅', desc: '红黑赛车椅，久坐不累，满意度上升。', price: (g) => 60 * ownedPCs(g) },
      { id: 'restore', icon: '🛡️', name: '还原精灵', desc: '重启即还原。电脑故障率降低55%，病毒危害大幅减小。', price: () => 300 },
      { id: 'net', icon: '🌐', name: '10M 光纤专线', desc: '告别随机掉线，满意度上升，战队赛加成。网费每天+15。', price: () => 800 },
      { id: 'ac', icon: '❄️', name: '格立柜式空调', desc: '寒冬里暖洋洋，满意度大幅上升。（不再用小太阳了）', price: () => 1500 },
      { id: 'vip', icon: '👑', name: 'VIP 包间', desc: '4 个液晶 + 真皮沙发的包间，有钱客人优先入座，单独定价。', price: () => 2500 },
    ],
  },
  {
    tab: '店面', items: [
      { id: 'neon', icon: '🌈', name: '霓虹门头招牌', desc: '门口亮起“极速网吧”霓虹灯，客流+15%。', price: () => 600 },
      { id: 'idscan', icon: '🪪', name: '身份证读卡器', desc: '开卡时自动识别年龄，未成年人一眼看穿。', price: () => 300 },
      { id: 'extinguisher', icon: '🧯', name: '灭火器', desc: '消防检查必备。', price: () => 120 },
      { id: 'tray', icon: '🍽️', name: '送餐托盘', desc: '一次能端 3 样东西。', price: () => 50 },
    ],
  },
  {
    tab: '人员', items: [
      { id: 'cashier', icon: '👩‍💼', name: '雇佣收银员 阿芳', desc: '自动给普通客人开卡，会查身份证拦下未成年人。日薪 50 元。', price: () => 100, stat: () => '入职费 100 + 日薪 50' },
      { id: 'cleaner', icon: '🧹', name: '雇佣保洁 王阿姨', desc: '自动收拾客人留下的垃圾。日薪 30 元。', price: () => 60, stat: () => '入职费 60 + 日薪 30' },
    ],
  },
  {
    tab: '进货', items: [
      { id: 'st_noodle', icon: '🍜', name: '康帅傅泡面 ×24', desc: '售价 4 元/桶。', price: () => 36, repeat: true, buy: (g) => (g.state.stock.noodle += 24), stat: (g) => `库存 ${g.state.stock.noodle}` },
      { id: 'st_drink', icon: '🥤', name: '饮料 ×24', desc: '可乐、冰红茶、红牛混装，售价 3 元/瓶。', price: () => 29, repeat: true, buy: (g) => (g.state.stock.drink += 24), stat: (g) => `库存 ${g.state.stock.drink}` },
      { id: 'st_headset', icon: '🎧', name: '耳机 ×3', desc: '网吧耳机消耗品，客人耳机坏了要换。', price: () => 36, repeat: true, buy: (g) => (g.state.stock.headset += 3), stat: (g) => `库存 ${g.state.stock.headset}` },
    ],
  },
  { tab: '定价', items: [] },
];

const REPAIR_CASES = [
  { sym: '屏幕蓝了，满屏白字：“IRQL_NOT_LESS_OR_EQUAL”', ok: '重启，用还原卡还原系统' },
  { sym: '显示器黑屏，电源灯一闪一闪的黄灯，主机风扇还在转', ok: '把显示器 VGA 线插紧' },
  { sym: '右下角的小电脑图标打了红叉，QQ 头像全灰了', ok: '重新插拔网线' },
  { sym: '游戏卡成幻灯片，任务管理器里 CPU 占用 100%', ok: '结束后台的迅雷和暴风影音' },
  { sym: '开机“滴——滴——滴——”长鸣，屏幕不亮', ok: '拔下内存条，用橡皮擦金手指' },
  { sym: '鼠标指针一动不动，键盘上三个灯也全灭了', ok: '重启电脑（PS/2 不能热插拔）' },
  { sym: '满屏弹窗广告：“恭喜您获得 QQ 币大奖！”', ok: '用杀毒软件全盘查杀' },
  { sym: '耳机里只有“滋滋”的电流声，游戏没声音', ok: '重装声卡驱动' },
];

export class UI {
  constructor() {
    this.portraits = new Portraits();
    this.bubbleEls = new Map();
    this.hudAcc = 0;
    this.buildDom();
  }

  buildDom() {
    const app = $('#app');
    this.app = app;
    this.layerBubbles = $('#bubbles');
    this.layerFloats = $('#floats');
    this.tooltip = $('#tooltip');
    this.toasts = $('#toasts');
    this.hud = $('#hud');
    this.dialog = $('#dialog');
    this.modal = $('#modal');
    this.dialog.addEventListener('click', (e) => { if (!e.target.closest('.choices')) this.advance(); });
    window.addEventListener('keydown', (e) => {
      if (this.dialog.classList.contains('show')) {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!this.choiceResolve) this.advance(); }
        const n = parseInt(e.key, 10);
        if (this.choiceResolve && n >= 1 && n <= 4) { const b = this.dialog.querySelectorAll('.choices button')[n - 1]; if (b) b.click(); }
      }
    });
  }

  wait(ms) { return sleep(ms); }

  setPhase(p) { this.hud.classList.toggle('show', p === 'play'); }

  // ---------- 每帧 ----------
  frame(game, dt) {
    if (!this.engine) return;
    // 气泡
    const seen = new Set();
    if (game.phase === 'play' || game.phase === 'intro') {
      for (const b of game.bubbles()) {
        const p = this.engine.project(b.pos);
        let e = this.bubbleEls.get(b.id);
        if (!e) {
          e = el('div', 'bubble', '<div class="ring"><span></span></div><div class="lbl"></div>');
          this.layerBubbles.appendChild(e);
          this.bubbleEls.set(b.id, e);
        }
        seen.add(b.id);
        e.style.display = p.visible ? '' : 'none';
        e.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
        const ring = e.firstChild;
        ring.style.display = b.icon ? '' : 'none';
        if (b.icon) {
          ring.firstChild.textContent = b.icon;
          const col = b.cls === 'talk' ? '#5ad1ff' : b.cls === 'good' ? '#5aff8a' : b.ratio > 0.5 ? '#ffd84a' : b.ratio > 0.25 ? '#ff9a3a' : '#ff3a4a';
          ring.style.background = `conic-gradient(${col} ${b.ratio * 360}deg, rgba(0,0,0,0.35) 0)`;
          ring.classList.toggle('urgent', b.ratio < 0.25 && b.cls !== 'talk');
        }
        e.lastChild.textContent = b.label || '';
        e.lastChild.style.display = b.label ? '' : 'none';
      }
    }
    for (const [id, e] of this.bubbleEls) if (!seen.has(id)) { e.remove(); this.bubbleEls.delete(id); }

    this.hudAcc += dt;
    if (this.hudAcc < 0.12) return;
    this.hudAcc = 0;
    if (game.phase === 'title' || !game.dayStats) return;
    const st = game.state;
    const h = Math.floor(game.hour) % 24, m = Math.floor((game.hour % 1) * 60);
    $('#h-day').textContent = `第${st.day}天`;
    $('#h-date').textContent = game.dayDef ? game.dayDef.date.replace(/^2006年/, '') + ' · ' + game.dayDef.weather : '';
    $('#h-clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('#h-money').textContent = st.money.toLocaleString();
    const gap = TARGET - st.money;
    $('#h-target').textContent = gap > 0 ? `距房租还差 ¥${gap}` : '房租已够 ✓';
    $('#h-target').classList.toggle('done', gap <= 0);
    $('#h-rep').style.width = st.rep + '%';
    $('#h-rep').style.background = st.rep > 66 ? '#4ade80' : st.rep > 33 ? '#facc15' : '#f87171';
    $('#h-repv').textContent = Math.round(st.rep);
    const seated = game.customers.filter((c) => c.seated).length;
    const owned = game.cafe.seats.filter((s) => s.owned).length;
    $('#h-online').textContent = `${seated}/${owned}`;
    $('#h-queue').textContent = game.queue.length;
    // 任务列表
    const list = game.needsList().slice(0, 9);
    const tasks = $('#tasks-list');
    tasks.innerHTML = '';
    if (!list.length) tasks.appendChild(el('div', 'empty', '暂时没有待办 ☕'));
    for (const n of list) {
      const row = el('div', 'task' + (n.ratio < 0.25 && n.type !== 'talk' ? ' urgent' : ''), `<span class="ic">${n.info.icon}</span><div class="tx"><b>${n.where}</b> ${n.name}<small>${n.info.text}</small><div class="pb"><i style="width:${Math.max(0, n.ratio) * 100}%"></i></div></div>`);
      row.onclick = () => game.clickCustomer(n.c);
      tasks.appendChild(row);
    }
    // 手上
    const hand = game.player.hand;
    $('#hand').innerHTML = `<span class="lab">手上</span>` + (hand.length ? hand.map((i) => `<span class="item">${ITEM_NAMES[i]}</span>`).join('') : '<span class="none">空</span>') + (game.player.cap > 1 ? `<span class="cap">${hand.length}/${game.player.cap}</span>` : '');
    const s = st.stock;
    $('#stock').innerHTML = `<span class="${s.noodle < 6 ? 'low' : ''}">🍜${s.noodle}</span><span class="${s.drink < 6 ? 'low' : ''}">🥤${s.drink}</span><span class="${s.headset < 2 ? 'low' : ''}">🎧${s.headset}</span>`;
    // 进度条（玩家动作）
    const pa = game.player.action;
    const pb = $('#player-progress');
    if (pa && pa.dur > 0.6) {
      const p = this.engine.project({ x: game.player.x, y: 2.1, z: game.player.z });
      pb.style.display = 'block';
      pb.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      pb.firstChild.style.width = Math.min(100, (pa.t / pa.dur) * 100) + '%';
    } else pb.style.display = 'none';
    document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', +b.dataset.s === game.speed));
  }

  showTooltip(text, x, y) {
    if (!text) { this.tooltip.style.display = 'none'; return; }
    this.tooltip.style.display = 'block';
    this.tooltip.textContent = text;
    this.tooltip.style.transform = `translate(${x + 16}px,${y + 14}px)`;
  }

  floatText(pos, text, color) {
    if (!this.engine) return;
    const p = this.engine.project(pos);
    if (!p.visible) return;
    const e = el('div', 'float', text);
    e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; e.style.color = color;
    this.layerFloats.appendChild(e);
    setTimeout(() => e.remove(), 1400);
  }

  toast(text, type = '') {
    const e = el('div', 'toast ' + type, text);
    this.toasts.appendChild(e);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
    setTimeout(() => e.classList.add('out'), 3800);
    setTimeout(() => e.remove(), 4300);
  }

  hint(text) {
    const h = $('#hint');
    h.innerHTML = `💡 ${text}`;
    h.classList.add('show');
    clearTimeout(this.hintT);
    this.hintT = setTimeout(() => h.classList.remove('show'), 9000);
  }

  dayTitle(D) {
    const d = $('#daytitle');
    d.innerHTML = `<div class="dt-date">${D.date} · ${D.weather}</div><div class="dt-title">${D.title}</div>`;
    d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
    setTimeout(() => d.classList.remove('show'), 2700);
  }

  // ---------- 对话 ----------
  line(who, cast, text) {
    return new Promise((res) => {
      const d = this.dialog;
      d.classList.add('show');
      d.classList.toggle('narr', who === 'sys');
      const img = $('.portrait', d);
      if (who !== 'sys') {
        img.src = this.portraits.get(who, cast.look);
        img.style.display = '';
        $('.name', d).textContent = who === 'me' ? '我' : cast.name;
        $('.title', d).textContent = cast.title || '';
        d.classList.toggle('mine', who === 'me');
      } else {
        img.style.display = 'none';
        $('.name', d).textContent = '';
        $('.title', d).textContent = '';
        d.classList.remove('mine');
      }
      $('.choices', d).innerHTML = '';
      const tx = $('.text', d);
      let i = 0;
      this.typing = true;
      tx.textContent = '';
      clearInterval(this.typeT);
      this.typeT = setInterval(() => {
        i += 1;
        tx.textContent = text.slice(0, i);
        if (i % 2 === 0 && this.audio) this.audio.play('text');
        if (i >= text.length) { clearInterval(this.typeT); this.typing = false; }
      }, 26);
      this.advanceFn = () => {
        if (this.typing) { clearInterval(this.typeT); tx.textContent = text; this.typing = false; return; }
        this.advanceFn = null;
        res();
      };
    });
  }
  advance() { if (this.advanceFn) this.advanceFn(); }

  choice(options) {
    return new Promise((res) => {
      const d = this.dialog;
      d.classList.add('show');
      clearInterval(this.typeT);
      this.typing = false;
      const box = $('.choices', d);
      box.innerHTML = '';
      this.advanceFn = null;
      options.forEach((t, i) => {
        const b = el('button', '', `<i>${i + 1}</i>${t}`);
        b.onclick = (e) => { e.stopPropagation(); this.choiceResolve = null; box.innerHTML = ''; res(i); };
        box.appendChild(b);
      });
      this.choiceResolve = res;
    });
  }
  closeDialog() { this.dialog.classList.remove('show'); }

  // ---------- 通用模态 ----------
  openModal(cls, html) {
    this.modal.className = 'show ' + (cls || '');
    this.modal.innerHTML = `<div class="panel">${html}</div>`;
    return $('.panel', this.modal);
  }
  closeModal() { this.modal.className = ''; this.modal.innerHTML = ''; }

  // ---------- 日报 ----------
  report(r, game) {
    return new Promise((res) => {
      const inc = r.income;
      const totalIn = inc.net + inc.goods + inc.other + (inc.night || 0);
      const totalOut = r.expense.reduce((a, [, v]) => a + v, 0);
      const exp = r.expense.reduce((m, [k, v]) => { m[k] = (m[k] || 0) + v; return m; }, {});
      const rows = Object.entries(exp).map(([k, v]) => `<tr><td>${k}</td><td class="neg">-¥${v}</td></tr>`).join('');
      const gap = TARGET - r.money;
      const p = this.openModal('report', `
        <div class="rp-head"><div class="rp-day">第 ${r.day} 天 · 营业日报</div><div class="rp-sub">${game.dayDef.date}</div></div>
        <div class="rp-grid">
          <div class="rp-card"><small>今日净收入</small><b class="${r.delta >= 0 ? 'pos' : 'neg'}">${r.delta >= 0 ? '+' : ''}¥${r.delta}</b></div>
          <div class="rp-card"><small>账上现金</small><b>¥${r.money}</b></div>
          <div class="rp-card"><small>口碑</small><b>${Math.round(r.rep)} <em class="${r.repDelta >= 0 ? 'pos' : 'neg'}">${r.repDelta >= 0 ? '▲' : '▼'}${Math.abs(r.repDelta).toFixed(1)}</em></b></div>
          <div class="rp-card"><small>接待 / 流失</small><b>${r.served} / <span class="neg">${r.lost}</span></b></div>
        </div>
        <table class="rp-table">
          <tr class="h"><td>收入</td><td></td></tr>
          <tr><td>上网费</td><td class="pos">+¥${inc.net}</td></tr>
          <tr><td>泡面饮料</td><td class="pos">+¥${inc.goods}</td></tr>
          ${inc.night ? `<tr><td>通宵上网</td><td class="pos">+¥${inc.night}</td></tr>` : ''}
          ${inc.other ? `<tr><td>其他</td><td class="pos">+¥${inc.other}</td></tr>` : ''}
          <tr class="h"><td>支出</td><td></td></tr>
          ${rows || '<tr><td>无</td><td></td></tr>'}
          <tr class="t"><td>合计</td><td>¥${totalIn - totalOut}</td></tr>
        </table>
        <div class="rp-goal">${gap > 0 ? `距离交房租（¥${TARGET}）还差 <b>¥${gap}</b>，剩余 <b>${10 - r.day}</b> 天` : '<b class="pos">房租的钱已经攒够了！</b>守住口碑，迎接最后的挑战。'}</div>
        <div class="rp-tip">${r.timeouts > 3 ? '⚠ 今天有 ' + r.timeouts + ' 次客人需求没有及时处理，考虑雇人帮忙。' : r.lost > 5 ? '⚠ 今天流失了 ' + r.lost + ' 位客人——机位不够或排队太久。可以添置电脑，或者适当涨价。' : '👍 今天干得不错。'}</div>
        <button class="btn primary big" id="rp-next">进入夜间经营 →</button>`);
      $('#rp-next', p).onclick = () => { this.closeModal(); res(); };
    });
  }

  // ---------- 夜间商店 ----------
  shop(game) {
    return new Promise((res) => {
      this.engine.setOverview(true);
      this.modal.className = 'show shop';
      let tab = 0;
      const render = () => {
        const st = game.state;
        const t = SHOP[tab];
        let body = '';
        if (t.tab === '定价') {
          body = `<div class="price-box">
            <label>普通区价格 <b id="pv">${st.price}</b> 元/小时</label>
            <input type="range" min="2" max="6" step="1" value="${st.price}" id="pr">
            <p class="desc">价格越高单客收入越多，但客流和满意度会下降。附近网吧普遍 3 元/小时，对门天网开业期间更便宜。</p>
            ${st.up.vip ? `<label>VIP 包间价格 <b id="vv">${st.vipPrice}</b> 元/小时</label><input type="range" min="4" max="10" step="1" value="${st.vipPrice}" id="vr">` : '<p class="desc dim">（购买 VIP 包间后可设置包间价格）</p>'}
          </div>`;
        } else {
          body = t.items.map((it) => {
            const owned = !it.repeat && st.up[it.id];
            const price = it.price(game);
            const can = !owned && st.money >= price && (!it.ok || it.ok(game));
            const statTxt = it.stat ? it.stat(game) : '';
            return `<div class="item ${owned ? 'owned' : ''}">
              <div class="ic">${it.icon}</div>
              <div class="info"><b>${it.name}</b><p>${it.desc}</p>${statTxt ? `<small>${statTxt}</small>` : ''}</div>
              <button class="btn ${can ? 'primary' : ''}" data-id="${it.id}" ${can ? '' : 'disabled'}>${owned ? '已拥有' : (it.ok && !it.ok(game) ? '已满' : '¥' + price)}</button>
            </div>`;
          }).join('');
        }
        this.modal.innerHTML = `<div class="panel">
          <div class="sh-head"><div><div class="sh-title">夜间经营</div><div class="sh-sub">第 ${st.day} 天打烊后 · 规划明天</div></div><div class="sh-money">¥${st.money.toLocaleString()}</div></div>
          <div class="tabs">${SHOP.map((s, i) => `<button class="${i === tab ? 'on' : ''}" data-tab="${i}">${s.tab}</button>`).join('')}</div>
          <div class="sh-body">${body}</div>
          <div class="sh-foot"><div class="sh-goal">房租目标 ¥${TARGET} · ${TARGET - st.money > 0 ? '还差 ¥' + (TARGET - st.money) : '已达成'}</div><button class="btn primary big" id="sh-next">睡觉，迎接第 ${st.day + 1} 天 →</button></div>
        </div>`;
        this.modal.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = +b.dataset.tab; render(); }));
        this.modal.querySelectorAll('.item button').forEach((b) => (b.onclick = () => {
          const it = SHOP[tab].items.find((x) => x.id === b.dataset.id);
          const price = it.price(game);
          if (st.money < price) return;
          st.money -= price;
          if (it.buy) it.buy(game); else st.up[it.id] = true;
          game.audio.play('cash');
          game.cafe.rebuildFurniture(st);
          render();
        }));
        const pr = $('#pr', this.modal);
        if (pr) pr.oninput = () => { st.price = +pr.value; $('#pv', this.modal).textContent = pr.value; game.cafe.setPrices(st.price, st.up.vip ? st.vipPrice : 0); };
        const vr = $('#vr', this.modal);
        if (vr) vr.oninput = () => { st.vipPrice = +vr.value; $('#vv', this.modal).textContent = vr.value; game.cafe.setPrices(st.price, st.vipPrice); };
        $('#sh-next', this.modal).onclick = () => { this.closeModal(); this.engine.setOverview(false); res(); };
      };
      render();
    });
  }

  // ---------- 修电脑小游戏 ----------
  repairGame(game, seat) {
    return new Promise((res) => {
      const cs = REPAIR_CASES[Math.floor(Math.random() * REPAIR_CASES.length)];
      const wrong = shuffle(REPAIR_CASES.filter((c) => c !== cs).map((c) => c.ok)).slice(0, 2);
      const opts = shuffle([cs.ok, ...wrong, '用力拍一拍机箱']);
      const p = this.openModal('mini repair', `
        <div class="mg-title">💻 ${seat.label} 号机故障</div>
        <div class="crt-sym"><div class="scr">${cs.sym}</div></div>
        <p class="mg-q">客人抱怨：<i>“${cs.sym.slice(0, 18)}……网管快来看看！”</i><br>你打算怎么处理？</p>
        <div class="mg-opts">${opts.map((o, i) => `<button class="btn" data-i="${i}">${o}</button>`).join('')}</div>
        <div class="mg-status"></div>
        <button class="btn ghost" id="mg-quit">先不修了</button>`);
      const status = $('.mg-status', p);
      let busy = false;
      p.querySelectorAll('[data-i]').forEach((b) => (b.onclick = async () => {
        if (busy) return;
        busy = true;
        const o = opts[+b.dataset.i];
        status.innerHTML = '<div class="work">🔧 处理中<span class="dots"></span></div><div class="pbar"><i></i></div>';
        game.audio.play('type');
        await sleep(1200);
        const luck = o === '用力拍一拍机箱' && Math.random() < 0.35;
        if (o === cs.ok || luck) {
          status.innerHTML = luck ? '<b class="pos">“砰！”……居然好了？！玄学修电脑！</b>' : '<b class="pos">✔ 搞定！屏幕亮了。</b>';
          game.audio.play('ok');
          await sleep(900);
          this.closeModal(); res(true);
        } else {
          b.disabled = true; b.classList.add('bad');
          status.innerHTML = o === '用力拍一拍机箱' ? '<b class="neg">“砰！”机箱凹了一块，没用。客人白了你一眼。</b>' : '<b class="neg">✘ 没用……客人更不耐烦了。</b>';
          game.audio.play('fail');
          if (seat.customer && seat.customer.need) { seat.customer.need.t -= 0.18; seat.customer.sat -= 5; }
          busy = false;
        }
      }));
      $('#mg-quit', p).onclick = () => { this.closeModal(); res(false); };
    });
  }

  // ---------- 杀毒小游戏 ----------
  virusGame(game) {
    return new Promise((res) => {
      const need = 10, time = 11;
      const p = this.openModal('mini virus', `
        <div class="mg-title">🐼 熊猫烧香专杀 · 手动版</div>
        <p class="mg-q">点掉屏幕上冒出来的熊猫！${time} 秒内点掉 ${need} 只。</p>
        <div class="xp"><div class="xp-bar"><span>开始</span><span id="vg-info"></span></div><div class="xp-area"></div></div>
        <div class="mg-status"></div>
        <button class="btn ghost" id="mg-quit">放弃</button>`);
      const area = $('.xp-area', p), info = $('#vg-info', p), status = $('.mg-status', p);
      let hit = 0, left = time, done = false;
      const end = async (ok) => {
        if (done) return; done = true;
        clearInterval(spawnT); clearInterval(clockT);
        status.innerHTML = ok ? '<b class="pos">✔ 病毒清除完毕！</b>' : '<b class="neg">✘ 熊猫太多了……再来一次？</b>';
        game.audio.play(ok ? 'ok' : 'fail');
        if (ok) { await sleep(800); this.closeModal(); res(true); }
        else {
          const again = el('button', 'btn primary', '再来一次');
          again.onclick = () => { this.closeModal(); this.virusGame(game).then(res); };
          status.appendChild(again);
        }
      };
      const spawn = () => {
        const d = el('div', 'panda', '<div class="pd">🐼</div><div class="incense">🕯️🕯️🕯️</div><small>熊猫烧香.exe</small>');
        d.style.left = 5 + Math.random() * 80 + '%';
        d.style.top = 5 + Math.random() * 70 + '%';
        d.onclick = () => { if (done) return; hit++; game.audio.play('hit'); d.classList.add('dead'); setTimeout(() => d.remove(), 200); if (hit >= need) end(true); upd(); };
        area.appendChild(d);
        setTimeout(() => { if (!d.classList.contains('dead')) d.remove(); }, 1300);
      };
      const upd = () => { info.textContent = `已清除 ${hit}/${need} · 剩余 ${left}s`; };
      const spawnT = setInterval(spawn, 480);
      const clockT = setInterval(() => { left--; upd(); if (left <= 0) end(false); }, 1000);
      spawn(); upd();
      $('#mg-quit', p).onclick = () => { done = true; clearInterval(spawnT); clearInterval(clockT); this.closeModal(); res(false); };
    });
  }

  // ---------- 战队赛 ----------
  tournament(game, baseP) {
    return new Promise(async (res) => {
      const p = this.openModal('mini tourney', `
        <div class="tn-head"><div class="team us">极速战队<small>老王 · 阿强 · 东子 · 小飞 · 亮子</small></div><div class="score"><b id="sc-a">0</b> : <b id="sc-b">0</b></div><div class="team them">天网战队<small>钱总重金打造</small></div></div>
        <div class="tn-map">de_dust2 · 五局三胜 · 胜率评估 ${Math.round(baseP * 100)}%</div>
        <div class="tn-feed" id="tn-feed"></div>
        <div class="tn-intel" id="tn-intel"></div>
        <div class="mg-opts" id="tn-opts"></div>`);
      const feed = $('#tn-feed', p), intel = $('#tn-intel', p), optsEl = $('#tn-opts', p);
      let a = 0, b = 0, round = 1;
      const US = ['Sniper王', '[极速]阿强', '[极速]东子', '[极速]小飞', '[极速]亮子'];
      const THEM = ['[天网]Ghost', '[天网]Kimi', '[天网]无敌', '[天网]小钱', '[天网]Ace'];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const log = (t, cls = '') => { const d = el('div', cls, t); feed.appendChild(d); feed.scrollTop = feed.scrollHeight; };
      log('📢 比赛开始！双方选手进入服务器……', 'sys');
      while (a < 3 && b < 3) {
        const plan = pick(['A', 'B', 'M']);
        const truthful = Math.random() < 0.8;
        const shown = truthful ? plan : pick(['A', 'B', 'M'].filter((x) => x !== plan));
        const intelTxt = { A: '老王压低声音：“A 大道脚步声很密，他们重兵守 A。”', B: '小飞：“B 洞里闪光弹扔个不停，B 点人多！”', M: '东子：“中门一直有狙在架，他们在中路控图。”' }[shown];
        intel.innerHTML = `<b>第 ${round} 局</b> · ${intelTxt}`;
        const choices = [['A', '全员冲 A 点'], ['B', '全员冲 B 点'], ['M', '中路控图，伺机转点']];
        const c = await new Promise((r) => {
          optsEl.innerHTML = '';
          choices.forEach(([k, t]) => { const bt = el('button', 'btn', t); bt.onclick = () => r(k); optsEl.appendChild(bt); });
        });
        optsEl.innerHTML = '';
        // 克制关系：打对方没重兵的点
        let pr = baseP;
        if (c === 'M') pr += plan === 'M' ? -0.12 : 0.06;
        else if (c === plan) pr -= 0.18;
        else pr += plan === 'M' ? 0.04 : 0.2;
        const win = Math.random() < Math.min(0.92, Math.max(0.08, pr));
        log(`—— 第 ${round} 局：${{ A: '冲A', B: '冲B', M: '中路控图' }[c]} ——`, 'sys');
        const kills = win ? [1, 1, 0, 1, 1, 0, 1] : [0, 1, 0, 0, 1, 0, 0];
        for (const k of shuffle(kills).slice(0, 5)) {
          await sleep(420);
          game.audio.play('gun');
          if (k) log(`${pick(US)} <span class="gun">⌐╦</span> ${pick(THEM)}${Math.random() < 0.3 ? ' <b>爆头</b>' : ''}`, 'us');
          else log(`${pick(THEM)} <span class="gun">⌐╦</span> ${pick(US)}`, 'them');
        }
        await sleep(500);
        if (win) { a++; log('✔ 极速战队拿下本局！网吧里一片欢呼！', 'win'); game.audio.play('cheer'); }
        else { b++; log('✘ 天网战队赢下本局……', 'lose'); game.audio.play('fail'); }
        $('#sc-a', p).textContent = a; $('#sc-b', p).textContent = b;
        round++;
        await sleep(600);
      }
      intel.innerHTML = a > b ? '<b class="pos">🏆 极速战队获胜！</b>' : '<b class="neg">天网战队获胜……</b>';
      const done = el('button', 'btn primary big', '继续');
      optsEl.appendChild(done);
      done.onclick = () => { this.closeModal(); res({ win: a > b, score: `${a}:${b}` }); };
    });
  }

  // ---------- 结局 ----------
  ending(info, game) {
    const st = game.state;
    const total = st.history.reduce((s, h) => s + h.served, 0);
    const p = this.openModal('ending ' + info.key, `
      <div class="ed-title">${info.title}</div>
      <p class="ed-desc">${info.desc}</p>
      <div class="ed-epi">${info.epi.map((e) => `<p>${e}</p>`).join('')}</div>
      <div class="ed-stats"><span>累计接待 <b>${total}</b> 人</span><span>最终口碑 <b>${Math.round(st.rep)}</b></span><span>账上余额 <b>¥${st.money}</b></span></div>
      <div class="ed-thanks">—— 献给每一个在网吧度过的青春 ——</div>
      <button class="btn primary big" id="ed-again">重新开始</button>`);
    $('#ed-again', p).onclick = () => location.reload();
  }
}
