tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
};

(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  State — everything is stored canonically in ZAR.
   *  The currency toggle only changes the *display* layer.
   *  Commission is a fraction (0.22 = 22%) applied to gross tutoring income.
   * ------------------------------------------------------------------ */
  const DEFAULTS = {
    currency: 'ZAR',
    rate: 18.60,
    hourly: 400,
    hours: 15,
    commission: 0.22,
    retainer: 55000,
    burn: 3000,
    savings: 5000,
    fundTarget: 22000,
  };

  let S = { ...DEFAULTS };

  /* ------------------------------------------------------------------ *
   *  DOM refs
   * ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);

  const el = {
    curBtns:      Array.from(document.querySelectorAll('[data-cur]')),
    rate:         $('rate'),
    hourly:       $('hourly'),
    hours:        $('hours'),
    hoursOut:     $('hoursOut'),
    commission:   $('commission'),
    commissionOut:$('commissionOut'),
    retainer:     $('retainer'),
    retainerNum:  $('retainerNum'),
    retainerHint: $('retainerHint'),
    burn:         $('burn'),
    savings:      $('savings'),
    fundTarget:   $('fundTarget'),
    reset:        $('reset'),

    runway:       $('runway'),
    runwayUnit:   $('runwayUnit'),
    runwayNote:   $('runwayNote'),
    runwayBadge:  $('runwayBadge'),

    velocity:     $('velocity'),
    velocityNote: $('velocityNote'),
    daysToFund:   $('daysToFund'),
    daysNote:     $('daysNote'),
    surplus:      $('surplus'),
    surplusNote:  $('surplusNote'),

    fundPct:      $('fundPct'),
    fundBar:      $('fundBar'),
    fundCurrent:  $('fundCurrent'),
    fundTargetOut:$('fundTargetOut'),
    fundEta:      $('fundEta'),

    coverage:     $('coverage'),
    coverageBar:  $('coverageBar'),
    coverageNote: $('coverageNote'),
  };

  const BTN_ON  = 'rounded-lg bg-red-700 px-4 py-1.5 text-xs font-semibold tracking-wide text-white transition';
  const BTN_OFF = 'rounded-lg px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-500 transition hover:text-white';

  /* ------------------------------------------------------------------ *
   *  Helpers
   * ------------------------------------------------------------------ */
  const isZAR   = () => S.currency === 'ZAR';
  const SYM     = () => (isZAR() ? 'R' : '$');
  const toDisp  = (zar) => (isZAR() ? zar : zar / (S.rate || 1));
  const toZar   = (disp) => (isZAR() ? disp : disp * (S.rate || 1));

  const round = (n, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  };

  const num = (v, d = 0) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);

  /** Format a ZAR-canonical amount into the active display currency. */
  function money(zar, decimals = 0) {
    return new Intl.NumberFormat(isZAR() ? 'en-ZA' : 'en-US', {
      style: 'currency',
      currency: S.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(toDisp(zar));
  }

  /** "Mar 2028" from a day offset. */
  function dateFromDays(days) {
    if (!isFinite(days) || days <= 0) return '—';
    const clamped = Math.min(days, 36500); // 100 years
    const d = new Date(Date.now() + clamped * 86400000);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  /** Paint a range input's filled track. */
  function paintRange(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value) || 0;
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--pct', Math.max(0, Math.min(100, pct)) + '%');
  }

  function setBadge(text) {
    el.runwayBadge.textContent = text;
    el.runwayBadge.className =
      'shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ' +
      'border-red-700 text-red-500';
  }

  const commissionPct = () => Math.round((S.commission || 0) * 100);

  /* ------------------------------------------------------------------ *
   *  Core arithmetic
   * ------------------------------------------------------------------ */
  function calc() {
    const grossMonthly   = S.hourly * S.hours * (52 / 12);
    const monthlyIncome  = grossMonthly * (1 - (S.commission || 0)); // net take-home

    const net   = monthlyIncome - S.burn;          // ZAR / month
    const daily = net / 30.4375;                   // ZAR / day

    const reached = S.fundTarget > 0 && S.savings >= S.fundTarget;
    const gap     = Math.max(0, S.fundTarget - S.savings);

    const runwayMonths = net >= 0 ? Infinity : S.savings / Math.max(1e-9, -net);

    let daysToFund;
    if (reached)                     daysToFund = 0;
    else if (daily > 0)              daysToFund = gap / daily;
    else                             daysToFund = Infinity;

    const coverage = S.retainer > 0 ? monthlyIncome / S.retainer : 0;
    const fundPct  = S.fundTarget > 0 ? Math.min(100, (S.savings / S.fundTarget) * 100) : 0;

    return {
      grossMonthly, monthlyIncome, net, daily, gap, reached,
      runwayMonths, daysToFund, coverage, fundPct,
    };
  }

  /* ------------------------------------------------------------------ *
   *  Render — inputs (called on boot, currency toggle, rate change)
   * ------------------------------------------------------------------ */
  function renderInputs() {
    document.querySelectorAll('[data-sym]').forEach((n) => (n.textContent = SYM()));
    document.querySelectorAll('[data-cur-label]').forEach((n) => (n.textContent = S.currency));

    el.hourly.value = round(toDisp(S.hourly), isZAR() ? 0 : 2);
    el.burn.value   = round(toDisp(S.burn), 0);
    el.savings.value = round(toDisp(S.savings), 0);
    el.fundTarget.value = round(toDisp(S.fundTarget), 0);

    el.hours.value = S.hours;
    el.hoursOut.textContent = S.hours + ' h';
    paintRange(el.hours);

    el.commission.value = commissionPct();
    el.commissionOut.textContent = commissionPct() + '%';
    paintRange(el.commission);

    // Retainer slider range is anchored to the $2k–$5k retainer ladder.
    const rMin = isZAR() ? 2000 * S.rate : 2000;
    const rMax = isZAR() ? 5000 * S.rate : 5000;

    el.retainer.min  = rMin;
    el.retainer.max  = rMax;
    el.retainer.step = isZAR() ? 250 : 25;
    el.retainer.value = toDisp(S.retainer);

    el.retainerNum.value = Math.round(toDisp(S.retainer));
    el.retainerHint.textContent =
      money(2000 * S.rate, 0) + ' – ' + money(5000 * S.rate, 0) + ' per month';

    paintRange(el.retainer);
  }

  /* ------------------------------------------------------------------ *
   *  Render — outputs (called on every change)
   * ------------------------------------------------------------------ */
  function render() {
    const c = calc();

    /* ---- Runway ---- */
    if (c.net >= 0) {
      el.runway.textContent = '∞';
      el.runwayUnit.textContent = 'months of runway';
      el.runwayNote.textContent =
        'Net tutoring income already outruns your burn. Every extra billable hour is pure surplus — the fund is compounding.';
      setBadge('Sustainable');
    } else {
      const m = c.runwayMonths;
      el.runway.textContent = m >= 24 ? num(Math.round(m)) : m.toFixed(1);
      el.runwayUnit.textContent = 'months of runway';
      el.runwayNote.textContent =
        'At ' + money(S.burn) + '/month burn, savings run dry around ' +
        dateFromDays(m * 30.4375) + '.';
      if (m < 3)       setBadge('Critical');
      else if (m < 6)  setBadge('Tight');
      else             setBadge('Stable');
    }

    /* ---- Daily velocity ---- */
    const positive = c.daily >= 0;
    el.velocity.textContent =
      (positive ? '+' : '−') + money(Math.abs(c.daily), 0);
    el.velocity.className =
      'mt-3 font-mono text-2xl font-semibold tnum ' +
      (positive ? 'text-white' : 'text-red-500');
    el.velocityNote.textContent = positive
      ? 'Banked per day after commission and living costs.'
      : 'Bleeding per day against your buffer.';

    /* ---- Days to fund ---- */
    if (c.reached) {
      el.daysToFund.textContent = '0';
      el.daysToFund.className = 'mt-3 font-mono text-2xl font-semibold text-red-500 tnum';
      el.daysNote.textContent = 'Fund target already met — redirect surplus to the next milestone.';
    } else if (!isFinite(c.daysToFund)) {
      el.daysToFund.textContent = '—';
      el.daysToFund.className = 'mt-3 font-mono text-2xl font-semibold text-zinc-500 tnum';
      el.daysNote.textContent = 'No positive velocity — the fund is not advancing.';
    } else {
      const d = Math.round(c.daysToFund);
      el.daysToFund.textContent = num(d);
      el.daysToFund.className = 'mt-3 font-mono text-2xl font-semibold text-white tnum';
      el.daysNote.textContent =
        '≈ ' + (d / 365).toFixed(1) + ' years · target ' + dateFromDays(c.daysToFund);
    }

    /* ---- Monthly surplus ---- */
    el.surplus.textContent =
      (c.net >= 0 ? '+' : '−') + money(Math.abs(c.net), 0);
    el.surplus.className =
      'mt-3 font-mono text-2xl font-semibold tnum ' +
      (c.net >= 0 ? 'text-white' : 'text-red-500');
    el.surplusNote.textContent =
      money(c.grossMonthly) + ' gross → ' + money(c.monthlyIncome) +
      ' net · ' + money(S.burn) + ' burn.';

    /* ---- Fund progress ---- */
    el.fundPct.textContent = c.fundPct.toFixed(1) + '%';
    el.fundBar.style.width = c.fundPct + '%';
    el.fundCurrent.textContent = money(S.savings);
    el.fundTargetOut.textContent = money(S.fundTarget);
    el.fundEta.textContent = c.reached
      ? 'Target reached'
      : isFinite(c.daysToFund) && c.daysToFund > 0
        ? 'ETA ' + dateFromDays(c.daysToFund)
        : 'No ETA at current velocity';

    /* ---- Retainer coverage ---- */
    const pct = Math.min(100, c.coverage * 100);
    el.coverage.textContent = Math.round(c.coverage * 100) + '%';
    el.coverageBar.style.width = pct + '%';
    el.coverageNote.textContent = c.coverage >= 1
      ? money(c.monthlyIncome) + '/mo net already clears the ' + money(S.retainer) +
        '/mo retainer target. Convert tutoring hours into recurring work to lock it in.'
      : money(c.monthlyIncome) + '/mo net earned against a ' + money(S.retainer) +
        '/mo retainer target — ' + money(S.retainer - c.monthlyIncome) +
        ' still to convert into recurring work.';
  }

  /* ------------------------------------------------------------------ *
   *  Currency UI
   * ------------------------------------------------------------------ */
  function updateCurrencyUI() {
    el.curBtns.forEach((b) => {
      b.className = b.dataset.cur === S.currency ? BTN_ON : BTN_OFF;
    });
  }

  /* ------------------------------------------------------------------ *
   *  Wiring
   * ------------------------------------------------------------------ */
  el.curBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.cur;
      if (next === S.currency) return;
      S.currency = next;
      updateCurrencyUI();
      renderInputs();
      render();
    });
  });

  el.rate.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.rate = isFinite(v) && v > 0 ? v : 1;
    renderInputs();
    render();
  });

  el.hourly.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.hourly = toZar(isFinite(v) && v > 0 ? v : 0);
    render();
  });

  el.hours.addEventListener('input', (e) => {
    S.hours = parseFloat(e.target.value) || 0;
    el.hoursOut.textContent = S.hours + ' h';
    paintRange(el.hours);
    render();
  });

  el.commission.addEventListener('input', (e) => {
    S.commission = (parseFloat(e.target.value) || 0) / 100;
    el.commissionOut.textContent = commissionPct() + '%';
    paintRange(el.commission);
    render();
  });

  el.retainer.addEventListener('input', (e) => {
    S.retainer = toZar(parseFloat(e.target.value) || 0);
    el.retainerNum.value = Math.round(toDisp(S.retainer));
    paintRange(el.retainer);
    render();
  });

  el.retainerNum.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.retainer = toZar(isFinite(v) && v > 0 ? v : 0);
    el.retainer.value = toDisp(S.retainer);
    paintRange(el.retainer);
    render();
  });

  el.burn.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.burn = toZar(isFinite(v) && v > 0 ? v : 0);
    render();
  });

  el.savings.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.savings = toZar(isFinite(v) && v > 0 ? v : 0);
    render();
  });

  el.fundTarget.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    S.fundTarget = toZar(isFinite(v) && v > 0 ? v : 0);
    render();
  });

  el.reset.addEventListener('click', () => {
    S = { ...DEFAULTS };
    el.rate.value = S.rate;
    updateCurrencyUI();
    renderInputs();
    render();
  });

  // Select-on-focus for number fields — makes overwriting painless.
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener('focus', () => input.select());
  });

  /* ------------------------------------------------------------------ *
   *  Boot
   * ------------------------------------------------------------------ */
  el.rate.value = S.rate;
  updateCurrencyUI();
  renderInputs();
  render();
})();