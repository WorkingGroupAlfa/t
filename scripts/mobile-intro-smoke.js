/* Run against a Chromium instance started with --remote-debugging-port=9223. */
'use strict';

const endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9223';
const pageUrl = process.env.PAGE_URL || 'http://127.0.0.1:4173/';
const desktopMode = process.env.SMOKE_MODE === 'desktop';
let sequence = 0;

async function main() {
  const targets = await fetch(endpoint + '/json/list').then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  if (!target) throw new Error('No Chromium page target found');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const exceptions = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text);
    }
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: desktopMode ? 1440 : 390,
    height: desktopMode ? 900 : 844,
    deviceScaleFactor: desktopMode ? 1 : 3,
    mobile: !desktopMode,
    screenWidth: desktopMode ? 1440 : 390,
    screenHeight: desktopMode ? 900 : 844
  });
  await send('Page.navigate', { url: pageUrl });
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const before = await send('Performance.getMetrics');
  const evaluation = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async function () {
      const pin = document.getElementById('ulr-intro-pin');
      const root = document.getElementById('ulr-intro');
      const shell = document.getElementById('ulr-morph-shell');
      const ghost = document.getElementById('ulr-mobile-morph-ghost');
      const header = document.getElementById('ulr-mobile-header');
      const desktopHeader = document.getElementById('ulr-morph-header');
      const track = document.getElementById('ulr-intro-track');
      const vh = pin.getBoundingClientRect().height;
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
      const samples = [];
      for (const screens of [0, .3, .55, .8, 1.15, 1.5, 2.1, .45, 0]) {
        scrollTo(0, root.offsetTop + vh * screens);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        samples.push({
          screens,
          scrollY,
          shellOpacity: getComputedStyle(shell).opacity,
          shellVisibility: getComputedStyle(shell).visibility,
          shellRect: shell.getBoundingClientRect().toJSON(),
          ghostOpacity: getComputedStyle(ghost).opacity,
          headerOpacity: getComputedStyle(header).opacity,
          headerPointerEvents: getComputedStyle(header).pointerEvents,
          desktopHeaderOpacity: getComputedStyle(desktopHeader).opacity,
          trackTransform: getComputedStyle(track).transform
        });
      }
      const contactButton = (${desktopMode ? 'true' : 'false'} ? desktopHeader : header).querySelector('[data-quiz-contact]');
      contactButton.click();
      await new Promise(resolve => setTimeout(resolve, 160));
      return {
        mobile: matchMedia('(max-width:760px)').matches,
        viewport: { innerWidth, innerHeight, pinHeight: vh },
        introHeight: root.offsetHeight,
        introSources: {
          clouds: document.getElementById('ulr-intro-clouds').currentSrc,
          homes: document.getElementById('ulr-intro-homes').currentSrc
        },
        samples,
        contactFlow: {
          formRendered: Boolean(document.getElementById('ulr-quiz-form')),
          quizScrollable: document.getElementById('ulr-morph-quiz').classList.contains('is-scrollable'),
          returnedToIntro: scrollY < vh * .1,
          shellVisibility: getComputedStyle(shell).visibility
        }
      };
    })()`
  });
  const after = await send('Performance.getMetrics');

  const metricMap = (result) => Object.fromEntries(result.metrics.map((metric) => [metric.name, metric.value]));
  const first = metricMap(before);
  const last = metricMap(after);
  const deltas = {};
  ['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration'].forEach((name) => {
    deltas[name] = (last[name] || 0) - (first[name] || 0);
  });

  console.log(JSON.stringify({
    result: evaluation.result && evaluation.result.value,
    evaluationError: evaluation.exceptionDetails || (evaluation.result && evaluation.result.description) || null,
    performanceDelta: deltas,
    exceptions
  }, null, 2));
  if (evaluation.exceptionDetails) process.exitCode = 1;
  socket.close();
  if (exceptions.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
