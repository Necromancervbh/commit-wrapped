(() => {
  const D = JSON.parse(document.getElementById('data').textContent);
  const params = new URLSearchParams(location.search);
  const isStatic = params.has('static');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const num = (n) => Number(n).toLocaleString('en-US');
  const pct = (x) => `${Math.round(x * 100)}%`;
  const count = (n) => `<span data-to="${n}">${num(n)}</span>`;
  const a = (d) => `style="--d:${d}s"`;

  const slides = [];
  const add = (bg, html) => slides.push({ bg, html });

  add('g1', `
    <p ${a(0)} class="kicker anim">${D.year} Wrapped</p>
    <h1 class="anim" ${a(0.15)}>Hey ${esc(D.firstName)}.</h1>
    <p ${a(0.4)} class="lead anim">You wrote a lot of code this year.<br>Let's unwrap it.</p>
    <p ${a(1.2)} class="hint anim">Tap or press → to continue</p>`);

  add('g6', `
    <p ${a(0)} class="kicker anim">This year you made</p>
    <div ${a(0.15)} class="mega anim">${count(D.commits)}</div>
    <h2 class="anim" ${a(0.3)}>commits</h2>
    <p ${a(0.9)} class="lead anim">across <b>${num(D.activeDays)}</b> days${D.repos.length > 1 ? ` and <b>${D.repos.length}</b> repos` : ''}.
      That's <b>${D.perDay}</b> commits every day you showed up.</p>`);

  if (D.busiest) {
    add('g3', `
      <p ${a(0)} class="kicker anim">Your busiest day was</p>
      <h2 class="anim" ${a(0.15)}>${esc(D.busiest.weekday)},<br>${esc(D.busiest.label)}</h2>
      <div ${a(0.5)} class="mega anim">${count(D.busiest.commits)}</div>
      <p ${a(0.65)} class="lead anim"><b>commits in a single day.</b><br>Whatever happened, we hope it shipped.</p>`);
  }

  const maxH = Math.max(...D.hours, 1);
  add('g4', `
    <p ${a(0)} class="kicker anim">You're most alive at</p>
    <div ${a(0.15)} class="mega anim">${esc(D.peakHour)}</div>
    <div class="hours">${D.hours.map((n, i) => `<i style="--h:${(n / maxH) * 100}%;--i:${i}"${i === D.peakHourIndex ? ' class="peak"' : ''} title="${n}"></i>`).join('')}</div>
    <div class="axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
    <p ${a(1.1)} class="lead anim">${esc(D.hourNote)} And <b>${esc(D.peakWeekday)}s</b> were your favorite day to ship.</p>`);

  if (D.streak.days > 1) {
    add('g2', `
      <p ${a(0)} class="kicker anim">Your longest streak</p>
      <div ${a(0.15)} class="mega anim">${count(D.streak.days)}<span class="unit"> days</span></div>
      <p ${a(0.35)} class="lead anim">${esc(D.streak.from)} → ${esc(D.streak.to)}, without missing a single day.</p>
      <div class="heat">${D.heat.map((week, w) => week.map((v) => `<i class="${v < 0 ? 'x' : v > 4 ? 'f' : `l${v}`}" style="--w:${w}"></i>`).join('')).join('')}</div>`);
  }

  if (D.languages.length) {
    const top = D.languages[0].share;
    add('g5', `
      <p ${a(0)} class="kicker anim">You wrote code in</p>
      <h2 class="anim" ${a(0.15)}>${D.languageCount} language${D.languageCount === 1 ? '' : 's'}</h2>
      <ol class="langs">${D.languages.map((l, i) => `
        <li class="anim" ${a(0.3 + i * 0.12)}><span>${esc(l.name)}</span><span>${pct(l.share)}</span>
          <span class="track"><i style="--w:${(l.share / top) * 100}%;--c:${l.color};--i:${i}"></i></span></li>`).join('')}
      </ol>
      <p ${a(1.2)} class="lead anim">but <b>${esc(D.languages[0].name)}</b> was your mother tongue.</p>`);
  }

  add('g7', `
    <p ${a(0)} class="kicker anim">You added</p>
    <div ${a(0.15)} class="mega mid anim plus">+${count(D.added)}</div>
    <p ${a(0.45)} class="kicker anim">and deleted</p>
    <div ${a(0.6)} class="mega mid anim minus">−${count(D.deleted)}</div>
    <p ${a(1.1)} class="lead anim">lines of code. ${esc(D.linesQuip)}</p>`);

  if (D.topFile) {
    add('g8', `
      <p ${a(0)} class="kicker anim">The file you couldn't leave alone</p>
      <code ${a(0.15)} class="file anim">${esc(D.topFile.path)}</code>
      <p ${a(0.35)} class="lead anim">${D.repos.length > 1 ? `in <b>${esc(D.topFile.repo)}</b>, ` : ''}touched in <b>${num(D.topFile.commits)}</b> commits.</p>
      ${D.topFiles.length ? `<ol class="list mono">${D.topFiles.map((f, i) => `<li class="anim" ${a(0.7 + i * 0.1)}><span>${esc(f.path)}</span><span class="n">${num(f.commits)}</span></li>`).join('')}</ol>` : ''}`);
  }

  if (D.repos.length > 1) {
    add('g3', `
      <p ${a(0)} class="kicker anim">Where you spent your time</p>
      <h2 class="anim" ${a(0.15)}>${D.repos.length} repos</h2>
      <ol class="list">${D.repos.slice(0, 6).map((r, i) => `<li class="anim" ${a(0.35 + i * 0.1)}><span class="e">${['🥇', '🥈', '🥉'][i] ?? '·'}</span><span>${esc(r.name)}</span><span class="n">${num(r.commits)}</span></li>`).join('')}</ol>`);
  }

  if (D.ai.commits) {
    add('g9', `
      <p ${a(0)} class="kicker anim">Your pair programmer</p>
      <div ${a(0.15)} class="big-emoji pop">🤖</div>
      <h2 class="anim" ${a(0.4)}>${count(D.ai.commits)} commits</h2>
      <p ${a(0.6)} class="lead anim">were co-authored by AI. That's <b>${pct(D.ai.share)}</b> of your year.
        ${D.ai.tools.length ? `Favorite co-pilot: <b>${esc(D.ai.tools[0].name)}</b>.` : ''}</p>`);
  }

  if (D.facts.length) {
    add('g6', `
      <p ${a(0)} class="kicker anim">Things we noticed</p>
      <h2 class="anim" ${a(0.15)}>Fun facts</h2>
      <ul class="list">${D.facts.map((f, i) => `<li class="anim" ${a(0.35 + i * 0.15)}><span class="e">${f.emoji}</span><span>${esc(f.text)}</span></li>`).join('')}</ul>`);
  }

  const P = D.personality;
  add('g1', `
    <p ${a(0)} class="kicker anim">Your coding personality is</p>
    <div style="--d:.7s" class="big-emoji pop">${P.emoji}</div>
    <h1 class="anim" ${a(1.1)}>${esc(P.title)}</h1>
    <p ${a(1.3)} class="lead anim"><b>${esc(P.tagline)}</b> ${esc(P.description)}</p>
    ${P.traits.length ? `<div ${a(1.6)} class="chips anim">${P.traits.map((t) => `<span class="chip">${t.emoji} ${esc(t.title)}</span>`).join('')}</div>` : ''}`);

  const cardSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(D.card)}`;
  const shareText = `My ${D.year} in code: ${num(D.commits)} commits, a ${D.streak.days}-day streak, and apparently I'm ${P.title} ${P.emoji}\n\nGet your own: ${D.command}`;
  add('g5', `
    <p ${a(0)} class="kicker anim">That's a wrap</p>
    <img ${a(0.15)} class="card anim" src="${cardSrc}" alt="${esc(D.firstName)}'s ${D.year} Wrapped card">
    <div ${a(0.35)} class="actions anim">
      <button class="btn" data-act="png">Download PNG</button>
      <button class="btn ghost" data-act="svg">Download SVG</button>
      <a class="btn ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(shareText)}">Share on X</a>
      <button class="btn ghost" data-act="copy">Copy text</button>
    </div>
    <p ${a(0.6)} class="small anim">Made with <a href="${esc(D.repoUrl)}" target="_blank" rel="noopener">commit-wrapped</a>. Nothing left your machine.</p>`);

  // ---- mount
  const story = document.getElementById('story');
  story.innerHTML = `
    <div class="bars">${slides.map(() => '<div class="bar"><i></i></div>').join('')}</div>
    <div class="top"><span>✦ commit-wrapped</span><button class="icon-btn" data-act="pause" aria-label="Pause">❚❚</button></div>
    ${slides.map((s, i) => `<section class="slide ${s.bg}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}"><div class="blob a"></div><div class="blob b"></div>${s.html}</section>`).join('')}
    <div class="toast" role="status"></div>`;
  if (isStatic) document.body.classList.add('static');

  const els = [...story.querySelectorAll('.slide')];
  const bars = [...story.querySelectorAll('.bar')];
  const pauseBtn = story.querySelector('[data-act="pause"]');
  let current = 0;
  let paused = isStatic || params.has('noplay');

  function go(n) {
    n = Math.max(0, Math.min(els.length - 1, n));
    els[current].classList.remove('active');
    current = n;
    const el = els[current];
    void el.offsetWidth; // restart CSS animations on revisit
    el.classList.add('active');
    bars.forEach((b, i) => {
      b.classList.remove('active');
      b.classList.toggle('done', i < current || (i === current && current === els.length - 1));
    });
    if (current < els.length - 1) {
      void bars[current].offsetWidth;
      bars[current].classList.add('active');
    }
    document.documentElement.style.setProperty('--bg', getComputedStyle(el).backgroundImage);
    history.replaceState(null, '', `#${current + 1}`);
    countUp(el);
  }

  function countUp(el) {
    for (const node of el.querySelectorAll('[data-to]')) {
      const to = Number(node.dataset.to);
      if (isStatic || to < 10) continue;
      const delay = (parseFloat(node.closest('[style*="--d"]')?.style.getPropertyValue('--d')) || 0) * 1000;
      const start = performance.now() + delay;
      const tick = (now) => {
        const k = Math.min(1, Math.max(0, (now - start) / 1500));
        node.textContent = num(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1 && el.classList.contains('active')) requestAnimationFrame(tick);
        else node.textContent = num(to);
      };
      node.textContent = '0';
      requestAnimationFrame(tick);
    }
  }

  function setPaused(p) {
    paused = p;
    story.classList.toggle('paused', p);
    pauseBtn.textContent = p ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
  }

  function toast(msg) {
    const t = story.querySelector('.toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  function save(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  async function act(kind) {
    if (kind === 'pause') return setPaused(!paused);
    if (kind === 'svg') return save(new Blob([D.card], { type: 'image/svg+xml' }), `commit-wrapped-${D.year}.svg`);
    if (kind === 'copy') {
      await navigator.clipboard.writeText(shareText).then(() => toast('Copied!'), () => toast('Copy failed'));
      return;
    }
    if (kind === 'png') {
      const img = new Image();
      img.src = cardSrc;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 1260;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => save(b, `commit-wrapped-${D.year}.png`), 'image/png');
    }
  }

  bars.forEach((b) => b.addEventListener('animationend', () => go(current + 1)));
  story.addEventListener('click', (e) => {
    const control = e.target.closest('button, a');
    if (control) {
      if (control.dataset.act) act(control.dataset.act);
      return;
    }
    const { left, width } = story.getBoundingClientRect();
    go(e.clientX - left < width * 0.3 ? current - 1 : current + 1);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(current + 1);
    else if (e.key === 'ArrowLeft') go(current - 1);
    else if (e.key === ' ') {
      e.preventDefault();
      setPaused(!paused);
    }
  });

  setPaused(paused);
  const start = Number((location.hash.match(/^#(\d+)$/) || [])[1]) || 1;
  go(start - 1);
})();
