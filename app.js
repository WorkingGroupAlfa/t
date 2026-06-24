/* United Lifestyle Resort Traralgon — standalone vanilla implementation.
   Ported from the Claude Design composer (United Lifestyle Resort Traralgon.dc.html).
   No framework, no runtime dependency. */
(function () {
  'use strict';

  // ---------- helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ---------- data ----------
  var phrases = [
    'Homes from $499,000',
    'Resort-style living in Traralgon',
    'Heated pool, gym, cinema and social spaces',
    'Own your home, keep what’s yours',
    'A lifestyle community for 50+'
  ];

  var faqData = [
    { q: 'Who can live at Traralgon?', a: 'Our community is designed for over-50s looking for an easier, low-maintenance lifestyle. Whether you’re downsizing, retiring, or simply ready for less upkeep and more living, you’re welcome here.' },
    { q: 'How much do the homes cost?', a: 'Homes in Stage 1 start from $499,000. Prices vary depending on the home design, layout and position within the community.' },
    { q: 'What does home ownership look like here?', a: 'You own your home outright. It is purchased professionally finished and yours from day one, with no body corporate and no traditional retirement village contract.' },
    { q: 'What does the weekly site fee cover?', a: 'The weekly site fee helps cover community facilities, gardens, landscaping and common area maintenance, so everyday living stays easy and well looked after.' },
    { q: 'Are there entry or exit fees?', a: 'No. Unlike many traditional retirement village models, there are no entry or exit fees on the home itself.' },
    { q: 'What facilities are available in the community?', a: 'Residents can enjoy a heated swimming pool, bowling and croquet greens, gym, private cinema, library, meeting rooms, hobby workshop, community kitchen, residents lounge and a year-round social calendar.' },
    { q: 'Are pets allowed?', a: 'Pet policies can vary, but the community is designed to support a relaxed and welcoming lifestyle. Please contact the team for the latest information on pet suitability.' },
    { q: 'Can I book an inspection or ask about available lots?', a: 'Yes. You can request a callback, book an inspection, or enquire about available homes and lots directly through the website.' }
  ];

  // ---- Four residential zones, traced from the annotated masterplan ----
  // Coordinates are in the masterplan image space (viewBox 0 0 4000 2250).
  // `path`  = SVG outline of the green residential land inside each zone.
  // `label` = where the on-map zone label sits.
  // Edit these paths to fine-tune the boundaries later; no interaction code changes are needed.
  var mapSize = { width: 4000, height: 2250 };
  var zoneData = [
    {
      id: 'zone1', name: 'Zone 1',
      rings: [
        [[1273,1678],[1523,1617],[1877,1532],[2152,1457],[2586,1382],[2614,1391],[2658,1541],[2461,1582],[2170,1651],[1895,1720],[1592,1791],[1323,1841],[1295,1766],[1283,1688]]
      ],
      label: { x: 1888, y: 1606 },
      blurb: 'A generous zone with a variety of homesites, positioned close to the community entrance.'
    },
    {
      id: 'zone2', name: 'Zone 2',
      rings: [
        [[517,472],[839,507],[1095,620],[1214,641],[1364,669],[1370,728],[1355,848],[1327,982],[698,923],[658,854],[573,713],[470,526]],
        [[777,994],[860,1000],[1136,1032],[1323,1060],[1330,1164],[1364,1332],[1339,1363],[1277,1388],[1152,1379],[914,1338],[842,1220],[758,1060]],
        [[945,1423],[1223,1454],[1352,1435],[1392,1478],[1392,1522],[1320,1560],[1158,1582],[1070,1554]]
      ],
      label: { x: 822, y: 840 },
      blurb: 'The established western precinct, set among mature trees and open landscaping.'
    },
    {
      id: 'zone3', name: 'Zone 3',
      rings: [
        [[1486,685],[1645,685],[1761,710],[1773,769],[1730,1128],[1802,1475],[1690,1498],[1495,1545],[1461,1460],[1395,1166],[1445,694]],
        [[1852,720],[2014,735],[2139,750],[2167,778],[2136,1047],[2195,1341],[2177,1392],[1880,1450],[1842,1329],[1798,1113],[1836,778]],
        [[2280,760],[2470,780],[2564,795],[2561,957],[2536,1075],[2600,1308],[2505,1325],[2273,1382],[2244,1304],[2202,1091],[2236,788]]
      ],
      label: { x: 1922, y: 1078 },
      blurb: 'Central homesites, moments from the resort amenities and the display village.'
    },
    {
      id: 'zone4', name: 'Zone 4',
      rings: [
        [[2677,807],[2833,822],[2968,840],[2967,910],[2955,1069],[3020,1320],[2948,1367],[2870,1376],[2720,1423],[2673,1341],[2608,1075],[2636,823]],
        [[3045,851],[3255,867],[3380,888],[3395,932],[3373,1088],[3414,1247],[3333,1282],[3092,1328],[3036,1200],[3014,1060],[3028,930]]
      ],
      label: { x: 3126, y: 910 },
      blurb: 'A peaceful northern zone overlooking the ornamental lake at the edge of the community.'
    }
  ];
  var zoneEditMode = /(?:\?|&)zoneEdit=1(?:&|$)/.test(window.location.search);
  try {
    zoneEditMode = zoneEditMode || window.localStorage.getItem('ulrZoneEdit') === '1';
  } catch (_) {}

  // ---- Resort amenity markers, placed over the community buildings on the masterplan ----
  // Coordinates are in the masterplan image space (0..4000 x, 0..2250 y). Nudge x/y to
  // fine-tune placement, or open the page with ?amenityEdit=1 to drag the markers.
  var amenities = [
    { id: 'games', name: 'Games room', icon: 'games', x: 1380, y: 442, blurb: 'A relaxed games room for cards, billiards and a bit of friendly competition.' },
    { id: 'lounge', name: 'Lounge & library', icon: 'book', x: 1617, y: 492, blurb: 'A quiet lounge and library to read, relax and catch up over coffee.' },
    { id: 'hall', name: 'Community hall', icon: 'hall', x: 1873, y: 526, blurb: 'A spacious hall for events, gatherings and community celebrations.' },
    { id: 'fitness', name: 'Fitness centre', icon: 'dumbbell', x: 2086, y: 540, blurb: 'A fully-equipped fitness centre to keep active at your own pace.' },
    { id: 'bowls', name: 'Bowls green', icon: 'bowls', x: 2339, y: 572, blurb: 'A manicured bowls green for a social roll any day of the week.' },
    { id: 'bbq', name: 'BBQ pavilion', icon: 'bbq', x: 2545, y: 587, blurb: 'An outdoor BBQ pavilion for shared meals and sunny afternoons.' },
    { id: 'pickleball', name: 'Pickleball court', icon: 'paddle', x: 2714, y: 617, blurb: 'A pickleball court — one of the fastest, friendliest games around.' },
    { id: 'workshop', name: 'Workshop', icon: 'tools', x: 3070, y: 676, blurb: 'A hands-on hobby workshop for projects, repairs and tinkering.' }
  ];
  var nearbyAmenity = {
    id: 'nearby',
    name: 'Nearby amenities',
    icon: 'location',
    x: 620,
    y: 1858,
    intro: 'Everyday essentials are close to the community entrance.',
    items: [
      { name: 'Vet clinic', distance: '230 m' },
      { name: 'Train station', distance: '750 m' },
      { name: 'Hospital', distance: '750 m' },
      { name: 'Cafe', distance: '1.1 km' },
      { name: 'Airport', distance: '1.8 km' },
      { name: 'Store', distance: '5.0 km' }
    ]
  };

  // ============================================================
  // MAP CONFIG — desktop (landscape render) vs mobile (square top-down image)
  // The mobile map has its OWN image, viewBox and zones/amenities so it can be tuned
  // independently. To position the mobile zones/points: open the page at a ≤760px width
  // with ?zoneEdit=1 (drag zone anchors) and ?amenityEdit=1 (drag markers), then copy the
  // JSON and paste it into mapMobileCfg.zones / .amenities below.
  // ============================================================
  function cloneMapData(d) { return JSON.parse(JSON.stringify(d)); }
  var mapDesktopCfg = { img: 'uploads/masterplan-a83a34d8.jpg', size: { width: 4000, height: 2250 }, zones: zoneData, amenities: amenities, nearby: nearbyAmenity };
  var mapMobileCfg = {
    img: 'uploads/plan-mobie.jpg',
    size: { width: 4000, height: 4000 },
    zones: [
    {
      id: 'zone1', name: 'Zone 1',
      rings: [
        [[1258,2558],[1392,2537],[1586,2493],[1839,2431],[2302,2325],[2611,2259],[2645,2294],[2673,2434],[2448,2487],[2223,2544],[1795,2640],[1289,2762],[1264,2656],[1245,2575]]
      ],
      label: { x: 1898, y: 2500 },
      blurb: 'A generous zone with a variety of homesites, positioned close to the community entrance.'
    },
    {
      id: 'zone2', name: 'Zone 2',
      rings: [
        [[795,1349],[983,1430],[1098,1493],[1214,1500],[1330,1531],[1342,1559],[1327,1712],[1305,1862],[636,1780],[417,1387],[448,1322],[583,1334]],
        [[995,1894],[1148,1915],[1289,1931],[1298,2037],[1317,2103],[1336,2180],[1327,2240],[1198,2272],[892,2234],[717,1944],[723,1902],[764,1874]],
        [[920,2331],[948,2315],[1186,2337],[1295,2328],[1361,2347],[1361,2427],[1189,2462],[1067,2447]]
      ],
      label: { x: 1057, y: 1931 },
      blurb: 'The established western precinct, set among mature trees and open landscaping.'
    },
    {
      id: 'zone3', name: 'Zone 3',
      rings: [
        [[1467,1544],[1611,1550],[1745,1568],[1752,1628],[1733,1803],[1714,2037],[1792,2353],[1461,2433],[1373,2033],[1408,1637],[1423,1550]],
        [[1945,1584],[2027,1597],[2155,1612],[2180,1655],[2155,1775],[2142,1997],[2205,2275],[1870,2353],[1795,2009],[1830,1609],[1873,1581]],
        [[2373,1633],[2467,1647],[2542,1656],[2580,1675],[2558,1980],[2589,2074],[2605,2187],[2283,2258],[2208,1983],[2248,1662],[2283,1628]]
      ],
      label: { x: 2012, y: 1835 },
      blurb: 'Central homesites, moments from the resort amenities and the display village.'
    },
    {
      id: 'zone4', name: 'Zone 4',
      rings: [
        [[2695,1665],[2870,1690],[2927,1684],[2989,1700],[3011,1746],[2983,1925],[3042,2212],[2952,2247],[2752,2287],[2714,2275],[2633,1958],[2652,1696]],
        [[3105,1715],[3236,1731],[3323,1737],[3420,1744],[3436,1780],[3427,1983],[3455,2115],[3395,2146],[3130,2212],[3058,1925],[3080,1744]]
      ],
      label: { x: 3056, y: 1909 },
      blurb: 'A peaceful northern zone overlooking the ornamental lake at the edge of the community.'
    }
    ],
    amenities: [
      { id: 'games', name: 'Games room', icon: 'games', x: 1358, y: 1322, blurb: 'A relaxed games room for cards, billiards and a bit of friendly competition.' },
      { id: 'lounge', name: 'Lounge & library', icon: 'book', x: 1592, y: 1344, blurb: 'A quiet lounge and library to read, relax and catch up over coffee.' },
      { id: 'hall', name: 'Community hall', icon: 'hall', x: 1855, y: 1375, blurb: 'A spacious hall for events, gatherings and community celebrations.' },
      { id: 'fitness', name: 'Fitness centre', icon: 'dumbbell', x: 2077, y: 1390, blurb: 'A fully-equipped fitness centre to keep active at your own pace.' },
      { id: 'bowls', name: 'Bowls green', icon: 'bowls', x: 2345, y: 1421, blurb: 'A manicured bowls green for a social roll any day of the week.' },
      { id: 'bbq', name: 'BBQ pavilion', icon: 'bbq', x: 2558, y: 1452, blurb: 'An outdoor BBQ pavilion for shared meals and sunny afternoons.' },
      { id: 'pickleball', name: 'Pickleball court', icon: 'paddle', x: 2733, y: 1481, blurb: 'A pickleball court — one of the fastest, friendliest games around.' },
      { id: 'workshop', name: 'Workshop', icon: 'tools', x: 3102, y: 1503, blurb: 'A hands-on hobby workshop for projects, repairs and tinkering.' }
    ],
    nearby: {
      id: 'nearby', name: 'Nearby amenities', icon: 'location', x: 605, y: 2790,
      intro: 'Everyday essentials are close to the community entrance.',
      items: [
        { name: 'Vet clinic', distance: '230 m' },
        { name: 'Train station', distance: '750 m' },
        { name: 'Hospital', distance: '750 m' },
        { name: 'Cafe', distance: '1.1 km' },
        { name: 'Airport', distance: '1.8 km' },
        { name: 'Store', distance: '5.0 km' }
      ]
    }
  };
  // ?map=mobile / ?map=desktop forces a specific map (handy for editing the mobile map
  // with a mouse at a comfortable desktop width — no DevTools touch emulation needed).
  var mapForce = (/(?:\?|&)map=(mobile|desktop)(?:&|$)/.exec(window.location.search) || [])[1] || null;
  // Swap the active map data + image/viewBox to match the current device (or the forced map).
  function applyMapConfig() {
    var useMobile = mapForce ? (mapForce === 'mobile') : state.isMobile;
    var c = useMobile ? mapMobileCfg : mapDesktopCfg;
    mapSize = c.size; zoneData = c.zones; amenities = c.amenities; nearbyAmenity = c.nearby;
    var img = $('ulr-map-img'); if (img && img.getAttribute('src') !== c.img) img.src = c.img;
    var wrap = $('ulr-mapwrap'); if (wrap) wrap.style.aspectRatio = c.size.width + ' / ' + c.size.height;
    var svg = $('ulr-map-svg'); if (svg) svg.setAttribute('viewBox', '0 0 ' + c.size.width + ' ' + c.size.height);
    amenitiesBuilt = false;  // force the markers to rebuild for the new map
  }

  var amenityIcons = {
    location: '<path d="M12 21s7-5.08 7-11a7 7 0 1 0-14 0c0 5.92 7 11 7 11z"/><circle cx="12" cy="10" r="2.35"/>',
    games: '<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.05-.011.1-.017.151C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.259-.006-.05-.011-.1-.017-.15A4 4 0 0 0 17.32 5z"/><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><circle cx="15" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="18" cy="10" r=".9" fill="currentColor" stroke="none"/>',
    book: '<path d="M12 7v13"/><path d="M3 17.5V5a1 1 0 0 1 1-1h4.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 3.5-3H20a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-5a3 3 0 0 0-3 1.5 3 3 0 0 0-3-1.5H4a1 1 0 0 1-1-1z"/>',
    hall: '<polygon points="12 3 21 8 3 8"/><line x1="4" x2="4" y1="8" y2="19"/><line x1="9" x2="9" y1="8" y2="19"/><line x1="15" x2="15" y1="8" y2="19"/><line x1="20" x2="20" y1="8" y2="19"/><line x1="3" x2="21" y1="20" y2="20"/>',
    dumbbell: '<path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/>',
    bowls: '<circle cx="12" cy="12" r="8.5"/><circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="14" cy="14" r="1.1" fill="currentColor" stroke="none"/>',
    bbq: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    paddle: '<ellipse cx="10.5" cy="9.5" rx="6" ry="6.5"/><path d="m14.8 14 4.4 5.6a1.6 1.6 0 0 1-2.4 2.1l-4-5"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
  };
  function amenitySvg(id, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block;">' + (amenityIcons[id] || '') + '</svg>';
  }
  var amenityEditMode = /(?:\?|&)amenityEdit=1(?:&|$)/.test(window.location.search);
  var amenityDrag = null, amenitiesBuilt = false;

  var reviews = [
    { quote: 'Moving here was one of the best decisions I’ve made — it truly feels like home.', name: 'Lyn', role: 'Moved from Melbourne', initials: 'L', stars: '★★★★★' },
    { quote: 'A welcoming community with plenty to do, and real peace of mind.', name: 'Carol & Ian', role: 'New residents', initials: 'CI', stars: '★★★★★' },
    { quote: 'Integrity, genuine care and lifetime friends who feel like family.', name: 'Bendigo Village resident', role: 'A trusted member for 12+ years', initials: 'BV', stars: '★★★★★' }
  ];

  var ownershipCards = [
    { title: 'You own your home outright', body: 'Purchased, professionally finished, and yours from day one. No body corporate. No retirement village contract.' },
    { title: 'We look after the land', body: 'A weekly site fee covers facilities, gardens and common areas. Eligible residents can apply for Centrelink rent assistance.' },
    { title: 'You keep what’s yours', body: 'When the time comes to sell, the home is yours to sell. No exit fees on the home itself.' }
  ];
  var ownTabLabels = ['You own', 'We care', 'You keep'];

  var benefits = ['No stamp duty', 'No entry or exit fees', 'Centrelink rent assistance eligible', 'Release equity from your family home', 'Lower weekly living costs', 'Downsize the house, upsize the life'];

  var homes = [
    { badge: 'Home Design 01', name: 'LAVENDER', price: 'From $499,000', img: 'uploads/LAVENDER.png', imgPhone: 'uploads/LAVENDER2-PHONE.png', plan: 'uploads/PLAN1.png', planRot: 90, specs: ['2 bedrooms', '1 bathroom', 'Open-plan living', 'Private outdoor area'] },
    { badge: 'Home Design 02', name: 'PEPPERMINT', price: 'Price coming soon', img: 'uploads/ROSEMARY.jpeg', imgPhone: 'uploads/ROSEMARY-PHONE.png', plan: 'uploads/PLAN2.png', planRot: 0, specs: ['2 bedrooms', '2 bathrooms', 'Larger living area', 'Premium finishes'] },
    { badge: 'Home Design 03', name: 'ROSEMARY', price: 'Price coming soon', img: 'uploads/PEPPERMINT.png ', imgPhone: 'uploads/PEPPERMINT-PHONE.png', plan: 'uploads/PLAN3.png', planRot: 0, specs: ['3 bedrooms', '2 bathrooms', 'Designed for extra space', 'Ideal for guests or hobbies'] }
  ];

  var awards = [
    { tag: 'Experience', title: 'Over three decades across property and financial services' },
    { tag: 'Development', title: 'Two decades shaping major property outcomes' },
    { tag: 'Responsibility', title: "Registered Responsible Manager under United PF's AFSL" },
    { tag: 'Long-term thinking', title: 'Built on trust, transparency and alignment' }
  ];

  // ---------- state ----------
  var state = {
    isMobile: window.matchMedia('(max-width:760px)').matches,
    quizStep: 0,           // 0=about · 1=size · 2=contact · 'done'
    quizAbout: null,
    quizSize: null,
    quizWhen: 'asap',      // 'asap' | 'schedule'
    quizName: '',
    phraseIdx: 0,
    brochureHomes: [],
    revIdx: 0,
    revCardOn: true,
    revPaused: false,
    revBloom: 0,
    ownTab: 0,
    ownExpanded: false,
    hoverZone: null,       // zone id hovered (desktop)
    activeZone: null,      // zone id with its card/sheet open
    enquiryZone: null,     // zone id added to the enquiry form
    activeAmenity: null,   // amenity id with its mobile sheet open
    activeNearby: false,   // nearby amenities info card/sheet open
    homeIdx: 0,
    homePaused: false,
    homeExpanded: false,   // mobile: home card showing full specs (vs collapsed name+price)
    planModalOpen: false,
    faqOpen: 0
  };

  // ============================================================
  // HEADER PHRASE
  // ============================================================
  function renderPhrase() {
    var span = $('ulr-phrase');
    span.textContent = phrases[state.phraseIdx];
    // replay animation
    span.style.animation = 'none';
    void span.offsetWidth;
    span.style.animation = 'ulrPhraseIn .8s ease both';
  }

  // ============================================================
  // QUIZ
  // ============================================================
  var quizSteps = [
    {
      key: 'quizAbout', title: 'Tell us a little about you',
      options: [
        { key: '50plus', label: 'I’m 50+, buying for myself' },
        { key: 'parents', label: 'I’m buying for my parents' },
        { key: 'under50', label: 'I’m under 50, buying for myself' }
      ]
    },
    {
      key: 'quizSize', title: 'What size home are you after?',
      options: [
        { key: '1bed', label: '1 bedroom' },
        { key: '2bed', label: '2 bedrooms' },
        { key: '3bed', label: '3 bedrooms' }
      ]
    }
  ];

  // re-render only the quiz (keeps the rest of the page untouched between steps)
  function setQuiz(patch) { Object.assign(state, patch); renderQuiz(); }

  function quizSelectedZoneHtml() {
    var zone = getZone(state.enquiryZone);
    var homesText = state.brochureHomes.join(', ');
    if (!zone && !homesText) return '';
    var html = '<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 10px; border-radius:12px; background:rgba(255,102,0,.13); border:1px solid rgba(255,102,0,.36);">';
    if (zone) {
      html += '<span style="color:rgba(247,243,234,.72); font-size:12.5px;">Interested zone</span>' +
        '<span style="display:inline-flex; align-items:center; gap:7px; background:#FF6600; color:#fff; font-size:12.5px; font-weight:700; padding:6px 11px; border-radius:999px;">' + esc(zone.name) + '</span>' +
        '<input type="hidden" name="interested_zone" value="' + esc(zone.name) + '">';
    }
    if (homesText) {
      html += '<span style="color:rgba(247,243,234,.72); font-size:12.5px;">Home design</span>' +
        '<span style="display:inline-flex; align-items:center; gap:7px; background:rgba(247,243,234,.14); color:#fff; font-size:12.5px; font-weight:700; padding:6px 11px; border-radius:999px;">' + esc(homesText) + '</span>' +
        '<input type="hidden" name="brochure_homes" value="' + esc(homesText) + '">';
    }
    return html + '</div>';
  }

  function goToQuizContact() {
    setQuiz({ quizStep: 2 });
    scrollTo('ulr-intro');
    setTimeout(updateIntro, 80);
  }

  function quizHeaderHtml(stepIdx) {
    var dots = '';
    for (var i = 0; i < 3; i++) {
      var on = i <= stepIdx;
      dots += '<span style="width:' + (i === stepIdx ? '22px' : '7px') + '; height:7px; border-radius:999px; background:' + (on ? '#FF6600' : 'rgba(247,243,234,.25)') + '; transition:width .35s ease, background .35s ease;"></span>';
    }
    var back = stepIdx > 0
      ? '<button data-act="back" aria-label="Back" style="display:inline-flex; align-items:center; gap:5px; background:none; border:0; cursor:pointer; color:rgba(247,243,234,.6); font-size:13px; padding:0;"><span style="font-size:15px; line-height:1;">&larr;</span> Back</button>'
      : '<span></span>';
    return '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:clamp(9px,1.4vw,14px);">' + back +
      '<div style="display:flex; gap:6px; align-items:center;">' + dots + '</div></div>';
  }

  function quizOptStyle(sel) { return 'display:flex; align-items:center; gap:15px; text-align:left; cursor:pointer; width:100%; background:rgba(247,243,234,.08); border:1.5px solid ' + (sel ? '#FF6600' : 'rgba(247,243,234,.2)') + '; border-radius:13px; padding:15px 18px; transition:border-color .2s, box-shadow .2s, transform .2s, background .2s;'; }
  function quizWhenStyle(on) { return 'cursor:pointer; border-radius:11px; padding:11px 10px; font-size:13.5px; font-weight:600; transition:background .2s,border-color .2s,color .2s; ' + (on ? 'background:#FF6600; border:1.5px solid #FF6600; color:#fff;' : 'background:rgba(247,243,234,.06); border:1.5px solid rgba(247,243,234,.22); color:#F7F3EA;'); }

  function renderQuiz() {
    var host = $('ulr-quiz-body');
    if (!host) return;
    var step = state.quizStep;

    if (step === 'done') {
      var first = state.quizName ? state.quizName.split(' ')[0] : '';
      host.innerHTML = '<div style="text-align:center;">' +
        '<div style="width:56px; height:56px; border-radius:50%; background:#FF6600; color:#fff; display:flex; align-items:center; justify-content:center; font-size:27px; margin:0 auto 16px; box-shadow:0 0 0 8px rgba(255,102,0,.12);">&#10003;</div>' +
        '<p style="margin:0 0 8px; font-family:\'Libre Baskerville\',serif; font-size:clamp(22px,3vw,28px); color:#fff;">Thank you' + (first ? ', ' + esc(first) : '') + '</p>' +
        '<p style="margin:0; color:rgba(247,243,234,.72); font-size:15px; line-height:1.55;">We&rsquo;ve got your details and the team will be in touch ' + (state.quizWhen === 'schedule' ? 'at your chosen time' : 'as soon as possible') + '.</p></div>';
      return;
    }

    // under-50 dead-end (branches off the first question)
    if (step === 'under50') {
      host.innerHTML =
        '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:clamp(9px,1.4vw,14px);">' +
        '<button data-act="back" aria-label="Back" style="display:inline-flex; align-items:center; gap:5px; background:none; border:0; cursor:pointer; color:rgba(247,243,234,.6); font-size:13px; padding:0;"><span style="font-size:15px; line-height:1;">&larr;</span> Back</button><span></span></div>' +
        '<div style="text-align:center; padding:clamp(6px,2vw,16px) 0;">' +
        '<div style="width:54px; height:54px; border-radius:50%; background:rgba(247,243,234,.1); border:1.5px solid rgba(247,243,234,.28); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#F7F3EA; font-family:\'Libre Baskerville\',serif; font-size:18px;">50+</div>' +
        '<p style="margin:0 0 10px; font-family:\'Libre Baskerville\',serif; font-size:clamp(20px,2.6vw,26px); line-height:1.25; color:#fff;">Sorry, our community is 50 years+</p>' +
        '<p style="margin:0; color:rgba(247,243,234,.72); font-size:15px; line-height:1.55;">Please come back later.</p></div>';
      var bku = host.querySelector('[data-act="back"]');
      if (bku) bku.onclick = function () { setQuiz({ quizStep: 0 }); };
      return;
    }

    if (step === 0 || step === 1) {
      var def = quizSteps[step];
      var html = quizHeaderHtml(step) +
        '<p style="margin:0 0 clamp(16px,2vw,22px); font-family:\'Libre Baskerville\',serif; font-size:clamp(20px,2.6vw,27px); line-height:1.28; color:#fff; text-align:center;">' + esc(def.title) + '</p><div style="display:grid; gap:11px;">';
      def.options.forEach(function (o) {
        var sel = state[def.key] === o.key;
        html += '<button data-opt="' + o.key + '" style="' + quizOptStyle(sel) + '">' +
          '<span style="flex:0 0 22px; width:22px; height:22px; border-radius:50%; border:2px solid ' + (sel ? '#FF6600' : 'rgba(247,243,234,.45)') + '; background:' + (sel ? '#FF6600' : 'transparent') + '; display:inline-block;"></span>' +
          '<span style="font-size:15.5px; color:#F7F3EA; font-weight:500;">' + esc(o.label) + '</span></button>';
      });
      host.innerHTML = html + '</div>';
      var bk = host.querySelector('[data-act="back"]');
      if (bk) bk.onclick = function () { setQuiz({ quizStep: step - 1 }); };
      Array.prototype.forEach.call(host.querySelectorAll('[data-opt]'), function (btn) {
        btn.onmouseover = function () { btn.style.borderColor = '#FF6600'; btn.style.background = 'rgba(247,243,234,.14)'; btn.style.transform = 'translateY(-1px)'; btn.style.boxShadow = '0 8px 22px -14px rgba(255,102,0,.6)'; };
        btn.onmouseout = function () { var sel = state[def.key] === btn.getAttribute('data-opt'); btn.style.borderColor = sel ? '#FF6600' : 'rgba(247,243,234,.2)'; btn.style.background = 'rgba(247,243,234,.08)'; btn.style.transform = 'none'; btn.style.boxShadow = 'none'; };
        btn.onclick = function () {
          var optKey = btn.getAttribute('data-opt');
          var p = {}; p[def.key] = optKey;
          // Under-50 isn't eligible — branch to a polite dead-end instead of advancing.
          p.quizStep = (step === 0 && optKey === 'under50') ? 'under50' : step + 1;
          setQuiz(p);
        };
      });
      return;
    }

    // step 2 — contact details + preferred time
    var sched = state.quizWhen === 'schedule';
    host.innerHTML = quizHeaderHtml(2) +
      '<p style="margin:0 0 clamp(10px,1.4vw,15px); font-family:\'Libre Baskerville\',serif; font-size:clamp(19px,2.4vw,25px); line-height:1.2; color:#fff; text-align:center;">Where can we reach you?</p>' +
      '<form id="ulr-quiz-form" style="display:grid; gap:9px;">' +
      quizSelectedZoneHtml() +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">' +
      '<input class="ulr-input" name="first_name" placeholder="First name" autocomplete="given-name" required style="padding:11px 14px; min-width:0;">' +
      '<input class="ulr-input" name="last_name" placeholder="Last name" autocomplete="family-name" required style="padding:11px 14px; min-width:0;">' +
      '</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">' +
      '<input class="ulr-input" name="email" type="email" placeholder="Email" autocomplete="email" required style="padding:11px 14px; min-width:0;">' +
      '<input class="ulr-input" name="phone" placeholder="Phone" autocomplete="tel" style="padding:11px 14px; min-width:0;">' +
      '</div>' +
      '<p style="margin:4px 0 1px; color:rgba(247,243,234,.72); font-size:13px; letter-spacing:.02em;">When are you ready to talk?</p>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">' +
      '<button type="button" data-when="asap" style="' + quizWhenStyle(!sched) + '">As soon as possible</button>' +
      '<button type="button" data-when="schedule" style="' + quizWhenStyle(sched) + '">Choose a time</button>' +
      '</div>' +
      '<div id="ulr-quiz-when" style="display:' + (sched ? 'grid' : 'none') + '; grid-template-columns:1fr 1fr; gap:9px;">' +
      '<input class="ulr-input" name="date" type="date" style="padding:10px 14px; color-scheme:dark; min-width:0;">' +
      '<input class="ulr-input" name="time" type="time" style="padding:10px 14px; color-scheme:dark; min-width:0;">' +
      '</div>' +
      '<button type="submit" class="ulr-btn-primary" style="margin-top:4px; font-size:15px; padding:12px; border-radius:11px;">Request a callback</button>' +
      '</form>';
    var bk2 = host.querySelector('[data-act="back"]');
    if (bk2) bk2.onclick = function () { setQuiz({ quizStep: 1 }); };
    // when-toggle: update via direct DOM so typed contact fields aren't wiped by a re-render
    Array.prototype.forEach.call(host.querySelectorAll('[data-when]'), function (b) {
      b.onclick = function () {
        state.quizWhen = b.getAttribute('data-when');
        Array.prototype.forEach.call(host.querySelectorAll('[data-when]'), function (x) { x.style.cssText = quizWhenStyle(x.getAttribute('data-when') === state.quizWhen); });
        $('ulr-quiz-when').style.display = state.quizWhen === 'schedule' ? 'grid' : 'none';
      };
    });
    host.querySelector('#ulr-quiz-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var firstEl = e.target.querySelector('input[name="first_name"]');
      var lastEl = e.target.querySelector('input[name="last_name"]');
      state.quizName = ((firstEl ? firstEl.value.trim() : '') + ' ' + (lastEl ? lastEl.value.trim() : '')).trim();
      setQuiz({ quizStep: 'done' });
    });
  }

  // ============================================================
  // REVIEWS CAROUSEL
  // ============================================================
  var revBusy = false, revAuto = null, revT = null;
  // Strip any stray wrapping quote marks/space so the template's curly quotes aren't doubled.
  function stripQ(s) { return String(s).replace(/^[\s"'“”]+|[\s"'“”]+$/g, ''); }
  // Longer testimonials get a smaller, left-aligned, denser treatment so the card stays compact.
  function quoteStyle(len) {
    if (len > 280) return { font: 'clamp(15px,1.7vw,18px)', line: '1.62', align: 'left', maxw: '600px' };
    if (len > 150) return { font: 'clamp(17px,2.1vw,22px)', line: '1.5', align: 'left', maxw: '560px' };
    return { font: 'clamp(20px,3vw,29px)', line: '1.44', align: 'center', maxw: '520px' };
  }
  function renderReviews() {
    var stage = $('ulr-rev-stage');
    var n = reviews.length;
    var idx = ((state.revIdx % n) + n) % n;
    var active = reviews[idx], prev = reviews[(idx - 1 + n) % n], next = reviews[(idx + 1) % n];
    var showSides = !state.isMobile;
    var cardOpacity = state.revCardOn === false ? 0 : 1;
    var cardShift = state.revCardOn === false ? '12px' : '0px';

    var aq = stripQ(active.quote), qs = quoteStyle(aq.length);

    var html = '';
    // lotus motif
    html += '<div data-bloom aria-hidden="true" style="position:absolute; left:50%; top:50%; width:min(620px,96%); transform:translate(-50%,-50%); pointer-events:none; z-index:0; animation:lotusBloom .9s cubic-bezier(.22,.61,.36,1) both;">' +
      '<div style="position:absolute; left:50%; top:50%; width:74%; padding-bottom:74%; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(62,90,80,.5), rgba(44,65,57,0) 68%);"></div>' +
      '<img src="uploads/logo.png" alt="" style="position:relative; display:block; width:52%; margin:0 auto;"></div>';

    if (showSides) {
      html += '<div data-rev="prev" aria-hidden="true" style="position:absolute; left:0; top:50%; transform:translateY(-50%); width:300px; max-width:30%; z-index:1; cursor:pointer; opacity:.3; filter:blur(1.5px);">' +
        '<div style="background:rgba(52,80,70,.42); border:1px solid rgba(247,243,234,.08); border-radius:18px; padding:26px 24px;">' +
        '<p style="margin:0; font-family:\'Libre Baskerville\',serif; font-size:17px; line-height:1.4; color:#F7F3EA; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">&ldquo;' + esc(stripQ(prev.quote)) + '&rdquo;</p>' +
        '<p style="margin:14px 0 0; color:rgba(247,243,234,.7); font-size:12.5px;">' + esc(prev.name) + '</p></div></div>';
    }

    html += '<div style="position:relative; z-index:2; width:min(620px,100%); opacity:' + cardOpacity + '; transform:translateY(' + cardShift + '); transition:opacity .42s ease, transform .6s cubic-bezier(.22,.61,.36,1);">' +
      '<div style="position:relative; background:linear-gradient(180deg,#3E5A50,rgba(55,81,71,.92)); border:1px solid rgba(247,243,234,.14); border-radius:24px; padding:clamp(34px,5vw,52px) clamp(26px,5vw,52px); box-shadow:0 40px 80px -36px rgba(0,0,0,.5); text-align:center; overflow:hidden;">' +
      '<div data-bloom style="width:64px; height:3px; border-radius:2px; background:#FF6600; margin:0 auto 22px; animation:accentGrow .8s cubic-bezier(.22,.61,.36,1) both;"></div>' +
      '<div style="display:flex; justify-content:center; gap:5px; color:#FF6600; font-size:17px; margin-bottom:20px; letter-spacing:.08em;">' + active.stars + '</div>' +
      '<p style="margin:0 auto; max-width:' + qs.maxw + '; min-height:clamp(96px,13vh,130px); max-height:46vh; overflow:auto; display:flex; align-items:center; justify-content:center; font-family:\'Libre Baskerville\',serif; font-size:' + qs.font + '; line-height:' + qs.line + '; color:#fff; text-align:' + qs.align + ';"><span>&ldquo;' + esc(aq) + '&rdquo;</span></p>' +
      '<div style="display:flex; align-items:center; justify-content:center; gap:14px; margin-top:30px;">' +
      '<span style="flex:0 0 auto; width:46px; height:46px; border-radius:50%; background:#DED2B8; display:flex; align-items:center; justify-content:center; color:#2C4139; font-weight:700; font-size:15px;">' + esc(active.initials) + '</span>' +
      '<div style="text-align:left;"><p style="margin:0; color:#fff; font-size:15px; font-weight:600;">' + esc(active.name) + '</p>' +
      '<p style="margin:2px 0 0; color:rgba(247,243,234,.62); font-size:13px;">' + esc(active.role) + '</p></div></div></div></div>';

    if (showSides) {
      html += '<div data-rev="next" aria-hidden="true" style="position:absolute; right:0; top:50%; transform:translateY(-50%); width:300px; max-width:30%; z-index:1; cursor:pointer; opacity:.3; filter:blur(1.5px); text-align:right;">' +
        '<div style="background:rgba(52,80,70,.42); border:1px solid rgba(247,243,234,.08); border-radius:18px; padding:26px 24px;">' +
        '<p style="margin:0; font-family:\'Libre Baskerville\',serif; font-size:17px; line-height:1.4; color:#F7F3EA; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">&ldquo;' + esc(stripQ(next.quote)) + '&rdquo;</p>' +
        '<p style="margin:14px 0 0; color:rgba(247,243,234,.7); font-size:12.5px;">' + esc(next.name) + '</p></div></div>';
      html += arrowBtn('prev', '&#8249;', '-4px', null) + arrowBtn('next', '&#8250;', null, '-4px');
    }
    stage.innerHTML = html;

    var p = stage.querySelector('[data-rev="prev"]'); if (p) p.onclick = revPrev;
    var nx = stage.querySelector('[data-rev="next"]'); if (nx) nx.onclick = revNext;
    Array.prototype.forEach.call(stage.querySelectorAll('[data-arrow]'), function (b) {
      b.onclick = b.getAttribute('data-arrow') === 'prev' ? revPrev : revNext;
      b.onmouseover = function () { b.style.background = '#FF6600'; b.style.borderColor = '#FF6600'; };
      b.onmouseout = function () { b.style.background = 'rgba(29,37,33,.45)'; b.style.borderColor = 'rgba(247,243,234,.25)'; };
    });

    // dots
    var dots = $('ulr-rev-dots');
    dots.innerHTML = '';
    reviews.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Go to testimonial');
      b.style.cssText = 'width:' + (i === idx ? '26px' : '8px') + '; height:8px; border-radius:999px; border:0; cursor:pointer; background:' + (i === idx ? '#FF6600' : 'rgba(247,243,234,.28)') + '; transition:width .45s ease, background .45s ease; padding:0;';
      b.onclick = function () { revGo(i); };
      dots.appendChild(b);
    });
    $('ulr-rev-progress').textContent = ('0' + (idx + 1)) + ' / 0' + n;
  }
  function arrowBtn(dir, glyph, left, right) {
    return '<button data-arrow="' + dir + '" aria-label="' + (dir === 'prev' ? 'Previous' : 'Next') + ' testimonial" style="position:absolute; ' + (left != null ? 'left:' + left + ';' : '') + (right != null ? 'right:' + right + ';' : '') + ' top:50%; transform:translateY(-50%); z-index:3; width:46px; height:46px; min-width:46px; min-height:46px; border-radius:50%; border:1px solid rgba(247,243,234,.25); background:rgba(29,37,33,.45); color:#F7F3EA; cursor:pointer; font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background .25s,border-color .25s;">' + glyph + '</button>';
  }
  function revGo(i) {
    var n = reviews.length; i = ((i % n) + n) % n;
    if (i === ((state.revIdx % n) + n) % n || revBusy) return;
    revBusy = true;
    state.revCardOn = false; renderReviews();
    clearTimeout(revT);
    revT = setTimeout(function () {
      state.revIdx = i; state.revCardOn = true; state.revBloom++;
      renderReviews(); revBusy = false;
    }, reduceMotion() ? 30 : 400);
  }
  function revNext() { revGo(state.revIdx + 1); }
  function revPrev() { revGo(state.revIdx - 1); }
  function revStartAuto() { revStopAuto(); revAuto = setInterval(function () { if (!state.revPaused && !document.hidden) revNext(); }, 8500); }
  function revStopAuto() { if (revAuto) { clearInterval(revAuto); revAuto = null; } }

  // ============================================================
  // OWNERSHIP DASHBOARD
  // ============================================================
  function renderOwnership() {
    // chips
    var chips = $('ulr-own-chips'); chips.innerHTML = '';
    benefits.slice(0, 3).forEach(function (c) {
      chips.appendChild(el('<div style="display:flex; align-items:center; gap:12px;">' +
        '<span style="flex:0 0 auto; width:22px; height:22px; border-radius:50%; background:rgba(255,102,0,.12); display:flex; align-items:center; justify-content:center; color:#FF6600; font-size:12px; font-weight:800;">&#10003;</span>' +
        '<span style="color:#2C4139; font-size:15px; font-weight:600;">' + esc(c) + '</span></div>'));
    });
    // tabs
    var tabs = $('ulr-own-tabs'); tabs.innerHTML = '';
    ownTabLabels.forEach(function (label, i) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'flex:1; background:none; border:0; cursor:pointer; padding:0 6px 14px; font-size:clamp(13px,1.6vw,15px); font-weight:' + (i === state.ownTab ? '700' : '500') + '; color:' + (i === state.ownTab ? '#2C4139' : '#7c8a82') + '; transition:color .3s;';
      b.onclick = function () { setState({ ownTab: i }); };
      tabs.appendChild(b);
    });
    $('ulr-own-underline').style.transform = 'translateX(' + (state.ownTab * 100) + '%)';
    var card = ownershipCards[state.ownTab] || ownershipCards[0];
    var content = $('ulr-own-content');
    content.innerHTML = '<h3 style="margin:0 0 12px; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:clamp(20px,2.6vw,25px); color:#2C4139; line-height:1.25;">' + esc(card.title) + '</h3>' +
      '<p style="margin:0; color:#5b6a62; font-size:15.5px; line-height:1.6; max-width:460px;">' + esc(card.body) + '</p>';
    content.style.animation = 'none'; void content.offsetWidth; content.style.animation = 'tabIn .5s ease both';

    // drawer
    $('ulr-own-expandlabel').textContent = state.ownExpanded ? 'Hide financial benefits' : 'View more financial benefits';
    $('ulr-own-arrow').style.transform = 'rotate(' + (state.ownExpanded ? '180deg' : '0deg') + ')';
    $('ulr-own-drawer').style.maxHeight = state.ownExpanded ? '200px' : '0px';
    $('ulr-own-drawer').style.opacity = state.ownExpanded ? 1 : 0;
    var extra = $('ulr-own-extra'); extra.innerHTML = '';
    benefits.slice(3).forEach(function (b) {
      extra.appendChild(el('<span style="display:inline-flex; align-items:center; gap:8px; background:#F7F3EA; border:1px solid #E4D9C0; border-radius:999px; padding:8px 14px; color:#2C4139; font-size:13.5px; font-weight:500;"><span style="flex:0 0 auto; width:6px; height:6px; border-radius:50%; background:#FF6600;"></span>' + esc(b) + '</span>'));
    });
  }

  // ============================================================
  // HOME OPTIONS SLIDER
  // ============================================================
  var homeAuto = null;
  var planModalBodyOverflow = '';
  function setupPlanLayer(img, h, i, variant) {
    img.src = h.plan;
    img.alt = h.name + ' floor plan';
    img.draggable = false;
    img.dataset.planIndex = String(i);
    img.style.cssText = 'position:absolute; left:50%; top:50%; display:block; object-fit:contain; opacity:0; z-index:1; pointer-events:none; user-select:none; transition:opacity ' + (variant === 'modal' ? '.34s' : '.28s') + ' ease; will-change:opacity; backface-visibility:hidden; filter:drop-shadow(0 10px 22px rgba(0,0,0,.4));';
    if (h.planRot === 90) {
      img.style.width = '100cqh';
      img.style.height = '100cqw';
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.transform = 'translate(-50%,-50%) rotate(90deg)';
      img.style.transformOrigin = '50% 50%';
    } else {
      img.style.maxWidth = variant === 'modal' ? 'calc(100% - 24px)' : '100%';
      img.style.maxHeight = variant === 'modal' ? 'calc(100% - 24px)' : '100%';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.transform = 'translate(-50%,-50%)';
    }
  }
  function ensurePlanStage(stageId, variant) {
    var stage = $(stageId);
    if (!stage || stage.dataset.built) return;
    homes.forEach(function (h, i) {
      if (!h.plan) return;
      var img = document.createElement('img');
      setupPlanLayer(img, h, i, variant);
      stage.appendChild(img);
    });
    stage.dataset.built = '1';
  }
  function renderPlanStage(stageId, hIdx) {
    var stage = $(stageId);
    if (!stage) return;
    Array.prototype.forEach.call(stage.querySelectorAll('[data-plan-index]'), function (img) {
      var active = Number(img.dataset.planIndex) === hIdx;
      img.style.opacity = active ? '1' : '0';
      img.style.zIndex = active ? '2' : '1';
      img.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  }
  function ensureHomePlanImages() { ensurePlanStage('ulr-home-plan-stage', 'thumb'); }
  function ensurePlanModalImages() { ensurePlanStage('ulr-plan-modal-stage', 'modal'); }
  function renderHomePlan(hIdx) {
    ensureHomePlanImages();
    renderPlanStage('ulr-home-plan-stage', hIdx);
  }
  function renderPlanModal(hIdx) {
    hIdx = hIdx == null ? ((state.homeIdx % homes.length) + homes.length) % homes.length : hIdx;
    var h = homes[hIdx];
    var title = $('ulr-plan-title');
    var eyebrow = $('ulr-plan-eyebrow');
    if (title) title.textContent = h.name + ' floor plan';
    if (eyebrow) eyebrow.textContent = h.badge;
    ensurePlanModalImages();
    renderPlanStage('ulr-plan-modal-stage', hIdx);
  }
  function openPlanModal() {
    var modal = $('ulr-plan-modal');
    if (!modal) return;
    state.planModalOpen = true;
    planModalBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    renderPlanModal();
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    var close = $('ulr-plan-close');
    if (close) close.focus({ preventScroll: true });
  }
  function closePlanModal() {
    var modal = $('ulr-plan-modal');
    if (!modal || !state.planModalOpen) return;
    state.planModalOpen = false;
    document.body.style.overflow = planModalBodyOverflow;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    var trigger = $('ulr-home-plan-frame');
    if (trigger) trigger.focus({ preventScroll: true });
  }
  function renderHomeImages() {
    var host = $('ulr-home-images');
    if (!host.dataset.built) {
      homes.forEach(function (h) {
        var img = document.createElement('img');
        img.alt = '';
        img.dataset.desk = h.img;
        img.dataset.phone = h.imgPhone || h.img;
        img.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transform:scale(1.0); transition:opacity .9s ease, transform 9s ease-out; z-index:1;';
        host.appendChild(img);
      });
      host.dataset.built = '1';
    }
    var hIdx = ((state.homeIdx % homes.length) + homes.length) % homes.length;
    Array.prototype.forEach.call(host.children, function (img, i) {
      // pick the phone or desktop photo for the current device (swaps on resize across the breakpoint)
      var want = state.isMobile ? img.dataset.phone : img.dataset.desk;
      if (img.getAttribute('src') !== want) img.src = want;
      img.style.opacity = i === hIdx ? 1 : 0;
      img.style.transform = i === hIdx ? 'scale(1.1)' : 'scale(1.0)';
      img.style.zIndex = i === hIdx ? 2 : 1;
    });
  }
  function renderHomePanel() {
    var hIdx = ((state.homeIdx % homes.length) + homes.length) % homes.length;
    var h = homes[hIdx];
    var specsHtml = '';
    h.specs.forEach(function (t, i) {
      specsHtml += '<div style="display:flex; align-items:center; gap:10px; color:#3E5A50; font-size:14.5px; animation:bulletIn .5s ease both; animation-delay:' + (140 + i * 90) + 'ms;">' +
        '<span style="flex:0 0 auto; width:6px; height:6px; border-radius:50%; background:#FF6600;"></span>' + esc(t) + '</div>';
    });
    var panel = $('ulr-home-panel');
    var mob = state.isMobile;
    var expanded = !mob || state.homeExpanded;   // desktop always shows the full specs
    var sameHome = panel.dataset.hidx === String(hIdx);
    panel.dataset.hidx = String(hIdx);
    panel.style.cssText = 'flex:1 1 360px; max-width:480px; background:rgba(247,243,234,.95); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(247,243,234,.5); border-radius:22px; box-shadow:0 40px 80px -42px rgba(0,0,0,.6); padding:clamp(24px,3vw,36px);';

    // Button base + the two visual variants. Desktop keeps the original pairing
    // (View details = filled green, Request brochure = outline). Mobile swaps them.
    var btnBase = 'flex:1 1 auto; cursor:pointer; font-weight:600; font-size:14.5px; padding:14px 22px; border-radius:12px; transition:background .25s,color .25s;';
    var fillBtn = btnBase + 'border:0; background:#3E5A50; color:#F7F3EA;';
    var outlineBtn = btnBase + 'border:1.5px solid #3E5A50; background:transparent; color:#3E5A50;';
    var detailsFilled = !mob;                     // desktop filled, mobile outline
    var detailsLabel = (mob && expanded) ? 'Hide details' : 'View details';

    panel.innerHTML =
      '<span style="display:inline-block; background:#2C4139; color:#F7F3EA; font-size:11.5px; font-weight:600; letter-spacing:.06em; padding:6px 12px; border-radius:999px; margin-bottom:16px;">' + esc(h.badge) + '</span>' +
      '<h3 style="margin:0 0 6px; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:clamp(28px,3.6vw,38px); color:#2C4139; line-height:1.04;">' + esc(h.name) + '</h3>' +
      '<p style="margin:0 0 ' + (expanded ? '22px' : '20px') + '; color:#FF6600; font-weight:700; font-size:clamp(16px,2vw,19px);">' + esc(h.price) + '</p>' +
      (expanded ? '<div style="display:grid; grid-template-columns:1fr 1fr; gap:11px 18px; margin-bottom:26px;">' + specsHtml + '</div>' : '') +
      '<div style="display:flex; flex-wrap:wrap; gap:12px;">' +
      '<button data-act="details" style="' + (detailsFilled ? fillBtn : outlineBtn) + '">' + detailsLabel + '</button>' +
      '<button data-act="brochure" style="' + (detailsFilled ? outlineBtn : fillBtn) + '">Request brochure</button>' +
      '</div>';
    // Replay the slide-in only when the home actually changes — not on a collapse/expand toggle.
    if (!sameHome) { panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = 'panelIn .7s cubic-bezier(.22,.61,.36,1) both'; }

    renderHomePlan(hIdx);
    if (state.planModalOpen) renderPlanModal(hIdx);

    var dt = panel.querySelector('[data-act="details"]');
    var bro = panel.querySelector('[data-act="brochure"]');
    function hoverFill(btn) { btn.onmouseover = function () { btn.style.background = '#2C4139'; }; btn.onmouseout = function () { btn.style.background = '#3E5A50'; }; }
    function hoverOutline(btn) { btn.onmouseover = function () { btn.style.background = '#3E5A50'; btn.style.color = '#F7F3EA'; }; btn.onmouseout = function () { btn.style.background = 'transparent'; btn.style.color = '#3E5A50'; }; }
    (detailsFilled ? hoverFill : hoverOutline)(dt);
    (detailsFilled ? hoverOutline : hoverFill)(bro);

    if (mob) {
      // Mobile: View details expands/collapses the card (stop auto-rotate so it doesn't yank away).
      dt.onclick = function () { homeStopAuto(); setState({ homeExpanded: !state.homeExpanded }); };
    } else {
      dt.onclick = goToQuizContact;
    }
    bro.onclick = function () {
      var name = h.name;
      if (state.brochureHomes.indexOf(name) === -1) state.brochureHomes.push(name);
      goToQuizContact();
    };

    // selectors
    var sel = $('ulr-home-selectors'); sel.innerHTML = '';
    homes.forEach(function (hm, i) {
      var b = document.createElement('button');
      b.style.cssText = 'background:none; border:0; cursor:pointer; padding:4px 0; font-family:\'Libre Baskerville\',serif; font-size:17px; color:' + (i === hIdx ? '#ffffff' : 'rgba(247,243,234,.5)') + '; position:relative; transition:color .3s;';
      b.innerHTML = esc(hm.name.replace('The ', '')) + '<span style="position:absolute; left:0; right:0; bottom:-3px; height:2px; background:#FF6600; opacity:' + (i === hIdx ? 1 : 0) + '; transition:opacity .3s;"></span>';
      b.onclick = function () { homeGo(i); };
      sel.appendChild(b);
    });
    $('ulr-home-progresslabel').textContent = ('0' + (hIdx + 1)) + ' / 0' + homes.length;
    $('ulr-home-progressbar').style.width = (((hIdx + 1) / homes.length) * 100) + '%';
  }
  function homeGo(i) {
    var n = homes.length; i = ((i % n) + n) % n;
    if (i === state.homeIdx) return;
    setState({ homeIdx: i, homeExpanded: false }); homeRestartAuto();
  }
  function homeNext() { homeGo(state.homeIdx + 1); }
  function homePrev() { homeGo(state.homeIdx - 1); }
  function homeStartAuto() { homeStopAuto(); homeAuto = setInterval(function () { if (!state.homePaused && !state.planModalOpen && !document.hidden) homeNext(); }, 8000); }
  function homeStopAuto() { if (homeAuto) { clearInterval(homeAuto); homeAuto = null; } }
  function homeRestartAuto() { homeStartAuto(); }

  // ============================================================
  // MASTERPLAN MAP
  // ============================================================
  var SVGNS = 'http://www.w3.org/2000/svg';
  var zoneEditDrag = null;

  function getZone(id) {
    return zoneData.find(function (z) { return z.id === id; }) || null;
  }

  function fmtCoord(n) {
    return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  }

  function cornerPoint(from, to, radius) {
    var dx = to[0] - from[0];
    var dy = to[1] - from[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var d = Math.min(radius, len * 0.44);
    return [from[0] + (dx / len) * d, from[1] + (dy / len) * d];
  }

  function roundedRingPath(points, radius) {
    if (!points || points.length < 3) return '';
    var r = radius || 32;
    var n = points.length;
    var first = cornerPoint(points[0], points[1], r);
    var parts = ['M ' + fmtCoord(first[0]) + ' ' + fmtCoord(first[1])];
    for (var i = 1; i <= n; i++) {
      var curr = points[i % n];
      var prev = points[(i - 1 + n) % n];
      var next = points[(i + 1) % n];
      var entry = cornerPoint(curr, prev, r);
      var exit = cornerPoint(curr, next, r);
      parts.push('L ' + fmtCoord(entry[0]) + ' ' + fmtCoord(entry[1]));
      parts.push('Q ' + fmtCoord(curr[0]) + ' ' + fmtCoord(curr[1]) + ' ' + fmtCoord(exit[0]) + ' ' + fmtCoord(exit[1]));
    }
    parts.push('Z');
    return parts.join(' ');
  }

  function zonePath(zone) {
    if (zone.path) return zone.path;
    return (zone.rings || []).map(function (ring) {
      return roundedRingPath(ring, zone.cornerRadius || 34);
    }).join(' ');
  }

  function mapPointFromEvent(e) {
    var svg = $('ulr-map-svg');
    var rect = svg.getBoundingClientRect();
    return [
      Math.max(0, Math.min(mapSize.width, ((e.clientX - rect.left) / rect.width) * mapSize.width)),
      Math.max(0, Math.min(mapSize.height, ((e.clientY - rect.top) / rect.height) * mapSize.height))
    ];
  }

  function zoneExportData() {
    return zoneData.map(function (z) {
      return {
        id: z.id,
        name: z.name,
        label: z.label,
        rings: z.rings,
        path: zonePath(z)
      };
    });
  }

  function renderZoneEditPanel() {
    if (!zoneEditMode) return;
    var wrap = $('ulr-mapwrap');
    if (!wrap) return;
    var panel = $('ulr-zone-edit-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ulr-zone-edit-panel';
      panel.style.cssText = 'position:absolute; left:14px; bottom:14px; z-index:12; width:min(380px,calc(100% - 28px)); max-height:46%; display:flex; flex-direction:column; gap:8px; padding:10px 12px; border-radius:12px; background:rgba(29,37,33,.9); border:1px solid rgba(255,102,0,.5); color:#F7F3EA; font:12px/1.4 Consolas, monospace; box-shadow:0 18px 50px -22px rgba(0,0,0,.75); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);';
      panel.innerHTML = '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><strong style="font:700 12px Mulish,sans-serif; letter-spacing:.08em; text-transform:uppercase; color:#FF6600;">Zone edit</strong><div style="display:flex; gap:6px;"><button data-copy-zone-json style="border:0; border-radius:999px; background:#FF6600; color:#fff; font:700 11px Mulish,sans-serif; padding:6px 10px; cursor:pointer;">Copy JSON</button><button data-toggle aria-label="Collapse" style="border:1px solid rgba(247,243,234,.3); border-radius:8px; background:transparent; color:#F7F3EA; font:700 13px Mulish,sans-serif; width:28px; height:28px; cursor:pointer;">▸</button></div></div><div data-body style="display:none; flex-direction:column; gap:8px; min-height:0;"><textarea id="ulr-zone-edit-output" readonly style="width:100%; min-height:120px; resize:vertical; border:1px solid rgba(247,243,234,.18); border-radius:8px; background:rgba(0,0,0,.22); color:#F7F3EA; padding:8px; font:11px/1.35 Consolas,monospace;"></textarea><div style="font:11px Mulish,sans-serif; color:rgba(247,243,234,.72);">Drag orange points to tune boundaries. Tip: open with <code>?map=mobile&zoneEdit=1</code> on desktop to edit with a mouse.</div></div>';
      wrap.appendChild(panel);
      panel.querySelector('[data-copy-zone-json]').onclick = function () {
        var text = $('ulr-zone-edit-output').value;
        if (navigator.clipboard) navigator.clipboard.writeText(text);
      };
      var zBody = panel.querySelector('[data-body]');
      panel.querySelector('[data-toggle]').onclick = function () {
        var open = zBody.style.display !== 'none';
        zBody.style.display = open ? 'none' : 'flex';
        this.textContent = open ? '▸' : '▾';
      };
    }
    var out = $('ulr-zone-edit-output');
    if (out) out.value = JSON.stringify(zoneExportData(), null, 2);
  }

  function renderZoneEditAnchors() {
    var svg = $('ulr-map-svg');
    if (!svg || !zoneEditMode) return;
    var old = svg.querySelector('[data-zone-editor]');
    if (old) old.remove();
    var group = document.createElementNS(SVGNS, 'g');
    group.setAttribute('data-zone-editor', 'true');
    zoneData.forEach(function (zone, zoneIndex) {
      (zone.rings || []).forEach(function (ring, ringIndex) {
        ring.forEach(function (pt, pointIndex) {
          var circle = document.createElementNS(SVGNS, 'circle');
          circle.setAttribute('cx', pt[0]);
          circle.setAttribute('cy', pt[1]);
          circle.setAttribute('r', '8');
          circle.setAttribute('vector-effect', 'non-scaling-stroke');
          circle.style.fill = '#F7F3EA';
          circle.style.stroke = '#FF6600';
          circle.style.strokeWidth = '2.4';
          circle.style.cursor = 'grab';
          circle.dataset.zoneIndex = zoneIndex;
          circle.dataset.ringIndex = ringIndex;
          circle.dataset.pointIndex = pointIndex;
          circle.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            zoneEditDrag = { zone: zone, ring: ring, point: pt };
            circle.style.cursor = 'grabbing';
          });
          circle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
          });
          group.appendChild(circle);
        });
      });
    });
    svg.appendChild(group);
    renderZoneEditPanel();
  }

  function updateZoneEditDrag(e) {
    if (!zoneEditDrag) return;
    var p = mapPointFromEvent(e);
    zoneEditDrag.point[0] = Math.round(p[0]);
    zoneEditDrag.point[1] = Math.round(p[1]);
    var path = document.querySelector('[data-zone="' + zoneEditDrag.zone.id + '"]');
    if (path) path.setAttribute('d', zonePath(zoneEditDrag.zone));
    renderZoneEditAnchors();
  }

  function renderMapStatic() {
    var svg = $('ulr-map-svg');
    var labels = $('ulr-map-labels');
    if (!svg || !labels) return;
    svg.innerHTML = '';
    labels.innerHTML = '';

    zoneData.forEach(function (z) {
      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', zonePath(z));
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.setAttribute('aria-label', z.name + ' residential area');
      path.style.strokeLinejoin = 'round';
      path.style.strokeLinecap = 'round';
      path.style.cursor = 'pointer';
      path.style.outline = 'none';  // drop the default focus box (orange highlight is the indicator)
      path.style.transition = 'fill .25s ease, stroke .25s ease, stroke-width .25s ease, filter .25s ease';
      path.dataset.zone = z.id;
      path.addEventListener('click', function () { openZone(z.id); });
      path.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openZone(z.id);
        }
      });
      path.addEventListener('pointerenter', function () { if (!state.isMobile) setMapHover(z.id); });
      path.addEventListener('pointerleave', function () { if (!state.isMobile) setMapHover(null); });
      svg.appendChild(path);

      var label = document.createElement('div');
      label.dataset.zoneLabel = z.id;
      label.textContent = z.name;
      label.style.cssText = 'position:absolute; left:' + ((z.label.x / mapSize.width) * 100) + '%; top:' + ((z.label.y / mapSize.height) * 100) + '%; transform:translate(-50%,-50%); padding:6px 11px; border-radius:999px; border:1px solid rgba(247,243,234,.76); background:rgba(44,65,57,.74); color:#F7F3EA; font-family:\'Libre Baskerville\',serif; font-size:clamp(10px,1.25vw,13px); line-height:1; letter-spacing:.04em; white-space:nowrap; box-shadow:0 10px 24px -16px rgba(29,37,33,.75); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); opacity:.9; transition:opacity .25s ease, background .25s ease, color .25s ease, border-color .25s ease, transform .25s ease;';
      labels.appendChild(label);
    });
    renderZoneEditAnchors();
  }

  function renderMapDynamic() {
    var svg = $('ulr-map-svg');
    if (!svg) return;
    Array.prototype.forEach.call(svg.querySelectorAll('[data-zone]'), function (path) {
      var id = path.dataset.zone;
      var active = state.activeZone === id;
      var selected = state.enquiryZone === id;
      var hovered = state.hoverZone === id;
      if (active || selected) {
        path.style.fill = 'rgba(255,102,0,.30)';
        path.style.stroke = '#FF6600';
        path.style.strokeWidth = active ? '2.6' : '2.2';
        path.style.filter = 'drop-shadow(0 0 10px rgba(255,102,0,.38))';
      } else if (hovered) {
        path.style.fill = 'rgba(255,102,0,.20)';
        path.style.stroke = 'rgba(255,102,0,.92)';
        path.style.strokeWidth = '1.9';
        path.style.filter = 'drop-shadow(0 0 7px rgba(255,102,0,.25))';
      } else {
        path.style.fill = 'rgba(255,238,203,.14)';
        path.style.stroke = 'rgba(255,238,203,.78)';
        path.style.strokeWidth = '1.35';
        path.style.filter = 'none';
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-zone-label]'), function (label) {
      var id = label.dataset.zoneLabel;
      var on = state.activeZone === id || state.enquiryZone === id || state.hoverZone === id;
      label.style.opacity = on ? '1' : '.88';
      label.style.background = on ? 'rgba(247,243,234,.96)' : 'rgba(44,65,57,.74)';
      label.style.color = on ? '#2C4139' : '#F7F3EA';
      label.style.borderColor = on ? 'rgba(255,102,0,.82)' : 'rgba(247,243,234,.76)';
      label.style.transform = 'translate(-50%,-50%) scale(' + (on ? '1.04' : '1') + ')';
    });
    renderMapPanels();
    renderSelectedZoneChip();
  }

  function setMapHover(id) {
    state.hoverZone = id;
    renderMapDynamic();
  }

  function openZone(id) {
    state.activeZone = id;
    state.hoverZone = null;
    closeNearbyPanel();
    renderMapDynamic();
  }

  function addZoneToEnquiry(id) {
    state.enquiryZone = id;
    state.activeZone = null;
    state.hoverZone = null;
    renderMapDynamic();
    goToQuizContact();
  }

  function clearEnquiryZone() {
    state.enquiryZone = null;
    renderMapDynamic();
  }

  function zonePanelHtml(zone, big) {
    var added = state.enquiryZone === zone.id;
    return '<div>' +
      '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:' + (big ? '18px' : '16px') + ';">' +
      '<div><span style="display:inline-block; margin-bottom:10px; color:#FF6600; letter-spacing:.18em; text-transform:uppercase; font-size:11px; font-weight:700;">Residential area</span>' +
      '<h3 style="margin:0; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:' + (big ? '28px' : '24px') + '; line-height:1.15; color:#2C4139;">' + esc(zone.name) + '</h3></div>' +
      '<button data-act="close" aria-label="Close zone panel" style="flex:0 0 auto; width:34px; height:34px; min-width:34px; min-height:34px; border-radius:50%; border:1px solid #E4D9C0; background:#fff; color:#3E5A50; cursor:pointer; font-size:20px; line-height:1; display:flex; align-items:center; justify-content:center;">&times;</button>' +
      '</div>' +
      '<p style="margin:0 0 ' + (big ? '22px' : '20px') + '; color:#5b6a62; font-size:' + (big ? '15.5px' : '14.5px') + '; line-height:1.55;">Interested in homes within this area? Add ' + esc(zone.name) + ' to your enquiry and the team will follow up with availability.</p>' +
      '<button data-act="add-zone" class="ulr-btn-primary" style="width:100%; font-size:' + (big ? '15.5px' : '14.5px') + '; padding:' + (big ? '15px' : '13px') + '; border-radius:12px;">' + (added ? 'Update enquiry with ' : 'Add ') + esc(zone.name) + (added ? '' : ' to enquiry') + '</button>' +
      '</div>';
  }

  function renderMapPanels() {
    var card = $('ulr-map-card');
    var sheet = $('ulr-map-sheet');
    var zone = getZone(state.activeZone);
    var open = !!zone;
    if (!card || !sheet) return;
    if (open && !state.isMobile) {
      card.style.display = 'block';
      card.innerHTML = zonePanelHtml(zone, false);
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'panelIn .4s ease both';
      card.querySelector('[data-act="close"]').onclick = closePanel;
      card.querySelector('[data-act="add-zone"]').onclick = function () { addZoneToEnquiry(zone.id); };
    } else {
      card.style.display = 'none';
    }
    if (open && state.isMobile) {
      sheet.style.display = 'flex';
      var inner = $('ulr-map-sheet-inner');
      inner.innerHTML = '<div style="width:42px; height:5px; border-radius:999px; background:#DED2B8; margin:0 auto 22px;"></div>' + zonePanelHtml(zone, true);
      inner.querySelector('[data-act="close"]').onclick = closePanel;
      inner.querySelector('[data-act="add-zone"]').onclick = function () { addZoneToEnquiry(zone.id); };
    } else {
      sheet.style.display = 'none';
    }
  }
  function renderSelectedZoneChip() {
    var host = $('ulr-selected-zone');
    if (!host) return;
    var zone = getZone(state.enquiryZone);
    if (!zone) { host.style.display = 'none'; host.innerHTML = ''; return; }
    host.style.display = 'flex';
    host.innerHTML = '<span style="color:#2C4139; font-weight:600; font-size:13.5px;">Selected area:</span>' +
      '<span style="display:inline-flex; align-items:center; gap:8px; background:#FF6600; color:#fff; font-size:13px; font-weight:700; padding:7px 13px; border-radius:999px;">' + esc(zone.name) +
      '<button data-act="clear-zone" aria-label="Clear selected zone" style="border:0; background:transparent; color:#fff; cursor:pointer; font-size:17px; line-height:1; padding:0; opacity:.9;">&times;</button></span>';
    host.querySelector('[data-act="clear-zone"]').onclick = clearEnquiryZone;
  }

  function closePanel() {
    state.activeZone = null;
    state.hoverZone = null;
    renderMapDynamic();
  }

  // ============================================================
  // AMENITY MARKERS (circular icon badges over the community buildings)
  // ============================================================
  function nearbyAmenitiesHtml(mode) {
    var rows = nearbyAmenity.items.map(function (item) {
      return '<div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:10px 0; border-bottom:1px solid ' + (mode === 'card' ? 'rgba(247,243,234,.12)' : '#EFE7D5') + ';">' +
        '<span style="display:flex; align-items:center; gap:9px; min-width:0; color:' + (mode === 'card' ? '#F7F3EA' : '#2C4139') + '; font-size:14.5px; font-weight:650;">' +
        '<span style="flex:0 0 auto; width:6px; height:6px; border-radius:50%; background:#FF6600; box-shadow:0 0 10px rgba(255,102,0,.45);"></span>' +
        '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(item.name) + '</span></span>' +
        '<span style="flex:0 0 auto; color:' + (mode === 'card' ? '#fff' : '#FF6600') + '; background:' + (mode === 'card' ? 'rgba(255,102,0,.18)' : 'rgba(255,102,0,.1)') + '; border:1px solid rgba(255,102,0,.34); border-radius:999px; padding:5px 9px; font-size:12.5px; font-weight:800; letter-spacing:.02em;">' + esc(item.distance) + '</span>' +
        '</div>';
    }).join('');

    if (mode === 'card') {
      return '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:12px;">' +
        '<div style="display:flex; align-items:center; gap:12px; min-width:0;">' +
        '<span style="flex:0 0 auto; width:42px; height:42px; border-radius:50%; background:#FF6600; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 18px -2px rgba(255,102,0,.68);">' + amenitySvg(nearbyAmenity.icon, 22) + '</span>' +
        '<div style="min-width:0;"><span style="display:block; color:#FF6600; letter-spacing:.16em; text-transform:uppercase; font-size:10px; font-weight:800;">Nearby</span>' +
        '<h3 style="margin:3px 0 0; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:22px; line-height:1.1; color:#F7F3EA;">Amenities</h3></div></div>' +
        '<button data-act="nearby-close" aria-label="Close nearby amenities" style="flex:0 0 auto; width:32px; height:32px; min-width:32px; min-height:32px; border-radius:50%; border:1px solid rgba(247,243,234,.18); background:rgba(247,243,234,.08); color:#F7F3EA; cursor:pointer; font-size:20px; line-height:1; display:flex; align-items:center; justify-content:center;">&times;</button></div>' +
        '<p style="margin:0 0 8px; color:rgba(247,243,234,.72); font-size:13.5px; line-height:1.45;">' + esc(nearbyAmenity.intro) + '</p>' +
        '<div style="display:grid; gap:0;">' + rows + '</div>';
    }

    return '<div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">' +
      '<span style="flex:0 0 auto; width:54px; height:54px; border-radius:50%; background:#FF6600; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 18px -2px rgba(255,102,0,.68);">' + amenitySvg(nearbyAmenity.icon, 28) + '</span>' +
      '<div><span style="display:block; color:#FF6600; letter-spacing:.16em; text-transform:uppercase; font-size:11px; font-weight:800;">Nearby amenities</span>' +
      '<h3 style="margin:3px 0 0; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:25px; line-height:1.1; color:#2C4139;">Closest places</h3></div></div>' +
      '<p style="margin:0 0 10px; color:#5b6a62; font-size:15px; line-height:1.55;">' + esc(nearbyAmenity.intro) + '</p>' +
      '<div style="display:grid; gap:0; margin-top:4px;">' + rows + '</div>' +
      '<button data-act="nearby-close" class="ulr-btn-primary" style="margin-top:20px; width:100%; font-size:15px; padding:14px; border-radius:12px;">Close</button>';
  }

  function renderNearbyCard() {
    var wrap = $('ulr-mapwrap');
    if (!wrap) return;
    var card = $('ulr-nearby-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'ulr-nearby-card';
      card.style.cssText = 'display:none; position:absolute; z-index:10; width:min(360px,calc(100% - 32px)); max-height:calc(100% - 110px); overflow:auto; pointer-events:auto; padding:22px; border-radius:18px; background:linear-gradient(180deg, rgba(62,90,80,.99), rgba(29,42,37,.99)); border:1px solid rgba(247,243,234,.22); box-shadow:0 30px 78px -26px rgba(0,0,0,.82), 0 0 0 1px rgba(255,102,0,.12); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);';
      wrap.appendChild(card);
    }
    if (!state.activeNearby || state.isMobile) {
      card.style.display = 'none';
      return;
    }
    card.style.left = 'calc(' + ((nearbyAmenity.x / mapSize.width) * 100) + '% + 34px)';
    card.style.top = 'auto';
    card.style.bottom = '72px';
    card.style.transform = 'none';
    card.style.display = 'block';
    card.innerHTML = nearbyAmenitiesHtml('card');
    card.style.animation = 'none';
    card.style.opacity = '0';
    requestAnimationFrame(function () {
      card.style.transition = 'opacity .26s ease';
      card.style.opacity = '1';
    });
    card.querySelector('[data-act="nearby-close"]').onclick = closeNearbyPanel;
  }

  function closeNearbyPanel() {
    state.activeNearby = false;
    var marker = document.querySelector('.am-marker.am-nearby');
    if (marker) marker.classList.remove('am-on');
    renderNearbyCard();
  }

  function openNearbySheet() {
    var sheet = $('ulr-amenity-sheet'), inner = $('ulr-amenity-sheet-inner');
    if (!sheet || !inner) return;
    state.activeNearby = true;
    inner.innerHTML = '<div style="width:42px; height:5px; border-radius:999px; background:#DED2B8; margin:0 auto 22px;"></div>' + nearbyAmenitiesHtml('sheet');
    inner.querySelector('[data-act="nearby-close"]').onclick = closeAmenitySheet;
    sheet.style.display = 'flex';
  }

  function onNearbyClick(btn) {
    var wasOpen = state.activeNearby;
    closeAmenityPins();
    if (state.isMobile) {
      openNearbySheet();
      btn.classList.add('am-on');
      return;
    }
    state.activeNearby = !wasOpen;
    btn.classList.toggle('am-on', state.activeNearby);
    renderNearbyCard();
  }

  function closeAmenityPins() {
    Array.prototype.forEach.call(document.querySelectorAll('.am-marker.am-on'), function (b) { b.classList.remove('am-on'); });
  }
  function closeAmenitySheet() {
    var sheet = $('ulr-amenity-sheet');
    if (sheet) sheet.style.display = 'none';
    state.activeAmenity = null;
    state.activeNearby = false;
    var nearbyMarker = document.querySelector('.am-marker.am-nearby');
    if (nearbyMarker) nearbyMarker.classList.remove('am-on');
    renderNearbyCard();
  }
  function openAmenitySheet(a) {
    var sheet = $('ulr-amenity-sheet'), inner = $('ulr-amenity-sheet-inner');
    if (!sheet || !inner) return;
    state.activeAmenity = a.id;
    inner.innerHTML =
      '<div style="width:42px; height:5px; border-radius:999px; background:#DED2B8; margin:0 auto 22px;"></div>' +
      '<div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">' +
      '<span style="flex:0 0 auto; width:54px; height:54px; border-radius:50%; background:#2C4139; color:#F7F3EA; display:flex; align-items:center; justify-content:center; box-shadow:0 0 18px -2px rgba(255,102,0,.5);">' + amenitySvg(a.icon, 26) + '</span>' +
      '<div><span style="display:block; color:#FF6600; letter-spacing:.16em; text-transform:uppercase; font-size:11px; font-weight:700;">Resort amenity</span>' +
      '<h3 style="margin:3px 0 0; font-family:\'Libre Baskerville\',serif; font-weight:400; font-size:24px; line-height:1.1; color:#2C4139;">' + esc(a.name) + '</h3></div></div>' +
      '<p style="margin:0; color:#5b6a62; font-size:15px; line-height:1.55;">' + esc(a.blurb) + '</p>' +
      '<button data-act="am-close" class="ulr-btn-primary" style="margin-top:20px; width:100%; font-size:15px; padding:14px; border-radius:12px;">Close</button>';
    inner.querySelector('[data-act="am-close"]').onclick = closeAmenitySheet;
    sheet.style.display = 'flex';
  }
  function onAmenityClick(a, btn) {
    closeNearbyPanel();
    if (state.isMobile) { openAmenitySheet(a); return; }
    var on = btn.classList.contains('am-on');
    closeAmenityPins();
    if (!on) btn.classList.add('am-on');
  }
  function renderAmenityEditPanel() {
    if (!amenityEditMode) return;
    var wrap = $('ulr-mapwrap'); if (!wrap) return;
    var panel = $('ulr-amenity-edit-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ulr-amenity-edit-panel';
      panel.style.cssText = 'position:absolute; right:14px; bottom:14px; z-index:12; width:min(360px,calc(100% - 28px)); max-height:46%; display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:12px; background:rgba(29,37,33,.9); border:1px solid rgba(255,102,0,.5); color:#F7F3EA; box-shadow:0 18px 50px -22px rgba(0,0,0,.75);';
      panel.innerHTML = '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><strong style="font:700 12px Mulish,sans-serif; letter-spacing:.08em; text-transform:uppercase; color:#FF6600;">Amenity edit</strong><div style="display:flex; gap:6px;"><button data-copy style="border:0; border-radius:999px; background:#FF6600; color:#fff; font:700 11px Mulish,sans-serif; padding:6px 10px; cursor:pointer;">Copy</button><button data-toggle aria-label="Collapse" style="border:1px solid rgba(247,243,234,.3); border-radius:8px; background:transparent; color:#F7F3EA; font:700 13px Mulish,sans-serif; width:28px; height:28px; cursor:pointer;">▸</button></div></div><div data-body style="display:none; flex-direction:column; gap:8px; min-height:0;"><textarea id="ulr-amenity-edit-out" readonly style="width:100%; min-height:120px; resize:vertical; border:1px solid rgba(247,243,234,.18); border-radius:8px; background:rgba(0,0,0,.22); color:#F7F3EA; padding:8px; font:11px/1.35 Consolas,monospace;"></textarea><div style="font:11px Mulish,sans-serif; color:rgba(247,243,234,.72);">Drag markers (incl. Nearby) to position. Tip: open with <code>?map=mobile&amenityEdit=1</code> on desktop to edit with a mouse.</div></div>';
      wrap.appendChild(panel);
      panel.querySelector('[data-copy]').onclick = function () { var t = $('ulr-amenity-edit-out'); if (t && navigator.clipboard) navigator.clipboard.writeText(t.value); };
      var aBody = panel.querySelector('[data-body]');
      panel.querySelector('[data-toggle]').onclick = function () {
        var open = aBody.style.display !== 'none';
        aBody.style.display = open ? 'none' : 'flex';
        this.textContent = open ? '▸' : '▾';
      };
    }
    var out = $('ulr-amenity-edit-out');
    if (out) out.value = JSON.stringify({
      amenities: amenities.map(function (a) { return { id: a.id, name: a.name, icon: a.icon, x: a.x, y: a.y, blurb: a.blurb }; }),
      nearby: { id: nearbyAmenity.id, x: nearbyAmenity.x, y: nearbyAmenity.y }
    }, null, 2);
  }
  function renderAmenities() {
    var layer = $('ulr-map-amenities');
    if (!layer || amenitiesBuilt) return;
    layer.innerHTML = '';
    amenities.forEach(function (a) {
      var btn = document.createElement('button');
      btn.className = 'am-marker';
      btn.dataset.amenity = a.id;
      btn.setAttribute('aria-label', a.name);
      btn.style.left = (a.x / mapSize.width * 100) + '%';
      btn.style.top = (a.y / mapSize.height * 100) + '%';
      btn.style.pointerEvents = 'auto';
      btn.innerHTML = '<span class="am-dot">' + amenitySvg(a.icon, '58%') + '</span><span class="am-tip">' + esc(a.name) + '</span>';
      if (amenityEditMode) {
        btn.style.cursor = 'grab';
        btn.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); amenityDrag = { a: a, btn: btn }; });
      }
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (!amenityEditMode) onAmenityClick(a, btn); });
      layer.appendChild(btn);
    });
    var nearbyBtn = document.createElement('button');
    nearbyBtn.className = 'am-marker am-nearby';
    nearbyBtn.dataset.amenity = nearbyAmenity.id;
    nearbyBtn.setAttribute('aria-label', nearbyAmenity.name);
    nearbyBtn.style.left = (nearbyAmenity.x / mapSize.width * 100) + '%';
    nearbyBtn.style.top = (nearbyAmenity.y / mapSize.height * 100) + '%';
    nearbyBtn.style.pointerEvents = 'auto';
    nearbyBtn.innerHTML = '<span class="am-dot">' + amenitySvg(nearbyAmenity.icon, '58%') + '</span><span class="am-tip">' + esc(nearbyAmenity.name) + '</span>';
    if (amenityEditMode) {
      nearbyBtn.style.cursor = 'grab';
      nearbyBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); amenityDrag = { a: nearbyAmenity, btn: nearbyBtn }; });
    }
    nearbyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!amenityEditMode) onNearbyClick(nearbyBtn);
    });
    layer.appendChild(nearbyBtn);
    amenitiesBuilt = true;
    renderNearbyCard();
    renderAmenityEditPanel();
  }
  function updateAmenityDrag(e) {
    if (!amenityDrag) return;
    var p = mapPointFromEvent(e);
    amenityDrag.a.x = Math.round(p[0]);
    amenityDrag.a.y = Math.round(p[1]);
    amenityDrag.btn.style.left = (amenityDrag.a.x / mapSize.width * 100) + '%';
    amenityDrag.btn.style.top = (amenityDrag.a.y / mapSize.height * 100) + '%';
    renderAmenityEditPanel();
  }

  function initMapInteract() {
    var wrap = $('ulr-mapwrap');
    if (!wrap) return;
    wrap.style.touchAction = 'pan-y';
    $('ulr-map-sheet').addEventListener('click', function (e) { if (e.target === this) closePanel(); });
    var amSheet = $('ulr-amenity-sheet');
    if (amSheet) amSheet.addEventListener('click', function (e) { if (e.target === this) closeAmenitySheet(); });
    wrap.addEventListener('click', function (e) {
      if (!e.target.closest('.am-marker') && !e.target.closest('#ulr-nearby-card')) {
        closeAmenityPins();
        closeNearbyPanel();
      }
    });
    if (amenityEditMode) {
      window.addEventListener('pointermove', updateAmenityDrag);
      window.addEventListener('pointerup', function () { amenityDrag = null; });
      window.addEventListener('pointercancel', function () { amenityDrag = null; });
    }
    if (zoneEditMode) {
      window.addEventListener('pointermove', updateZoneEditDrag);
      window.addEventListener('pointerup', function () {
        if (!zoneEditDrag) return;
        zoneEditDrag = null;
        renderZoneEditAnchors();
      });
      window.addEventListener('pointercancel', function () {
        zoneEditDrag = null;
        renderZoneEditAnchors();
      });
    }
  }

  // ============================================================
  // FAQ ACCORDION
  // ============================================================
  var faqBuilt = false;
  // Paint open/closed state onto the EXISTING cards so the CSS transitions actually run.
  function paintFaq() {
    var list = $('ulr-faq-list'); if (!list) return;
    var cards = list.querySelectorAll('[data-faq-card]');
    faqData.forEach(function (f, i) {
      var open = i === state.faqOpen, card = cards[i];
      if (!card) return;
      var q = function (s) { return card.querySelector(s); };
      card.style.background = open ? 'rgba(44,65,57,.6)' : 'rgba(29,42,37,.42)';
      card.style.borderColor = open ? 'rgba(255,102,0,.4)' : 'rgba(247,243,234,.12)';
      card.style.boxShadow = open ? '0 32px 64px -32px rgba(0,0,0,.65)' : '0 12px 30px -22px rgba(0,0,0,.5)';
      card.style.transform = open ? 'translateY(-2px)' : 'translateY(0)';
      if (q('[data-faq-num]')) q('[data-faq-num]').style.color = open ? '#FF6600' : 'rgba(247,243,234,.4)';
      if (q('[data-faq-q]')) q('[data-faq-q]').style.color = open ? '#ffffff' : 'rgba(247,243,234,.9)';
      if (q('[data-faq-arrow]')) q('[data-faq-arrow]').style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
      if (q('[data-faq-arrowpath]')) q('[data-faq-arrowpath]').setAttribute('stroke', open ? '#FF6600' : 'rgba(247,243,234,.55)');
      if (q('[data-faq-accent]')) q('[data-faq-accent]').style.width = open ? '46px' : '0px';
      var ans = q('[data-faq-ans]');
      if (ans) { ans.style.gridTemplateRows = open ? '1fr' : '0fr'; ans.style.opacity = open ? '1' : '0'; }
      if (q('[data-faq-ap]')) q('[data-faq-ap]').style.transform = open ? 'translateY(0)' : 'translateY(8px)';
    });
    $('ulr-faq-progress').textContent = state.faqOpen >= 0 ? ('0' + (state.faqOpen + 1) + ' / 0' + faqData.length) : ('— / 0' + faqData.length);
    $('ulr-faq-progressbar').style.width = state.faqOpen >= 0 ? (((state.faqOpen + 1) / faqData.length) * 100) + '%' : '0%';
  }
  function renderFaq() {
    var list = $('ulr-faq-list'); if (!list) return;
    if (!faqBuilt) {
      list.innerHTML = '';
      var pad = 'clamp(18px,2.4vw,26px)';
      faqData.forEach(function (f, i) {
        var card = el('<div data-faq-card style="border-radius:16px; overflow:hidden; background:rgba(29,42,37,.42); border:1px solid rgba(247,243,234,.12); box-shadow:0 12px 30px -22px rgba(0,0,0,.5); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); transition:background .5s ease, border-color .5s ease, box-shadow .5s ease, transform .5s cubic-bezier(.22,.61,.36,1);">' +
          '<button data-faq-btn style="width:100%; display:flex; align-items:center; gap:16px; text-align:left; cursor:pointer; background:none; border:0; padding:clamp(18px,2.4vw,24px) ' + pad + ';">' +
          '<span data-faq-num style="flex:0 0 auto; font-family:\'Libre Baskerville\',serif; font-size:14px; color:rgba(247,243,234,.4); transition:color .35s ease; font-variant-numeric:tabular-nums;">0' + (i + 1) + '</span>' +
          '<span data-faq-q style="flex:1; font-family:\'Libre Baskerville\',serif; font-size:clamp(16px,2vw,19px); line-height:1.3; color:rgba(247,243,234,.9); transition:color .35s ease;">' + esc(f.q) + '</span>' +
          '<svg data-faq-arrow width="16" height="16" viewBox="0 0 16 16" style="flex:0 0 auto; transform:rotate(0deg); transition:transform .5s cubic-bezier(.22,.61,.36,1);"><path data-faq-arrowpath d="M4 6.5 L8 10.5 L12 6.5" stroke="rgba(247,243,234,.55)" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>' +
          '</button>' +
          '<div data-faq-accent style="height:2px; margin:0 ' + pad + '; background:#FF6600; width:0px; transition:width .55s cubic-bezier(.22,.61,.36,1);"></div>' +
          '<div data-faq-ans style="display:grid; grid-template-rows:0fr; opacity:0; transition:grid-template-rows .5s cubic-bezier(.4,0,.2,1), opacity .4s ease;">' +
          '<div style="overflow:hidden; min-height:0;">' +
          '<p data-faq-ap style="margin:0; padding:14px ' + pad + ' clamp(20px,2.6vw,26px) calc(' + pad + ' + 30px); color:rgba(247,243,234,.82); font-size:15px; line-height:1.62; transform:translateY(8px); transition:transform .5s cubic-bezier(.4,0,.2,1);">' + esc(f.a) + '</p>' +
          '</div></div></div>');
        card.querySelector('[data-faq-btn]').onclick = function () { state.faqOpen = state.faqOpen === i ? -1 : i; paintFaq(); };
        list.appendChild(card);
      });
      faqBuilt = true;
    }
    paintFaq();
  }

  // ============================================================
  // STATIC: awards
  // ============================================================
  function renderAwards() {
    var host = $('ulr-awards');
    awards.forEach(function (aw) {
      host.appendChild(el('<div style="background:linear-gradient(145deg, rgba(247,243,234,.075), rgba(247,243,234,.035)); border:1px solid rgba(247,243,234,.14); border-radius:14px; padding:14px 15px; box-shadow:inset 0 1px 0 rgba(247,243,234,.06);">' +
        '<span style="display:flex; align-items:center; gap:7px; color:#FF6600; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:6px;"><span style="width:5px; height:5px; border-radius:50%; background:#FF6600; box-shadow:0 0 10px rgba(255,102,0,.45);"></span>' + esc(aw.tag) + '</span>' +
        '<p style="margin:0; font-size:13px; color:rgba(247,243,234,.88); line-height:1.38;">' + esc(aw.title) + '</p></div>'));
    });
  }

  // ============================================================
  // REVEAL ON SCROLL
  // ============================================================
  var io = null, safetyT = null;
  function reveal(elm) { elm.style.opacity = '1'; elm.style.transform = 'none'; }
  function initReveals() {
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (elm) {
      if (elm._init) return;
      elm._init = true;
      elm.style.opacity = '0';
      elm.style.transform = 'translateY(28px)';
      elm.style.transition = 'opacity 1s cubic-bezier(.22,.61,.36,1), transform 1s cubic-bezier(.22,.61,.36,1)';
      var r = elm.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) reveal(elm); else io.observe(elm);
    });
    clearTimeout(safetyT);
    safetyT = setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), reveal); }, 4000);
  }

  // ============================================================
  // SCROLL MOTION (hero parallax, zoom blocks, keyhole pin)
  // ============================================================
  var rafPending = false;
  function onScrollRaf() { if (!rafPending) { rafPending = true; requestAnimationFrame(function () { rafPending = false; onScroll(); }); } }

  function onScroll() {
    var vh = window.innerHeight;
    // The landing screen (quiz form + headline) and the header reveal now live inside
    // the clouds intro — see updateIntro(). No separate hero block here anymore.
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom]'), function (elm) {
      var r = elm.getBoundingClientRect();
      var prog = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      elm.style.transform = 'scale(' + (1.02 + prog * 0.16) + ')';
    });

    // keyhole: progress tracks native scroll position (see updateKeyhole / khTick)
    if (!kh.reduced) updateKeyhole();
    // intro clouds->homes transition (scroll-driven)
    updateIntro();
  }

  // ============================================================
  // KEYHOLE — SCROLL-DRIVEN REVEAL
  // ============================================================
  // The reveal is driven straight from the page's native scroll position. The tall
  // #ulr-keyhole section gives the scroll distance; its sticky #kh-pin stays fixed
  // on screen while p runs 0 -> 1 in lockstep with the scrollbar. Nothing hijacks
  // the scroll, so it stays smooth on wheel / trackpad / touch / keyboard alike.
  var kh = { reduced: false, running: false, raf: null, lastP: -1 };
  function smoothstep(x, a, b) {
    if (b === undefined) { b = 1; a = a || 0; }
    var t = (x - a) / (b - a); t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  }
  function renderKeyhole(p) {
    var stage = $('kh-stage'), intEl = $('kh-int'), ring = $('kh-ring'),
      capExt = $('kh-cap-ext'), capInt = $('kh-cap-int'), intScrim = $('kh-int-scrim'), hint = $('kh-hint');
    var W = window.innerWidth, H = window.innerHeight;
    var sMin = W < 768 ? 22 : 9;
    var sMax = Math.max(360, (1.5 * Math.max(W, H) * 100) / (0.4 * W));
    var s = sMin + (sMax - sMin) * (p * p);
    if (stage) stage.style.setProperty('--kh-s', String(s));
    var appear = smoothstep(p, 0.004, 0.06);
    if (intEl) intEl.style.opacity = String(appear);
    var ringFade = p > 0.78 ? 0 : (1 - smoothstep(p, 0, 0.5));
    if (ring) ring.style.opacity = String(appear * ringFade);
    var extFade = 1 - smoothstep(p, 0.16, 0.34);
    var extRise = (1 - smoothstep(p, 0, 0.12)) * 30;
    if (capExt) { capExt.style.opacity = String(extFade); capExt.style.transform = 'translateY(' + extRise + 'px)'; }
    var ci = smoothstep(p, 0.62, 0.95);
    if (capInt) capInt.style.opacity = String(ci);
    if (intScrim) intScrim.style.opacity = String(ci * 0.85);
    if (hint) hint.style.opacity = String((1 - smoothstep(p, 0, 0.16)) * 0.85);
  }
  function applyKeyholeSimple() {
    var khEl = $('ulr-keyhole'); if (!khEl) return;
    khEl.style.height = 'auto';
    var pin = $('kh-pin');
    if (pin) { pin.style.position = 'relative'; pin.style.height = 'auto'; }
    var stage = $('kh-stage');
    if (stage) { stage.style.position = 'relative'; stage.style.height = 'min(82svh,640px)'; }
    var intEl = $('kh-int');
    if (intEl) { intEl.style.opacity = '1'; intEl.style.webkitMaskImage = 'none'; intEl.style.maskImage = 'none'; }
    ['kh-ring', 'kh-hint'].forEach(function (id) { var e = $(id); if (e) e.style.display = 'none'; });
    var c = $('kh-cap-int'); if (c) c.style.opacity = '1';
    var cs = $('kh-int-scrim'); if (cs) cs.style.opacity = '0.55';
  }
  // Map the current scroll position to p (0..1) and paint, skipping redundant frames.
  function updateKeyhole() {
    if (kh.reduced) return;
    var sec = $('ulr-keyhole'); if (!sec) return;
    var travel = sec.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    var p = -sec.getBoundingClientRect().top / travel;
    p = Math.min(1, Math.max(0, p));
    if (Math.abs(p - kh.lastP) < 0.0004) return;
    kh.lastP = p;
    renderKeyhole(p);
  }
  // While the section is on screen, repaint every frame so the reveal tracks scroll
  // position frame-for-frame (smoother than relying on scroll events alone).
  function khTick() {
    updateKeyhole();
    if (kh.running) kh.raf = requestAnimationFrame(khTick);
  }
  function khStart() {
    if (kh.running || kh.reduced) return;
    kh.running = true;
    kh.raf = requestAnimationFrame(khTick);
  }
  function khStop() {
    kh.running = false;
    if (kh.raf) { cancelAnimationFrame(kh.raf); kh.raf = null; }
  }
  function initKeyhole() {
    var maskOk = typeof CSS !== 'undefined' && (CSS.supports('mask-image', 'url(#x)') || CSS.supports('-webkit-mask-image', 'url(#x)'));
    kh.reduced = reduceMotion() || !maskOk;
    if (kh.reduced) { applyKeyholeSimple(); return; }
    renderKeyhole(0);
    updateKeyhole();
    var sec = $('ulr-keyhole');
    if (sec && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) khStart(); else khStop(); });
      }, { rootMargin: '20% 0px 20% 0px' }).observe(sec);
    } else {
      khStart();
    }
  }

  // ============================================================
  // INTRO — CLOUDS -> HOMES (scroll-driven; ported from Claude Design to vanilla)
  // ============================================================
  // Cosine-eased piecewise interpolation between keyframe stops.
  function introInterp(input, output, p) {
    if (p <= input[0]) return output[0];
    if (p >= input[input.length - 1]) return output[output.length - 1];
    for (var i = 0; i < input.length - 1; i++) {
      if (p >= input[i] && p <= input[i + 1]) {
        var span = input[i + 1] - input[i];
        var lt = span ? (p - input[i]) / span : 0;
        lt = -(Math.cos(Math.PI * lt) - 1) / 2;
        return output[i] + (output[i + 1] - output[i]) * lt;
      }
    }
    return output[output.length - 1];
  }
  // Progress comes straight from the tall #ulr-intro section's scroll position; its
  // sticky child stays pinned while p runs 0->1, panning the camera clouds -> homes.
  function updateIntro() {
    var root = $('ulr-intro');
    if (!root) return;
    var vh = window.innerHeight;
    var scrollable = root.offsetHeight - vh;
    if (scrollable <= 0) return;
    var scrolled = Math.min(Math.max(-root.getBoundingClientRect().top, 0), scrollable);
    var p = scrolled / scrollable;
    // Camera pan + scale run across the WHOLE section (clouds -> homes).
    var camY = introInterp([0, 0.06, 0.96, 1], [0, 0, 1, 1], p) * (1.80 * vh);
    var scale = introInterp([0, 0.1, 0.5, 0.92, 1], [1.02, 1.03, 1.05, 1.04, 1.06], p);
    var track = $('ulr-intro-track'), scaleEl = $('ulr-intro-scale');
    if (track) track.style.transform = 'translateY(' + (-camY) + 'px)';
    if (scaleEl) scaleEl.style.transform = 'scale(' + scale + ')';

    // Overlay transitions are keyed to raw scroll (viewport-heights), so they feel like
    // a normal hero hand-off regardless of section length. The headline clears first.
    var head = $('ulr-intro-head');
    var headFade = smoothstep(scrolled, vh * 0.05, vh * 0.42);
    if (head) { head.style.opacity = String(1 - headFade); head.style.transform = 'translateY(' + (headFade * -26) + 'px)'; }

    // One real shell morphs from the bottom quiz card into the sticky header pill.
    var e = Math.min(1, Math.max(0, (scrolled - vh * 0.22) / (vh * 1.05)));  // completes ~1.27 screens in
    var es = e * e * (3 - 2 * e);
    var shell = $('ulr-morph-shell');
    var quizPanel = $('ulr-morph-quiz');
    var headerPanel = $('ulr-morph-header');
    if (shell) {
      var startW = Math.min(820, window.innerWidth * 0.90);
      var headerPad = Math.max(24, Math.min(52, window.innerWidth * 0.06));
      var endW = Math.min(1160, window.innerWidth - headerPad);
      var startH = Math.max(380, Math.min(vh * 0.48, 465));
      var endH = 58;
      var startGap = Math.max(16, Math.min(vh * 0.022, 26));  // small breathing room above the bottom edge
      var startTop = vh - startH - startGap;
      var endTop = Math.max(10, Math.min(window.innerWidth * 0.018, 18));
      var width = startW + (endW - startW) * es;
      var height = startH + (endH - startH) * es;
      var top = startTop + (endTop - startTop) * es;
      var radius = 24 + (999 - 24) * es;
      shell.style.width = width + 'px';
      shell.style.height = height + 'px';
      shell.style.borderRadius = radius + 'px';
      if (state.isMobile) {
        // Phones: move the shell with a composited transform (no per-frame `top` layout) and
        // keep a static shadow — avoids the paint/layout thrash that made the intro scroll stutter.
        shell.style.top = startTop + 'px';
        shell.style.transform = 'translateX(-50%) translateY(' + ((endTop - startTop) * es) + 'px)';
      } else {
        shell.style.top = top + 'px';
        shell.style.transform = 'translateX(-50%)';
        shell.style.boxShadow = '0 ' + (34 - 16 * es) + 'px ' + (80 - 36 * es) + 'px -' + (26 - 4 * es) + 'px rgba(29,37,33,' + (0.62 + 0.1 * es) + ')';
      }
      if (quizPanel) {
        var qo = 1 - smoothstep(e, 0.16, 0.5);
        quizPanel.style.opacity = String(qo);
        quizPanel.style.pointerEvents = e < 0.22 ? 'auto' : 'none';
      }
      if (headerPanel) {
        var ho = smoothstep(e, 0.42, 0.82);
        headerPanel.style.opacity = String(ho);
        headerPanel.style.pointerEvents = ho > 0.55 ? 'auto' : 'none';
      }
    }

    // Lifestyle pitch fades in over the homes near the END of the section (p-based,
    // so it tracks the clouds->homes pan rather than the early form hand-off).
    var outro = $('ulr-intro-outro');
    if (outro) {
      var oo = smoothstep(p, 0.52, 0.72);
      outro.style.opacity = String(oo);
      outro.style.pointerEvents = oo > 0.5 ? 'auto' : 'none';
    }
  }

  // ============================================================
  // SHARED
  // ============================================================
  function scrollTo(id) { var elm = $(id); if (elm) elm.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function applyResponsive() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-desktop-inline]'), function (elm) {
      elm.style.display = window.innerWidth > 560 ? 'inline' : 'none';
    });
  }

  // setState: shallow-merge then re-render affected areas (simple: render all reactive)
  function setState(patch) {
    Object.assign(state, patch);
    renderReactive();
  }
  function renderReactive() {
    renderQuiz();
    renderReviews();
    renderOwnership();
    renderHomeImages();
    renderHomePanel();
    renderMapDynamic();
    renderFaq();
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // static one-time
    renderPhrase();
    renderAwards();
    applyMapConfig();
    renderMapStatic();
    renderAmenities();
    initMapInteract();

    // reactive
    renderReactive();

    // hero scroll/header wiring
    Array.prototype.forEach.call(document.querySelectorAll('[data-scroll]'), function (b) {
      b.onclick = function () {
        var target = b.getAttribute('data-scroll');
        if (target === 'ulr-enquiry') goToQuizContact();
        else scrollTo(target);
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-quiz-contact]'), function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();   // don't also trigger the whole-header click below
        goToQuizContact();
      };
    });
    // The whole sticky header acts as a "back to the form" button (scrolls up to the intro/quiz).
    var morphHeader = $('ulr-morph-header');
    if (morphHeader) {
      morphHeader.style.cursor = 'pointer';
      morphHeader.setAttribute('role', 'button');
      morphHeader.setAttribute('aria-label', 'Back to the form');
      morphHeader.onclick = function () { scrollTo('ulr-intro'); };
    }
    // home nav buttons
    $('ulr-home-prev').onclick = homePrev;
    $('ulr-home-next').onclick = homeNext;
    [$('ulr-home-prev'), $('ulr-home-next')].forEach(function (b) {
      b.onmouseover = function () { b.style.background = '#FF6600'; b.style.borderColor = '#FF6600'; };
      b.onmouseout = function () { b.style.background = 'rgba(29,42,37,.45)'; b.style.borderColor = 'rgba(247,243,234,.3)'; };
    });
    var planFrame = $('ulr-home-plan-frame');
    if (planFrame) {
      planFrame.onclick = openPlanModal;
      planFrame.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlanModal();
        }
      };
    }
    var planModal = $('ulr-plan-modal');
    if (planModal) {
      planModal.addEventListener('click', function (e) {
        if (e.target === planModal) closePlanModal();
      });
    }
    var planClose = $('ulr-plan-close');
    if (planClose) {
      planClose.onclick = closePlanModal;
      planClose.onmouseover = function () { planClose.style.background = '#FF6600'; planClose.style.borderColor = '#FF6600'; planClose.style.color = '#fff'; };
      planClose.onmouseout = function () { planClose.style.background = 'rgba(247,243,234,.08)'; planClose.style.borderColor = 'rgba(247,243,234,.22)'; planClose.style.color = '#F7F3EA'; };
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.planModalOpen) closePlanModal();
    });
    // ownership expand
    $('ulr-own-expandbtn').onclick = function () { setState({ ownExpanded: !state.ownExpanded }); };

    // reviews hover/touch pause on stage
    var revStage = $('ulr-rev-stage');
    revStage.addEventListener('mouseenter', function () { state.revPaused = true; });
    revStage.addEventListener('mouseleave', function () { state.revPaused = false; });
    revStage.addEventListener('touchstart', function (e) { revStage._tx = (e.touches && e.touches[0]) ? e.touches[0].clientX : null; });
    revStage.addEventListener('touchend', function (e) {
      if (revStage._tx == null) return;
      var x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : revStage._tx;
      var dx = x - revStage._tx; revStage._tx = null;
      if (dx < -40) revNext(); else if (dx > 40) revPrev();
    });

    // homes hover/touch pause
    var homesSec = $('ulr-homes');
    homesSec.addEventListener('mouseenter', function () { state.homePaused = true; });
    homesSec.addEventListener('mouseleave', function () { state.homePaused = false; });
    homesSec.addEventListener('touchstart', function (e) { homesSec._tx = (e.touches && e.touches[0]) ? e.touches[0].clientX : null; });
    homesSec.addEventListener('touchend', function (e) {
      if (homesSec._tx == null) return;
      var x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : homesSec._tx;
      var dx = x - homesSec._tx; homesSec._tx = null;
      if (dx < -40) homeNext(); else if (dx > 40) homePrev();
    });

    // reveals + scroll
    initReveals();
    window.addEventListener('scroll', onScrollRaf, { passive: true });
    onScroll();

    // phrases rotation
    setInterval(function () { state.phraseIdx = (state.phraseIdx + 1) % phrases.length; renderPhrase(); }, 3600);

    applyResponsive();
    initKeyhole();

    // autoplay
    revStartAuto();
    homeStartAuto();

    // resize
    window.addEventListener('resize', function () {
      var wasMobile = state.isMobile;
      state.isMobile = window.matchMedia('(max-width:760px)').matches;
      applyResponsive();
      if (wasMobile !== state.isMobile) { applyMapConfig(); renderMapStatic(); renderAmenities(); renderReactive(); closeAmenitySheet(); closeAmenityPins(); closeNearbyPanel(); }
      if (!kh.reduced) { kh.lastP = -1; updateKeyhole(); }
      updateIntro();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
