#!/usr/bin/env node

const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:9294';
const debuggerPort = process.env.CHROME_DEBUG_PORT || '9341';

const defaultRoutes = [
  '/',
  '/collections',
  '/collections/all',
  '/products/anime-hero-gesture-portrait-metal-wall-art-framed-panel',
  '/cart',
  '/search?q=metal',
  '/pages/about',
  '/pages/contact',
  '/pages/ordering-and-payments',
  '/policies/refund-policy',
  '/policies/privacy-policy',
  '/policies/terms-of-service',
  '/policies/shipping-policy',
  '/404-responsive-audit'
];
const routes = process.env.AUDIT_ROUTES
  ? process.env.AUDIT_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : defaultRoutes;

const defaultViewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'small-desktop', width: 1024, height: 768, mobile: false },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'mobile-landscape', width: 844, height: 390, mobile: true },
  { name: 'narrow', width: 320, height: 568, mobile: true }
];
const requestedViewports = process.env.AUDIT_VIEWPORTS
  ? new Set(process.env.AUDIT_VIEWPORTS.split(',').map((name) => name.trim()))
  : null;
const viewports = requestedViewports
  ? defaultViewports.filter((viewport) => requestedViewports.has(viewport.name))
  : defaultViewports;

const tabs = await fetch(`http://127.0.0.1:${debuggerPort}/json`).then((response) => response.json());
const tab = tabs.find((candidate) => candidate.type === 'page' && candidate.url.startsWith(baseUrl));

if (!tab) {
  throw new Error(`No storefront tab found on Chrome debugger port ${debuggerPort}`);
}

const socket = new WebSocket(tab.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
let consoleIssues = [];
let networkIssues = [];

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }

  if (message.method === 'Runtime.exceptionThrown') {
    consoleIssues.push(message.params.exceptionDetails.text || 'Uncaught exception');
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    consoleIssues.push(message.params.entry.text);
  }
  if (message.method === 'Network.loadingFailed') {
    const { errorText, blockedReason, type } = message.params;
    if (errorText !== 'net::ERR_ABORTED') {
      networkIssues.push(`${type}: ${blockedReason || errorText}`);
    }
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out: ${method}`));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function waitForDocument() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const state = await evaluate('document.readyState');
    if (state === 'complete') break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
}

const diagnosticsExpression = `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const label = (element) => {
    const id = element.id ? '#' + element.id : '';
    const classes = [...element.classList].slice(0, 3).map((name) => '.' + name).join('');
    return (element.tagName.toLowerCase() + id + classes).slice(0, 140);
  };
  const rectData = (element) => {
    const rect = element.getBoundingClientRect();
    return { selector: label(element), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) };
  };
  const all = [...document.querySelectorAll('body *')];
  const intentionalOverflow = (element) => element.closest('[data-carousel-track], .home-hero__track, .announcement-bar__track, .cart-drawer, dialog, [aria-hidden="true"]');
  const overflow = all.filter((element) => {
    if (!visible(element) || intentionalOverflow(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.left < -2 || rect.right > viewportWidth + 2;
  }).slice(0, 20).map(rectData);
  const brokenImages = [...document.images]
    .filter((image) => visible(image) && image.complete && image.naturalWidth === 0)
    .map((image) => ({ selector: label(image), src: image.currentSrc || image.src }));
  const clipped = all.filter((element) => {
    if (!visible(element) || element.closest('.visually-hidden') || !element.textContent.trim() || element.children.length > 0) return false;
    const style = getComputedStyle(element);
    const clippedOverflow = ['hidden', 'clip'].includes(style.overflow) || ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY);
    const lineClamp = style.webkitLineClamp && style.webkitLineClamp !== 'none';
    return clippedOverflow && !lineClamp && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2);
  }).slice(0, 20).map((element) => ({ ...rectData(element), text: element.textContent.trim().slice(0, 90) }));
  const smallControls = [...document.querySelectorAll('button, input:not([type="hidden"]), select, summary, [role="button"]')]
    .filter((element) => {
      if (!visible(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width < 36 || rect.height < 36;
    })
    .slice(0, 30)
    .map((element) => ({ ...rectData(element), name: (element.getAttribute('aria-label') || element.textContent || element.value || '').trim().slice(0, 80) }));
  return {
    title: document.title,
    path: location.pathname + location.search,
    viewport: { width: innerWidth, clientWidth: viewportWidth, height: innerHeight },
    pageWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
    h1Count: document.querySelectorAll('h1').length,
    h1Text: [...document.querySelectorAll('h1')].map((heading) => heading.textContent.trim()),
    mainCount: document.querySelectorAll('main').length,
    overflow,
    brokenImages,
    clipped,
    smallControls
  };
})()`;

await Promise.all([
  send('Page.enable'),
  send('Runtime.enable'),
  send('Log.enable'),
  send('Network.enable')
]);

const report = [];

for (const viewport of viewports) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });

  for (const route of routes) {
    consoleIssues = [];
    networkIssues = [];
    await send('Page.navigate', { url: baseUrl + route });
    await waitForDocument();
    const diagnostics = await evaluate(diagnosticsExpression);
    report.push({
      auditViewport: viewport.name,
      route,
      ...diagnostics,
      consoleIssues: [...new Set(consoleIssues)].slice(0, 10),
      networkIssues: [...new Set(networkIssues)].slice(0, 10)
    });
    process.stderr.write(`Checked ${viewport.name} ${route}\n`);
  }
}

socket.close();
console.log(JSON.stringify(report, null, 2));
