/* Force USA Dealer Zone — application.
 *
 * Vanilla JS, no build step, no modules: the site runs from a static host or
 * straight off the filesystem. `DZ` (data.js) supplies the seed content.
 */
(function (global, DZ) {
  'use strict';

  if (!DZ) throw new Error('data.js must load before app.js');

  /* ================================================================= utils == */

  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escape anything interpolated into HTML. Admin-editable fields land in the
   *  DOM, so this is the difference between an editable profile and an XSS. */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  function attr(value) { return esc(value); }

  var MONEY = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });

  function money(n) {
    var num = Number(n);
    return isFinite(num) ? MONEY.format(num) : '—';
  }

  function compactMoney(n) {
    var num = Number(n) || 0;
    if (num === 0) return '—';
    if (Math.abs(num) >= 1000) return '$' + Math.round(num / 1000) + 'k';
    return '$' + num;
  }

  var MONTH_INDEX = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  /** Parse the date formats a human might type into an admin field:
   *  "2026-07-01", "1 Jul 2026", "July 2026", "March 2019".
   *  The mockup leaned on `new Date(str)`, which is engine-dependent for all
   *  but the ISO form and silently produced Invalid Date elsewhere. */
  function parseLooseDate(input) {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

    var s = String(input).trim();

    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) {
      var d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
      return isNaN(d.getTime()) ? null : d;
    }

    var named = s.toLowerCase().match(/^(?:(\d{1,2})\s+)?([a-z]{3,9})\.?,?\s*(?:(\d{1,2})[a-z]*,?\s*)?(\d{4})$/);
    if (named) {
      var month = MONTH_INDEX[named[2].slice(0, 3)];
      if (month !== undefined) {
        var day = named[1] ? +named[1] : (named[3] ? +named[3] : 1);
        return new Date(+named[4], month, day);
      }
    }

    var fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  function isoToday() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function pretty(iso) {
    var d = parseLooseDate(iso);
    if (!d) return String(iso || '—');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function monthKey(iso) { return String(iso || '').slice(0, 7); }

  function daysBetween(fromIso, to) {
    var a = parseLooseDate(fromIso);
    if (!a) return null;
    return Math.max(0, Math.round((to - a) / 86400000));
  }

  function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ================================================================= store == */

  var STORAGE_KEY = 'dealer-zone/v1';

  function normaliseOrder(raw) {
    return {
      id: raw.id || uid(),
      ref: String(raw.ref || '').trim(),
      date: String(raw.date || '').trim(),
      sku: String(raw.sku || '').trim(),
      qty: Number(raw.qty) || 0,
      value: Number(raw.value) || 0
    };
  }

  function seed() {
    return {
      profile: Object.assign({}, DZ.seedState.profile),
      orders: DZ.seedState.orders.map(normaliseOrder)
    };
  }

  /** localStorage throws in private-mode Safari and when site data is blocked,
   *  so every access is guarded and the app falls back to in-memory state. */
  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return seed();
      return {
        profile: Object.assign({}, DZ.seedState.profile, parsed.profile || {}),
        orders: Array.isArray(parsed.orders) && parsed.orders.length
          ? parsed.orders.map(normaliseOrder)
          : seed().orders
      };
    } catch (err) {
      console.warn('[dealer-zone] could not read saved state:', err);
      return seed();
    }
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        profile: state.profile,
        orders: state.orders
      }));
    } catch (err) {
      // Quota or blocked storage — the session still works, it just won't persist.
      console.warn('[dealer-zone] could not save state:', err);
    }
  }

  var persisted = load();

  var state = {
    view: 'dashboard',
    product: 'C20',
    query: '',
    adminAuthed: false,
    login: { user: '', pass: '', error: '' },
    newOrder: { ref: '', date: '', sku: 'C20', qty: '', value: '' },
    orderError: '',
    navOpen: false,
    profile: persisted.profile,
    orders: persisted.orders
  };

  /* =============================================================== derived == */

  var SKU_COLORS = ['#00AC75', '#008BCE', '#185787', '#A5AEB7', '#425660'];

  function derive() {
    var today = new Date();
    var orders = state.orders.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    var last = orders[0] || null;

    var fyStart = parseLooseDate(state.profile.fyStart);
    var fyOrders = fyStart
      ? orders.filter(function (o) {
          var d = parseLooseDate(o.date);
          return d && d >= fyStart;
        })
      : orders;

    var bySku = {};
    fyOrders.forEach(function (o) {
      var key = o.sku || '—';
      bySku[key] = (bySku[key] || 0) + o.qty;
    });

    var skuKeys = Object.keys(bySku).sort(function (a, b) { return bySku[b] - bySku[a]; });
    var topSku = skuKeys[0] || null;
    var totalUnits = fyOrders.reduce(function (t, o) { return t + o.qty; }, 0);
    var totalValue = fyOrders.reduce(function (t, o) { return t + o.value; }, 0);

    // Donut segments as conic-gradient stops.
    var sweep = 0;
    var stops = skuKeys.map(function (key, i) {
      var share = totalUnits ? (bySku[key] / totalUnits) * 100 : 0;
      var stop = SKU_COLORS[i % SKU_COLORS.length] + ' ' + sweep.toFixed(2) + '% ' + (sweep + share).toFixed(2) + '%';
      sweep += share;
      return stop;
    });

    var breakdown = skuKeys.map(function (key, i) {
      return {
        sku: key,
        units: bySku[key],
        share: totalUnits ? Math.round((bySku[key] / totalUnits) * 100) + '%' : '0%',
        color: SKU_COLORS[i % SKU_COLORS.length]
      };
    });

    // Six-month window anchored on the later of "this month" and the most
    // recent order, so the chart never renders empty just because the demo
    // data sits in the past (or the future).
    var anchor = new Date(today.getFullYear(), today.getMonth(), 1);
    if (last) {
      var lastDate = parseLooseDate(last.date);
      if (lastDate) {
        var lastMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
        if (lastMonth > anchor) anchor = lastMonth;
      }
    }

    var months = [];
    for (var i = 5; i >= 0; i--) {
      var m = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      months.push({
        key: m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'),
        label: m.toLocaleDateString('en-US', { month: 'short' })
      });
    }

    var monthTotals = months.map(function (m) {
      var rows = orders.filter(function (o) { return monthKey(o.date) === m.key; });
      return {
        key: m.key,
        label: m.label,
        value: rows.reduce(function (t, o) { return t + o.value; }, 0),
        units: rows.reduce(function (t, o) { return t + o.qty; }, 0)
      };
    });

    var peak = monthTotals.reduce(function (max, m) { return Math.max(max, m.value); }, 0);
    var scale = peak || 1;

    var ticks = [1, 0.75, 0.5, 0.25, 0].map(function (f) {
      return peak ? compactMoney(Math.round(peak * f)) : (f === 0 ? '$0' : '');
    });

    var bars = monthTotals.map(function (m) {
      return {
        label: m.label,
        amount: compactMoney(m.value),
        units: m.units,
        height: m.value ? Math.max(2, Math.round((m.value / scale) * 100)) : 0,
        isMax: peak > 0 && m.value === peak
      };
    });

    var guideTotal = DZ.catalogue.reduce(function (t, p) { return t + p.guideCount; }, 0);
    var newAssets = DZ.assetPacks.filter(function (a) { return a.badge === 'New'; }).length;

    return {
      today: today,
      orders: orders,
      last: last,
      daysSinceLast: last ? daysBetween(last.date, today) : null,
      fyOrders: fyOrders,
      fyStartValid: !!fyStart,
      topSku: topSku,
      topSkuUnits: topSku ? bySku[topSku] : 0,
      topSkuShare: totalUnits && topSku ? Math.round((bySku[topSku] / totalUnits) * 100) + '%' : '—',
      totalUnits: totalUnits,
      totalValue: totalValue,
      donutGradient: stops.length ? stops.join(',') : 'var(--line-soft) 0% 100%',
      breakdown: breakdown,
      bars: bars,
      ticks: ticks,
      guideTotal: guideTotal,
      newAssets: newAssets,
      launchCount: DZ.launches.length
    };
  }

  function currentProduct() {
    var found = DZ.catalogue.filter(function (p) { return p.name === state.product; })[0];
    return found || DZ.catalogue[0];
  }

  /* ================================================================ search == */

  function searchAll(q) {
    var needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    var hits = [];

    DZ.catalogue.forEach(function (p) {
      if ((p.name + ' ' + p.line).toLowerCase().indexOf(needle) > -1) {
        hits.push({
          kind: 'Product', title: p.name, detail: p.line,
          href: '#/support/' + encodeURIComponent(p.name)
        });
      }
    });

    Object.keys(DZ.guidesByProduct).forEach(function (name) {
      DZ.guidesByProduct[name].forEach(function (g) {
        var hay = (g.title + ' ' + g.category + ' ' + g.parts + ' ' + g.steps.join(' ')).toLowerCase();
        if (hay.indexOf(needle) > -1) {
          hits.push({
            kind: name + ' guide', title: g.title, detail: g.category + ' · ' + g.time,
            href: '#/support/' + encodeURIComponent(name)
          });
        }
      });
    });

    DZ.assetPacks.forEach(function (a) {
      if ((a.title + ' ' + a.type + ' ' + a.detail).toLowerCase().indexOf(needle) > -1) {
        hits.push({ kind: 'Asset', title: a.title, detail: a.type + ' · ' + a.format, href: '#/assets' });
      }
    });

    DZ.subDealerResources.forEach(function (r) {
      if ((r.title + ' ' + r.detail).toLowerCase().indexOf(needle) > -1) {
        hits.push({ kind: 'Sub-dealer', title: r.title, detail: r.detail, href: '#/sub-dealers' });
      }
    });

    if ('warranty claim submit'.indexOf(needle) > -1 || needle.indexOf('claim') > -1) {
      hits.push({ kind: 'Action', title: 'Submit a warranty claim', detail: 'Opens the claim form', href: '#/claim' });
    }

    return hits.slice(0, 40);
  }

  /* ================================================================= views == */

  var NAV = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Troubleshooting & support', view: 'support' },
    { label: 'Submit a claim', view: 'claim' },
    { label: 'Assets & launches', view: 'assets' },
    { label: 'Sell & install sheets', view: 'sheets' },
    { label: 'Sub-dealer resources', view: 'sub-dealers' },
    { label: 'Account', view: 'account' },
    { label: 'Admin', view: 'admin' }
  ];

  var TITLES = {
    dashboard: 'Dashboard',
    support: 'Troubleshooting & support',
    claim: 'Submit a warranty claim',
    assets: 'Assets & launches',
    sheets: 'Sell & install sheets',
    'sub-dealers': 'Sub-dealer resources',
    account: 'Account',
    admin: 'Admin',
    search: 'Search'
  };

  function renderNav() {
    return NAV.map(function (item) {
      var active = item.view === state.view;
      return '<a class="navlink' + (active ? ' is-active' : '') + '" href="#/' + item.view + '"' +
        (active ? ' aria-current="page"' : '') + '>' + esc(item.label) + '</a>';
    }).join('');
  }

  /* ---------------------------------------------------------------- dashboard */

  function viewDashboard(d) {
    var stats = [
      { label: 'Products on your account', value: String(DZ.catalogue.length) },
      { label: 'Troubleshooting guides', value: String(d.guideTotal) },
      { label: 'New assets', value: String(d.newAssets) },
      { label: 'Launching soon', value: String(d.launchCount) }
    ];

    return '' +
      '<div class="page-head">' +
        '<div>' +
          '<h1>Welcome back, ' + esc(state.profile.company) + '</h1>' +
          '<p class="lede" style="margin-top:8px">Here\'s what needs you today. ' +
            esc(state.profile.tier) + ' · ' + esc(state.profile.territory) + '</p>' +
        '</div>' +
        '<a class="btn btn--primary" href="#/claim">Submit a warranty claim</a>' +
      '</div>' +

      '<div class="grid grid--stats" style="margin-bottom:36px">' +
        stats.map(function (s) {
          return '<div class="stat"><div class="label">' + esc(s.label) + '</div>' +
            '<div class="stat__value">' + esc(s.value) + '</div></div>';
        }).join('') +
      '</div>' +

      '<div class="section-head">' +
        '<h2>Your products</h2>' +
        '<span class="muted" style="font-size:13.5px">Select a product for its troubleshooting guides</span>' +
      '</div>' +

      '<div class="grid grid--cards" style="margin-bottom:40px">' +
        DZ.catalogue.map(function (p) {
          return '<a class="product" href="#/support/' + encodeURIComponent(p.name) + '">' +
            '<span class="product__media">' +
              '<img src="' + attr(p.image) + '" alt="' + attr(p.name + ' — ' + p.line) + '" loading="lazy" width="400" height="300">' +
            '</span>' +
            '<span class="product__body">' +
              '<span class="product__name">' + esc(p.name) + '</span>' +
              '<span class="product__line">' + esc(p.line) + '</span>' +
              '<span class="product__cta">' + p.guideCount + ' troubleshooting guides &rarr;</span>' +
            '</span>' +
          '</a>';
        }).join('') +
      '</div>' +

      '<div class="grid grid--wide">' +
        '<div class="card">' +
          '<h3 style="margin-bottom:16px">Fix it fast</h3>' +
          '<p class="muted" style="font-size:14px;margin-bottom:16px">Most issues resolve without a claim. Start with the guide for the product in question.</p>' +
          '<div class="stack" style="gap:8px">' +
            DZ.catalogue.map(function (p) {
              return '<a class="navlink" style="border:1px solid var(--line);border-left-width:1px;padding:11px 14px;font-size:13.5px;color:var(--ink)" href="#/support/' + encodeURIComponent(p.name) + '">' +
                esc(p.name) + ' — all troubleshooting guides</a>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<h3 style="margin-bottom:16px">Latest order</h3>' +
          (d.last
            ? '<div class="stack" style="gap:8px">' +
                '<div class="kv"><span>' + esc(d.last.ref) + '</span><span class="muted">' + esc(pretty(d.last.date)) + '</span></div>' +
                '<div class="kv"><span>' + esc(d.last.sku) + '</span><span class="muted">' + d.last.qty + ' units</span></div>' +
                '<div class="kv" style="border-bottom:0"><span>Value</span><span class="muted">' + esc(money(d.last.value)) + '</span></div>' +
                '<p class="dim" style="font-size:12.5px;margin-top:6px">' +
                  (d.daysSinceLast === null ? '' : d.daysSinceLast + ' days ago') + '</p>' +
                '<a class="btn btn--outline" style="justify-self:start" href="#/account">View order history</a>' +
              '</div>'
            : '<p class="muted" style="font-size:14px">No orders on file yet.</p>') +
        '</div>' +

        '<div class="card">' +
          '<h3 style="margin-bottom:16px">Launching soon</h3>' +
          '<div class="stack" style="gap:12px">' +
            DZ.launches.map(function (l) {
              return '<div class="kv"><span>' + esc(l.name) + '</span>' +
                '<span class="muted" style="font-size:12.5px">' + esc(l.window) + '</span></div>';
            }).join('') +
            '<a class="btn btn--outline" style="justify-self:start" href="#/assets">See the launch calendar</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ support */

  function viewSupport() {
    var product = currentProduct();
    var guides = DZ.guidesByProduct[product.name] || [];

    return '' +
      '<div style="margin-bottom:26px">' +
        '<div class="eyebrow">Troubleshooting &amp; support</div>' +
        '<h1>Fix it fast</h1>' +
        '<p class="lede" style="margin-top:10px">Start here before you claim. Pick one of your products for its guides, ' +
          'parts diagrams and manuals. If it can\'t be fixed on site, file the claim in one click.</p>' +
      '</div>' +

      '<div class="chips" role="tablist" aria-label="Choose a product">' +
        DZ.catalogue.map(function (p) {
          var active = p.name === product.name;
          return '<button type="button" role="tab" class="chip' + (active ? ' is-active' : '') + '"' +
            ' aria-selected="' + active + '" data-action="select-product" data-product="' + attr(p.name) + '">' +
            esc(p.name) + '</button>';
        }).join('') +
      '</div>' +

      '<div class="grid grid--guides">' +
        '<div class="product-bar spanner">' +
          '<div>' +
            '<div class="product-bar__name">' + esc(product.name) + '</div>' +
            '<div class="product-bar__meta">' + esc(product.line) + ' · Warranty: ' + esc(product.warranty) + '</div>' +
          '</div>' +
          '<div class="product-bar__links">' +
            '<a href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">Manual (PDF)</a>' +
            '<a href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">Parts diagram</a>' +
          '</div>' +
        '</div>' +

        (guides.length
          ? guides.map(function (g) {
              return '<article class="guide">' +
                '<div class="guide__meta"><span>' + esc(g.category) + '</span>' +
                  '<span class="guide__time">' + esc(g.time) + '</span></div>' +
                '<h3 class="guide__title">' + esc(g.title) + '</h3>' +
                '<ol>' + g.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
                '<div class="guide__parts">Parts often needed: ' + esc(g.parts) + '</div>' +
              '</article>';
            }).join('')
          : '<div class="empty spanner">No guides published for this product yet.</div>') +

        '<div class="callout spanner">' +
          '<div>' +
            '<div class="callout__title">Still stuck on the ' + esc(product.name) + '?</div>' +
            '<div class="callout__sub">File the claim and our team picks it up straight away.</div>' +
          '</div>' +
          '<a class="btn btn--primary" href="#/claim">Submit a warranty claim</a>' +
        '</div>' +
      '</div>';
  }

  /* -------------------------------------------------------------------- claim */

  function viewClaim() {
    return '' +
      '<a class="btn-link" href="#/support">&larr; Back to troubleshooting</a>' +
      '<h1>Submit a warranty claim</h1>' +
      '<p class="lede" style="margin:10px 0 26px">Tell us what broke. We\'ll take it from there. Submissions land with ' +
        'our warranty team instantly — you\'ll get a claim reference by email.</p>' +

      '<div class="claim-layout">' +
        '<div class="claim-layout__form">' +
          '<div class="notice" role="status" data-embed-fallback hidden>' +
            'The claim form isn\'t loading in this browser — it\'s usually a privacy extension blocking the embed. ' +
            '<a href="' + attr(DZ.links.claimForm) + '" target="_blank" rel="noopener" style="color:#fff;font-weight:700">' +
            'Open the form in a new tab</a>.' +
          '</div>' +
          '<div class="embed-frame embed-frame--tall" data-embed-watch>' +
            '<iframe src="' + attr(DZ.links.claimFormEmbed) + '" title="Force USA warranty claim form" ' +
              'referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '</div>' +
        '</div>' +

        '<div class="claim-layout__side">' +
          '<div class="card">' +
            '<h3 style="margin-bottom:12px">Before you submit</h3>' +
            '<ul class="checklist">' +
              '<li>Have the serial number ready — it\'s on the frame decal.</li>' +
              '<li>Photos of the fault save a round of questions.</li>' +
              '<li>Include the invoice number if the unit is close to end of warranty.</li>' +
              '<li>One claim per unit, even if several parts are affected.</li>' +
            '</ul>' +
          '</div>' +

          '<div class="card">' +
            '<h3 style="margin-bottom:12px">Your products</h3>' +
            '<div class="stack" style="gap:7px;font-size:14px">' +
              DZ.catalogue.map(function (p) {
                return '<div class="kv"><span>' + esc(p.name) + '</span>' +
                  '<span class="muted" style="font-size:12.5px">' + esc(p.warranty) + '</span></div>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<h3 style="margin-bottom:10px">Form not loading?</h3>' +
            '<p class="muted" style="font-size:14px;margin-bottom:12px">Some browsers and privacy extensions block ' +
              'embedded forms. Open it in a new tab instead.</p>' +
            '<a class="btn btn--outline" href="' + attr(DZ.links.claimForm) + '" target="_blank" rel="noopener">Open claim form</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------- assets */

  function viewAssets() {
    var today = new Date();

    return '' +
      '<div class="eyebrow">Marketing &amp; launches</div>' +
      '<h1>Assets &amp; launches</h1>' +
      '<p class="lede" style="margin:10px 0 28px">Every image, film and template cleared for dealer use, plus what\'s ' +
        'coming down the line. Assets drop 30 days before ship date — list early and you take the first wave of demand.</p>' +

      '<h2 style="margin-bottom:16px">Launch calendar</h2>' +
      '<div class="timeline" style="margin-bottom:40px">' +
        DZ.launches.map(function (l) {
          var ship = parseLooseDate(l.ship);
          var away = ship ? Math.round((ship - today) / 86400000) : null;
          return '<article class="launch">' +
            '<div class="launch__head">' +
              '<div>' +
                '<div class="launch__name">' + esc(l.name) + '</div>' +
                '<div class="launch__when">' + esc(l.window) + ' · ships ' + esc(pretty(l.ship)) +
                  (away !== null && away > 0 ? ' · ' + away + ' days away' : '') + '</div>' +
              '</div>' +
              '<span class="badge badge--info">' + esc(l.status) + '</span>' +
            '</div>' +
            '<p class="muted" style="font-size:14px">' + esc(l.detail) + '</p>' +
            '<div class="meter"><div class="meter__fill meter__fill--info" style="width:' + l.progress + '%"></div></div>' +
            '<div class="play__foot"><span>Readiness</span><span>' + l.progress + '%</span></div>' +
          '</article>';
        }).join('') +
      '</div>' +

      '<div class="section-head">' +
        '<h2>Asset library</h2>' +
        '<span class="muted" style="font-size:13.5px">' + DZ.assetPacks.length + ' packs · newest first</span>' +
      '</div>' +
      '<div class="grid grid--wide" style="margin-bottom:24px">' +
        DZ.assetPacks.map(function (a) {
          return '<article class="asset">' +
            '<div class="asset__head">' +
              '<h3 class="asset__title">' + esc(a.title) + '</h3>' +
              (a.badge ? '<span class="badge badge--solid">' + esc(a.badge) + '</span>' : '') +
            '</div>' +
            '<div class="asset__meta"><span>' + esc(a.type) + '</span><span>' + esc(a.format) + '</span></div>' +
            '<p class="muted" style="font-size:13.5px">' + esc(a.detail) + '</p>' +
            '<div class="play__foot" style="margin-top:4px">' +
              '<span>Updated ' + esc(pretty(a.updated)) + '</span>' +
              '<a href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener" style="font-weight:700">Download</a>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>' +

      '<div class="callout">' +
        '<div>' +
          '<div class="callout__title">Need something that isn\'t here?</div>' +
          '<div class="callout__sub">Ask your Force USA rep — custom co-branded assets turn around in about five working days.</div>' +
        '</div>' +
        '<a class="btn btn--primary" href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">Open the asset library</a>' +
      '</div>';
  }

  /* ------------------------------------------------------------------- sheets */

  function viewSheets() {
    return '' +
      '<div class="eyebrow">Document library</div>' +
      '<h1>Sell &amp; install sheets</h1>' +
      '<p class="lede" style="margin:10px 0 24px">Sell sheets, comparison charts and install guides for every unit you ' +
        'carry — served live from the Force USA library, so what you download is always the current version.</p>' +

      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;align-items:center">' +
        '<a class="btn btn--primary" href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">Open the full library</a>' +
        '<span class="muted" style="font-size:13.5px">Browse below, or open in Drive to download whole folders as a zip.</span>' +
      '</div>' +

      '<div class="notice" role="status" data-embed-fallback hidden style="margin-bottom:12px">' +
        'The Drive preview isn\'t loading here. ' +
        '<a href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener" style="color:#fff;font-weight:700">' +
        'Open the library in a new tab</a>.' +
      '</div>' +
      '<div class="embed-frame embed-frame--drive" data-embed-watch>' +
        '<iframe src="' + attr(DZ.links.driveEmbed) + '" title="Force USA sell and install sheets"></iframe>' +
      '</div>' +
      '<p class="dim" style="font-size:12.5px;margin-top:12px">If the browser blocks the embed, use ' +
        '<a href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">Open the full library</a>. ' +
        'Swap in the production Drive folder and share it to the portal service account before launch.</p>';
  }

  /* -------------------------------------------------------------- sub-dealers */

  function viewSubDealers() {
    var active = DZ.subDealers.filter(function (s) { return s.status === 'Active'; }).length;
    var units = DZ.subDealers.reduce(function (t, s) { return t + s.units; }, 0);

    return '' +
      '<div class="eyebrow">Network</div>' +
      '<h1>Sub-dealer resources</h1>' +
      '<p class="lede" style="margin:10px 0 28px">Everything you need to bring a sub-dealer on, price them correctly ' +
        'and keep them selling. Your network sits under your account — their volume counts toward your tier.</p>' +

      '<div class="grid grid--stats" style="margin-bottom:36px">' +
        '<div class="stat"><div class="label">Sub-dealers</div><div class="stat__value">' + DZ.subDealers.length + '</div></div>' +
        '<div class="stat"><div class="label">Active</div><div class="stat__value">' + active + '</div></div>' +
        '<div class="stat"><div class="label">Onboarding</div><div class="stat__value">' + (DZ.subDealers.length - active) + '</div></div>' +
        '<div class="stat"><div class="label">Network units</div><div class="stat__value">' + units + '</div></div>' +
      '</div>' +

      '<h2 style="margin-bottom:16px">Resources</h2>' +
      '<div class="grid grid--wide" style="margin-bottom:40px">' +
        DZ.subDealerResources.map(function (r) {
          return '<article class="card stack">' +
            '<h3 style="font-size:16px">' + esc(r.title) + '</h3>' +
            '<p class="muted" style="font-size:13.5px">' + esc(r.detail) + '</p>' +
            '<a class="btn btn--outline" style="justify-self:start;margin-top:4px" href="' + attr(DZ.links.drive) + '" target="_blank" rel="noopener">' +
              esc(r.action) + '</a>' +
          '</article>';
        }).join('') +
      '</div>' +

      '<h2 style="margin-bottom:16px">Your network</h2>' +
      '<div class="table-wrap">' +
        '<table class="data"><caption class="visually-hidden">Sub-dealers trading under your account</caption>' +
          '<thead><tr><th scope="col">Sub-dealer</th><th scope="col">Location</th>' +
            '<th scope="col">Partner since</th><th scope="col">Units FY</th><th scope="col">Status</th></tr></thead>' +
          '<tbody>' +
            DZ.subDealers.map(function (s) {
              return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.city) + '</td>' +
                '<td>' + esc(s.since) + '</td><td class="num">' + s.units + '</td>' +
                '<td><span class="badge ' + (s.status === 'Active' ? 'badge--good' : 'badge--info') + '">' +
                  esc(s.status) + '</span></td></tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ account */

  function viewAccount(d) {
    var p = state.profile;

    var stats = [
      d.last
        ? { label: 'Most recent order', value: pretty(d.last.date),
            sub: d.last.ref + ' · ' + money(d.last.value) +
              (d.daysSinceLast === null ? '' : ' · ' + d.daysSinceLast + ' days ago') }
        : { label: 'Most recent order', value: '—', sub: 'No orders on file' },
      { label: 'Orders this FY', value: String(d.fyOrders.length),
        sub: d.fyStartValid ? 'Since ' + p.fyStart : 'Financial year start not recognised' },
      { label: 'Most purchased SKU', value: d.topSku || '—',
        sub: d.topSku ? d.topSkuUnits + ' units this FY' : 'Nothing recorded this FY' },
      { label: 'FY units / value', value: String(d.totalUnits),
        sub: money(d.totalValue) + ' across all lines' }
    ];

    var hasChart = d.bars.some(function (b) { return b.height > 0; });

    return '' +
      '<div class="eyebrow">Account</div>' +
      '<h1>' + esc(p.company) + '</h1>' +
      '<p class="lede" style="margin:10px 0 28px">' + esc(p.role) + ' · ' + esc(p.tier) + ' · ' + esc(p.territory) +
        ' · Account ' + esc(p.accountNo) + '</p>' +

      '<div class="grid grid--stats" style="margin-bottom:32px">' +
        stats.map(function (s) {
          var long = String(s.value).length > 9 ? ' stat__value--long' : '';
          return '<div class="stat stat--topline"><div class="label">' + esc(s.label) + '</div>' +
            '<div class="stat__value' + long + '">' + esc(s.value) + '</div>' +
            '<div class="stat__sub">' + esc(s.sub) + '</div></div>';
        }).join('') +
      '</div>' +

      '<div class="split" style="margin-bottom:16px">' +
        '<div class="split__main card">' +
          '<div class="section-head" style="margin-bottom:20px">' +
            '<h3>Order value by month</h3><span class="muted" style="font-size:13px">Last six months</span>' +
          '</div>' +
          (hasChart
            ? '<div class="chart">' +
                '<div class="chart__ticks" aria-hidden="true">' +
                  d.ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') +
                '</div>' +
                '<div class="chart__plot" role="img" aria-label="' +
                  attr('Order value by month: ' + d.bars.map(function (b) {
                    return b.label + ' ' + b.amount;
                  }).join(', ')) + '">' +
                  d.bars.map(function (b) {
                    return '<div class="chart__col"><div class="chart__bar' + (b.isMax ? ' is-max' : '') +
                      '" style="height:' + b.height + '%"></div></div>';
                  }).join('') +
                '</div>' +
                '<span></span>' +
                '<div class="chart__labels">' +
                  d.bars.map(function (b) {
                    return '<div class="chart__label"><span class="chart__amount">' + esc(b.amount) + '</span>' +
                      '<span class="chart__month">' + esc(b.label) + '</span></div>';
                  }).join('') +
                '</div>' +
              '</div>'
            : '<p class="muted" style="font-size:14px">No orders in the last six months.</p>') +
        '</div>' +

        '<div class="split__side card stack" style="gap:18px">' +
          '<div>' +
            '<h3 style="margin-bottom:4px">Unit mix this FY</h3>' +
            '<p class="muted" style="font-size:13px">Since ' + esc(p.fyStart) + '</p>' +
          '</div>' +
          '<div class="donut" style="background:conic-gradient(' + d.donutGradient + ')">' +
            '<div class="donut__hole">' +
              '<div>' +
                '<div class="donut__value">' + esc(d.topSkuShare) + '</div>' +
                '<div class="donut__label">' + esc(d.topSku ? d.topSku + ' share' : 'No data') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (d.breakdown.length
            ? '<div class="legend">' +
                d.breakdown.map(function (b) {
                  return '<div class="legend__row">' +
                    '<span class="legend__swatch" style="background:' + attr(b.color) + '"></span>' +
                    '<span class="legend__name">' + esc(b.sku) + '</span>' +
                    '<span class="muted">' + b.units + ' · ' + esc(b.share) + '</span></div>';
                }).join('') +
              '</div>'
            : '<p class="muted" style="font-size:13.5px">No orders in this financial year.</p>') +
        '</div>' +
      '</div>' +

      '<div class="card" style="margin-bottom:32px">' +
        '<div class="section-head" style="margin-bottom:6px">' +
          '<h3>Current strategy to improve sales</h3>' +
          '<span class="muted" style="font-size:13px">Agreed with your Force USA rep · reviewed quarterly</span>' +
        '</div>' +
        '<p class="muted" style="font-size:14px;max-width:66ch;margin-bottom:20px">Four plays running this quarter. ' +
          'Progress updates as orders and install data come through.</p>' +
        '<div class="grid grid--wide">' +
          DZ.strategies.map(function (s) {
            return '<article class="play">' +
              '<div class="play__head">' +
                '<h4>' + esc(s.title) + '</h4>' +
                '<span class="badge badge--' + esc(s.tone) + '">' + esc(s.status) + '</span>' +
              '</div>' +
              '<p class="muted" style="font-size:14px">' + esc(s.detail) + '</p>' +
              '<div class="meter"><div class="meter__fill meter__fill--' + esc(s.tone) +
                '" style="width:' + s.progress + '%"></div></div>' +
              '<div class="play__foot"><span>' + esc(s.owner) + '</span><span>' + s.progress + '% to target</span></div>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="split" style="margin-bottom:32px">' +
        '<div class="split__main card">' +
          '<h3 style="margin-bottom:16px">Account details</h3>' +
          '<div class="stack" style="gap:8px;font-size:14px">' +
            [['Account number', p.accountNo], ['Role / tier', p.role + ' · ' + p.tier],
             ['Territory', p.territory], ['Partner since', p.since],
             ['Primary contact', p.contact], ['Email', p.email], ['Phone', p.phone],
             ['Payment terms', p.terms], ['Ship-to', p.shipTo]].map(function (row) {
              return '<div class="kv"><span class="muted">' + esc(row[0]) + '</span>' +
                '<span style="text-align:right">' + esc(row[1]) + '</span></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="split__side card stack">' +
          '<h3>Something out of date?</h3>' +
          '<p class="muted" style="font-size:14px">Account details are maintained by Force USA staff. Ask your rep, ' +
            'or sign in to admin if you have staff credentials.</p>' +
          '<a class="btn btn--outline" style="justify-self:start" href="#/admin">Go to admin</a>' +
        '</div>' +
      '</div>' +

      '<h2 style="margin-bottom:16px">Order history</h2>' +
      renderOrderTable(d.orders, false);
  }

  function renderOrderTable(orders, editable) {
    if (!orders.length) {
      return '<div class="empty">No orders recorded' + (editable ? ' — add one above.' : '.') + '</div>';
    }
    return '<div class="table-wrap"><table class="data">' +
      '<caption class="visually-hidden">Order history, most recent first</caption>' +
      '<thead><tr>' +
        '<th scope="col">Order</th><th scope="col">Date</th><th scope="col">SKU</th>' +
        '<th scope="col">Units</th><th scope="col">Value</th>' +
        (editable ? '<th scope="col"><span class="visually-hidden">Actions</span></th>' : '') +
      '</tr></thead><tbody>' +
      orders.map(function (o) {
        return '<tr>' +
          '<td>' + esc(o.ref) + '</td>' +
          '<td>' + esc(pretty(o.date)) + '</td>' +
          '<td>' + esc(o.sku) + '</td>' +
          '<td class="num">' + o.qty + '</td>' +
          '<td class="num">' + esc(money(o.value)) + '</td>' +
          (editable
            ? '<td><button type="button" class="btn btn--ghost btn--sm" data-action="remove-order" ' +
              'data-id="' + attr(o.id) + '">Remove<span class="visually-hidden"> order ' + esc(o.ref) + '</span></button></td>'
            : '') +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* -------------------------------------------------------------------- admin */

  var PROFILE_FIELDS = [
    ['company', 'Company'], ['accountNo', 'Account number'],
    ['role', 'Role'], ['tier', 'Tier'],
    ['territory', 'Territory'], ['since', 'Partner since'],
    ['contact', 'Primary contact'], ['email', 'Email'],
    ['phone', 'Phone'], ['terms', 'Payment terms'],
    ['shipTo', 'Ship-to address'], ['fyStart', 'Financial year starts']
  ];

  function viewAdminLocked() {
    return '' +
      '<div style="display:grid;place-items:center;padding:clamp(20px,5vw,60px) 0">' +
        '<form class="card" style="max-width:420px;width:100%;padding:clamp(26px,3vw,38px)" data-action="login-form" novalidate>' +
          '<div class="eyebrow" style="letter-spacing:0.2em">Restricted</div>' +
          '<h1 style="font-size:28px;letter-spacing:0.05em;margin-bottom:8px">Admin sign in</h1>' +
          '<p class="muted" style="font-size:14px;margin-bottom:24px">Force USA staff only. Admin access lets you edit ' +
            'this dealer\'s account details and order records.</p>' +
          '<div class="stack" style="gap:16px">' +
            '<label class="field">' +
              '<span>Admin email</span>' +
              '<input class="input input--lg" type="email" name="user" autocomplete="username" ' +
                'placeholder="admin@forceusa.com" value="' + attr(state.login.user) + '"' +
                (state.login.error ? ' aria-invalid="true"' : '') + '>' +
            '</label>' +
            '<label class="field">' +
              '<span>Password</span>' +
              '<input class="input input--lg" type="password" name="pass" autocomplete="current-password" ' +
                'placeholder="••••••••"' + (state.login.error ? ' aria-invalid="true"' : '') + '>' +
            '</label>' +
            (state.login.error
              ? '<div class="notice" role="alert">' + esc(state.login.error) + '</div>'
              : '') +
            '<button type="submit" class="btn btn--primary btn--block">Unlock admin</button>' +
            '<p class="dim" style="font-size:12.5px;text-align:center">Demo credentials: admin@forceusa.com / force2026</p>' +
            '<p class="dim" style="font-size:11.5px;text-align:center;line-height:1.5">This gate is a front-end demo, ' +
              'not access control — anyone can read the credentials in the page source. Move it behind a real ' +
              'server-side session before this holds anything private.</p>' +
          '</div>' +
        '</form>' +
      '</div>';
  }

  function viewAdminUnlocked(d) {
    return '' +
      '<div class="page-head" style="margin-bottom:24px">' +
        '<div>' +
          '<div class="eyebrow" style="color:var(--green)">Admin · editing ' + esc(state.profile.company) + '</div>' +
          '<h1>Manage account</h1>' +
        '</div>' +
        '<button type="button" class="btn btn--ghost" data-action="logout">Lock admin</button>' +
      '</div>' +

      '<div class="card" style="margin-bottom:20px">' +
        '<h3 style="margin-bottom:6px">Account details</h3>' +
        '<p class="muted" style="font-size:13.5px;margin-bottom:20px">Changes apply to the Account screen as you type ' +
          'and are saved to this browser.</p>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))">' +
          PROFILE_FIELDS.map(function (f) {
            return '<label class="field">' +
              '<span>' + esc(f[1]) + '</span>' +
              '<input class="input" type="text" data-field="' + attr(f[0]) + '" value="' + attr(state.profile[f[0]]) + '">' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card" style="margin-bottom:20px">' +
        '<h3 style="margin-bottom:6px">Log an order</h3>' +
        '<p class="muted" style="font-size:13.5px;margin-bottom:20px">Adding an order updates the most-recent date, ' +
          'FY count, unit mix and top SKU automatically.</p>' +
        '<form class="form-row" data-action="order-form" novalidate>' +
          '<label class="field"><span>Order ref</span>' +
            '<input class="input" type="text" name="ref" placeholder="SO-00000" value="' + attr(state.newOrder.ref) + '" required></label>' +
          '<label class="field"><span>Date</span>' +
            '<input class="input" type="date" name="date" value="' + attr(state.newOrder.date) + '" max="2100-12-31" required></label>' +
          '<label class="field"><span>SKU</span>' +
            '<input class="input" type="text" name="sku" list="dz-skus" placeholder="C20" value="' + attr(state.newOrder.sku) + '"></label>' +
          '<label class="field"><span>Units</span>' +
            '<input class="input" type="number" name="qty" min="0" step="1" placeholder="12" value="' + attr(state.newOrder.qty) + '"></label>' +
          '<label class="field"><span>Value (USD)</span>' +
            '<input class="input" type="number" name="value" min="0" step="1" placeholder="38400" value="' + attr(state.newOrder.value) + '"></label>' +
          '<button type="submit" class="btn btn--primary" style="flex:0 0 auto;padding:13px 22px">Add order</button>' +
        '</form>' +
        '<datalist id="dz-skus">' +
          DZ.catalogue.map(function (p) { return '<option value="' + attr(p.name) + '"></option>'; }).join('') +
        '</datalist>' +
        (state.orderError ? '<div class="notice" role="alert" style="margin-top:16px">' + esc(state.orderError) + '</div>' : '') +
      '</div>' +

      renderOrderTable(d.orders, true) +

      '<div class="card" style="margin-top:20px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center">' +
        '<div>' +
          '<h3 style="font-size:16px">Reset the demo</h3>' +
          '<p class="muted" style="font-size:13.5px;margin-top:4px">Restores the seed profile and order list in this browser.</p>' +
        '</div>' +
        '<button type="button" class="btn btn--ghost" data-action="reset-demo">Reset to seed data</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------------- search */

  function viewSearch() {
    var q = state.query;
    var hits = searchAll(q);

    return '' +
      '<div class="eyebrow">Search</div>' +
      '<h1>' + (q ? 'Results for &ldquo;' + esc(q) + '&rdquo;' : 'Search the dealer zone') + '</h1>' +
      '<p class="lede" style="margin:10px 0 28px">' +
        (q.trim().length < 2
          ? 'Type at least two characters into the search box above.'
          : hits.length + ' match' + (hits.length === 1 ? '' : 'es') +
            ' across products, troubleshooting guides, assets and sub-dealer resources.') +
      '</p>' +
      (hits.length
        ? '<div class="grid grid--wide">' +
            hits.map(function (h) {
              return '<a class="card stack" style="text-decoration:none;color:inherit;gap:6px" href="' + attr(h.href) + '">' +
                '<span class="label">' + esc(h.kind) + '</span>' +
                '<span style="font-family:var(--display);font-weight:900;text-transform:uppercase;font-size:17px;letter-spacing:0.04em">' +
                  esc(h.title) + '</span>' +
                '<span class="muted" style="font-size:13.5px">' + esc(h.detail) + '</span>' +
              '</a>';
            }).join('') +
          '</div>'
        : (q.trim().length >= 2 ? '<div class="empty">Nothing matched. Try a product name, a symptom, or a part.</div>' : ''));
  }

  /* ================================================================ embeds == */

  var embedTimers = [];

  /** Cross-origin iframes give no usable error event when a network policy or
   *  privacy extension blocks them — the frame just stays blank. Treat "no load
   *  event within a few seconds" as blocked and surface the open-in-a-tab link. */
  function watchEmbeds() {
    embedTimers.forEach(clearTimeout);
    embedTimers = [];

    Array.prototype.forEach.call(document.querySelectorAll('[data-embed-watch]'), function (box) {
      var frame = box.querySelector('iframe');
      var fallback = document.querySelector('[data-embed-fallback]');
      if (!frame || !fallback) return;

      var settled = false;
      frame.addEventListener('load', function () {
        settled = true;
        fallback.hidden = true;
      }, { once: true });

      embedTimers.push(setTimeout(function () {
        if (!settled) fallback.hidden = false;
      }, 6000));
    });
  }

  /* ================================================================ routing == */

  var VALID_VIEWS = {};
  NAV.forEach(function (n) { VALID_VIEWS[n.view] = true; });
  VALID_VIEWS.search = true;

  /** Hash routing keeps the site deployable on any static host — including a
   *  GitHub Pages project subpath — with no rewrite rules. */
  function parseHash() {
    var raw = (global.location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    var view = parts[0] || 'dashboard';

    if (view === 'home') view = 'dashboard';
    if (!VALID_VIEWS[view]) return { view: 'not-found', arg: parts[0] || '' };

    return { view: view, arg: parts[1] || '' };
  }

  function applyRoute() {
    var route = parseHash();

    if (route.view === 'not-found') {
      state.view = 'not-found';
    } else {
      state.view = route.view;

      if (route.view === 'support' && route.arg) {
        var match = DZ.catalogue.filter(function (p) {
          return p.name.toLowerCase() === route.arg.toLowerCase();
        })[0];
        if (match) state.product = match.name;
      }
      if (route.view === 'search') {
        state.query = route.arg || '';
        var box = document.getElementById('site-search');
        if (box && box.value !== state.query) box.value = state.query;
      }
    }

    state.navOpen = false;
    render();
    global.scrollTo(0, 0);

    // Move focus to the heading so keyboard and screen-reader users land in the
    // new view rather than at the top of an unchanged document.
    var heading = document.querySelector('#main h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function viewNotFound() {
    return '' +
      '<div class="eyebrow">404</div>' +
      '<h1>That screen doesn\'t exist</h1>' +
      '<p class="lede" style="margin:10px 0 24px">The link may be out of date. Everything in the dealer zone is ' +
        'reachable from the menu.</p>' +
      '<a class="btn btn--primary" href="#/dashboard">Back to the dashboard</a>';
  }

  /* ============================================================== rendering == */

  var els = {};

  function render() {
    var d = derive();
    var body;

    switch (state.view) {
      case 'dashboard':    body = viewDashboard(d); break;
      case 'support':      body = viewSupport(); break;
      case 'claim':        body = viewClaim(); break;
      case 'assets':       body = viewAssets(); break;
      case 'sheets':       body = viewSheets(); break;
      case 'sub-dealers':  body = viewSubDealers(); break;
      case 'account':      body = viewAccount(d); break;
      case 'admin':        body = state.adminAuthed ? viewAdminUnlocked(d) : viewAdminLocked(); break;
      case 'search':       body = viewSearch(); break;
      default:             body = viewNotFound();
    }

    els.main.innerHTML = body;
    els.nav.innerHTML = renderNav();

    els.whoName.textContent = state.profile.company;
    els.whoRole.textContent = state.profile.role;
    els.whoAvatar.textContent = initials(state.profile.company);

    document.title = (TITLES[state.view] || 'Not found') + ' · Force USA Dealer Zone';

    syncNavVisibility();
    watchEmbeds();
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  var mqNarrow = global.matchMedia ? global.matchMedia('(max-width: 860px)') : null;

  function isNarrow() { return mqNarrow ? mqNarrow.matches : false; }

  function syncNavVisibility() {
    var narrow = isNarrow();
    els.sidebar.hidden = narrow && !state.navOpen;
    els.navToggle.setAttribute('aria-expanded', String(narrow ? state.navOpen : true));
  }

  /* ================================================================= toasts == */

  var toastTimer = null;

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2600);
  }

  /* ================================================================ actions == */

  function login(user, pass) {
    // Demo gate only. See the note rendered on the sign-in card.
    if (String(user).trim().toLowerCase() === 'admin@forceusa.com' && pass === 'force2026') {
      state.adminAuthed = true;
      state.login = { user: '', pass: '', error: '' };
      render();
      toast('Admin unlocked');
    } else {
      state.login.user = user;
      state.login.error = "Those details don't match an admin account.";
      render();
    }
  }

  function addOrder(form) {
    var data = new FormData(form);
    var ref = String(data.get('ref') || '').trim();
    var date = String(data.get('date') || '').trim();
    var sku = String(data.get('sku') || '').trim();
    var qtyRaw = String(data.get('qty') || '').trim();
    var valueRaw = String(data.get('value') || '').trim();

    state.newOrder = { ref: ref, date: date, sku: sku, qty: qtyRaw, value: valueRaw };

    var problem = '';
    if (!ref) problem = 'Give the order a reference.';
    else if (state.orders.some(function (o) { return o.ref.toLowerCase() === ref.toLowerCase(); }))
      problem = 'Order ' + ref + ' is already on file.';
    else if (!date) problem = 'Pick a date for the order.';
    else if (!parseLooseDate(date)) problem = "That date isn't valid.";
    else if (qtyRaw && (!isFinite(Number(qtyRaw)) || Number(qtyRaw) < 0)) problem = 'Units must be zero or more.';
    else if (valueRaw && (!isFinite(Number(valueRaw)) || Number(valueRaw) < 0)) problem = 'Value must be zero or more.';

    if (problem) {
      state.orderError = problem;
      render();
      return;
    }

    state.orders.push(normaliseOrder({
      ref: ref, date: date, sku: sku || '—',
      qty: Math.round(Number(qtyRaw) || 0),
      value: Math.round(Number(valueRaw) || 0)
    }));

    state.orderError = '';
    state.newOrder = { ref: '', date: '', sku: 'C20', qty: '', value: '' };
    save();
    render();
    toast('Order ' + ref + ' added');
  }

  function removeOrder(id) {
    var order = state.orders.filter(function (o) { return o.id === id; })[0];
    if (!order) return;
    state.orders = state.orders.filter(function (o) { return o.id !== id; });
    save();
    render();
    toast('Order ' + order.ref + ' removed');
  }

  function resetDemo() {
    var fresh = seed();
    state.profile = fresh.profile;
    state.orders = fresh.orders;
    state.orderError = '';
    save();
    render();
    toast('Demo data restored');
  }

  /* ================================================================= events == */

  function wireEvents() {
    // One delegated click handler for the whole app — views are re-rendered
    // wholesale, so per-element listeners would leak on every render.
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;

      switch (el.getAttribute('data-action')) {
        case 'select-product':
          global.location.hash = '#/support/' + encodeURIComponent(el.getAttribute('data-product'));
          break;
        case 'remove-order':
          removeOrder(el.getAttribute('data-id'));
          break;
        case 'logout':
          state.adminAuthed = false;
          state.login = { user: '', pass: '', error: '' };
          render();
          toast('Admin locked');
          break;
        case 'reset-demo':
          resetDemo();
          break;
        case 'toggle-nav':
          state.navOpen = !state.navOpen;
          syncNavVisibility();
          break;
        default:
          break;
      }
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      var action = form.getAttribute('data-action');
      if (!action) return;
      e.preventDefault();

      if (action === 'login-form') {
        login(form.elements.user.value, form.elements.pass.value);
      } else if (action === 'order-form') {
        addOrder(form);
      } else if (action === 'search-form') {
        goSearch(form.elements.q.value);
      }
    });

    // Admin profile fields write straight through to state on input.
    document.addEventListener('input', function (e) {
      var key = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!key || !(key in state.profile)) return;
      state.profile[key] = e.target.value;
      save();
      els.whoName.textContent = state.profile.company;
      els.whoRole.textContent = state.profile.role;
      els.whoAvatar.textContent = initials(state.profile.company);
    });

    global.addEventListener('hashchange', applyRoute);

    if (mqNarrow) {
      var onChange = function () { syncNavVisibility(); };
      if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', onChange);
      else if (mqNarrow.addListener) mqNarrow.addListener(onChange);
    }

    // Debounced live search — Enter still works via the form submit above.
    var searchTimer = null;
    els.search.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var value = els.search.value;
      searchTimer = setTimeout(function () {
        if (value.trim().length >= 2) goSearch(value);
        else if (state.view === 'search' && !value.trim()) global.location.hash = '#/dashboard';
      }, 250);
    });
  }

  function goSearch(q) {
    var trimmed = String(q || '').trim();
    var target = '#/search' + (trimmed ? '/' + encodeURIComponent(trimmed) : '');
    if (global.location.hash === target) {
      state.query = trimmed;
      render();
    } else {
      global.location.hash = target;
    }
  }

  /* =================================================================== boot == */

  function boot() {
    els = {
      main: document.getElementById('main'),
      nav: document.getElementById('sidebar-nav'),
      sidebar: document.getElementById('sidebar'),
      navToggle: document.getElementById('nav-toggle'),
      search: document.getElementById('site-search'),
      toast: document.getElementById('toast'),
      whoName: document.getElementById('who-name'),
      whoRole: document.getElementById('who-role'),
      whoAvatar: document.getElementById('who-avatar'),
      year: document.getElementById('year')
    };

    var missing = Object.keys(els).filter(function (k) { return !els[k]; });
    if (missing.length) {
      console.error('[dealer-zone] missing elements:', missing.join(', '));
      return;
    }

    els.year.textContent = String(new Date().getFullYear());

    wireEvents();
    applyRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Exposed for debugging in the console.
  DZ.app = {
    state: state,
    derive: derive,
    reset: resetDemo,
    render: render
  };
})(window, window.DZ);
