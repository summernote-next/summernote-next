import ICONS from './icons.js';

export { ICONS };
export const ICON_PREFIX = 'note-icon-';

const ICON_SET = new Set(ICONS);

export function iconNames() {
  return ICONS.slice();
}

export function hasIcon(name) {
  return ICON_SET.has(name);
}

const inFlight = {};
const ICON_CACHE = {};

function normalizeSvg(raw) {
  return raw
    .replace(/<\?xml[^>]*>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>\s*/gi, '')
    .replace(/<defs>[\s\S]*?<\/defs>\s*/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>\s*/gi, '')
    .replace(/\sclass="cls-\d+"/g, ' fill="currentColor"')
    .replace(/\sclass="st0"/g, ' fill="currentColor"')
    .replace(/\sfill="#[0-9a-fA-F]{3,8}"/g, ' fill="currentColor"')
    .replace(/(style="[^"]*fill:\s*)#[0-9a-fA-F]+/gi, '$1currentColor')
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/<svg((?![^>]*\sfill=)[^>]*)>/i, '<svg$1 fill="currentColor">')
    .trim();
}

function detectIconBaseUrl(hostDoc) {
  if (hostDoc === undefined || hostDoc === null) {
    return 'icons/';
  }
  if (typeof hostDoc.getElementsByTagName !== 'function') {
    return 'icons/';
  }
  const scripts = hostDoc.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src;
    if (!src) {
      continue;
    }
    const fileName = src.split('/').pop() || '';
    const cleanName = fileName.split(/[?#]/)[0];
    if (/^summernote-next(?:-classic)?(?:\.min)?\.js$/i.test(cleanName)) {
      return src.replace(/([?#].*)?[^/]*$/, '') + 'icons/';
    }
  }
  return 'icons/';
}

let iconBaseUrl = detectIconBaseUrl(typeof document !== 'undefined' ? document : null);

export function __detectIconBaseUrl__(hostDoc) {
  return detectIconBaseUrl(hostDoc);
}

export function setIconBaseUrl(url) {
  iconBaseUrl = url ? url.replace(/([^/])$/, '$1/') : '';
}

export function getIconBaseUrl() {
  return iconBaseUrl;
}

export function getIconUrl(name) {
  return iconBaseUrl + name + '.svg';
}

export function getIconSvg(name) {
  return ICON_CACHE[name] || null;
}

export function loadIcon(name) {
  if (!hasIcon(name)) {
    return Promise.resolve(null);
  }
  if (ICON_CACHE[name]) {
    return Promise.resolve(ICON_CACHE[name]);
  }
  if (inFlight[name]) {
    return inFlight[name];
  }
  inFlight[name] = fetch(getIconUrl(name))
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load icon "' + name + '" (' + response.status + ')');
      }
      return response.text();
    })
    .then((raw) => {
      const svg = normalizeSvg(raw);
      ICON_CACHE[name] = svg;
      delete inFlight[name];
      return svg;
    })
    .catch((err) => {
      delete inFlight[name];
      throw err;
    });
  return inFlight[name];
}

let allIconsPromise = null;
export function loadAllIcons() {
  if (!allIconsPromise) {
    allIconsPromise = Promise.all(iconNames().map((name) => loadIcon(name)));
  }
  return allIconsPromise;
}

export function resetIconCache() {
  for (const key of Object.keys(ICON_CACHE)) {
    delete ICON_CACHE[key];
  }
  for (const key of Object.keys(inFlight)) {
    delete inFlight[key];
  }
  allIconsPromise = null;
}