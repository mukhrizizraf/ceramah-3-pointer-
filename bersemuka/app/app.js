/* =========================================================
   Belajar Bijak, Skor Hebat! — presentation engine + widgets
   Everything runs locally: no network, no accounts.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const digit = (e, max) => { const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || ''); const n = m ? +m[1] : 0; return n && n <= max ? n : 0; };

  /* ---------- persistent state (per-browser, survives reload) ---------- */
  const store = {
    key: 'belajar-bijak-slot2-v1',
    data: {},
    load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } },
    save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage blocked: run without */ } },
  };
  store.load();

  /* ---------- stage scaling ---------- */
  const stage = $('#stage');
  const fit = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  addEventListener('resize', fit);
  fit();

  /* ---------- sound (WebAudio, synthesised: no files needed) ---------- */
  const Sound = {
    ctx: null,
    muted: !!store.data.muted,
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
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.03);
    },
    tick() { this.tone(1150, 0.05, 'square', 0.05); },
    pop() { this.tone(520, 0.09, 'triangle', 0.14); this.tone(780, 0.07, 'triangle', 0.08, 0.04); },
    correct() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.15, i * 0.085)); },
    end() { [880, 660, 880, 660, 1046].forEach((f, i) => this.tone(f, 0.24, 'square', 0.08, i * 0.17)); },
    swish(up = true) {
      if (this.muted) return;
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime, d = 0.22;
      const n = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), a = n.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = n; f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(up ? 500 : 2200, t);
      f.frequency.exponentialRampToValueAtTime(up ? 2200 : 500, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f).connect(g).connect(c.destination); s.start(t);
      this.tone(up ? 660 : 495, 0.09, 'sine', 0.05);
    },
    gong() { this.tone(196, 1.1, 'sine', 0.22); this.tone(392, 0.8, 'triangle', 0.06); },
  };

  /* ---------- toast ---------- */
  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1800);
  };

  /* ---------- confetti ---------- */
  const Confetti = {
    fire() {
      const cv = $('#confetti'), g = cv.getContext('2d');
      const cols = ['#FF5A1F', '#FFC93C', '#6C86FF', '#34CF9F', '#F2EDE3'];
      const P = Array.from({ length: 260 }, (_, i) => ({
        x: i % 2 ? 260 : 1660, y: 760,
        vx: (i % 2 ? 1 : -1) * (6 + Math.random() * 16), vy: -18 - Math.random() * 22,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.35,
        w: 12 + Math.random() * 14, h: 7 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0],
      }));
      let t = 0;
      const frame = () => {
        g.clearRect(0, 0, 1920, 1080);
        P.forEach((p) => {
          p.vy += 0.55; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.r * 2));
          g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
        });
        if (++t < 260) requestAnimationFrame(frame); else g.clearRect(0, 0, 1920, 1080);
      };
      frame();
    },
  };

  /* =========================================================
     TIMER
     ========================================================= */
  const Timer = {
    el: $('#timer'), total: 0, left: 0, run: false, h: 0, last: 0, lastTick: 0,
    C: 163.4,
    start(sec) {
      this.total = sec; this.left = sec; this.run = true;
      this.el.classList.add('on'); this.el.classList.remove('done', 'paused');
      Sound.pop(); this.loop(); this.render();
    },
    loop() {
      clearInterval(this.h); this.last = performance.now();
      this.h = setInterval(() => {
        const now = performance.now();
        if (this.run) {
          this.left -= (now - this.last) / 1000;
          if (this.left <= 0) {
            this.left = 0; this.run = false; clearInterval(this.h);
            this.el.classList.add('done'); Sound.end();
          } else if (this.left <= 5 && Math.ceil(this.left) !== this.lastTick) {
            this.lastTick = Math.ceil(this.left); Sound.tick();
          }
          this.render();
        }
        this.last = now;
      }, 100);
    },
    toggle() {
      if (this.left <= 0) return;
      this.run = !this.run; this.el.classList.toggle('paused', !this.run);
    },
    add(s) {
      this.left += s; this.total = Math.max(this.total, this.left);
      if (!this.run && this.el.classList.contains('done')) { this.el.classList.remove('done'); this.run = true; this.loop(); }
      this.render();
    },
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
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-timer]');
    if (b) Timer.start(+b.dataset.timer);
  });

  /* =========================================================
     OVERLAYS
     ========================================================= */
  const ovl = {
    open(id) { this.closeAll(); $('#' + id).classList.add('on'); this.cur = id; if (this.onOpen[id]) this.onOpen[id](); },
    close(id) { $('#' + id).classList.remove('on'); if (this.cur === id) this.cur = null; },
    toggle(id) { this.cur === id ? this.close(id) : this.open(id); },
    closeAll() { $$('.ovl.on').forEach((o) => o.classList.remove('on')); this.cur = null; },
    cur: null,
    onOpen: {},
  };
  $$('.ovl').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) ovl.close(o.id); }));
  $$('#tmenu [data-s]').forEach((b) => b.addEventListener('click', () => { Timer.start(+b.dataset.s); ovl.close('tmenu'); }));

  /* ---------- random seat picker ---------- */
  const Picker = {
    el: $('#picker'), busy: false,
    spin() {
      if (this.busy) return;
      this.busy = true; this.el.classList.remove('done');
      const R = Math.max(1, +$('.cfg-rows', this.el).value || 12);
      const S = Math.max(1, +$('.cfg-seats', this.el).value || 20);
      const row = $('.r-row', this.el), seat = $('.r-seat', this.el);
      const fr = 1 + Math.floor(Math.random() * R), fs = 1 + Math.floor(Math.random() * S);
      let delay = 40, steps = 0;
      const roll = () => {
        steps++;
        row.textContent = steps < 26 ? 1 + Math.floor(Math.random() * R) : fr;
        seat.textContent = steps < 34 ? 1 + Math.floor(Math.random() * S) : fs;
        Sound.tick();
        if (steps < 34) { delay *= 1.085; setTimeout(roll, delay); }
        else { this.busy = false; this.el.classList.add('done'); Sound.correct(); }
      };
      roll();
    },
  };
  $('.p-spin', Picker.el).addEventListener('click', () => Picker.spin());
  ['cfg-rows', 'cfg-seats'].forEach((c) => {
    const i = $('.' + c, Picker.el);
    if (store.data[c]) i.value = store.data[c];
    i.addEventListener('change', () => { store.data[c] = i.value; store.save(); });
  });

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
      leave() {},
      key() { return false; },
    };
  }
  const extend = (base, over) => Object.assign(Object.create(base), over);

  const widgets = {};

  /* ---------- poll ---------- */
  widgets.poll = (s, base) => {
    const rows = $$('.poll-row', s);
    let v = store.data.poll || [0, 0, 0, 0];
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
    const add = (i, d) => { v[i] = Math.max(0, v[i] + d); store.data.poll = v; store.save(); Sound.pop(); render(); };
    rows.forEach((r, i) => {
      r.addEventListener('click', (e) => add(i, e.shiftKey ? -1 : 1));
      r.addEventListener('contextmenu', (e) => { e.preventDefault(); add(i, -1); });
    });
    s.addEventListener('reset', () => { v = [0, 0, 0, 0]; render(); });
    render();
    return extend(base, { key(e) { const k = digit(e, 4); if (k) { add(k - 1, e.shiftKey ? -1 : 1); return true; } return false; } });
  };

  /* ---------- word cloud ---------- */
  widgets.cloud = (s, base) => {
    const area = $('.cloud', s), inp = $('.cloud-in', s);
    let w = store.data.words || {};
    const norm = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 40);
    const render = () => {
      const entries = Object.entries(w).sort((a, b) => b[1] - a[1]);
      area.innerHTML = '';
      if (!entries.length) { area.innerHTML = '<p class="cloud-empty">Kata-kata pelajar akan muncul di sini…</p>'; return; }
      const mx = entries[0][1], many = entries.length > 14;
      const ordered = [];
      entries.forEach((e, i) => (i % 2 ? ordered.push(e) : ordered.unshift(e)));
      ordered.forEach(([t, c]) => {
        const b = document.createElement('button');
        const r = mx > 1 ? (c - 1) / (mx - 1) : 1;
        b.className = 'word' + (c === mx && mx > 1 ? ' top' : '');
        b.style.fontSize = (many ? 30 : 38) + r * (many ? 70 : 96) + 'px';
        b.style.setProperty('--o', (0.55 + 0.45 * r).toFixed(2));
        b.textContent = t;
        b.title = 'Klik: +1 · Shift + klik: −1';
        b.addEventListener('click', (e) => add(t, e.shiftKey ? -1 : 1));
        area.appendChild(b);
      });
    };
    const add = (t, d = 1) => {
      t = norm(t); if (!t) return;
      w[t] = (w[t] || 0) + d; if (w[t] <= 0) delete w[t];
      store.data.words = w; store.save(); Sound.pop(); render();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(inp.value); inp.value = ''; } });
    $$('.chip', s).forEach((c) => c.addEventListener('click', () => add(c.textContent)));
    s.addEventListener('reset', () => { w = {}; render(); });
    render();
    return base;
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

  /* ---------- applause meter (microphone, with manual fallback) ---------- */
  widgets.applause = (s, base) => {
    const cols = $$('.ap-col', s), status = $('.ap-status', s);
    let scores = store.data.applause || [0, 0, 0];
    const names = store.data.apNames || ['Pasangan 1', 'Pasangan 2', 'Pasangan 3'];
    let busy = false, analyser = null;
    const save = () => { store.data.applause = scores; store.data.apNames = names; store.save(); };
    const render = () => {
      const mx = Math.max(...scores);
      cols.forEach((c, i) => {
        $('.ap-fill', c).style.height = scores[i] + '%';
        $('.ap-score', c).textContent = Math.round(scores[i]);
        c.classList.toggle('win', mx > 0 && scores[i] === mx);
      });
    };
    const getMic = async () => {
      if (analyser) return analyser;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        const ctx = Sound.ensure();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser(); analyser.fftSize = 2048; src.connect(analyser);
        return analyser;
      } catch (err) {
        status.textContent = 'Mikrofon tidak tersedia · guna butang + dan − untuk markah manual';
        return null;
      }
    };
    const measure = async (i) => {
      if (busy) return;
      busy = true;
      const a = await getMic();
      if (!a) { busy = false; return; }
      const buf = new Float32Array(a.fftSize), col = cols[i], fillEl = $('.ap-fill', col), scoreEl = $('.ap-score', col);
      const dur = 4000; let sum = 0, cnt = 0, peak = 0, smooth = 0;
      col.classList.add('live'); col.classList.remove('win');
      status.textContent = `Tepuk sekuat-kuatnya untuk ${names[i]}!`;
      const t0 = performance.now();
      const frame = () => {
        a.getFloatTimeDomainData(buf);
        let rms = 0; for (let k = 0; k < buf.length; k++) rms += buf[k] * buf[k];
        rms = Math.sqrt(rms / buf.length);
        const lvl = Math.min(100, Math.pow(rms, 0.55) * 230);
        smooth = smooth * 0.7 + lvl * 0.3;
        sum += lvl; cnt++; peak = Math.max(peak, smooth);
        fillEl.style.height = smooth + '%';
        const el = performance.now() - t0;
        scoreEl.textContent = Math.max(0, Math.ceil((dur - el) / 1000)) + 's';
        if (el < dur) { requestAnimationFrame(frame); return; }
        scores[i] = Math.min(100, (sum / cnt) * 0.6 + peak * 0.4);
        col.classList.remove('live'); busy = false; save(); render(); Sound.correct();
        status.textContent = 'Tekan 1, 2 atau 3 untuk pasangan seterusnya';
      };
      frame();
    };
    cols.forEach((c, i) => {
      const nm = $('.ap-name', c);
      nm.value = names[i];
      nm.addEventListener('input', () => { names[i] = nm.value; save(); });
      $('.ap-go', c).addEventListener('click', () => measure(i));
      $('.ap-plus', c).addEventListener('click', () => { scores[i] = Math.min(100, scores[i] + 10); save(); render(); Sound.pop(); });
      $('.ap-minus', c).addEventListener('click', () => { scores[i] = Math.max(0, scores[i] - 10); save(); render(); });
    });
    s.addEventListener('reset', () => { scores = [0, 0, 0]; render(); });
    render();
    return extend(base, { key(e) { const k = digit(e, 3); if (k) { measure(k - 1); return true; } return false; } });
  };

  /* ---------- offline chat simulation ---------- */
  widgets.chat = (s, base) => {
    const msgs = $$('.msg', s), lis = $$('.demo-steps li', s);
    msgs.forEach((m) => { m.dataset.full = $('.msg-text', m).textContent; });
    let typer = 0;
    s.addEventListener('step', (e) => {
      const n = e.detail;
      clearInterval(typer);
      msgs.forEach((m) => {
        const k = +m.dataset.step, t = $('.msg-text', m);
        m.classList.remove('typing');
        t.textContent = k < n ? m.dataset.full : '';
      });
      lis.forEach((li, j) => li.classList.toggle('on', j + 1 === n || (n === 0 && j === 0)));
      const m = msgs.find((x) => +x.dataset.step === n);
      if (!m) return;
      const t = $('.msg-text', m), full = m.dataset.full, ai = m.classList.contains('ai');
      if (!s.classList.contains('active')) { t.textContent = full; return; }
      let i = 0; m.classList.add('typing');
      typer = setInterval(() => {
        i += ai ? 3 : 2;
        t.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(typer); m.classList.remove('typing'); if (ai) Sound.pop(); }
      }, ai ? 22 : 26);
    });
    return base;
  };

  /* ---------- 3-question checklist ---------- */
  widgets.check = (s, base) => {
    const rows = $$('.q3-row', s), ban = $('.q3-verdict', s);
    let st = [null, null, null];
    const TXT = {
      wait: 'Jawab ketiga-tiga soalan dengan jujur.',
      stop: 'Ada "TIDAK"? Berhenti. Fikir semula sebelum guna AI.',
      go: 'Tiga kali YA. Teruskan, dan kekal bijak.',
    };
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

  /* ---------- routine timeline progress ---------- */
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
      if (!list.length) { wall.innerHTML = '<p class="wall-empty">Komitmen pelajar akan diletak di sini…</p>'; return; }
      list.slice(-6).forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'note';
        d.style.setProperty('--r', [-3, 2, -1.5, 3, -2.5, 1.5][i] + 'deg');
        d.innerHTML = `<p><small>Guna AI untuk</small><b>${esc(c[0])}</b></p><p><small>Berhenti guna AI untuk</small><b>${esc(c[1])}</b></p>`;
        wall.appendChild(d);
      });
    };
    const pin = () => {
      if (!a.value.trim() && !b.value.trim()) { a.focus(); return; }
      list.push([a.value.trim() || '…', b.value.trim() || '…']);
      store.data.commits = list; store.save();
      a.value = ''; b.value = ''; a.blur(); b.blur();
      Sound.correct(); render();
    };
    $('.pin', s).addEventListener('click', pin);
    a.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); b.focus(); } });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pin(); } });
    s.addEventListener('reset', () => { list = []; render(); });
    render();
    return base;
  };

  /* ---------- team quiz game ---------- */
  const QUIZ = [
    { q: 'Huruf "I" dalam BIJAK bermaksud…', o: ['Ikut Kawan', 'Imbas Kembali', 'Internet Laju', 'Idea Segera'], a: 1, why: '<b>Imbas Kembali</b>: uji diri dengan soalan dan kad imbas.' },
    { q: 'Cara terbaik guna AI untuk assignment esei?', o: ['Minta AI tulis, terus hantar', 'Tukar perkataan jawapan AI', 'Tulis draf sendiri, minta AI kritik', 'Salin dari kawan yang guna AI'], a: 2, why: 'AI sebagai <b>pengkritik</b>, anda sebagai penulis.' },
    { q: 'AI beri anda 5 rujukan jurnal. Apa yang perlu dibuat?', o: ['Semak setiap satu di sumber asal', 'Terus masukkan dalam rujukan', 'Pilih yang paling panjang', 'Buang semua sekali'], a: 0, why: 'AI boleh <b>mereka rujukan</b>. Tak jumpa di sumber asal? Jangan guna.' },
    { q: 'Yang manakah BUKAN bahan resipi prompt?', o: ['Peranan', 'Konteks', 'Emoji', 'Format'], a: 2, why: 'Peranan, Tugas, Konteks, Format, dan <b>ayat ajaib</b>.' },
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
    let teams = store.data.qTeams || ['Kiri Depan', 'Kanan Depan', 'Kiri Belakang', 'Kanan Belakang'];
    let scores = store.data.qScores || [0, 0, 0, 0];
    let awards = store.data.qAwards || QUIZ.map(() => []);
    let phase = 'intro', qi = 0, tmr = 0, left = QT, lastTick = 0;
    const save = () => { store.data.qTeams = teams; store.data.qScores = scores; store.data.qAwards = awards; store.save(); };
    const recompute = () => { scores = [0, 0, 0, 0]; awards.forEach((arr) => arr.forEach((t) => { scores[t] += 100; })); };

    const strip = (active) => `<div class="q-teams ${active ? 'active' : ''}">${teams.map((t, i) =>
      `<button class="q-team c-${QCOL[i]} ${awards[qi] && awards[qi].includes(i) && active ? 'got' : ''}" data-i="${i}"><span class="k">${i + 1}</span><span class="tn">${esc(t)}</span><b>${scores[i]}</b></button>`).join('')}</div>`;

    const bindStrip = () => $$('.q-team', root).forEach((b) => b.addEventListener('click', () => award(+b.dataset.i)));

    const award = (i) => {
      if (phase !== 'reveal') return;
      const arr = awards[qi], k = arr.indexOf(i);
      if (k >= 0) arr.splice(k, 1); else { arr.push(i); Sound.pop(); }
      recompute(); save();
      $('.q-teams', root).outerHTML = strip(true); bindStrip();
    };

    const stopTimer = () => clearInterval(tmr);
    const runTimer = () => {
      stopTimer(); left = QT; lastTick = 0;
      const ring = $('.q-timer', root), fg = $('.fg', root), num = $('.q-timer b', root);
      let last = performance.now();
      tmr = setInterval(() => {
        const now = performance.now(); left -= (now - last) / 1000; last = now;
        if (left <= 0) { left = 0; stopTimer(); reveal(); return; }
        const c = Math.ceil(left);
        num.textContent = c;
        fg.style.strokeDashoffset = RC * (1 - left / QT);
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
          <p class="body-l dim" style="max-width:1400px">6 soalan · 20 saat setiap satu · 100 mata untuk setiap pasukan yang betul. Ketua pasukan tunjuk jari: A = 1, B = 2, C = 3, D = 4.</p>
          <div class="q-setup">${teams.map((t, i) => `<label class="c-${QCOL[i]}"><span>Pasukan ${i + 1}</span><input data-i="${i}" value="${esc(t)}" spellcheck="false"></label>`).join('')}</div>
          <div class="q-go"><span class="label q-hint">Klik nama untuk tukar · markah semasa disimpan</span><button class="btn solid q-start">Mula kuiz →</button></div>
        </div>`;
        $$('.q-setup input', root).forEach((inp) => inp.addEventListener('input', () => { teams[+inp.dataset.i] = inp.value || `Pasukan ${+inp.dataset.i + 1}`; save(); }));
        $('.q-start', root).addEventListener('click', () => ctl.next());
        return;
      }
      if (phase === 'q' || phase === 'reveal') {
        const Q = QUIZ[qi], rv = phase === 'reveal';
        root.innerHTML = `
          <div class="q-top"><span class="label">Soalan <b>${qi + 1}</b> / ${QUIZ.length}</span>
            <div class="q-timer ${rv ? 'low' : ''}"><svg viewBox="0 0 116 116"><circle class="bg" cx="58" cy="58" r="50"/><circle class="fg" cx="58" cy="58" r="50" stroke-dasharray="${RC}" stroke-dashoffset="${rv ? RC : 0}"/></svg><b>${rv ? '0' : QT}</b></div></div>
          <h2 class="q-text">${esc(Q.q)}</h2>
          <div class="q-opts">${Q.o.map((o, i) => `<div class="q-opt c-${QCOL[i]} ${rv ? (i === Q.a ? 'correct' : 'wrong') : ''}">${SHAPE[i]}<span>${esc(o)}</span><span class="ltr">${'ABCD'[i]}${rv && i === Q.a ? ' · BETUL' : ''}</span></div>`).join('')}</div>
          <div class="q-bottom">
            <p class="q-why">${rv ? Q.why : '<span class="label q-hint">Tekan → untuk dedah jawapan lebih awal</span>'}</p>
            ${strip(rv)}
            ${rv ? '<span class="label q-hint">Klik atau tekan 1–4 untuk pasukan yang betul (+100) · → soalan seterusnya</span>' : ''}
          </div>`;
        bindStrip();
        if (!rv) runTimer();
        return;
      }
      // final leaderboard
      const order = teams.map((t, i) => i).sort((x, y) => scores[y] - scores[x]);
      const mx = Math.max(1, ...scores), top = Math.max(...scores);
      root.innerHTML = `<div class="q-final">
        <span class="label" style="color:var(--signal)">Keputusan kuiz kilat</span>
        <h2 class="h-m">Papan <em>markah.</em></h2>
        <div class="q-board">${order.map((i, r) => `<div class="q-brow c-${QCOL[i]} ${scores[i] === top && top > 0 ? 'first' : ''}" style="animation-delay:${r * 0.1}s"><span class="rk">${r + 1}</span><span class="nm">${esc(teams[i])}${scores[i] === top && top > 0 ? '<span class="champ">JUARA</span>' : ''}</span><span class="bar"><i data-w="${(scores[i] / mx) * 100}"></i></span><span class="pts">${scores[i]}</span></div>`).join('')}</div>
        <div class="q-go" style="margin-top:auto"><span class="label q-hint">→ ke slaid penutup</span><button class="btn q-again">Main semula</button></div>
      </div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.q-brow .bar i', root).forEach((b) => { b.style.width = b.dataset.w + '%'; })));
      $('.q-again', root).addEventListener('click', () => { awards = QUIZ.map(() => []); recompute(); save(); phase = 'intro'; qi = 0; render(); });
      if (Math.max(...scores) > 0) { setTimeout(() => { Confetti.fire(); Sound.correct(); }, 500); }
    };

    const reveal = () => { phase = 'reveal'; render(); Sound.gong(); setTimeout(() => Sound.correct(), 250); };

    const ctl = extend(base, {
      enter() { render(); },
      leave() { stopTimer(); },
      next() {
        if (phase === 'intro') { phase = 'q'; qi = 0; render(); Sound.pop(); return true; }
        if (phase === 'q') { reveal(); return true; }
        if (phase === 'reveal') {
          if (qi < QUIZ.length - 1) { qi++; phase = 'q'; render(); Sound.pop(); } else { phase = 'final'; render(); }
          return true;
        }
        return false;
      },
      prev() {
        if (phase === 'intro') return false;
        if (phase === 'final') { phase = 'reveal'; qi = QUIZ.length - 1; render(); return true; }
        if (phase === 'reveal') { phase = 'q'; render(); return true; }
        if (qi === 0) { phase = 'intro'; render(); return true; }
        qi--; phase = 'reveal'; render(); return true;
      },
      key(e) {
        const k = digit(e, 4);
        if (k && phase === 'reveal') { award(k - 1); return true; }
        return false;
      },
    });
    s.addEventListener('reset', () => { awards = QUIZ.map(() => []); recompute(); phase = 'intro'; qi = 0; if (s.classList.contains('active')) render(); });
    recompute();
    return ctl;
  };

  /* ---------- build controllers ---------- */
  slides.forEach((s) => {
    const base = stepCtl(s);
    const w = s.dataset.widget;
    s.ctl = w && widgets[w] ? widgets[w](s, base) : base;
  });

  /* ---------- flip cards also respond to clicks ---------- */
  $$('.flip').forEach((f) => f.addEventListener('click', () => { f.classList.toggle('shown'); Sound.pop(); }));

  /* ---------- BIJAK letters jump to their slide ---------- */
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    const i = slides.findIndex((s) => s.id === b.dataset.goto);
    if (i >= 0) go(i, 0);
  }));

  /* ---------- copy prompt ---------- */
  $$('.copy').forEach((b) => b.addEventListener('click', () => {
    const txt = $('.prompt-text', b.closest('.prompt')).textContent.trim();
    const done = () => { toast('Prompt disalin'); Sound.pop(); };
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Tidak dapat menyalin'); }
      ta.remove();
    };
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
    s.classList.add('active');
    s.ctl.enter(dir || 0);
    updateChrome();
    store.data.slide = cur; store.save();
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* file:// in some browsers */ }
    Presenter.update();
  }
  function next() {
    if (slides[cur].ctl.next()) { Presenter.update(); return; }
    if (cur < slides.length - 1) go(cur + 1, 1);
  }
  function prev() {
    if (slides[cur].ctl.prev()) { Presenter.update(); return; }
    if (cur > 0) go(cur - 1, -1);
  }

  /* =========================================================
     PRESENTER VIEW (popup window, same origin via about:blank)
     ========================================================= */
  const Presenter = {
    win: null,
    open() {
      this.win = window.open('', 'bijak-presenter', 'width=1180,height=780');
      if (!this.win) { toast('Benarkan pop-up untuk paparan penyampai'); return; }
      const fonts = new URL('fonts/fonts.css', location.href).href;
      const d = this.win.document;
      d.open();
      d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Penyampai · Belajar Bijak</title><link rel="stylesheet" href="${fonts}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0E121C;color:#F2EDE3;font-family:'Bricolage Grotesque',system-ui,sans-serif;padding:28px 34px;height:100vh;display:grid;grid-template-rows:auto auto 1fr auto;gap:22px}
.l{font:600 13px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7F879B}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
.clk{display:flex;gap:34px}
.clk div{display:flex;flex-direction:column;gap:8px}
.clk b{font:700 46px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:-.02em}
.clk b.warn{color:#FF5A1F}
.cur h1{font-size:40px;letter-spacing:-.03em;font-weight:720;line-height:1.05;margin-top:10px}
.cur .st{font:600 15px 'JetBrains Mono',Consolas,monospace;color:#FFC93C;margin-top:8px}
.notes{background:#181D2B;border-radius:20px;padding:26px 30px;font-size:25px;line-height:1.5;overflow:auto;color:#E7E2D8}
.bot{display:flex;justify-content:space-between;align-items:center;gap:20px}
.nx b{display:block;font-size:22px;font-weight:650;margin-top:8px;color:#B6BCCB}
.btns{display:flex;gap:10px}
button{font:700 15px 'JetBrains Mono',Consolas,monospace;letter-spacing:.08em;padding:16px 26px;border-radius:999px;border:2px solid #3A4258;background:none;color:#F2EDE3;cursor:pointer}
button.p{background:#FF5A1F;border-color:#FF5A1F;color:#12151D}
</style></head><body>
<div class="top"><div class="cur"><span class="l" id="pc"></span><h1 id="pt"></h1><div class="st" id="ps"></div></div>
<div class="clk"><div><span class="l">Masa berlalu</span><b id="pe">0:00</b></div><div><span class="l">Jam</span><b id="pw"></b></div><div><span class="l">Baki ke 2.15</span><b id="pr"></b></div></div></div>
<span class="l">Nota penceramah</span>
<div class="notes" id="pn"></div>
<div class="bot"><div class="nx"><span class="l">Seterusnya</span><b id="px"></b></div><div class="btns"><button id="bz">Set semula masa</button><button id="bp">← Sebelum</button><button class="p" id="bn">Seterusnya →</button></div></div>
</body></html>`);
      d.close();
      d.addEventListener('keydown', onKey);
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
    const b = $('#toolbar [data-act="sound"]'); b.classList.toggle('on', m);
    $('.sw', b).style.display = m ? 'none' : '';
    toast(m ? 'Bunyi dimatikan' : 'Bunyi dihidupkan');
  };
  const resetAll = () => {
    if (!confirm('Kosongkan semua undian, awan kata, komitmen, tepukan dan markah kuiz?')) return;
    const keep = { slide: cur, muted: Sound.muted, 'cfg-rows': store.data['cfg-rows'], 'cfg-seats': store.data['cfg-seats'] };
    store.data = keep; store.save();
    sessionStart = 0;
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
      if (ovl.cur === 'help' || (ovl.cur === 'overview' && e.key.toLowerCase() === 'o') || (ovl.cur === 'tmenu' && e.key.toLowerCase() === 't') || (ovl.cur === 'picker' && e.key.toLowerCase() === 'w')) { ovl.closeAll(); e.preventDefault(); }
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
      case 'b': case '.': $('#black').classList.toggle('on'); break;
      case 'm': setMute(!Sound.muted); break;
      case 'h': ovl.open('help'); break;
      default: return;
    }
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  /* buttons shouldn't keep focus (Space/Enter would re-click them) */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setTimeout(() => b.blur(), 0);
  });

  /* toolbar */
  $$('#toolbar [data-act]').forEach((b) => b.addEventListener('click', () => {
    Sound.ensure();
    ({
      prev, next,
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

  /* show toolbar + cursor on mouse move */
  let uiT = 0;
  addEventListener('mousemove', () => {
    document.body.classList.add('ui');
    clearTimeout(uiT); uiT = setTimeout(() => document.body.classList.remove('ui'), 2600);
  });

  /* swipe on touch screens */
  let tx = null;
  addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
  });

  /* ---------- start ---------- */
  const fromHash = parseInt((location.hash || '').slice(1), 10);
  const showAll = /[?&]all(&|$)/.test(location.search); // ?all = open slide with every step revealed (rehearsal / print)
  go(fromHash >= 1 && fromHash <= slides.length ? fromHash - 1 : 0, showAll ? -1 : 0);
  booted = true;
  if (!store.data.seenHelp) { setTimeout(() => toast('Tekan H untuk kawalan · F untuk skrin penuh'), 900); store.data.seenHelp = 1; store.save(); }
})();
