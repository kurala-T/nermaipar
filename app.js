(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const I18N = window.I18N || { en: {} };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icon = (name, cls = 'h-4 w-4') => `<i data-lucide="${name}" class="${cls}"></i>`;

  const safeGet = (key, fallback) => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* file:// or private mode */ }
  };
  const safeJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  };

  const defaultStats = () => ({ xp: 0, rounds: 0, answered: 0, correct: 0, tags: {} });
  const savedStats = safeJson('nermaipar_stats_v1', defaultStats());
  const savedLang = safeGet('nermaipar_lang', 'en');

  const state = {
    lang: I18N[savedLang] ? savedLang : 'en',
    channel: 'app',
    step: 1,
    maxStep: 1,
    analyzed: false,
    analyzing: false,
    currentClaim: CLAIMS.health,
    currentClaimKey: 'health',
    currentTone: 'elder',
    selectedTactic: 0,
    quiz: null,
    offline: false,
    queue: [],
    hash: '',
    logs: [],
    pulseChecks: 1284,
    stats: { ...defaultStats(), ...savedStats, tags: savedStats.tags || {} },
    threads: THREAD_ORDER.map((key, index) => ({
      key,
      checks: CLAIMS[key].checks,
      minutes: [5, 2, 12, 1][index] || 1,
      status: key === 'gps' ? 'checking' : CLAIMS[key].verdict
    })),
    waHistory: [],
    waBusy: false,
    smsClaimKey: 'health',
    smsMode: 'inbox',
    judgeOpen: false
  };

  const statusMeta = {
    false: { key: 'threads.verifiedFake', icon: 'alert-octagon', cls: 'border-red-400/20 bg-red-400/10 text-red-300', dot: 'bg-red-400' },
    true: { key: 'threads.authentic', icon: 'check-circle-2', cls: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
    misleading: { key: 'threads.misleading', icon: 'alert-triangle', cls: 'border-amber-400/20 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400' },
    checking: { key: 'threads.checking', icon: 'loader-circle', cls: 'border-sky-400/20 bg-sky-400/10 text-sky-300', dot: 'bg-sky-300' }
  };

  const verdictMeta = {
    false: { icon: 'alert-octagon', card: 'border-red-200 bg-red-50/70', text: 'text-danger', iconBg: 'bg-red-100 text-danger', chip: 'bg-red-100 text-red-700' },
    true: { icon: 'badge-check', card: 'border-emerald-200 bg-emerald-50/70', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-700', chip: 'bg-emerald-100 text-emerald-700' },
    misleading: { icon: 'alert-triangle', card: 'border-amber-200 bg-amber-50/70', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-700', chip: 'bg-amber-100 text-amber-700' },
    unverified: { icon: 'circle-help', card: 'border-slate-200 bg-slate-50', text: 'text-slate-600', iconBg: 'bg-slate-200 text-slate-600', chip: 'bg-slate-200 text-slate-600' }
  };

  function t(key, vars = {}) {
    const dict = I18N[state.lang] || I18N.en;
    let text = dict[key] ?? I18N.en[key] ?? key;
    return String(text).replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
  }

  function tr(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[state.lang] || value.en || '';
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  let toastTimer;
  function toast(message) {
    const box = $('#toast');
    const text = $('#toastMsg');
    if (!box || !text) return;
    text.textContent = message;
    box.classList.remove('translate-y-20', 'opacity-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add('translate-y-20', 'opacity-0'), 3000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast(t('common.copied'));
  }

  function saveStats() {
    safeSet('nermaipar_stats_v1', JSON.stringify(state.stats));
  }

  function saveLang() {
    safeSet('nermaipar_lang', state.lang);
  }

  async function hashText(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    try {
      if (window.crypto?.subtle) {
        const bytes = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch { /* fall through to deterministic demo hash */ }
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i += 1) {
      h1 ^= text.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ text.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    const chunk = (n) => n.toString(16).padStart(8, '0');
    return [chunk(h1), chunk(h2), chunk(h1 ^ 0x9e3779b9), chunk(h2 ^ 0x7f4a7c15), chunk(h1 ^ h2), chunk(h1 + h2), chunk(h1 * 3), chunk(h2 * 5)].join('');
  }

  function updateCharCount() {
    const input = $('#claimInput');
    const count = $('#charCount');
    if (!input || !count) return;
    count.textContent = `${input.value.length} / 1200`;
  }

  function updateHash(value) {
    hashText(value).then((hash) => {
      state.hash = hash;
      const node = $('#judgeHash');
      if (node) node.textContent = hash;
    });
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((node) => {
      const value = t(node.dataset.i18n);
      if (value) node.textContent = value;
    });
    $$('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    const select = $('#languageSelect');
    if (select) select.value = state.lang;
    refreshIcons();
  }

  function refreshDynamic() {
    renderThreads();
    renderResilience();
    renderWa();
    renderSms();
    renderJudge();
    if (state.currentClaim && state.analyzed) {
      renderResult();
      renderExplain();
      renderRespond();
    }
    if (state.quiz) renderQuiz();
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function setChannel(channel) {
    if (!['app', 'wa', 'sms'].includes(channel)) return;
    state.channel = channel;
    ['app', 'wa', 'sms'].forEach((name) => {
      const view = $(`#view${name.charAt(0).toUpperCase() + name.slice(1)}`);
      if (view) view.classList.toggle('hidden', name !== channel);
    });
    $$('.channel-btn').forEach((button) => {
      const active = button.dataset.channel === channel;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('bg-slate', active);
      button.classList.toggle('text-white', active);
      button.classList.toggle('shadow-sm', active);
      button.classList.toggle('text-slate-500', !active);
      button.classList.toggle('font-bold', active);
      button.classList.toggle('font-semibold', !active);
    });
    if (channel === 'wa') renderWa();
    if (channel === 'sms') renderSms();
    if (window.scrollY > 320) {
      const view = $(`#view${channel.charAt(0).toUpperCase() + channel.slice(1)}`);
      if (view) view.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    refreshIcons();
  }

  function setStep(step, options = {}) {
    if (step > 1 && !state.analyzed) {
      toast(t('detect.needCheck'));
      return;
    }
    state.step = step;
    state.maxStep = Math.max(state.maxStep, step);
    $$('.step-panel, [id^="panel"]').forEach((panel) => panel.classList.add('hidden'));
    const panel = $(`#panel${step}`);
    if (panel) panel.classList.remove('hidden');
    $$('.step-tab').forEach((tab) => {
      const number = Number(tab.dataset.step);
      const active = number === step;
      const completed = number < state.maxStep;
      const badge = tab.querySelector('span:first-child');
      tab.setAttribute('aria-selected', String(active));
      tab.classList.toggle('bg-teal', active);
      tab.classList.toggle('text-white', active || completed);
      tab.classList.toggle('bg-emerald-50', completed && !active);
      tab.classList.toggle('text-emerald-700', completed && !active);
      tab.classList.toggle('text-slate-500', !active && !completed);
      if (badge) {
        badge.className = completed && !active
          ? 'grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[9px] text-white'
          : active
            ? 'grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[9px]'
            : 'grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[9px]';
        badge.innerHTML = completed && !active ? icon('check', 'h-2.5 w-2.5') : String(number);
      }
    });
    if (step === 4 && state.currentClaim) {
      if (!state.quiz || state.quiz.claimKey !== state.currentClaim.key) startQuiz();
      else renderQuiz();
    }
    if (step === 2 && state.currentClaim) renderExplain();
    if (step === 3 && state.currentClaim) renderRespond();
    if (options.scroll !== false && window.innerWidth < 900) {
      const shell = $('#viewApp');
      if (shell) shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    refreshIcons();
  }

  /* ── Claim matching / analysis ──────────────────────────── */
  function matchClaim(text) {
    const n = text.toLowerCase();
    if (/isro|satellite|orbit|sriharikota/.test(n)) return CLAIMS.isro;
    if (/₹500|500 note|gps chip|rbi confirmed/.test(n)) return CLAIMS.gps;
    if (/bank|kyc|account blocked|bit\.ly|otp|debit card|credit card/.test(n)) return CLAIMS.phishing;
    if (/herbal|virus|remedy|cure|health|ministry of health/.test(n)) return CLAIMS.health;
    return buildDynamicClaim(text);
  }

  function uiL(key) {
    return L(I18N.en[key] || '', I18N.hi[key] || I18N.en[key] || '', I18N.ta[key] || I18N.en[key] || '');
  }

  function buildDynamicClaim(text) {
    const flags = [];
    const add = (tag, regex) => {
      if (flags.some((item) => item.tag === tag)) return;
      const match = text.match(regex);
      if (match) flags.push({ tag, phrase: match[0] });
    };
    add('urgency', /\b(urgent|immediately|act now|tonight|last chance|within \d+ (minutes|hours))\b/i);
    add('social', /\b(forward|share with|send to|all contacts|10 people|10 friends)\b/i);
    add('link', /(bit\.ly|tinyurl|https?:\/\/|www\.|click here|update kyc|otp|account blocked)/i);
    add('fear', /\b(blocked|suspended|penalty|danger|die|death|loss|fine)\b/i);
    add('health', /\b(cure|remedy|virus|health|doctor|medicine|herbal)\b/i);
    add('authority', /\b(govt|government|ministry|nasa|who|isro|rbi|official|confirmed)\b/i);
    add('emotional', /\b(pray|bless|bad luck|family|children|elders|shame)\b/i);
    if (!flags.length) flags.push({ tag: 'verification', phrase: '' });

    const hasLink = flags.some((item) => item.tag === 'link');
    const hasHealth = flags.some((item) => item.tag === 'health');
    const verdict = hasLink || hasHealth ? 'false' : 'unverified';
    const risk = Math.min(94, 42 + flags.length * 11 + (hasLink ? 15 : 0));
    const short = text.length > 92 ? `${text.slice(0, 89).trim()}…` : text;
    const title = L(short, short, short);
    const factsEn = [I18N.en['dynamic.fact1'], I18N.en['dynamic.fact2'], I18N.en['dynamic.fact3']];
    const factsHi = [I18N.hi['dynamic.fact1'], I18N.hi['dynamic.fact2'], I18N.hi['dynamic.fact3']];
    const factsTa = [I18N.ta['dynamic.fact1'], I18N.ta['dynamic.fact2'], I18N.ta['dynamic.fact3']];
    const tagTactics = flags.map(({ tag, phrase }) => ({
      key: tag,
      phrase,
      label: TAG_INFO[tag].label,
      category: TAG_INFO[tag].category,
      desc: TAG_INFO[tag].desc,
      counter: TAG_INFO[tag].counter,
      positive: false
    }));
    return {
      key: `dynamic-${Date.now()}`,
      isDynamic: true,
      threadId: 'NP-LOCAL',
      text,
      verdict,
      subtype: uiL('dynamic.subtype'),
      confidence: verdict === 'false' ? 86 : 58,
      risk,
      checks: 1,
      location: L('Your check', 'आपकी जाँच', 'உங்கள் சரிபார்ப்பு'),
      isSpike: false,
      title,
      summary: verdict === 'false' ? uiL('dynamic.summaryFalse') : uiL('dynamic.summaryUnverified'),
      primaryTag: flags[0].tag,
      tactics: tagTactics,
      facts: { en: factsEn, hi: factsHi, ta: factsTa },
      replies: {
        elder: uiL('dynamic.replyElder'),
        peer: uiL('dynamic.replyPeer'),
        firm: uiL('dynamic.replyFirm')
      },
      card: {
        stamp: uiL(`result.${verdict}`),
        headline: title,
        footer: uiL('dynamic.cardFooter')
      },
      citations: ['PIB Fact Check', 'AltNews', 'Boom Live']
    };
  }

  async function analyzeCurrent() {
    if (state.analyzing) return;
    const input = $('#claimInput');
    const text = input?.value.trim() || '';
    if (!text) {
      toast(t('detect.empty'));
      input?.focus();
      return;
    }

    state.analyzing = true;
    const claim = matchClaim(text);
    const hash = await hashText(text);
    if (claim.isDynamic) claim.threadId = `NP-${hash.slice(0, 4).toUpperCase()}`;
    state.currentClaim = claim;
    state.currentClaimKey = claim.key;
    state.analyzed = false;
    state.maxStep = 1;
    state.selectedTactic = 0;
    state.currentTone = 'elder';
    state.quiz = null;
    state.hash = hash;

    const result = $('#detectResult');
    const loading = $('#analysisLoading');
    const button = $('#analyzeBtn');
    const stage = $('#loadingStage');
    const bar = $('#loadingBar');
    if (result) { result.classList.add('hidden'); result.innerHTML = ''; }
    if (loading) loading.classList.remove('hidden');
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    if (stage) stage.textContent = t('detect.loadingTitle');
    if (bar) bar.style.width = '8%';
    setStep(1, { force: true, scroll: false });

    logTelemetry(`mutation: claims.triage({ id: "${claim.threadId}", lang: "${state.lang}" })`);
    if (claim.isDynamic) logTelemetry(`hash: ${hash.slice(0, 20)}… grouped locally`);
    if (state.offline) {
      state.queue.push({ id: claim.threadId, hash, at: Date.now() });
      updateQueue();
      logTelemetry(`offline: buffered ${claim.threadId} in local cache`);
    }

    const stages = state.offline
      ? ['detect.stage1', 'detect.offlineStage', 'detect.stage4']
      : ['detect.stage1', 'detect.stage2', 'detect.stage3', 'detect.stage4'];
    for (let i = 0; i < stages.length; i += 1) {
      if (stage) stage.textContent = t(stages[i]);
      if (bar) bar.style.width = `${Math.round(((i + 1) / stages.length) * 100)}%`;
      await wait(i === stages.length - 1 ? 320 : 380);
    }

    state.analyzed = true;
    state.analyzing = false;
    if (loading) loading.classList.add('hidden');
    if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
    if (result) result.classList.remove('hidden');

    const thread = state.threads.find((item) => item.key === claim.key);
    if (thread) thread.status = claim.verdict;
    renderThreads();
    renderResult();
    renderExplain();
    renderRespond();
    renderResilience();
    renderJudge();
    refreshIcons();
    logTelemetry(`mutation: claims.commit({ id: "${claim.threadId}", verdict: "${claim.verdict}", confidence: ${claim.confidence} })`);
    if (result) setTimeout(() => result.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  function resetCheck() {
    state.analyzed = false;
    state.analyzing = false;
    state.quiz = null;
    state.maxStep = 1;
    state.currentClaim = CLAIMS.health;
    state.currentClaimKey = 'health';
    state.selectedTactic = 0;
    const input = $('#claimInput');
    if (input) { input.value = ''; input.focus(); }
    const result = $('#detectResult');
    if (result) { result.classList.add('hidden'); result.innerHTML = ''; }
    const loading = $('#analysisLoading');
    if (loading) loading.classList.add('hidden');
    ['#audioStatus', '#imageStatus'].forEach((selector) => { const node = $(selector); if (node) node.textContent = ''; });
    updateCharCount();
    updateHash('');
    setStep(1, { force: true, scroll: false });
    renderResult();
    refreshIcons();
  }

  function loadSample(key, options = {}) {
    const claim = CLAIMS[key];
    if (!claim) return;
    if (state.channel !== 'app') setChannel('app');
    const input = $('#claimInput');
    if (input) { input.value = claim.text; updateCharCount(); updateHash(claim.text); }
    if (options.auto === false) {
      input?.focus();
      return;
    }
    toast(t('detect.sampleLoaded'));
    return analyzeCurrent();
  }

  function renderResult() {
    const box = $('#detectResult');
    if (!box) return;
    const claim = state.currentClaim;
    if (!claim || !state.analyzed) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');

    const meta = verdictMeta[claim.verdict] || verdictMeta.unverified;
    const band = claim.risk >= 70 ? 'high' : claim.risk >= 40 ? 'medium' : 'low';
    const angle = -90 + Math.max(0, Math.min(100, claim.risk)) * 1.8;
    const facts = claim.facts?.[state.lang] || claim.facts?.en || [];
    const actions = claim.verdict === 'true' ? t('result.seeSignals') : t('result.seeFlags');
    const community = claim.isSpike
      ? `<div class="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber">${icon('users', 'h-3.5 w-3.5')}</span>
          <div><p class="text-[9px] font-bold uppercase tracking-[.13em] text-amber-700">${t('result.community')}</p>
          <p class="mt-1 text-[10px] font-semibold leading-relaxed">${esc(t('result.communityText', { count: claim.checks, place: tr(claim.location) }))}</p></div>
        </div>`
      : '';

    box.innerHTML = `
      <div class="grid gap-3 md:grid-cols-[1.08fr_.92fr]">
        <article class="relative overflow-hidden rounded-[22px] border ${meta.card} p-4 sm:p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-xl ${meta.iconBg}">${icon(meta.icon, 'h-4 w-4')}</span><span class="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">${t('result.verdict')}</span></div>
            <span class="rounded-full bg-white/70 px-2 py-1 font-mono text-[8px] font-bold text-slate-500">#${esc(claim.threadId)}</span>
          </div>
          <div class="mt-4 flex flex-wrap items-end gap-2">
            <h3 class="font-display text-[32px] font-bold leading-none tracking-[-.04em] ${meta.text}">${esc(t(`result.${claim.verdict}`))}</h3>
            <span class="mb-1 rounded-full px-2 py-0.5 text-[8px] font-bold ${meta.chip}">${esc(tr(claim.subtype))}</span>
          </div>
          <p class="mt-3 text-[11px] leading-relaxed text-slate-600">${esc(tr(claim.summary))}</p>
          <div class="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-semibold text-slate-400"><span>${esc(t('result.confidence', { score: claim.confidence }))}</span><span>·</span><span>${esc(t('result.checked', { count: claim.checks }))}</span><span>·</span><span>${esc(tr(claim.location))}</span></div>
        </article>

        <article class="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div class="flex items-center justify-between"><span class="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">${t('result.risk')}</span><span class="rounded-full px-2.5 py-1 text-[8px] font-bold ${band === 'high' ? 'bg-red-100 text-red-700' : band === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${esc(t(`result.${band}`))}</span></div>
          <div class="mx-auto mt-1 w-full max-w-[230px]">
            <svg viewBox="0 0 240 140" class="w-full" role="img" aria-label="${esc(t('result.risk'))}">
              <path d="M30 120 A90 90 0 0 1 75 42.1" fill="none" stroke="#10B981" stroke-width="13" stroke-linecap="round" opacity="${band === 'low' ? 1 : .18}"/>
              <path d="M75 42.1 A90 90 0 0 1 165 42.1" fill="none" stroke="#F59E0B" stroke-width="13" stroke-linecap="round" opacity="${band === 'medium' ? 1 : .18}"/>
              <path d="M165 42.1 A90 90 0 0 1 210 120" fill="none" stroke="#EF4444" stroke-width="13" stroke-linecap="round" opacity="${band === 'high' ? 1 : .18}"/>
              <g class="gauge-needle" style="transform: rotate(${angle}deg)">
                <line x1="120" y1="120" x2="120" y2="48" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="120" cy="120" r="5" fill="#1E293B"/>
              </g>
            </svg>
          </div>
          <div class="mt-1 flex justify-between gap-1">
            ${['low', 'medium', 'high'].map((risk) => `<button type="button" data-risk="${risk}" class="risk-band flex-1 rounded-lg px-1 py-1.5 text-[8px] font-bold transition ${risk === band ? 'bg-slate text-white' : 'bg-[#F3F5F0] text-slate-400 hover:text-slate'}">${esc(t(`result.${risk}`))}</button>`).join('')}
          </div>
          <p id="riskAdvice" class="mt-2.5 text-[9px] leading-relaxed text-slate-500">${esc(t(`result.advice${band.charAt(0).toUpperCase() + band.slice(1)}`))}</p>
        </article>
      </div>
      ${community}
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-[#FBFCF9] p-3">
        <div class="min-w-0">
          <p class="text-[8px] font-bold uppercase tracking-[.13em] text-slate-400">${t('result.sources')}</p>
          <div class="mt-1 flex flex-wrap gap-1">${claim.citations.map((source) => `<span class="rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[7px] font-bold text-slate-500">${esc(source)}</span>`).join('')}</div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" data-action="new" class="rounded-full border border-line bg-white px-3 py-2 text-[9px] font-bold text-slate-500 transition hover:border-teal hover:text-teal-deep">${t('result.newCheck')}</button>
          <button type="button" data-action="see" class="flex items-center gap-1.5 rounded-full bg-slate px-3 py-2 text-[9px] font-bold text-white transition hover:bg-ink">${esc(actions)}${icon('arrow-right', 'h-3 w-3')}</button>
        </div>
      </div>`;
    refreshIcons();
  }

  function selectRiskBand(band) {
    $$('#detectResult .risk-band').forEach((button) => {
      const active = button.dataset.risk === band;
      button.classList.toggle('bg-slate', active);
      button.classList.toggle('text-white', active);
      button.classList.toggle('bg-[#F3F5F0]', !active);
      button.classList.toggle('text-slate-400', !active);
    });
    const advice = $('#riskAdvice');
    if (advice) advice.textContent = t(`result.advice${band.charAt(0).toUpperCase() + band.slice(1)}`);
  }

  /* ── Explain ────────────────────────────────────────────── */
  function buildAnnotated(claim) {
    let html = esc(claim.text).replace(/\n/g, '<br>');
    const tactics = [...(claim.tactics || [])].sort((a, b) => b.phrase.length - a.phrase.length);
    tactics.forEach((tactic) => {
      if (!tactic.phrase) return;
      const phrase = esc(tactic.phrase);
      const index = html.indexOf(phrase);
      if (index === -1) return;
      const active = claim.tactics.indexOf(tactic) === state.selectedTactic;
      html = `${html.slice(0, index)}<button type="button" class="flag-mark ${tactic.positive ? 'is-positive' : ''} ${active ? 'is-active' : ''}" data-tactic-index="${claim.tactics.indexOf(tactic)}">${phrase}</button>${html.slice(index + phrase.length)}`;
    });
    return html;
  }

  function renderExplain() {
    const claim = state.currentClaim;
    if (!claim) return;
    const text = $('#annotatedText');
    const chips = $('#flagChips');
    if (text) text.innerHTML = buildAnnotated(claim);
    if (chips) {
      chips.innerHTML = (claim.tactics || []).map((tactic, index) => `
        <button type="button" data-tactic-index="${index}" class="flag-chip flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[8px] font-bold transition ${index === state.selectedTactic ? 'border-slate bg-slate text-white' : tactic.positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300' : 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'}">
          ${icon(tactic.positive ? 'check' : 'flag', 'h-2.5 w-2.5')}<span>${esc(tr(tactic.label))}</span>
        </button>`).join('');
    }
    selectTactic(state.selectedTactic, false);
    refreshIcons();
  }

  function selectTactic(index, rerender = true) {
    const claim = state.currentClaim;
    if (!claim?.tactics?.length) return;
    const safeIndex = Math.max(0, Math.min(index, claim.tactics.length - 1));
    state.selectedTactic = safeIndex;
    const tactic = claim.tactics[safeIndex];
    const positive = Boolean(tactic.positive);
    const card = $('#inspectorCard');
    const category = $('#inspectorCategory');
    const eyebrow = $('#inspectorEyebrow');
    const title = $('#inspectorTitle');
    const desc = $('#inspectorDesc');
    const counter = $('#tacticCounter');
    if (card) card.className = `relative overflow-hidden rounded-[22px] border p-4 sm:p-5 ${positive ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`;
    if (category) {
      category.textContent = tr(tactic.category);
      category.className = `rounded-full bg-white/70 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider ${positive ? 'text-emerald-700' : 'text-amber-700'}`;
    }
    if (eyebrow) {
      eyebrow.textContent = positive ? t('explain.trustSignal') : t('explain.manipulation');
      eyebrow.className = `mt-4 text-[9px] font-bold uppercase tracking-[.14em] ${positive ? 'text-emerald-700' : 'text-amber-700'}`;
    }
    if (title) title.textContent = tr(tactic.label);
    if (desc) desc.textContent = tr(tactic.desc);
    if (counter) counter.textContent = tr(tactic.counter);
    if (rerender) {
      $$('#flagChips .flag-chip').forEach((chip) => {
        const active = Number(chip.dataset.tacticIndex) === safeIndex;
        const isPositive = claim.tactics[Number(chip.dataset.tacticIndex)]?.positive;
        chip.className = `flag-chip flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[8px] font-bold transition ${active ? 'border-slate bg-slate text-white' : isPositive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300' : 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'}`;
      });
      $$('#annotatedText .flag-mark').forEach((mark) => {
        const active = Number(mark.dataset.tacticIndex) === safeIndex;
        const isPositive = claim.tactics[Number(mark.dataset.tacticIndex)]?.positive;
        mark.classList.toggle('is-active', active);
        mark.classList.toggle('is-positive', Boolean(isPositive));
      });
      refreshIcons();
    }
  }

  /* ── Respond ────────────────────────────────────────────── */
  function setTone(tone) {
    state.currentTone = tone;
    renderRespond();
  }

  function renderRespond() {
    const claim = state.currentClaim;
    if (!claim) return;
    $$('.tone-btn').forEach((button) => {
      const active = button.dataset.tone === state.currentTone;
      button.className = `tone-btn flex items-center gap-2.5 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${active ? 'border-teal bg-teal-tint' : 'border-line bg-white hover:border-teal/40'}`;
      const iconBox = button.querySelector('span:first-child');
      if (iconBox) iconBox.className = `grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? 'bg-white text-teal-deep shadow-sm' : 'bg-[#F3F5F0] text-slate-500'}`;
    });
    const label = $('#scriptToneLabel');
    const script = $('#replyScript');
    if (label) label.textContent = t(`respond.${state.currentTone}`);
    if (script) script.textContent = tr(claim.replies[state.currentTone]);
    renderFactCard(claim);
    refreshIcons();
  }

  function renderFactCard(claim) {
    const stamp = $('#fcStamp');
    const headline = $('#fcHeadline');
    const bullets = $('#fcBullets');
    const id = $('#fcId');
    const footer = $('#fcFooter');
    if (stamp) {
      stamp.textContent = tr(claim.card.stamp);
      const colors = claim.verdict === 'true'
        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
        : claim.verdict === 'misleading'
          ? 'border-amber-400 bg-amber-500/15 text-amber-300'
          : 'border-red-400 bg-red-500/15 text-red-300';
      stamp.className = `stamp rounded-md border-2 border-dashed px-3 py-1 font-mono text-[16px] font-bold uppercase tracking-[.18em] sm:text-[19px] ${colors}`;
    }
    if (headline) headline.textContent = tr(claim.card.headline);
    if (id) id.textContent = `#${claim.threadId}`;
    if (footer) footer.textContent = tr(claim.card.footer);
    if (bullets) {
      const facts = claim.facts?.[state.lang] || claim.facts?.en || [];
      const positive = claim.verdict === 'true';
      bullets.innerHTML = facts.map((fact) => `<li class="flex gap-1.5"><span class="${positive ? 'text-emerald-400' : 'text-red-400'}">${positive ? '✓' : '✕'}</span><span>${esc(fact)}</span></li>`).join('');
    }
  }

  async function copyScript() {
    if (!state.currentClaim) return;
    await copyText(tr(state.currentClaim.replies[state.currentTone]));
    toast(t('respond.copied'));
  }

  async function copyCaption() {
    const claim = state.currentClaim;
    if (!claim) return;
    const facts = claim.facts?.[state.lang] || claim.facts?.en || [];
    const caption = `${tr(claim.card.stamp)} — ${tr(claim.card.headline)}\n${facts.map((fact) => `• ${fact}`).join('\n')}\n\n${t('respond.checkedBy')} · #${claim.threadId}`;
    await copyText(caption);
    toast(t('respond.captionCopied'));
  }

  function downloadFactCard() {
    const claim = state.currentClaim;
    if (!claim) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, '#202B3C');
    gradient.addColorStop(0.55, '#182230');
    gradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = 'rgba(13,148,136,.14)';
    ctx.beginPath();
    ctx.arc(930, 110, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245,158,11,.08)';
    ctx.beginPath();
    ctx.arc(120, 980, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NermaiPar', 90, 94);
    ctx.fillStyle = '#5EEAD4';
    ctx.font = '700 22px "Space Mono", monospace';
    ctx.fillText(`#${claim.threadId}`, 850, 94);
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.moveTo(90, 126);
    ctx.lineTo(990, 126);
    ctx.stroke();

    const stampText = tr(claim.card.stamp);
    const color = claim.verdict === 'true' ? '#34D399' : claim.verdict === 'misleading' ? '#FBBF24' : '#F87171';
    ctx.save();
    ctx.translate(540, 320);
    ctx.rotate(-0.09);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.setLineDash([13, 10]);
    ctx.strokeRect(-190, -58, 380, 116);
    ctx.fillStyle = color;
    ctx.font = '700 64px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stampText, 0, 24);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 52px "Plus Jakarta Sans", sans-serif';
    const headline = tr(claim.card.headline);
    const words = headline.split(' ');
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = `${line}${line ? ' ' : ''}${word}`;
      if (ctx.measureText(test).width > 830 && line) { lines.push(line); line = word; } else line = test;
    });
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, index) => ctx.fillText(text, 540, 470 + index * 68));

    ctx.textAlign = 'left';
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    const facts = claim.facts?.[state.lang] || claim.facts?.en || [];
    facts.slice(0, 3).forEach((fact, index) => {
      const y = 680 + index * 74;
      ctx.fillStyle = claim.verdict === 'true' ? '#34D399' : '#F87171';
      ctx.fillText('•', 110, y);
      ctx.fillStyle = '#CBD5E1';
      const maxWidth = 800;
      let text = fact;
      if (ctx.measureText(text).width > maxWidth) {
        while (text.length > 20 && ctx.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
        text = `${text.trim()}…`;
      }
      ctx.fillText(text, 140, y);
    });

    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.moveTo(90, 960);
    ctx.lineTo(990, 960);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(tr(claim.card.footer), 90, 1012);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#5EEAD4';
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText('VERIFIED', 990, 1012);

    const link = document.createElement('a');
    link.download = `nermaipar-${claim.threadId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast(t('respond.downloaded'));
  }

  /* ── Resilience + training ──────────────────────────────── */
  function tagLabel(tag) {
    return TAG_INFO[tag] ? tr(TAG_INFO[tag].label) : String(tag || '');
  }

  function tagLabelPlain(tag) {
    const label = tagLabel(tag);
    return state.lang === 'en' ? label.toLowerCase() : label;
  }

  function weakestTag() {
    let best = null;
    Object.entries(state.stats.tags || {}).forEach(([tag, stats]) => {
      if (!stats || !stats.seen) return;
      const ratio = stats.wrong / stats.seen;
      if (!best || ratio > best.ratio || (ratio === best.ratio && stats.wrong > best.stats.wrong)) {
        best = { tag, ratio, stats };
      }
    });
    return best;
  }

  function currentWeakTag() {
    const weak = weakestTag();
    if (weak && weak.stats.wrong > 0) return weak.tag;
    return state.currentClaim?.primaryTag || 'urgency';
  }

  function renderResilience() {
    const weak = weakestTag();
    const tag = currentWeakTag();
    const level = 1 + Math.floor(state.stats.xp / 100);
    const progress = state.stats.xp % 100;
    const rounds = state.stats.rounds || 0;
    const accuracy = state.stats.answered ? Math.round((state.stats.correct / state.stats.answered) * 100) : null;
    const percent = weak && weak.stats.seen ? Math.round((weak.stats.wrong / weak.stats.seen) * 100) : 0;
    const sub = weak && weak.stats.wrong
      ? t('train.weaknessLine', { tactic: tagLabelPlain(weak.tag), percent })
      : state.stats.answered
        ? t('train.strong')
        : t('train.noData');

    const weakValue = $('#weakSpotValue');
    const weakSub = $('#weakSpotSub');
    const xpValue = $('#xpValue');
    const xpProgress = $('#xpProgress');
    const accuracyValue = $('#accuracyValue');
    const accuracySub = $('#accuracySub');
    const sideWeakSpot = $('#sideWeakSpot');
    const sideLevel = $('#sideLevel');
    const sideXpBar = $('#sideXpBar');
    const sideXp = $('#sideXp');

    if (weakValue) weakValue.textContent = tagLabel(tag);
    if (weakSub) weakSub.textContent = sub;
    if (xpValue) xpValue.textContent = t('train.xpLevel', { xp: state.stats.xp, level });
    if (xpProgress) xpProgress.style.width = `${progress}%`;
    if (accuracyValue) accuracyValue.textContent = accuracy === null ? '—' : `${accuracy}%`;
    if (accuracySub) accuracySub.textContent = rounds ? t('train.rounds', { count: rounds }) : t('train.progress');
    if (sideWeakSpot) sideWeakSpot.textContent = tagLabel(tag);
    if (sideLevel) sideLevel.textContent = `Level ${level}`;
    if (sideXpBar) sideXpBar.style.width = `${progress}%`;
    if (sideXp) sideXp.textContent = `${t('train.xpLevel', { xp: state.stats.xp, level })} · ${t('train.rounds', { count: rounds })}`;
  }

  function startQuiz() {
    const tag = state.currentClaim?.primaryTag || 'urgency';
    const order = ROUND_ORDER[tag] || ROUND_ORDER.default;
    const used = new Set();
    const chosen = [];
    order.forEach((wanted) => {
      if (chosen.length >= 5) return;
      const question = QUESTION_BANK.find((item) => !used.has(item.id) && item.tags.includes(wanted));
      if (question) { used.add(question.id); chosen.push(question); }
    });
    QUESTION_BANK.forEach((question) => {
      if (chosen.length < 5 && !used.has(question.id)) { used.add(question.id); chosen.push(question); }
    });
    state.quiz = {
      claimKey: state.currentClaim?.key || 'health',
      tag,
      index: 0,
      finished: false,
      items: chosen.map((question) => ({ question, answered: false, choice: null, correct: false }))
    };
    renderQuiz();
    renderResilience();
    logTelemetry(`mutation: training.round.start({ tactic: "${tag}", questions: ${chosen.length} })`);
  }

  function renderQuiz() {
    const quiz = state.quiz;
    if (!quiz) return;
    const item = quiz.items[quiz.index];
    const total = quiz.items.length;
    const tune = $('#quizTune');
    const scenario = $('#quizScenario');
    const counter = $('#quizCounter');
    const progressBar = $('#quizProgressBar');
    const body = $('#quizBody');
    const summary = $('#quizSummary');
    const prompt = $('#quizPrompt');
    const options = $('#quizOptions');
    const feedback = $('#quizFeedback');
    const feedbackTitle = $('#quizFeedbackTitle');
    const feedbackDesc = $('#quizFeedbackDesc');

    if (tune) tune.textContent = t('train.tuned', { tactic: tagLabel(quiz.tag) });
    if (counter) counter.textContent = t('train.qOf', { current: Math.min(quiz.index + 1, total), total });
    if (progressBar) progressBar.style.width = `${Math.round(((quiz.index + (quiz.finished ? 1 : 0)) / total) * 100)}%`;

    if (quiz.finished) {
      if (body) body.classList.add('hidden');
      if (summary) summary.classList.remove('hidden');
      const score = quiz.items.filter((entry) => entry.correct).length;
      const summaryText = $('#quizSummaryText');
      if (summaryText) summaryText.textContent = t('train.doneSub', { score, total });
      if (scenario) scenario.textContent = t('train.roundScore');
      const profile = $('#weakSpotProfile');
      if (profile) {
        const weak = weakestTag();
        const percent = weak && weak.stats.seen ? Math.round((weak.stats.wrong / weak.stats.seen) * 100) : 0;
        const note = weak && weak.stats.wrong
          ? t('train.weaknessLine', { tactic: tagLabelPlain(weak.tag), percent })
          : t('train.strong');
        profile.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <p class="text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">${esc(t('train.weakSpot'))}</p>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[8px] font-bold text-slate-500">${score} / ${total}</span>
          </div>
          <p class="mt-1.5 text-[13px] font-bold text-slate">${esc(tagLabel(currentWeakTag()))}</p>
          <p class="mt-1 text-[10px] leading-relaxed text-slate-500">${esc(note)}</p>
          <div class="mt-3 space-y-1.5">
            ${quiz.items.map((entry) => `
              <div class="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
                <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full ${entry.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${icon(entry.correct ? 'check' : 'x', 'h-2.5 w-2.5')}</span>
                <span class="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-600">${esc(tr(entry.question.scenario))}</span>
                <span class="text-[8px] font-bold ${entry.correct ? 'text-emerald-600' : 'text-red-500'}">${entry.correct ? '✓' : '✕'}</span>
              </div>`).join('')}
          </div>`;
      }
      refreshIcons();
      return;
    }

    if (body) body.classList.remove('hidden');
    if (summary) summary.classList.add('hidden');
    if (scenario && item) scenario.textContent = tr(item.question.scenario);
    if (prompt && item) prompt.textContent = tr(item.question.prompt);

    if (options && item) {
      options.innerHTML = item.question.options.map((option, index) => {
        const isCorrect = index === item.question.correct;
        const isChoice = index === item.choice;
        const palette = !item.answered
          ? 'border-line bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
          : isCorrect
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
            : isChoice
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-line bg-slate-50 text-slate-400';
        const badge = item.answered && isCorrect
          ? 'bg-emerald-500 text-white'
          : item.answered && isChoice
            ? 'bg-red-500 text-white'
            : 'bg-[#F3F5F0] text-slate-500';
        return `
          <button type="button" data-quiz-option="${index}" ${item.answered ? 'disabled' : ''} class="flex w-full items-start gap-2.5 rounded-xl border p-3 text-left text-[11px] leading-relaxed transition ${palette}">
            <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold ${badge}">${item.answered && isCorrect ? icon('check', 'h-3 w-3') : item.answered && isChoice ? icon('x', 'h-3 w-3') : String.fromCharCode(65 + index)}</span>
            <span class="flex-1">${esc(tr(option))}</span>
          </button>`;
      }).join('');
    }

    if (feedback && feedbackTitle && feedbackDesc) {
      if (item && item.answered) {
        feedback.classList.remove('hidden');
        feedback.className = `mt-4 rounded-xl border p-3 ${item.correct ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`;
        feedbackTitle.className = `flex items-center gap-1.5 text-[10px] font-bold ${item.correct ? 'text-emerald-700' : 'text-red-700'}`;
        feedbackTitle.innerHTML = `${icon(item.correct ? 'check-circle-2' : 'x-circle', 'h-3.5 w-3.5')}<span>${esc(item.correct ? t('train.correct') : t('train.wrong'))}</span>`;
        feedbackDesc.textContent = tr(item.question.explanation);
        let next = $('#quizNextBtn');
        if (!next) {
          next = document.createElement('button');
          next.id = 'quizNextBtn';
          next.type = 'button';
          next.className = 'mt-3 flex items-center gap-1.5 rounded-full bg-slate px-3.5 py-2 text-[9px] font-bold text-white transition hover:bg-ink';
          feedback.appendChild(next);
        }
        const last = quiz.index >= total - 1;
        next.innerHTML = `${esc(last ? t('train.finish') : t('train.next'))}${icon('arrow-right', 'h-3 w-3')}`;
      } else {
        feedback.classList.add('hidden');
      }
    }

    const answered = quiz.items.filter((entry) => entry.answered).length;
    const correct = quiz.items.filter((entry) => entry.correct).length;
    const accuracyValue = $('#accuracyValue');
    const accuracySub = $('#accuracySub');
    if (accuracyValue) accuracyValue.textContent = answered ? `${Math.round((correct / answered) * 100)}%` : '—';
    if (accuracySub) accuracySub.textContent = t('train.progress');
    refreshIcons();
  }

  function answerQuiz(index) {
    const quiz = state.quiz;
    if (!quiz || quiz.finished) return;
    const item = quiz.items[quiz.index];
    if (!item || item.answered) return;
    item.answered = true;
    item.choice = index;
    item.correct = index === item.question.correct;
    const tag = item.question.tags[0] || quiz.tag;
    if (!state.stats.tags[tag]) state.stats.tags[tag] = { seen: 0, wrong: 0 };
    state.stats.tags[tag].seen += 1;
    state.stats.answered += 1;
    if (item.correct) {
      state.stats.correct += 1;
      state.stats.xp += 20;
    } else {
      state.stats.tags[tag].wrong += 1;
      state.stats.xp += 5;
    }
    saveStats();
    renderResilience();
    renderQuiz();
    logTelemetry(`mutation: training.answer({ q: "${item.question.id}", correct: ${item.correct} })`);
  }

  function nextQuiz() {
    const quiz = state.quiz;
    if (!quiz || quiz.finished) return;
    const item = quiz.items[quiz.index];
    if (!item || !item.answered) return;
    if (quiz.index >= quiz.items.length - 1) {
      quiz.finished = true;
      state.stats.rounds = (state.stats.rounds || 0) + 1;
      saveStats();
      renderResilience();
      renderQuiz();
      logTelemetry(`mutation: training.round.commit({ score: ${quiz.items.filter((entry) => entry.correct).length}, total: ${quiz.items.length} })`);
      return;
    }
    quiz.index += 1;
    renderQuiz();
  }

  async function trainWeakSpot() {
    if (!state.analyzed) {
      await loadSample('health');
    }
    setStep(4);
    toast(t('resilience.trainToast'));
  }

  /* ── Live viral threads ─────────────────────────────────── */
  function renderThreads() {
    const list = $('#threadsList');
    if (!list) return;
    list.innerHTML = state.threads.map((thread) => {
      const claim = CLAIMS[thread.key];
      const meta = statusMeta[thread.status] || statusMeta.checking;
      const active = state.analyzed && state.currentClaim?.key === thread.key;
      return `
        <button type="button" data-thread-key="${thread.key}" class="group w-full rounded-2xl border px-3 py-2.5 text-left transition ${active ? 'border-white/15 bg-white/[.07]' : 'border-transparent hover:border-white/10 hover:bg-white/[.04]'}">
          <div class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot} ${thread.status === 'checking' ? 'animate-pulse' : ''}"></span>
            <span class="min-w-0 flex-1 truncate text-[10px] font-bold text-white">${esc(tr(claim.title))}</span>
            <span class="font-mono text-[7px] text-slate-500">#${esc(claim.threadId)}</span>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5 pl-3.5 text-[7px] text-slate-500">
            <span>${esc(t('threads.checks', { count: thread.checks }))}</span>
            <span>·</span>
            <span>${esc(t('threads.minAgo', { count: thread.minutes }))}</span>
            <span class="ml-auto rounded-full border px-1.5 py-0.5 font-bold ${meta.cls}">${esc(t(meta.key))}</span>
          </div>
        </button>`;
    }).join('');
    const pulse = $('#threadsPulse');
    if (pulse) pulse.textContent = t('threads.pulse', { count: state.pulseChecks.toLocaleString('en-IN') });
    refreshIcons();
  }

  function loadThread(key) {
    const thread = state.threads.find((item) => item.key === key);
    const claim = CLAIMS[key];
    if (!thread || !claim) return;
    if (state.channel !== 'app') setChannel('app');
    thread.status = 'checking';
    renderThreads();
    toast(t('threads.runCheck', { id: claim.threadId }));
    setTimeout(() => {
      loadSample(key).then(() => {
        toast(t('threads.statusUpdated', { id: claim.threadId }));
      }).catch(() => {});
    }, 450);
  }

  function tickCommunity() {
    state.pulseChecks += 1 + Math.floor(Math.random() * 5);
    state.threads.forEach((thread) => {
      thread.checks += Math.floor(Math.random() * 3);
      if (Math.random() < 0.25) thread.minutes = Math.max(1, thread.minutes - 1);
      else if (Math.random() < 0.3) thread.minutes = Math.min(59, thread.minutes + 1);
    });
    const gps = state.threads.find((thread) => thread.key === 'gps');
    if (gps && gps.status === 'checking' && Math.random() < 0.32) {
      gps.status = 'misleading';
      toast(t('threads.statusUpdated', { id: CLAIMS.gps.threadId }));
    }
    const pulse = $('#pulseChecks');
    if (pulse) pulse.textContent = state.pulseChecks.toLocaleString('en-IN');
    renderThreads();
  }

  /* ── WhatsApp bot ───────────────────────────────────────── */
  function ensureWaGreeting() {
    if (!state.waHistory.length) {
      state.waHistory.push({ role: 'bot', kind: 'greeting' });
      state.waHistory.push({ role: 'bot', kind: 'samplesPrompt' });
    }
  }

  function renderWaSuggestions() {
    const box = $('#waSuggestions');
    if (!box) return;
    box.innerHTML = ['health', 'phishing', 'isro'].map((key) => {
      const label = t(`detect.sample${key === 'health' ? 'Health' : key === 'phishing' ? 'Phishing' : 'Isro'}`);
      return `<button type="button" data-wa-sample="${key}" class="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[8px] font-bold text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200">${esc(label)}</button>`;
    }).join('');
  }

  function waVerdictTone(claim) {
    if (claim.verdict === 'true') return { border: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-400/10', stamp: 'text-emerald-300' };
    if (claim.verdict === 'misleading') return { border: 'border-amber-400/30', text: 'text-amber-300', bg: 'bg-amber-400/10', stamp: 'text-amber-300' };
    return { border: 'border-red-400/30', text: 'text-red-300', bg: 'bg-red-400/10', stamp: 'text-red-300' };
  }

  function renderWa() {
    const box = $('#waMessages');
    if (!box) return;
    ensureWaGreeting();
    box.innerHTML = state.waHistory.map((message, index) => {
      if (message.role === 'user') {
        return `<div class="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-[#005C4B] px-3 py-2 text-[10px] leading-relaxed text-white shadow-sm">
          <p>${esc(message.text)}</p>
          <p class="mt-1 text-right text-[7px] text-emerald-200/70">${esc(t('wa.you'))} · ✓✓</p>
        </div>`;
      }
      if (message.kind === 'greeting') {
        return `<div class="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#202C33] px-3 py-2.5 text-[10px] leading-relaxed text-slate-200 shadow-sm">
          <p class="mb-1 text-[8px] font-bold uppercase tracking-[.12em] text-emerald-300">NermaiPar</p>
          <p>${esc(t('wa.greeting'))}</p>
        </div>`;
      }
      if (message.kind === 'samplesPrompt') {
        return `<div class="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#202C33] px-3 py-2.5 text-[10px] leading-relaxed text-slate-300 shadow-sm">
          <p class="mb-2">${esc(t('wa.greeting2'))}</p>
          <div class="flex flex-wrap gap-1.5">
            ${['health', 'phishing', 'isro'].map((key) => `<button type="button" data-wa-sample="${key}" class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-bold text-emerald-200 transition hover:bg-emerald-400/20">${esc(t(`detect.sample${key === 'health' ? 'Health' : key === 'phishing' ? 'Phishing' : 'Isro'}`))}</button>`).join('')}
          </div>
        </div>`;
      }
      if (message.claim) {
        const claim = message.claim;
        const tone = waVerdictTone(claim);
        const stamp = tr(claim.card?.stamp || '');
        return `<div class="max-w-[90%] rounded-2xl rounded-bl-md border ${tone.border} bg-[#202C33] p-3 text-[10px] leading-relaxed text-slate-200 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[8px] font-bold uppercase tracking-[.12em] text-slate-400">${esc(t('wa.verdict'))}</span>
            <span class="rounded-full border ${tone.border} ${tone.bg} px-2 py-0.5 font-mono text-[8px] font-bold ${tone.stamp}">${esc(stamp)}</span>
          </div>
          <p class="mt-1.5 text-[11px] font-bold text-white">${esc(tr(claim.title))}</p>
          <p class="mt-1 text-[9px] leading-relaxed text-slate-400">${esc(tr(claim.summary))}</p>
          <div class="mt-2 flex items-center gap-2">
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full ${claim.risk >= 70 ? 'bg-red-400' : claim.risk >= 40 ? 'bg-amber-400' : 'bg-emerald-400'}" style="width:${claim.risk}%"></div></div>
            <span class="font-mono text-[7px] text-slate-400">${claim.risk}% ${esc(t('result.risk'))}</span>
          </div>
          <p class="mt-2 text-[8px] font-bold ${claim.verdict === 'true' ? 'text-emerald-300' : 'text-red-300'}">${esc(claim.verdict === 'true' ? t('wa.safe') : t('wa.doNotForward'))}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button type="button" data-wa-action="copy" data-wa-index="${index}" class="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[8px] font-bold text-slate-200 transition hover:bg-white/10">${icon('copy', 'h-2.5 w-2.5')}<span>${esc(t('wa.copy'))}</span></button>
            <button type="button" data-wa-action="open" data-wa-index="${index}" class="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-bold text-emerald-200 transition hover:bg-emerald-400/20">${icon('external-link', 'h-2.5 w-2.5')}<span>${esc(t('wa.open'))}</span></button>
          </div>
        </div>`;
      }
      return '';
    }).join('');
    const typing = $('#waTyping');
    if (typing) typing.classList.add('hidden');
    renderWaSuggestions();
    refreshIcons();
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  async function sendWa(raw) {
    if (state.waBusy) return;
    const text = String(raw || '').trim();
    if (!text) {
      toast(t('detect.empty'));
      return;
    }
    state.waBusy = true;
    state.waHistory.push({ role: 'user', kind: 'text', text });
    const input = $('#waInput');
    if (input) input.value = '';
    renderWa();
    const typing = $('#waTyping');
    if (typing) { typing.classList.remove('hidden'); typing.classList.add('flex'); }
    const box = $('#waMessages');
    if (box) box.scrollTop = box.scrollHeight;
    await wait(700);
    await wait(900);
    const claim = matchClaim(text);
    if (claim.isDynamic) {
      const hash = await hashText(text);
      claim.threadId = `NP-${hash.slice(0, 4).toUpperCase()}`;
      claim.key = `dynamic-${hash.slice(0, 8)}`;
    }
    const thread = state.threads.find((item) => item.key === claim.key);
    if (thread) { thread.checks += 1; renderThreads(); }
    state.waHistory.push({ role: 'bot', kind: 'claim', claim });
    if (typing) { typing.classList.add('hidden'); typing.classList.remove('flex'); }
    renderWa();
    state.waBusy = false;
    logTelemetry(`mutation: wa.triage({ id: "${claim.threadId}", verdict: "${claim.verdict}" })`);
  }

  async function copyWaReply(index) {
    const entry = state.waHistory[index];
    const claim = entry?.claim;
    if (!claim) return;
    const tone = claim.verdict === 'true' ? 'peer' : 'elder';
    await copyText(tr(claim.replies?.[tone] || claim.replies?.elder || ''));
    toast(t('wa.copied'));
  }

  async function openClaimInApp(claim) {
    if (!claim) return;
    setChannel('app');
    if (CLAIMS[claim.key]) {
      await loadSample(claim.key);
    } else {
      const input = $('#claimInput');
      if (input) {
        input.value = claim.text;
        updateCharCount();
        updateHash(claim.text);
      }
      await analyzeCurrent();
    }
    setStep(2);
    toast(t('wa.reportOpened'));
  }

  /* ── SMS / feature phone ────────────────────────────────── */
  function updateSmsClock() {
    const clock = $('#smsClock');
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const network = $('#smsNetwork');
    if (network) network.textContent = state.offline ? '2G · offline cache' : '2G · no data';
  }

  function smsStamp(claim) {
    return tr(claim.card?.stamp || '');
  }

  function renderSms() {
    const screen = $('#smsScreen');
    if (!screen) return;
    const claim = CLAIMS[state.smsClaimKey] || CLAIMS.health;
    const facts = claim.facts?.[state.lang] || claim.facts?.en || [];
    const lines = [];
    const from = `<p class="text-[8px] font-bold uppercase tracking-wider opacity-60">${esc(t('sms.from'))}</p>`;

    if (state.smsMode === 'inbox') {
      lines.push(from);
      lines.push(`<p>${esc(t('sms.help1'))}</p>`);
      lines.push(`<p>${esc(t('sms.help2'))}</p>`);
      lines.push(`<p class="mt-1 border-t border-[#6f8f68]/40 pt-1 opacity-70">${esc(t('sms.options'))}</p>`);
      lines.push(`<p class="mt-1 font-bold">${esc(tr(claim.title))}</p>`);
    } else if (state.smsMode === 'checking') {
      lines.push(from);
      lines.push(`<p class="font-bold">${esc(t('sms.checking'))}</p>`);
      lines.push(`<p class="opacity-70">${esc(tr(claim.title))}</p>`);
    } else if (state.smsMode === 'result') {
      lines.push(from);
      lines.push(`<p class="font-bold">${esc(tr(claim.title))}</p>`);
      lines.push(`<p class="mt-1"><strong>${esc(smsStamp(claim))}</strong> · ${esc(t('result.risk'))} ${claim.risk}/100</p>`);
      lines.push(`<p>${esc(facts[0] || tr(claim.summary))}</p>`);
      lines.push(`<p class="mt-1 opacity-70">${esc(t('sms.options'))}</p>`);
    } else if (state.smsMode === 'voice') {
      lines.push(from);
      lines.push(`<p class="font-bold">${esc(t('sms.voiceDone'))}</p>`);
      lines.push(`<p>${esc(facts[0] || tr(claim.summary))}</p>`);
      lines.push(`<p class="mt-1 opacity-70">${esc(t('sms.options'))}</p>`);
    } else if (state.smsMode === 'reply') {
      lines.push(from);
      lines.push(`<p class="font-bold">${esc(t('sms.replyDone'))}</p>`);
      lines.push(`<p>${esc(tr(claim.replies?.elder || claim.replies?.peer || ''))}</p>`);
    } else if (state.smsMode === 'report') {
      lines.push(from);
      lines.push(`<p class="font-bold">${esc(t('sms.reportDone'))}</p>`);
      lines.push(`<p>REF: #${esc(claim.threadId)}</p>`);
      lines.push(`<p class="opacity-70">${esc(tr(claim.title))}</p>`);
    }
    screen.innerHTML = lines.join('');
    updateSmsClock();
  }

  function setSmsSample(key) {
    if (!CLAIMS[key]) return;
    state.smsClaimKey = key;
    state.smsMode = 'checking';
    state.smsToken = Date.now();
    renderSms();
    toast(t('detect.sampleLoaded'));
    const token = state.smsToken;
    setTimeout(() => {
      if (state.smsToken === token && state.smsMode === 'checking') {
        state.smsMode = 'result';
        renderSms();
      }
    }, 900);
  }

  function smsKey(key) {
    const claim = CLAIMS[state.smsClaimKey] || CLAIMS.health;
    if (key === 'up') {
      const keys = Object.keys(CLAIMS);
      const next = keys[(keys.indexOf(state.smsClaimKey) + 1) % keys.length];
      setSmsSample(next);
      return;
    }
    if (key === 'OK') {
      if (state.smsMode === 'inbox') {
        state.smsMode = 'checking';
        state.smsToken = Date.now();
        const token = state.smsToken;
        renderSms();
        setTimeout(() => {
          if (state.smsToken === token && state.smsMode === 'checking') {
            state.smsMode = 'result';
            renderSms();
          }
        }, 750);
      } else {
        state.smsMode = 'result';
        renderSms();
      }
      return;
    }
    if (!['1', '2', '3'].includes(key)) return;
    if (state.smsMode === 'inbox' || state.smsMode === 'checking') {
      state.smsMode = 'result';
      renderSms();
      return;
    }
    state.smsMode = key === '1' ? 'voice' : key === '2' ? 'reply' : 'report';
    renderSms();
    toast(t(key === '1' ? 'sms.voiceDone' : key === '2' ? 'sms.replyDone' : 'sms.reportDone'));
    logTelemetry(`mutation: sms.action({ id: "${claim.threadId}", action: "${key}" })`);
  }

  /* ── Judge mode / telemetry ─────────────────────────────── */
  function updateQueue() {
    const queue = $('#queueCount');
    if (!queue) return;
    queue.textContent = state.queue.length ? t('judge.pending', { count: state.queue.length }) : t('judge.synced');
  }

  function logTelemetry(message) {
    state.logs.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message
    });
    state.logs = state.logs.slice(0, 24);
    renderJudge();
  }

  function renderJudge() {
    const status = $('#netStatusLabel');
    const button = $('#netToggleBtn');
    const queue = $('#queueCount');
    const log = $('#mutationLog');
    const online = !state.offline;

    if (status) {
      status.textContent = t(online ? 'judge.online' : 'judge.offline');
      status.className = `mt-0.5 text-[11px] font-bold ${online ? 'text-teal-300' : 'text-amber-300'}`;
    }
    if (button) {
      button.textContent = t(online ? 'judge.goOffline' : 'judge.goOnline');
      button.className = `rounded-full border px-3 py-1.5 font-mono text-[8px] font-bold transition ${online ? 'border-teal-400/30 bg-teal-400/10 text-teal-300 hover:bg-teal-400/20' : 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'}`;
    }
    if (queue) {
      queue.textContent = state.queue.length ? t('judge.pending', { count: state.queue.length }) : t('judge.synced');
    }
    if (log) {
      log.innerHTML = state.logs.length
        ? state.logs.map((entry) => `<p><span class="text-slate-600">${esc(entry.time)}</span> <span class="text-teal-300">›</span> ${esc(entry.message)}</p>`).join('')
        : `<p>${esc(t('judge.emptyLog'))}</p>`;
    }
  }

  function setOffline(next, silent = false) {
    const was = state.offline;
    state.offline = Boolean(next);
    if (was && !state.offline && state.queue.length) {
      const count = state.queue.length;
      state.queue = [];
      logTelemetry(`mutation: sync.flush({ count: ${count} })`);
    }
    if (!silent) toast(t(state.offline ? 'judge.offlineToast' : 'judge.onlineToast'));
    logTelemetry(`mutation: network.mode({ online: ${!state.offline} })`);
    renderJudge();
    updateSmsClock();
  }

  function openJudge() {
    const drawer = $('#judgeDrawer');
    if (!drawer) return;
    state.judgeOpen = true;
    drawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderJudge();
    refreshIcons();
    setTimeout(() => { const close = $('#judgeCloseBtn'); if (close) close.focus(); }, 80);
  }

  function closeJudge() {
    const drawer = $('#judgeDrawer');
    if (!drawer) return;
    state.judgeOpen = false;
    drawer.classList.add('hidden');
    document.body.style.overflow = '';
    const open = $('#judgeOpenBtn');
    if (open) open.focus();
  }

  /* ── Media, paste, misc ─────────────────────────────────── */
  async function pasteFromClipboard() {
    const input = $('#claimInput');
    try {
      const text = await navigator.clipboard.readText();
      if (text && input) {
        input.value = text.slice(0, 1200);
        updateCharCount();
        updateHash(input.value);
        input.focus();
      }
    } catch {
      if (input) input.focus();
    }
  }

  function handleMedia(file, kind) {
    if (!file) return;
    const isAudio = kind === 'audio';
    const status = $(`#${kind}Status`);
    const doneKey = isAudio ? 'detect.audioDone' : 'detect.imageDone';
    if (status) status.textContent = `${t(doneKey)} · ${file.name}`;
    const input = $('#claimInput');
    if (input) {
      input.value = isAudio ? CLAIMS.health.text : CLAIMS.phishing.text;
      updateCharCount();
      updateHash(input.value);
    }
    toast(t(doneKey));
    const field = $(`#${kind}File`);
    if (field) field.value = '';
    setTimeout(() => { analyzeCurrent(); }, 350);
  }

  /* ── Events + init ──────────────────────────────────────── */
  function bindEvents() {
    $$('.channel-btn').forEach((button) => {
      button.addEventListener('click', () => setChannel(button.dataset.channel));
    });
    $$('.step-tab').forEach((button) => {
      button.addEventListener('click', () => setStep(Number(button.dataset.step)));
    });
    $$('.tone-btn').forEach((button) => {
      button.addEventListener('click', () => setTone(button.dataset.tone));
    });

    const brand = $('#brandHome');
    if (brand) brand.addEventListener('click', (event) => { event.preventDefault(); resetCheck(); setChannel('app'); window.scrollTo({ top: 0, behavior: 'smooth' }); });

    const language = $('#languageSelect');
    if (language) {
      language.addEventListener('change', () => {
        state.lang = language.value;
        saveLang();
        applyI18n();
        refreshDynamic();
        updateHash($('#claimInput')?.value || '');
        toast(t('common.langChanged'));
      });
    }

    const judgeOpen = $('#judgeOpenBtn');
    if (judgeOpen) judgeOpen.addEventListener('click', openJudge);
    const judgeClose = $('#judgeCloseBtn');
    if (judgeClose) judgeClose.addEventListener('click', closeJudge);
    const judgeBackdrop = $('#judgeBackdrop');
    if (judgeBackdrop) judgeBackdrop.addEventListener('click', closeJudge);
    const netToggle = $('#netToggleBtn');
    if (netToggle) netToggle.addEventListener('click', () => setOffline(!state.offline));

    const analyze = $('#analyzeBtn');
    if (analyze) analyze.addEventListener('click', analyzeCurrent);
    const claimInput = $('#claimInput');
    if (claimInput) {
      claimInput.addEventListener('input', () => { updateCharCount(); updateHash(claimInput.value); });
      claimInput.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          analyzeCurrent();
        }
      });
    }
    const paste = $('#pasteBtn');
    if (paste) paste.addEventListener('click', pasteFromClipboard);
    const clear = $('#clearBtn');
    if (clear) clear.addEventListener('click', resetCheck);

    $$('.sample-card').forEach((button) => {
      button.addEventListener('click', () => loadSample(button.dataset.sample));
    });

    const audio = $('#audioFile');
    if (audio) audio.addEventListener('change', () => handleMedia(audio.files?.[0], 'audio'));
    const image = $('#imageFile');
    if (image) image.addEventListener('change', () => handleMedia(image.files?.[0], 'image'));

    const result = $('#detectResult');
    if (result) {
      result.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]');
        if (action) {
          if (action.dataset.action === 'new') resetCheck();
          else if (action.dataset.action === 'see') setStep(2);
          return;
        }
        const band = event.target.closest('.risk-band');
        if (band) selectRiskBand(band.dataset.risk);
      });
    }

    const annotated = $('#annotatedText');
    if (annotated) {
      annotated.addEventListener('click', (event) => {
        const mark = event.target.closest('[data-tactic-index]');
        if (mark) selectTactic(Number(mark.dataset.tacticIndex));
      });
    }
    const chips = $('#flagChips');
    if (chips) {
      chips.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-tactic-index]');
        if (chip) selectTactic(Number(chip.dataset.tacticIndex));
      });
    }

    const explainBack = $('#explainBack');
    if (explainBack) explainBack.addEventListener('click', () => setStep(1));
    const explainNext = $('#explainNext');
    if (explainNext) explainNext.addEventListener('click', () => setStep(3));
    const respondBack = $('#respondBack');
    if (respondBack) respondBack.addEventListener('click', () => setStep(2));
    const respondNext = $('#respondNext');
    if (respondNext) respondNext.addEventListener('click', () => setStep(4));
    const trainBack = $('#trainBack');
    if (trainBack) trainBack.addEventListener('click', () => setStep(3));
    const trainNew = $('#trainNewCheck');
    if (trainNew) trainNew.addEventListener('click', resetCheck);
    const sidebarTrain = $('#sidebarTrainBtn');
    if (sidebarTrain) sidebarTrain.addEventListener('click', trainWeakSpot);

    const copyScriptBtn = $('#copyScriptBtn');
    if (copyScriptBtn) copyScriptBtn.addEventListener('click', copyScript);
    const downloadBtn = $('#downloadCardBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadFactCard);
    const captionBtn = $('#copyCaptionBtn');
    if (captionBtn) captionBtn.addEventListener('click', copyCaption);

    const quizOptions = $('#quizOptions');
    if (quizOptions) {
      quizOptions.addEventListener('click', (event) => {
        const option = event.target.closest('[data-quiz-option]');
        if (option) answerQuiz(Number(option.dataset.quizOption));
      });
    }
    const quizFeedback = $('#quizFeedback');
    if (quizFeedback) {
      quizFeedback.addEventListener('click', (event) => {
        if (event.target.closest('#quizNextBtn')) nextQuiz();
      });
    }
    const quizRestart = $('#quizRestartBtn');
    if (quizRestart) quizRestart.addEventListener('click', () => { startQuiz(); toast(t('train.started')); });
    const quizNew = $('#quizNewClaimBtn');
    if (quizNew) quizNew.addEventListener('click', resetCheck);

    const threads = $('#threadsList');
    if (threads) {
      threads.addEventListener('click', (event) => {
        const button = event.target.closest('[data-thread-key]');
        if (button) loadThread(button.dataset.threadKey);
      });
    }

    const waForm = $('#waForm');
    if (waForm) {
      waForm.addEventListener('submit', (event) => {
        event.preventDefault();
        sendWa($('#waInput')?.value || '');
      });
    }
    const waSuggestions = $('#waSuggestions');
    if (waSuggestions) {
      waSuggestions.addEventListener('click', (event) => {
        const button = event.target.closest('[data-wa-sample]');
        if (button) sendWa(CLAIMS[button.dataset.waSample]?.text || '');
      });
    }
    const waMessages = $('#waMessages');
    if (waMessages) {
      waMessages.addEventListener('click', (event) => {
        const button = event.target.closest('[data-wa-action]');
        if (!button) return;
        const index = Number(button.dataset.waIndex);
        if (button.dataset.waAction === 'copy') copyWaReply(index);
        if (button.dataset.waAction === 'open') {
          const claim = state.waHistory[index]?.claim;
          if (claim) openClaimInApp(claim);
        }
      });
    }

    $$('[data-sms-key]').forEach((button) => {
      button.addEventListener('click', () => smsKey(button.dataset.smsKey));
    });
    $$('[data-sms-sample]').forEach((button) => {
      button.addEventListener('click', () => setSmsSample(button.dataset.smsSample));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.judgeOpen) closeJudge();
    });
    window.addEventListener('offline', () => setOffline(true, true));
    window.addEventListener('online', () => setOffline(false, true));
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        /* Offline shell is optional; the prototype still runs without it. */
      });
    });
  }

  function init() {
    bindEvents();
    applyI18n();
    ensureWaGreeting();
    renderWa();
    renderSms();
    renderThreads();
    renderResilience();
    renderJudge();
    updateCharCount();
    updateHash('');
    setChannel('app');
    setStep(1, { scroll: false });
    const pulse = $('#pulseChecks');
    if (pulse) pulse.textContent = state.pulseChecks.toLocaleString('en-IN');
    updateSmsClock();
    logTelemetry(`session.open({ channel: "app", lang: "${state.lang}" })`);
    setInterval(tickCommunity, 14000);
    setInterval(updateSmsClock, 30000);
    refreshIcons();
    registerServiceWorker();
  }

  init();
})();
