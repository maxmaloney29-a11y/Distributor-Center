/* Force USA Dealer Zone — seed data.
 *
 * Plain global (no ES modules) so the site runs from file:// as well as from a
 * web server. `window.DZ` is the single namespace shared by data.js and app.js.
 */
(function (global) {
  'use strict';

  var DZ = (global.DZ = global.DZ || {});

  /* ---------------------------------------------------------------- catalogue */

  // One reusable guide, parameterised by unit — the cable/pulley fix is the
  // same procedure on every frame, only the failure point differs.
  function cableGuide(unit) {
    return {
      category: 'Cables & pulleys',
      time: '20 min fix',
      title: 'Cable slipping off the pulley',
      steps: [
        'Unload the stack and release all tension from the cable.',
        'Check the pulley guard clearance — a bent guard is the usual cause on the ' + unit + '.',
        'Re-seat the cable in the groove and hand-turn the pulley through a full rotation.',
        'Re-tension, then run five slow reps under light load before returning it to service.'
      ],
      parts: 'Pulley guard, 90mm pulley wheel'
    };
  }

  var STACK_GUIDE = {
    category: 'Weight stack',
    time: '15 min fix',
    title: 'Stack sticking or dropping unevenly',
    steps: [
      'Check the guide rods for scoring and wipe down with a dry cloth.',
      'Apply silicone lubricant to the rods — never oil-based.',
      'Confirm the selector pin seats fully through the plate.',
      'Cycle the stack ten times by hand to redistribute.'
    ],
    parts: 'Selector pin, guide rod bushings'
  };

  var FRAME_GUIDE = {
    category: 'Frame',
    time: '30 min fix',
    title: 'Movement or rocking under load',
    steps: [
      'Re-torque all base bolts in a cross pattern to spec in the manual.',
      'Check floor level — most rocking is the slab, not the unit.',
      'Fit the levelling feet supplied in the hardware pack.',
      'Recheck torque after one week of use.'
    ],
    parts: 'Levelling feet, M12 base bolts'
  };

  DZ.guidesByProduct = {
    'C10': [
      cableGuide('C10'),
      STACK_GUIDE,
      FRAME_GUIDE,
      {
        category: 'Smith bar',
        time: '10 min fix',
        title: 'Smith carriage catching in the track',
        steps: [
          'Wipe the full length of the track and inspect for debris.',
          'Check the nylon rollers for flat spots.',
          'Lubricate with silicone spray, run the carriage end to end.',
          'Replace rollers if the catch repeats within a week.'
        ],
        parts: 'Nylon roller set'
      },
      {
        category: 'Attachments',
        time: '10 min fix',
        title: 'Lat bar or row handle sitting off-centre',
        steps: [
          'Check the swivel clip for a bent gate.',
          'Confirm the cable end fitting is fully seated in the carabiner.',
          'Spin the swivel — a dry bearing pulls the bar off-centre under load.',
          'Replace the swivel assembly if it does not turn freely.'
        ],
        parts: 'Swivel clip, carabiner'
      },
      {
        category: 'Install',
        time: '45 min fix',
        title: 'Uprights out of square after assembly',
        steps: [
          'Back off the base bolts a quarter turn to free the frame.',
          'Measure both diagonals across the uprights — they must match within 3mm.',
          'Shim the low corner before re-torquing.',
          'Re-torque in a cross pattern and re-measure.'
        ],
        parts: 'Shim pack, M12 base bolts'
      }
    ],
    'C20': [
      cableGuide('C20'),
      {
        category: 'Cables & pulleys',
        time: '25 min fix',
        title: 'Centre cable system feels notchy',
        steps: [
          'Trace the cable route against the diagram in the manual — a mis-route on the centre system is common at install.',
          'Inspect each pulley for a seized bearing by spinning it free.',
          'Replace any pulley that does not spin freely for two full turns.',
          'Re-tension and test through the full range.'
        ],
        parts: 'Centre pulley assembly'
      },
      STACK_GUIDE,
      {
        category: 'Attachments',
        time: '10 min fix',
        title: "Sliding Bench won't lock to the uprights",
        steps: [
          'Clear the 1-inch holes of packing debris and paint flash.',
          'Check the lock pin spring returns fully.',
          'Confirm the bench is squared to the 3x3 upright before pinning.',
          'Replace the pin assembly if travel is short.'
        ],
        parts: 'Bench lock pin assembly'
      },
      FRAME_GUIDE,
      {
        category: 'Smith bar',
        time: '15 min fix',
        title: 'Smith bar counterbalance drifting',
        steps: [
          'Check the counterbalance cable for stretch against the marked length.',
          'Inspect both anchor points for elongated holes.',
          'Adjust the tensioner until the bar holds position mid-track.',
          'Cycle the bar ten times and re-check it still holds.'
        ],
        parts: 'Counterbalance cable, tensioner'
      },
      {
        category: 'Install',
        time: '45 min fix',
        title: 'Unit will not clear a low ceiling',
        steps: [
          'Confirm the ceiling height against the spec sheet before you cut anything.',
          'Fit the low-ceiling pulley bracket from the install kit.',
          'Re-route the top cable through the lowered anchor.',
          'Re-tension and check the full range clears by at least 50mm.'
        ],
        parts: 'Low-ceiling bracket kit'
      }
    ],
    'C10 SB': [
      cableGuide('C10 SB'),
      {
        category: 'Sliding bench',
        time: '20 min fix',
        title: 'Bench carriage rolling rough or noisy',
        steps: [
          'Clean the rail and inspect for grit in the wheel path.',
          'Check wheel bolts for looseness — a quarter turn is enough to cause noise.',
          'Lubricate wheel bearings with silicone spray.',
          'Load-test at 50% before returning to service.'
        ],
        parts: 'Carriage wheel kit'
      },
      {
        category: 'Sliding bench',
        time: '10 min fix',
        title: "Bench won't lock at an angle",
        steps: [
          'Check the detent plate for burrs.',
          'Confirm the adjustment lever spring is intact.',
          'Seat the pin fully and listen for the click.',
          'Replace the lever assembly if the pin sits proud.'
        ],
        parts: 'Adjustment lever assembly'
      },
      STACK_GUIDE,
      FRAME_GUIDE,
      {
        category: 'Install',
        time: '20 min fix',
        title: 'Bench rail fouling the weight stack shroud',
        steps: [
          'Check the rail is mounted on the correct hole pattern for the SB variant.',
          'Confirm the shroud is seated flush, not pinched at the lower bracket.',
          'Slide the carriage to full travel and mark the contact point.',
          'Re-position the rail one hole forward if contact persists.'
        ],
        parts: 'Rail mount hardware'
      }
    ],
    'F-TT': [
      cableGuide('F-TT'),
      {
        category: 'Cables & pulleys',
        time: '20 min fix',
        title: 'Uneven resistance between the two arms',
        steps: [
          'Compare cable tension arm to arm with the carriages at the same height.',
          'Adjust the tensioner at the base of the lighter arm.',
          'Check both carriages travel the same distance from stop to stop.',
          'Re-test with a matched load on each side.'
        ],
        parts: 'Cable tensioner'
      },
      {
        category: 'Adjustment',
        time: '10 min fix',
        title: 'Pulley carriage hard to reposition',
        steps: [
          'Clear the travel channel of debris.',
          'Check the release handle returns fully.',
          'Lubricate the channel with silicone spray.',
          'Replace the handle spring if travel stays short.'
        ],
        parts: 'Release handle spring'
      },
      FRAME_GUIDE,
      {
        category: 'Install',
        time: '30 min fix',
        title: 'Wall-mount anchors pulling under load',
        steps: [
          'Confirm the anchors are rated for the spec-sheet pull-out load.',
          'Check the mount lands on structure, not plasterboard alone.',
          'Re-drill into the stud or fit a spreader plate.',
          'Load-test to 1.5x working load before handover.'
        ],
        parts: 'Spreader plate, structural anchors'
      }
    ]
  };

  // guideCount is derived, never hand-maintained — the mockup had it drifting
  // out of sync with the actual guide arrays.
  DZ.catalogue = [
    { name: 'C10', line: 'All-In-One Trainer', warranty: 'Lifetime frame', slotId: 'c10', image: 'assets/img/product-c10.svg' },
    { name: 'C20', line: 'All-In-One Trainer', warranty: 'Lifetime frame', slotId: 'c20', image: 'assets/img/product-c20.svg' },
    { name: 'C10 SB', line: 'All-In-One Trainer · Sliding Bench', warranty: 'Lifetime frame', slotId: 'c10sb', image: 'assets/img/product-c10sb.svg' },
    { name: 'F-TT', line: 'Functional Trainer', warranty: 'Lifetime frame', slotId: 'ftt', image: 'assets/img/product-ftt.svg' }
  ].map(function (p) {
    var guides = DZ.guidesByProduct[p.name] || [];
    p.guideCount = guides.length;
    return p;
  });

  /* ------------------------------------------------------------ asset library */

  DZ.assetPacks = [
    { title: 'C20 studio photography', type: 'Images', format: 'ZIP · 48 files · 412 MB', updated: '2026-08-28', badge: 'New', detail: 'Cut-out and in-situ shots on white and charcoal, 4000px, ready for product pages and print.' },
    { title: 'C20 lifestyle library', type: 'Images', format: 'ZIP · 26 files · 288 MB', updated: '2026-08-28', badge: 'New', detail: 'Real gyms, real athletes. Cleared for paid social and retail signage in North America.' },
    { title: 'C10 SB launch kit', type: 'Campaign', format: 'ZIP · 34 files · 190 MB', updated: '2026-08-14', badge: 'New', detail: 'Social cutdowns, email headers, banner set and a two-page dealer sell sheet.' },
    { title: 'F-TT product video', type: 'Video', format: 'MP4 · 1080p · 2 min 10 s', updated: '2026-08-09', badge: 'New', detail: 'Hero film with clean audio and a captions track. A 30-second cutdown ships in the same folder.' },
    { title: 'Force USA logo pack', type: 'Brand', format: 'ZIP · SVG, EPS, PNG', updated: '2026-07-30', badge: '', detail: 'Primary, stacked and mono lockups with clear-space rules and the minimum-size chart.' },
    { title: 'Brand guidelines 2026', type: 'Brand', format: 'PDF · 42 pages', updated: '2026-07-30', badge: '', detail: 'Colour, type, photography direction and the co-branding rules for dealer material.' },
    { title: 'Co-branded quote template', type: 'Sales', format: 'DOCX + PDF', updated: '2026-07-22', badge: '', detail: 'Drop your logo in the header. Pre-filled with current warranty and freight terms.' },
    { title: 'Commercial fit-out deck', type: 'Sales', format: 'PPTX · 18 slides', updated: '2026-07-18', badge: 'New', detail: 'The deck behind the boutique-studio play. Floor plans, ROI maths and objection handling.' },
    { title: 'Spec sheet bundle', type: 'Documents', format: 'PDF · 4 files', updated: '2026-07-11', badge: '', detail: 'Every current SKU: footprint, shipping weight, ceiling requirement and load ratings.' },
    { title: 'Retail signage pack', type: 'Print', format: 'ZIP · A1, A2, shelf strips', updated: '2026-06-27', badge: '', detail: 'Print-ready with bleed. Editable INDD sources included for your own pricing.' },
    { title: 'Install & handover checklist', type: 'Documents', format: 'PDF · 2 pages', updated: '2026-06-20', badge: '', detail: 'The checklist that cuts callbacks. Print it, sign it, leave a copy with the customer.' },
    { title: 'Warranty terms summary', type: 'Documents', format: 'PDF · 1 page', updated: '2026-06-12', badge: '', detail: 'The customer-facing one-pager. What is covered, for how long, and what voids it.' }
  ];

  DZ.launches = [
    { name: 'C20 Pro', window: 'Q4 2026', ship: '2026-11-02', status: 'Assets drop 3 Oct', progress: 70, detail: 'Commercial-grade uprights and a heavier stack. Pre-orders open to Tier 1 two weeks early.' },
    { name: 'F-TT Compact', window: 'Q1 2027', ship: '2027-02-15', status: 'In tooling', progress: 40, detail: 'Same cable system in a 1.4m footprint. Built for apartment gyms and PT studios.' },
    { name: 'Attachment range refresh', window: 'Q2 2027', ship: '2027-05-04', status: 'Concept', progress: 15, detail: 'Fourteen attachments rebuilt around the new swivel standard. Backwards compatible.' }
  ];

  /* --------------------------------------------------------- sub-dealer module */

  DZ.subDealerResources = [
    { title: 'Sub-dealer onboarding kit', detail: 'Everything a new sub-dealer needs in week one: account setup, ordering process, freight terms and who to call.', action: 'Open kit' },
    { title: 'Margin & pricing framework', detail: 'Tier bands, MAP policy and the margin you should be holding at each volume step. Updated each quarter.', action: 'View framework' },
    { title: 'Co-branded template set', detail: 'Quotes, proposals and email signatures that carry both logos without breaking either brand.', action: 'Download set' },
    { title: 'Product training modules', detail: 'Six short modules covering the range, the cable systems and the five questions every buyer asks.', action: 'Start training' },
    { title: 'Demo unit programme', detail: 'How to apply for a demo unit, what it costs, and the sales lift dealers see once one is on the floor.', action: 'Apply' },
    { title: 'Territory & conflict policy', detail: 'How territories are drawn, how overlap is resolved, and how to register a deal before you quote it.', action: 'Read policy' }
  ];

  DZ.subDealers = [
    { name: 'Wasatch Fitness Supply', city: 'Provo, UT', tier: 'Sub-dealer', since: '2021', status: 'Active', units: 42 },
    { name: 'High Desert Gym Co', city: 'Boise, ID', tier: 'Sub-dealer', since: '2022', status: 'Active', units: 28 },
    { name: 'Basin Strength Equipment', city: 'Reno, NV', tier: 'Sub-dealer', since: '2023', status: 'Active', units: 19 },
    { name: 'Summit Home Gyms', city: 'Denver, CO', tier: 'Sub-dealer', since: '2024', status: 'Onboarding', units: 6 },
    { name: 'Cascade PT Equipment', city: 'Portland, OR', tier: 'Sub-dealer', since: '2025', status: 'Onboarding', units: 3 }
  ];

  /* -------------------------------------------------------------- the strategy */

  DZ.strategies = [
    { title: 'Push the C20 into commercial fit-outs', owner: 'Dana Ruiz · GAF Inc', status: 'On track', tone: 'good', progress: 62, detail: 'Target 12 boutique studios in the territory this quarter using the C20 spec sheet and install guide. Force USA supplies co-branded quote templates.' },
    { title: 'Attach the Sliding Bench to every C10 quote', owner: 'Sales floor', status: 'Needs push', tone: 'info', progress: 38, detail: 'C10 SB attach rate sits below territory average. Train the floor on the two-minute demo and lead with the space saving, not the price.' },
    { title: 'Cut install callbacks on the F-TT', owner: 'Service team', status: 'On track', tone: 'good', progress: 74, detail: 'Run the cable tension check from the troubleshooting hub at handover. Fewer callbacks means faster reorders and better reviews.' },
    { title: 'Pre-sell the next launch', owner: 'Marcus Hale · Force USA', status: 'Starting', tone: 'muted', progress: 15, detail: 'Assets drop 30 days before ship date. Get product pages live on launch morning — dealers who list early take the first wave of demand.' }
  ];

  /* ------------------------------------------------------------- account seed */

  DZ.seedState = {
    profile: {
      company: 'GAF Inc',
      accountNo: 'D-10428',
      role: 'Distributor',
      tier: 'Tier 1',
      territory: 'Western US',
      since: 'March 2019',
      contact: 'Dana Ruiz',
      email: 'orders@gafinc.com',
      phone: '(801) 555-0142',
      shipTo: '2280 Foothill Blvd, Salt Lake City, UT 84108',
      terms: 'Net 45',
      fyStart: '1 Jul 2026'
    },
    orders: [
      { ref: 'SO-88213', date: '2026-08-27', sku: 'C20', qty: 18, value: 74200 },
      { ref: 'SO-87940', date: '2026-08-06', sku: 'C10', qty: 12, value: 38400 },
      { ref: 'SO-87611', date: '2026-07-24', sku: 'C20', qty: 24, value: 98900 },
      { ref: 'SO-87402', date: '2026-07-15', sku: 'F-TT', qty: 9, value: 21150 },
      { ref: 'SO-87188', date: '2026-07-03', sku: 'C10 SB', qty: 14, value: 51800 },
      { ref: 'SO-86904', date: '2026-06-19', sku: 'C20', qty: 20, value: 82400 }
    ]
  };

  /* ------------------------------------------------------------ external links */

  DZ.links = {
    claimForm: 'https://form.asana.com/?k=TGhBMWKt2u9cc30s1VN0nA&d=12600476210818',
    claimFormEmbed: 'https://form.asana.com/?k=TGhBMWKt2u9cc30s1VN0nA&d=12600476210818&embed=true',
    drive: 'https://drive.google.com/drive/folders/1_Y-RtAlTEFXbuws7LhdOUuxcOg3OBU8C?usp=drive_link',
    driveEmbed: 'https://drive.google.com/embeddedfolderview?id=1_Y-RtAlTEFXbuws7LhdOUuxcOg3OBU8C#grid'
  };
})(window);
