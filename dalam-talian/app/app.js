/* =========================================================
   Belajar Bijak, Skor Hebat! — ONLINE edition (Webex / Google Meet / Zoom)
   Presentation engine + widgets. Runs locally, no network.
   Audience interaction comes in through the meeting chat:
   copy the chat, press Ctrl+V on a slide, and the slide counts it.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const digit = (e, max) => { const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || ''); const n = m ? +m[1] : 0; return n && n <= max ? n : 0; };

  /* ---------- persistent state ---------- */
  const store = {
    key: 'belajar-bijak-slot2-online-v1',
    data: {},
    load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } },
    save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage blocked */ } },
  };
  store.load();

  /* ---------- stage scaling ---------- */
  const stage = $('#stage');
  const fit = () => { const s = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `translate(-50%, -50%) scale(${s})`; };
  addEventListener('resize', fit); fit();

  /* ---------- sound ---------- */
  const Sound = {
    ctx: null, muted: !!store.data.muted,
    ensure() {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(f, d = 0.12, type = 'sine', v = 0.16, when = 0) {
      if (this.muted) return;
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.03);
    },
    tick() { this.tone(1150, 0.05, 'square', 0.05); },
    pop() { this.tone(520, 0.09, 'triangle', 0.14); this.tone(780, 0.07, 'triangle', 0.08, 0.04); },
    correct() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.15, i * 0.085)); },
    end() { [880, 660, 880, 660, 1046].forEach((f, i) => this.tone(f, 0.24, 'square', 0.08, i * 0.17)); },
    swish(up = true) {
      if (this.muted) return;
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + 0.01, d = 0.24;
      const n = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), a = n.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = n; f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime(up ? 500 : 2400, t);
      f.frequency.exponentialRampToValueAtTime(up ? 2400 : 500, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f).connect(g).connect(c.destination); s.start(t);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(up ? 420 : 900, t);
      o.frequency.exponentialRampToValueAtTime(up ? 900 : 420, t + 0.16);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(og).connect(c.destination); o.start(t); o.stop(t + 0.2);
    },
    gong() { this.tone(196, 1.1, 'sine', 0.22); this.tone(392, 0.8, 'triangle', 0.06); },
  };

  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600);
  };

  const Confetti = {
    fire() {
      const cv = $('#confetti'), g = cv.getContext('2d');
      const cols = ['#FF5A1F', '#FFC93C', '#6C86FF', '#34CF9F', '#F2EDE3'];
      const P = Array.from({ length: 220 }, (_, i) => ({
        x: i % 2 ? 260 : 1660, y: 760, vx: (i % 2 ? 1 : -1) * (6 + Math.random() * 16), vy: -18 - Math.random() * 22,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.35, w: 14 + Math.random() * 14, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0],
      }));
      let t = 0;
      const frame = () => {
        g.clearRect(0, 0, 1920, 1080);
        P.forEach((p) => { p.vy += 0.55; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.r * 2)); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
        if (++t < 240) requestAnimationFrame(frame); else g.clearRect(0, 0, 1920, 1080);
      };
      frame();
    },
  };

  /* =========================================================
     MEETING CHAT IMPORT
     Understands copied chat from Webex, Google Meet and Zoom:
       Webex:  "from Ali to everyone: 12:51 PM" + message lines
       Meet:   "Ali" / "12:51 PM" / message lines
       Zoom:   "12:51:03 From Ali to Everyone:" + message, or "From Ali to Everyone 12:51 PM"
       Other:  "Ali: message", or bare lines (counted without a name)
     ========================================================= */
  const TIME_RX = /^\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?|pagi|ptg|petang|tgh|malam)?\s*$/;
  const TIME_LEAD = /^\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?)?/;
  const HDR_FROM = /^\s*(?:\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?)?\s+)?(?:from|daripada|dari)\s+(.+?)\s+(?:to|kepada)\s+(?:everyone|all participants|all|semua peserta|semua orang|semua)\b(.*)$/i;
  const HDR_NAMETIME = /^\s*([^\d:].{1,58}?)\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?)?\s*$/;
  const INLINE = /^\s*([^:\n]{2,40}?)\s*:\s+(.+)$/;
  const SELF = /^(you|anda|saya|me)$/i;

  const letterOf = (msg) => { const m = /^\s*[([]?\s*([a-dA-D])\s*[)\].:!]*\s*$/.exec(msg); return m ? 'ABCD'.indexOf(m[1].toUpperCase()) : -1; };
  const numOf = (msg, max) => { const m = /^\s*([1-9])\s*[).:!]*\s*$/.exec(msg); const n = m ? +m[1] : 0; return n >= 1 && n <= max ? n - 1 : -1; };

  const Chat = {
    seen: store.data.chatSeen || [],
    roster: store.data.roster || [],
    me: store.data.chatMe || '',
    parse(text) {
      const out = []; let cur = null;
      text.replace(/\r/g, '').split('\n').forEach((raw) => {
        const l = raw.replace(/​/g, '').trim();
        if (!l) return;
        if (TIME_RX.test(l)) { // Google Meet: the line before a lone time is the sender's name
          const last = out[out.length - 1];
          if (last && last.loose && last.msg.length <= 60) { out.pop(); cur = last.msg; }
          return;
        }
        let m = HDR_FROM.exec(l);
        if (m) {
          cur = m[1].trim();
          const tail = m[2].replace(/^[\s:]+/, '').replace(TIME_LEAD, '').replace(/^[\s:]+/, '').trim();
          if (tail && !/^\(.{4,}\)$/.test(tail)) out.push({ name: cur, msg: tail }); // skip "(Direct Message)"-style tags, keep answers like "(D)"
          return;
        }
        m = HDR_NAMETIME.exec(l);
        if (m) { cur = m[1].trim(); return; }
        if (cur) { out.push({ name: cur, msg: l, loose: true }); return; }
        m = INLINE.exec(l);
        if (m && !/^https?$/i.test(m[1])) { out.push({ name: m[1].trim(), msg: m[2].trim() }); return; }
        out.push({ name: null, msg: l, loose: true });
      });
      const me = this.me.trim().toLowerCase();
      return out
        .map(({ name, msg }) => ({ name: name && name.replace(/\s+/g, ' ').slice(0, 60), msg }))
        .filter((x) => !(x.name && (SELF.test(x.name) || (me && x.name.toLowerCase() === me))));
    },
    ingest(text) {
      const msgs = this.parse(text);
      if (!msgs.length) return { parsed: 0, fresh: [] };
      const sig = msgs.map((m) => (m.name || '') + '|' + m.msg);
      const prev = this.seen;
      let k = 0; // longest overlap: end of what we saw before == start of this paste
      for (let n = Math.min(prev.length, sig.length); n > 0; n--) {
        let ok = true;
        for (let i = 0; i < n; i++) { if (prev[prev.length - n + i] !== sig[i]) { ok = false; break; } }
        if (ok) { k = n; break; }
      }
      const fresh = msgs.slice(k);
      this.seen = prev.slice(0, prev.length - k).concat(sig).slice(-3000);
      fresh.forEach((m) => { if (m.name && !this.roster.includes(m.name)) this.roster.push(m.name); });
      store.data.chatSeen = this.seen; store.data.roster = this.roster; store.save();
      return { parsed: msgs.length, fresh };
    },
    forget() { this.seen = []; this.roster = []; store.data.chatSeen = []; store.data.roster = []; store.save(); },
  };

  function handleChat(text) {
    if (!text || !text.trim()) return;
    const r = Chat.ingest(text);
    if (!r.parsed) { toast('Tiada mesej chat dikesan'); return; }
    Picker.addNames(Chat.roster);
    updateChatStats();
    if (!r.fresh.length) { toast('Tiada mesej baharu sejak kali terakhir diletak'); return; }
    const res = slides[cur].ctl.chat(r.fresh);
    toast(`${r.fresh.length} mesej baharu · ${res || Chat.roster.length + ' nama dikesan'}`);
    Sound.pop();
  }
  const updateChatStats = () => { $('#chat .c-names').textContent = Chat.roster.length; $('#chat .c-seen').textContent = Chat.seen.length; };

  document.addEventListener('paste', (e) => {
    const t = e.target;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !(t.classList.contains('cloud-in') && /\n/.test(text))))) return;
    if (!text) return;
    e.preventDefault();
    if (t && t.blur) t.blur();
    handleChat(text);
  });

  /* =========================================================
     TIMER
     ========================================================= */
  const Timer = {
    el: $('#timer'), total: 0, left: 0, run: false, h: 0, last: 0, lastTick: 0, C: 163.4,
    start(sec) { this.total = sec; this.left = sec; this.run = true; this.el.classList.add('on'); this.el.classList.remove('done', 'paused'); Sound.pop(); this.loop(); this.render(); },
    loop() {
      clearInterval(this.h); this.last = performance.now();
      this.h = setInterval(() => {
        const now = performance.now();
        if (this.run) {
          this.left -= (now - this.last) / 1000;
          if (this.left <= 0) { this.left = 0; this.run = false; clearInterval(this.h); this.el.classList.add('done'); Sound.end(); }
          else if (this.left <= 5 && Math.ceil(this.left) !== this.lastTick) { this.lastTick = Math.ceil(this.left); Sound.tick(); }
          this.render();
        }
        this.last = now;
      }, 100);
    },
    toggle() { if (this.left <= 0) return; this.run = !this.run; this.el.classList.toggle('paused', !this.run); },
    add(s) { this.left += s; this.total = Math.max(this.total, this.left); if (!this.run && this.el.classList.contains('done')) { this.el.classList.remove('done'); this.run = true; this.loop(); } this.render(); },
    stop() { this.run = false; clearInterval(this.h); this.el.classList.remove('on', 'done', 'paused'); },
    render() {
      const t = Math.ceil(this.left);
      $('.t-time', this.el).textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      $('.fg', this.el).style.strokeDashoffset = this.C * (1 - (this.total ? this.left / this.total : 0));
    },
  };
  $('.t-pause', Timer.el).addEventListener('click', () => Timer.toggle());
  $('.t-time', Timer.el).addEventListener('click', () => Timer.toggle());
  $('.t-add', Timer.el).addEventListener('click', () => Timer.add(30));
  $('.t-x', Timer.el).addEventListener('click', () => Timer.stop());
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-timer]'); if (b) Timer.start(+b.dataset.timer); });

  /* =========================================================
     OVERLAYS
     ========================================================= */
  const ovl = {
    cur: null, onOpen: {},
    open(id) { this.closeAll(); $('#' + id).classList.add('on'); this.cur = id; if (this.onOpen[id]) this.onOpen[id](); },
    close(id) { $('#' + id).classList.remove('on'); if (this.cur === id) this.cur = null; },
    toggle(id) { this.cur === id ? this.close(id) : this.open(id); },
    closeAll() { $$('.ovl.on').forEach((o) => o.classList.remove('on')); this.cur = null; },
  };
  $$('.ovl').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) ovl.close(o.id); }));
  $$('#tmenu [data-s]').forEach((b) => b.addEventListener('click', () => { Timer.start(+b.dataset.s); ovl.close('tmenu'); }));

  /* ---------- chat panel ---------- */
  const chatIn = $('#chat .chat-in'), chatMe = $('#chat .c-me');
  chatMe.value = Chat.me;
  chatMe.addEventListener('input', () => { Chat.me = chatMe.value; store.data.chatMe = chatMe.value; store.save(); });
  $('#chat .c-go').addEventListener('click', () => { const t = chatIn.value; chatIn.value = ''; ovl.close('chat'); handleChat(t); });
  $('#chat input[type=file]').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { ovl.close('chat'); handleChat(String(rd.result)); };
    rd.readAsText(f); e.target.value = '';
  });
  $('#chat .c-clear').addEventListener('click', () => {
    if (!confirm('Lupakan semua chat dan nama yang telah dibaca? (Markah aktiviti tidak dipadam.)')) return;
    Chat.forget(); updateChatStats(); toast('Chat lama dilupakan');
  });
  ovl.onOpen.chat = () => { updateChatStats(); setTimeout(() => chatIn.focus(), 50); };
  updateChatStats();

  /* ---------- name picker ---------- */
  const Picker = {
    el: $('#picker'), busy: false, picked: new Set(),
    list() { return [...new Set($('.pick-list', this.el).value.split('\n').map((s) => s.trim()).filter(Boolean))]; },
    count() { $('.p-count', this.el).textContent = `${this.list().length} nama`; },
    addNames(names) {
      const ta = $('.pick-list', this.el), have = new Set(this.list());
      const add = names.filter((n) => !have.has(n));
      if (!add.length) return;
      ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + add.join('\n');
      store.data.pickNames = ta.value; store.save(); this.count();
    },
    spin() {
      if (this.busy) return;
      const names = this.list(), out = $('.r-name', this.el);
      if (!names.length) { out.textContent = 'Tiada nama'; toast('Letak chat (Ctrl+V) atau taip nama dahulu'); return; }
      let pool = names.filter((n) => !this.picked.has(n));
      if (!pool.length) { this.picked.clear(); pool = names; }
      const final = pool[Math.floor(Math.random() * pool.length)];
      this.picked.add(final);
      this.busy = true; this.el.classList.remove('done');
      let delay = 45, steps = 0;
      const roll = () => {
        steps++;
        out.textContent = steps < 30 ? names[Math.floor(Math.random() * names.length)] : final;
        Sound.tick();
        if (steps < 30) { delay *= 1.08; setTimeout(roll, delay); }
        else { this.busy = false; this.el.classList.add('done'); Sound.correct(); }
      };
      roll();
    },
  };
  $('.pick-list', Picker.el).value = store.data.pickNames || '';
  $('.pick-list', Picker.el).addEventListener('input', (e) => { store.data.pickNames = e.target.value; store.save(); Picker.count(); });
  $('.p-spin', Picker.el).addEventListener('click', () => Picker.spin());
  $('.p-fill', Picker.el).addEventListener('click', () => { Picker.addNames(Chat.roster); toast(`${Chat.roster.length} nama dari chat`); });
  ovl.onOpen.picker = () => Picker.count();
  Picker.count();

  /* ---------- overview ---------- */
  ovl.onOpen.overview = () => {
    const g = $('#overview .grid'); g.innerHTML = '';
    slides.forEach((s, i) => {
      const theme = ['light', 'sand', 'dark', 'signal'].find((t) => s.classList.contains(t));
      const c = document.createElement('button');
      c.className = 'card' + (i === cur ? ' cur' : '');
      c.innerHTML = `<span class="label">${String(i + 1).padStart(2, '0')} · ${esc(s.dataset.section || '')}</span><b>${esc(s.dataset.title)}</b><i class="t-${theme}"></i>`;
      c.addEventListener('click', () => { ovl.close('overview'); go(i, 0); });
      g.appendChild(c);
    });
  };

  /* =========================================================
     SLIDE ENGINE
     ========================================================= */
  const slides = $$('.slide');
  let cur = 0;
  let sessionStart = store.data.sessionStart || 0;

  function stepCtl(s) {
    const els = $$('[data-step]', s);
    const max = els.reduce((m, el) => Math.max(m, +el.dataset.step || 0), 0);
    let n = 0;
    const set = (k) => {
      n = Math.max(0, Math.min(max, k));
      els.forEach((el) => el.classList.toggle('shown', +el.dataset.step <= n));
      s.dataset.stepNow = n;
      s.dispatchEvent(new CustomEvent('step', { detail: n }));
    };
    return {
      max, set,
      get n() { return n; },
      enter(dir) { set(dir < 0 ? max : 0); },
      next() { if (n < max) { set(n + 1); return true; } return false; },
      prev() { if (n > 0) { set(n - 1); return true; } return false; },
      leave() {}, key() { return false; }, chat() { return ''; },
    };
  }
  const extend = (base, over) => Object.assign(Object.create(base), over);
  const widgets = {};

  /* ---------- poll (A–D) ---------- */
  widgets.poll = (s, base) => {
    const rows = $$('.poll-row', s);
    let v = store.data.poll || [0, 0, 0, 0];
    let voters = store.data.pollVoters || {};
    const save = () => { store.data.poll = v; store.data.pollVoters = voters; store.save(); };
    const render = () => {
      const tot = v.reduce((a, b) => a + b, 0), mx = Math.max(1, ...v);
      rows.forEach((r, i) => {
        $('.pbar i', r).style.width = (v[i] / mx) * 100 + '%';
        $('.pc b', r).textContent = v[i];
        $('.pc small', r).textContent = tot ? Math.round((v[i] / tot) * 100) + '%' : '–';
        r.classList.toggle('lead', tot > 0 && v[i] === mx);
      });
      $('.poll-total', s).textContent = tot;
    };
    const add = (i, d) => { v[i] = Math.max(0, v[i] + d); save(); Sound.pop(); render(); };
    rows.forEach((r, i) => {
      r.addEventListener('click', (e) => add(i, e.shiftKey ? -1 : 1));
      r.addEventListener('contextmenu', (e) => { e.preventDefault(); add(i, -1); });
    });
    s.addEventListener('reset', () => { v = [0, 0, 0, 0]; voters = {}; render(); });
    render();
    return extend(base, {
      key(e) { const k = digit(e, 4); if (k) { add(k - 1, e.shiftKey ? -1 : 1); return true; } return false; },
      chat(fresh) {
        let n = 0;
        fresh.forEach((m) => {
          const k = letterOf(m.msg); if (k < 0) return;
          if (m.name) { if (voters[m.name] !== undefined) return; voters[m.name] = k; }
          v[k]++; n++;
        });
        save(); render();
        return `${n} undi dikira`;
      },
    });
  };

  /* ---------- word cloud ---------- */
  widgets.cloud = (s, base) => {
    const area = $('.cloud', s), inp = $('.cloud-in', s);
    let w = store.data.words || {};
    const norm = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
    const render = () => {
      const entries = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 40);
      area.innerHTML = '';
      if (!entries.length) { area.innerHTML = '<p class="cloud-empty">Kata-kata dari chat akan muncul di sini…</p>'; return; }
      const mx = entries[0][1], many = entries.length > 14;
      const ordered = [];
      entries.forEach((e, i) => (i % 2 ? ordered.push(e) : ordered.unshift(e)));
      ordered.forEach(([t, c]) => {
        const b = document.createElement('button');
        const r = mx > 1 ? (c - 1) / (mx - 1) : 1;
        b.className = 'word' + (c === mx && mx > 1 ? ' top' : '');
        b.style.fontSize = (many ? 32 : 40) + r * (many ? 66 : 92) + 'px';
        b.style.setProperty('--o', (0.6 + 0.4 * r).toFixed(2));
        b.textContent = t;
        b.title = 'Klik: +1 · Shift + klik: −1';
        b.addEventListener('click', (e) => add(t, e.shiftKey ? -1 : 1));
        area.appendChild(b);
      });
    };
    const bump = (t, d) => { t = norm(t); if (!t) return false; w[t] = (w[t] || 0) + d; if (w[t] <= 0) delete w[t]; return true; };
    const add = (t, d = 1) => { if (bump(t, d)) { store.data.words = w; store.save(); Sound.pop(); render(); } };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(inp.value); inp.value = ''; } });
    $$('.chip', s).forEach((c) => c.addEventListener('click', () => add(c.textContent)));
    s.addEventListener('reset', () => { w = {}; render(); });
    render();
    return extend(base, {
      chat(fresh) {
        let n = 0;
        fresh.forEach((m) => {
          const t = m.msg.trim();
          if (t.length < 2 || t.length > 40 || letterOf(t) >= 0 || numOf(t, 9) >= 0 || /^https?:/i.test(t)) return;
          if (bump(t, 1)) n++;
        });
        store.data.words = w; store.save(); render();
        return `${n} perkataan ditambah`;
      },
    });
  };

  /* ---------- prompt recipe meter ---------- */
  widgets.recipe = (s, base) => {
    const fill = $('.meter i', s), lab = $('.meter-label', s), ph = $('.ph', s);
    const W = [10, 28, 48, 68, 86, 100];
    const L = ['Lemah', 'Kabur', 'Boleh tahan', 'Baik', 'Mantap', 'Jurulatih peribadi'];
    const C = ['#FF5A1F', '#FF5A1F', '#FFC93C', '#FFC93C', '#34CF9F', '#34CF9F'];
    s.addEventListener('step', (e) => {
      const n = e.detail;
      fill.style.width = W[n] + '%'; fill.style.background = C[n]; lab.textContent = L[n];
      ph.style.display = n ? 'none' : '';
      if (n && s.classList.contains('active')) Sound.pop();
    });
    return base;
  };

  /* ---------- offline chat simulation ---------- */
  widgets.chat = (s, base) => {
    const msgs = $$('.msg', s), lis = $$('.demo-steps li', s);
    msgs.forEach((m) => { m.dataset.full = $('.msg-text', m).textContent; });
    let typer = 0;
    s.addEventListener('step', (e) => {
      const n = e.detail;
      clearInterval(typer);
      msgs.forEach((m) => { const k = +m.dataset.step; m.classList.remove('typing'); $('.msg-text', m).textContent = k < n ? m.dataset.full : ''; });
      lis.forEach((li, j) => li.classList.toggle('on', j + 1 === n || (n === 0 && j === 0)));
      const m = msgs.find((x) => +x.dataset.step === n);
      if (!m) return;
      const t = $('.msg-text', m), full = m.dataset.full, ai = m.classList.contains('ai');
      if (!s.classList.contains('active')) { t.textContent = full; return; }
      let i = 0; m.classList.add('typing');
      typer = setInterval(() => {
        i += ai ? 3 : 2; t.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(typer); m.classList.remove('typing'); if (ai) Sound.pop(); }
      }, ai ? 22 : 26);
    });
    return base;
  };

  /* ---------- 3-question checklist ---------- */
  widgets.check = (s, base) => {
    const rows = $$('.q3-row', s), ban = $('.q3-verdict', s);
    let st = [null, null, null];
    const TXT = { wait: 'Jawab ketiga-tiga soalan dengan jujur.', stop: 'Ada "TIDAK"? Berhenti. Fikir semula sebelum guna AI.', go: 'Tiga kali YA. Teruskan, dan kekal bijak.' };
    const render = () => {
      rows.forEach((r, i) => $$('.yn button', r).forEach((b) => b.classList.toggle('sel', b.dataset.v === st[i])));
      const v = st.includes('no') ? 'stop' : st.every((x) => x === 'yes') ? 'go' : 'wait';
      ban.dataset.v = v; ban.textContent = TXT[v];
    };
    rows.forEach((r, i) => $$('.yn button', r).forEach((b) => b.addEventListener('click', () => {
      st[i] = st[i] === b.dataset.v ? null : b.dataset.v;
      const v0 = ban.dataset.v; render();
      if (ban.dataset.v === 'go' && v0 !== 'go') Sound.correct(); else if (ban.dataset.v === 'stop' && v0 !== 'stop') Sound.gong(); else Sound.pop();
    })));
    render();
    return extend(base, { enter(d) { base.enter(d); st = [null, null, null]; render(); } });
  };

  /* ---------- routine timeline ---------- */
  widgets.timeline = (s, base) => {
    const line = $('.tl-line i', s);
    s.addEventListener('step', (e) => { line.style.width = [0, 12.5, 37.5, 62.5, 100][e.detail] + '%'; });
    return base;
  };

  /* ---------- commitment wall ---------- */
  widgets.commit = (s, base) => {
    const a = $('#c-a', s), b = $('#c-b', s), wall = $('.wall', s);
    let list = store.data.commits || [];
    const render = () => {
      wall.innerHTML = '';
      if (!list.length) { wall.innerHTML = '<p class="wall-empty">Komitmen dari chat akan diletak di sini…</p>'; return; }
      list.slice(-6).forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'note';
        d.style.setProperty('--r', [-3, 2, -1.5, 3, -2.5, 1.5][i] + 'deg');
        d.innerHTML = c.t
          ? `<p><small>${esc(c.n || 'Peserta')}</small><b>${esc(c.t.length > 120 ? c.t.slice(0, 117) + '…' : c.t)}</b></p>`
          : `<p><small>Guna AI untuk</small><b>${esc(c[0])}</b></p><p><small>Berhenti guna AI untuk</small><b>${esc(c[1])}</b></p>`;
        wall.appendChild(d);
      });
    };
    const save = () => { store.data.commits = list; store.save(); };
    const pin = () => {
      if (!a.value.trim() && !b.value.trim()) { a.focus(); return; }
      list.push([a.value.trim() || '…', b.value.trim() || '…']); save();
      a.value = ''; b.value = ''; a.blur(); b.blur(); Sound.correct(); render();
    };
    $('.pin', s).addEventListener('click', pin);
    a.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); b.focus(); } });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pin(); } });
    s.addEventListener('reset', () => { list = []; render(); });
    render();
    return extend(base, {
      chat(fresh) {
        let n = 0;
        fresh.forEach((m) => { if (m.msg.length >= 12) { list.push({ t: m.msg, n: m.name }); n++; } });
        save(); render(); if (n) Sound.correct();
        return `${n} komitmen diletak`;
      },
    });
  };

  /* ---------- quiz: individual answers from chat ---------- */
  const QUIZ = [
    { q: 'Huruf "I" dalam BIJAK bermaksud…', o: ['Ikut Kawan', 'Imbas Kembali', 'Internet Laju', 'Idea Segera'], a: 1, why: '<b>Imbas Kembali</b>: uji diri dengan soalan dan kad imbas.' },
    { q: 'Cara terbaik guna AI untuk assignment esei?', o: ['Minta AI tulis, terus hantar', 'Tukar perkataan jawapan AI', 'Tulis draf sendiri, minta AI kritik', 'Salin dari kawan yang guna AI'], a: 2, why: 'AI sebagai <b>pengkritik</b>, anda sebagai penulis.' },
    { q: 'AI beri anda 5 rujukan jurnal. Apa yang perlu dibuat?', o: ['Semak setiap satu di sumber asal', 'Terus masukkan dalam rujukan', 'Pilih yang paling panjang', 'Buang semua sekali'], a: 0, why: 'AI boleh <b>mereka rujukan</b>. Tak jumpa di sumber asal? Jangan guna.' },
    { q: 'BEEQK2023 Soalan 1(b): t = 12.7413 ÷ 0.9123 ≈ ?', o: ['1.40', '13.97', '11.83', '0.07'], a: 1, why: '12.7413 ÷ 0.9123 ≈ <b>13.97</b>, jauh melebihi t kritikal 1.699 (df = 29).' },
    { q: 'Kenapa uji diri lebih berkesan daripada baca semula?', o: ['Lebih cepat siap', 'Tak perlu nota langsung', 'AI yang ingat untuk kita', 'Otak berusaha mengingat, ingatan jadi kuat'], a: 3, why: '<b>Testing effect</b>: usaha mengingat semula menguatkan ingatan.' },
    { q: 'Soalan ke-3 sebelum tekan Enter ialah…', o: ['Adakah AI ini percuma?', 'Bolehkah saya terangkan hasilnya tanpa AI?', 'Berapa cepat AI menjawab?', 'Kawan saya guna juga ke?'], a: 1, why: 'Tak boleh terangkan tanpa AI? Anda <b>belum belajar</b>.' },
  ];
  const QCOL = ['signal', 'sun', 'blue', 'mint'];
  const SHAPE = [
    '<svg class="shape" viewBox="0 0 56 56"><path d="M28 6 52 48H4z"/></svg>',
    '<svg class="shape" viewBox="0 0 56 56"><path d="M28 3 53 28 28 53 3 28z"/></svg>',
    '<svg class="shape" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24"/></svg>',
    '<svg class="shape" viewBox="0 0 56 56"><rect x="6" y="6" width="44" height="44" rx="5"/></svg>',
  ];
  widgets.quiz = (s, base) => {
    const root = $('.quiz', s);
    const QT = 20, RC = 2 * Math.PI * 50;
    const blank = () => ({ ans: QUIZ.map(() => ({})), anon: QUIZ.map(() => [0, 0, 0, 0]), man: QUIZ.map(() => []) });
    let Q = store.data.quiz || blank();
    let phase = 'intro', qi = 0, tmr = 0, left = QT, lastTick = 0;
    const save = () => { store.data.quiz = Q; store.save(); };

    const counts = (q) => { const c = Q.anon[q].slice(); Object.values(Q.ans[q]).forEach((k) => { c[k]++; }); return c; };
    const rightNames = (q) => [...new Set(Object.keys(Q.ans[q]).filter((n) => Q.ans[q][n] === QUIZ[q].a).concat(Q.man[q]))];
    const scores = () => { const sc = {}; QUIZ.forEach((_, q) => rightNames(q).forEach((n) => { sc[n] = (sc[n] || 0) + 100; })); return sc; };

    const stopTimer = () => clearInterval(tmr);
    const runTimer = () => {
      stopTimer(); left = QT; lastTick = 0;
      const ring = $('.q-timer', root), fg = $('.fg', root), num = $('.q-timer b', root);
      let last = performance.now();
      tmr = setInterval(() => {
        const now = performance.now(); left -= (now - last) / 1000; last = now;
        if (left <= 0) { left = 0; stopTimer(); reveal(); return; }
        const c = Math.ceil(left);
        num.textContent = c; fg.style.strokeDashoffset = RC * (1 - left / QT);
        ring.classList.toggle('low', left <= 5);
        if (left <= 5 && c !== lastTick) { lastTick = c; Sound.tick(); }
      }, 80);
    };

    const render = () => {
      stopTimer();
      root.dataset.phase = phase;
      if (phase === 'intro') {
        root.innerHTML = `<div class="q-intro">
          <span class="label" style="color:var(--signal)">Aktiviti 06 · Kuiz kilat</span>
          <h2 class="h-l">Siapa paling <em>BIJAK?</em></h2>
          <p class="body-l dim" style="max-width:1450px">6 soalan · 20 saat setiap satu. Taip <b style="color:var(--paper)">A, B, C atau D</b> di chat. Jawapan pertama sahaja dikira · 100 mata setiap jawapan betul.</p>
          <div class="q-legend">${QCOL.map((c, i) => `<div class="q-opt c-${c}">${SHAPE[i]}<span class="lg">${'ABCD'[i]}</span></div>`).join('')}</div>
          <div class="q-go" style="margin-top:auto"><span class="label q-hint">${Chat.roster.length} nama dikesan dari chat setakat ini</span><button class="btn solid q-start">Mula kuiz →</button></div>
        </div>`;
        $('.q-start', root).addEventListener('click', () => ctl.next());
        return;
      }
      if (phase === 'q' || phase === 'reveal') {
        const D = QUIZ[qi], rv = phase === 'reveal', c = counts(qi), tot = c.reduce((a, b) => a + b, 0);
        const right = rightNames(qi);
        root.innerHTML = `
          <div class="q-top"><span class="label">Soalan <b>${qi + 1}</b> / ${QUIZ.length}</span>
            <div class="q-timer ${rv ? 'low' : ''}"><svg viewBox="0 0 116 116"><circle class="bg" cx="58" cy="58" r="50"/><circle class="fg" cx="58" cy="58" r="50" stroke-dasharray="${RC}" stroke-dashoffset="${rv ? RC : 0}"/></svg><b>${rv ? '0' : QT}</b></div></div>
          <h2 class="q-text">${esc(D.q)}</h2>
          <div class="q-opts">${D.o.map((o, i) => `<div class="q-opt c-${QCOL[i]} ${rv ? (i === D.a ? 'correct' : 'wrong') : ''}">${SHAPE[i]}<span>${esc(o)}</span><span class="ltr">${'ABCD'[i]}${rv && i === D.a ? ' · BETUL' : ''}</span>${rv && tot ? `<span class="dist">${c[i]} · ${Math.round((c[i] / tot) * 100)}%</span>` : ''}</div>`).join('')}</div>
          <div class="q-bottom">
            ${rv ? `<p class="q-why">${D.why}</p>` : ''}
            <div class="q-rowbar">
              ${rv
                ? `<p class="q-right">${right.length ? `Betul: <b>${esc(right.slice(0, 6).join(', '))}</b>${right.length > 6 ? ` +${right.length - 6} lagi` : ''}` : tot ? 'Tiada nama yang betul direkod.' : 'Letak chat (Ctrl+V) untuk kira jawapan.'}</p><input class="q-man" placeholder="Tambah nama yang betul, Enter" spellcheck="false">`
                : `<span class="label q-hint">Taip A, B, C atau D di chat · → untuk dedah</span><span class="q-recv">${tot} jawapan diterima</span>`}
            </div>
          </div>`;
        if (rv) {
          const man = $('.q-man', root);
          man.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || !man.value.trim()) return;
            e.preventDefault();
            const n = man.value.trim().replace(/\s+/g, ' ');
            if (!Q.man[qi].includes(n)) Q.man[qi].push(n);
            if (!Chat.roster.includes(n)) Chat.roster.push(n);
            save(); Sound.pop(); render(); $('.q-man', root).focus();
          });
        } else runTimer();
        return;
      }
      // final
      const sc = scores(), names = Object.keys(sc).sort((x, y) => sc[y] - sc[x]).slice(0, 6);
      if (names.length) {
        const mx = Math.max(...names.map((n) => sc[n])), top = mx;
        root.innerHTML = `<div class="q-final">
          <span class="label" style="color:var(--signal)">Keputusan kuiz kilat</span>
          <h2 class="h-m">Papan <em>markah.</em></h2>
          <div class="q-board">${names.map((n, r) => `<div class="q-brow c-${QCOL[r % 4]} ${sc[n] === top ? 'first' : ''}" style="animation-delay:${r * 0.08}s"><span class="rk">${r + 1}</span><span class="nm">${esc(n)}${sc[n] === top ? '<span class="champ">JUARA</span>' : ''}</span><span class="bar"><i data-w="${(sc[n] / mx) * 100}"></i></span><span class="pts">${sc[n]}</span></div>`).join('')}</div>
          <div class="q-go" style="margin-top:auto"><span class="label q-hint">→ ke slaid penutup</span><button class="btn q-again">Main semula</button></div>
        </div>`;
        requestAnimationFrame(() => requestAnimationFrame(() => $$('.q-brow .bar i', root).forEach((b) => { b.style.width = b.dataset.w + '%'; })));
        setTimeout(() => { Confetti.fire(); Sound.correct(); }, 500);
      } else {
        root.innerHTML = `<div class="q-final">
          <span class="label" style="color:var(--signal)">Keputusan kuiz kilat</span>
          <h2 class="h-m">Berapa ramai yang <em>betul?</em></h2>
          <div class="q-sum">${QUIZ.map((D, q) => { const c = counts(q), t = c.reduce((a, b) => a + b, 0); return `<div><span>Soalan ${q + 1}</span><b>${t ? Math.round((c[D.a] / t) * 100) + '%' : '–'}</b><span>${t} jawapan</span></div>`; }).join('')}</div>
          <div class="q-go" style="margin-top:auto"><span class="label q-hint">Papan markah nama memerlukan chat yang diletak</span><button class="btn q-again">Main semula</button></div>
        </div>`;
      }
      $('.q-again', root).addEventListener('click', () => { Q = blank(); save(); phase = 'intro'; qi = 0; render(); });
    };

    const reveal = () => { phase = 'reveal'; render(); Sound.gong(); setTimeout(() => Sound.correct(), 250); };

    const ctl = extend(base, {
      enter() { render(); },
      leave() { stopTimer(); },
      next() {
        if (phase === 'intro') { phase = 'q'; qi = 0; render(); Sound.pop(); return true; }
        if (phase === 'q') { reveal(); return true; }
        if (phase === 'reveal') { if (qi < QUIZ.length - 1) { qi++; phase = 'q'; render(); Sound.pop(); } else { phase = 'final'; render(); } return true; }
        return false;
      },
      prev() {
        if (phase === 'intro') return false;
        if (phase === 'final') { phase = 'reveal'; qi = QUIZ.length - 1; render(); return true; }
        if (phase === 'reveal') { phase = 'q'; render(); return true; }
        if (qi === 0) { phase = 'intro'; render(); return true; }
        qi--; phase = 'reveal'; render(); return true;
      },
      chat(fresh) {
        if (phase !== 'q' && phase !== 'reveal') return '';
        let n = 0;
        fresh.forEach((m) => {
          const k = letterOf(m.msg); if (k < 0) return;
          if (m.name) { if (Q.ans[qi][m.name] !== undefined) return; Q.ans[qi][m.name] = k; } else Q.anon[qi][k]++;
          n++;
        });
        save();
        if (phase === 'reveal') render();
        else { const c = counts(qi).reduce((a, b) => a + b, 0); const el = $('.q-recv', root); if (el) el.textContent = `${c} jawapan diterima`; }
        return `${n} jawapan soalan ${qi + 1}`;
      },
    });
    s.addEventListener('reset', () => { Q = blank(); phase = 'intro'; qi = 0; if (s.classList.contains('active')) render(); });
    return ctl;
  };

  /* ---------- build controllers ---------- */
  slides.forEach((s) => { const base = stepCtl(s); const w = s.dataset.widget; s.ctl = w && widgets[w] ? widgets[w](s, base) : base; });

  $$('.flip').forEach((f) => f.addEventListener('click', () => { f.classList.toggle('shown'); Sound.pop(); }));
  /* click an exam paper to enlarge it for remote viewers */
  $$('.paper img').forEach((im) => im.closest('.paper').addEventListener('click', () => {
    const z = $('#zoom img');
    const sc = Math.min(1700 / im.naturalWidth, 860 / im.naturalHeight);
    z.src = im.getAttribute('src'); z.alt = im.alt;
    z.style.width = Math.round(im.naturalWidth * sc) + 'px'; z.style.height = Math.round(im.naturalHeight * sc) + 'px';
    ovl.open('zoom'); Sound.pop();
  }));
  $('#zoom').addEventListener('click', () => ovl.close('zoom'));
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => { const i = slides.findIndex((s) => s.id === b.dataset.goto); if (i >= 0) go(i, 0); }));
  $$('.copy').forEach((b) => b.addEventListener('click', () => {
    const txt = $('.prompt-text', b.closest('.prompt')).textContent.trim();
    const done = () => { toast('Prompt disalin'); Sound.pop(); };
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Tidak dapat menyalin'); } ta.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }));

  /* ---------- navigation ---------- */
  function updateChrome() {
    const s = slides[cur];
    stage.dataset.theme = ['dark', 'signal'].find((t) => s.classList.contains(t)) || 'light';
    stage.dataset.chrome = s.dataset.chrome || 'on';
    $('#chrome .c-sec').textContent = s.dataset.section || '';
    $('#chrome .c-count').innerHTML = `<b>${String(cur + 1).padStart(2, '0')}</b> / ${slides.length}`;
    $('#progress i').style.width = ((cur + 1) / slides.length) * 100 + '%';
    $('#notes .n-title').innerHTML = `<b>${String(cur + 1).padStart(2, '0')}</b> · ${esc(s.dataset.title)}`;
    $('#notes .n-body').textContent = ($('.notes', s) || {}).textContent || '';
  }
  let booted = false; // no swish for the initial slide load
  function go(i, dir) {
    if (i < 0 || i >= slides.length) return;
    const prev = slides[cur];
    if (prev !== slides[i]) { prev.classList.remove('active'); prev.ctl.leave(); if (booted) Sound.swish(i > cur); }
    if (!sessionStart && i > 0) { sessionStart = Date.now(); store.data.sessionStart = sessionStart; }
    cur = i;
    const s = slides[cur];
    s.classList.add('active'); s.ctl.enter(dir || 0);
    updateChrome();
    store.data.slide = cur; store.save();
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* ignore */ }
    Presenter.update();
  }
  function next() { if (slides[cur].ctl.next()) { Presenter.update(); return; } if (cur < slides.length - 1) go(cur + 1, 1); }
  function prev() { if (slides[cur].ctl.prev()) { Presenter.update(); return; } if (cur > 0) go(cur - 1, -1); }

  /* =========================================================
     PRESENTER VIEW (separate window: share only the slides window/tab)
     ========================================================= */
  const Presenter = {
    win: null,
    open() {
      this.win = window.open('', 'bijak-presenter-online', 'width=1180,height=780');
      if (!this.win) { toast('Benarkan pop-up untuk paparan penyampai'); return; }
      const fonts = new URL('fonts/fonts.css', location.href).href;
      const d = this.win.document;
      d.open();
      d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Penyampai · Belajar Bijak (dalam talian)</title><link rel="stylesheet" href="${fonts}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0E121C;color:#F2EDE3;font-family:'Bricolage Grotesque',system-ui,sans-serif;padding:28px 34px;height:100vh;display:grid;grid-template-rows:auto auto 1fr auto;gap:22px}
.l{font:600 13px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#8E96A9}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
.clk{display:flex;gap:34px}.clk div{display:flex;flex-direction:column;gap:8px}
.clk b{font:700 46px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:-.02em}.clk b.warn{color:#FF5A1F}
.cur h1{font-size:40px;letter-spacing:-.03em;font-weight:720;line-height:1.05;margin-top:10px}
.cur .st{font:600 15px 'JetBrains Mono',Consolas,monospace;color:#FFC93C;margin-top:8px}
.notes{background:#181D2B;border-radius:20px;padding:26px 30px;font-size:25px;line-height:1.5;overflow:auto;color:#E7E2D8}
.bot{display:flex;justify-content:space-between;align-items:center;gap:20px}
.nx b{display:block;font-size:22px;font-weight:650;margin-top:8px;color:#C7CCD8}
.btns{display:flex;gap:10px}
button{font:700 15px 'JetBrains Mono',Consolas,monospace;letter-spacing:.08em;padding:16px 22px;border-radius:999px;border:2px solid #3A4258;background:none;color:#F2EDE3;cursor:pointer}
button.p{background:#FF5A1F;border-color:#FF5A1F;color:#12151D}
.tip{font:500 14px 'JetBrains Mono',Consolas,monospace;color:#8E96A9}
</style></head><body>
<div class="top"><div class="cur"><span class="l" id="pc"></span><h1 id="pt"></h1><div class="st" id="ps"></div></div>
<div class="clk"><div><span class="l">Masa berlalu</span><b id="pe">0:00</b></div><div><span class="l">Jam</span><b id="pw"></b></div><div><span class="l">Baki ke 2.15</span><b id="pr"></b></div></div></div>
<span class="l">Nota penceramah · Ctrl+V di sini juga menghantar chat ke slaid</span>
<div class="notes" id="pn"></div>
<div class="bot"><div class="nx"><span class="l">Seterusnya</span><b id="px"></b></div><div class="btns"><button id="bz">Set semula masa</button><button id="bp">← Sebelum</button><button class="p" id="bn">Seterusnya →</button></div></div>
</body></html>`);
      d.close();
      d.addEventListener('keydown', onKey);
      d.addEventListener('paste', (e) => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (t) { e.preventDefault(); handleChat(t); } });
      d.getElementById('bn').onclick = () => next();
      d.getElementById('bp').onclick = () => prev();
      d.getElementById('bz').onclick = () => { sessionStart = Date.now(); store.data.sessionStart = sessionStart; store.save(); tickClock(); };
      this.update(); tickClock();
    },
    update() {
      const w = this.win;
      if (!w || w.closed) return;
      const d = w.document, s = slides[cur], nx = slides[cur + 1], c = s.ctl;
      d.getElementById('pc').textContent = `Slaid ${cur + 1} / ${slides.length} · ${s.dataset.section || ''}`;
      d.getElementById('pt').textContent = s.dataset.title;
      d.getElementById('ps').textContent = c.max ? `Langkah ${c.n} / ${c.max}` : '';
      d.getElementById('pn').textContent = ($('.notes', s) || {}).textContent || '';
      d.getElementById('px').textContent = nx ? nx.dataset.title : 'Tamat';
    },
  };

  const fmt = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sx = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sx).padStart(2, '0'); };
  function tickClock() {
    const now = new Date();
    const el = sessionStart ? fmt(Date.now() - sessionStart) : '0:00';
    const wall = now.toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' });
    const end = new Date(now); end.setHours(14, 15, 0, 0);
    const rem = end - now;
    $('#notes .n-clock').textContent = `Berlalu ${el} · ${wall}`;
    const w = Presenter.win;
    if (w && !w.closed) {
      const d = w.document;
      d.getElementById('pe').textContent = el;
      d.getElementById('pw').textContent = wall;
      const pr = d.getElementById('pr');
      pr.textContent = rem > 0 && rem < 6 * 3600 * 1000 ? fmt(rem) : '–';
      pr.classList.toggle('warn', rem > 0 && rem < 5 * 60 * 1000);
    }
  }
  setInterval(tickClock, 1000);

  /* =========================================================
     INPUT
     ========================================================= */
  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen && document.exitFullscreen();
  };
  const setMute = (m) => {
    Sound.muted = m; store.data.muted = m; store.save();
    const b = $('#toolbar [data-act="sound"]'); b.classList.toggle('on', m); $('.sw', b).style.display = m ? 'none' : '';
    toast(m ? 'Bunyi dimatikan' : 'Bunyi dihidupkan');
  };
  const resetAll = () => {
    if (!confirm('Kosongkan semua undian, awan kata, komitmen, markah kuiz dan chat yang dibaca?')) return;
    store.data = { slide: cur, muted: Sound.muted, chatMe: Chat.me, pickNames: store.data.pickNames };
    store.save();
    Chat.forget(); updateChatStats(); sessionStart = 0;
    slides.forEach((s) => s.dispatchEvent(new Event('reset')));
    toast('Semua aktiviti dikosongkan');
  };

  function onKey(e) {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) { if (e.key === 'Escape') t.blur(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Sound.ensure();
    if (ovl.cur) {
      if (e.key === 'Escape') { ovl.closeAll(); e.preventDefault(); return; }
      if (ovl.cur === 'picker' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); Picker.spin(); return; }
      const k = e.key.toLowerCase();
      if (ovl.cur === 'help' || (ovl.cur === 'overview' && k === 'o') || (ovl.cur === 'tmenu' && k === 't') || (ovl.cur === 'picker' && k === 'w') || (ovl.cur === 'chat' && k === 'c')) { ovl.closeAll(); e.preventDefault(); }
      return;
    }
    if ($('#black').classList.contains('on') && e.key.toLowerCase() !== 'b' && e.key !== '.') { $('#black').classList.remove('on'); return; }
    if (slides[cur].ctl.key(e)) { e.preventDefault(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); next(); return;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); return;
      case 'Home': e.preventDefault(); go(0, 0); return;
      case 'End': e.preventDefault(); go(slides.length - 1, 0); return;
      case 'Escape': $('#notes').classList.remove('on'); return;
      case '?': ovl.open('help'); return;
      default: break;
    }
    switch (e.key.toLowerCase()) {
      case 'f': toggleFs(); break;
      case 'n': $('#notes').classList.toggle('on'); break;
      case 'p': Presenter.open(); break;
      case 'o': ovl.open('overview'); break;
      case 't': ovl.open('tmenu'); break;
      case 'w': ovl.open('picker'); break;
      case 'c': ovl.open('chat'); break;
      case 'b': case '.': $('#black').classList.toggle('on'); break;
      case 'm': setMute(!Sound.muted); break;
      case 'h': ovl.open('help'); break;
      default: return;
    }
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTimeout(() => b.blur(), 0); });

  $$('#toolbar [data-act]').forEach((b) => b.addEventListener('click', () => {
    Sound.ensure();
    ({
      prev, next,
      chat: () => ovl.toggle('chat'),
      timer: () => ovl.toggle('tmenu'),
      picker: () => ovl.toggle('picker'),
      notes: () => $('#notes').classList.toggle('on'),
      presenter: () => Presenter.open(),
      overview: () => ovl.toggle('overview'),
      sound: () => setMute(!Sound.muted),
      full: toggleFs,
      reset: resetAll,
      help: () => ovl.toggle('help'),
    })[b.dataset.act]();
  }));
  if (Sound.muted) { const b = $('#toolbar [data-act="sound"]'); b.classList.add('on'); $('.sw', b).style.display = 'none'; }

  let uiT = 0;
  addEventListener('mousemove', () => { document.body.classList.add('ui'); clearTimeout(uiT); uiT = setTimeout(() => document.body.classList.remove('ui'), 2600); });

  /* ---------- start ---------- */
  const fromHash = parseInt((location.hash || '').slice(1), 10);
  const showAll = /[?&]all(&|$)/.test(location.search); // ?all = every step revealed (rehearsal / review)
  go(fromHash >= 1 && fromHash <= slides.length ? fromHash - 1 : 0, showAll ? -1 : 0);
  booted = true;
  if (!store.data.seenHelp) { setTimeout(() => toast('H untuk kawalan · Ctrl+V untuk letak chat · P untuk paparan penyampai'), 900); store.data.seenHelp = 1; store.save(); }
  window.__bijak = { handleChat, Chat }; // used by the rehearsal test page only
})();
