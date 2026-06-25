// Native DOM/JS utility helpers.

/**
 * @class core.func
 *
 * func utils (for high-order func's arg)
 *
 * @singleton
 * @alternateClassName func
 */
function eq(itemA) {
  return function(itemB) {
    return itemA === itemB;
  };
}

function eq2(itemA, itemB) {
  return itemA === itemB;
}

function peq2(propName) {
  return function(itemA, itemB) {
    return itemA[propName] === itemB[propName];
  };
}

function ok() {
  return true;
}

function fail() {
  return false;
}

function not(f) {
  return function() {
    return !f.apply(f, arguments);
  };
}

function and(fA, fB) {
  return function(item) {
    return fA(item) && fB(item);
  };
}

function self(a) {
  return a;
}

function invoke(obj, method) {
  return function() {
    return obj[method].apply(obj, arguments);
  };
}

let idCounter = 0;

/**
 * reset globally-unique id
 *
 */
function resetUniqueId() {
  idCounter = 0;
}

/**
 * generate a globally-unique id
 *
 * @param {String} [prefix]
 */
function uniqueId(prefix) {
  const id = ++idCounter + '';
  return prefix ? prefix + id : id;
}

/**
 * returns bnd (bounds) from rect
 *
 * - IE Compatibility Issue: http://goo.gl/sRLOAo
 * - Scroll Issue: http://goo.gl/sNjUc
 *
 * @param {Rect} rect
 * @return {Object} bounds
 * @return {Number} bounds.top
 * @return {Number} bounds.left
 * @return {Number} bounds.width
 * @return {Number} bounds.height
 */
function rect2bnd(rect) {
  if (!rect) {
    return {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    };
  }

  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

/**
 * returns a copy of the object where the keys have become the values and the values the keys.
 * @param {Object} obj
 * @return {Object}
 */
function invertObject(obj) {
  const inverted = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      inverted[obj[key]] = key;
    }
  }
  return inverted;
}

/**
 * @param {String} namespace
 * @param {String} [prefix]
 * @return {String}
 */
function namespaceToCamel(namespace, prefix) {
  prefix = prefix || '';
  return prefix + namespace.split('.').map(function(name) {
    return name.substring(0, 1).toUpperCase() + name.substring(1);
  }).join('');
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} immediate
 * @return {Function}
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 *
 * @param {String} url
 * @return {Boolean}
 */
function isValidUrl(url) {
  const expression = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;
  return expression.test(url);
}

// Schemes that can execute script or smuggle active content when used in
// href/src attributes. These must never be allowed to reach the DOM.
const DANGEROUS_URL_SCHEME_PATTERN = /^(?:javascript|vbscript|data|blob|file)\s*:/i;
// Unicode whitespace characters (>= 0x80) that browsers ignore while parsing
// the scheme part of a URL.
const URL_IGNORED_UNICODE_WS = '\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

/**
 * Neutralizes URLs that use a dangerous scheme (e.g. `javascript:`,
 * `vbscript:`, `data:`) to prevent DOM-based XSS when the value is later
 * assigned to an `href`/`src` attribute. Control characters that browsers
 * strip while parsing the scheme (tabs, newlines, NUL bytes) are removed
 * before the check so that obfuscated payloads such as `java\tscript:` are
 * detected as well.
 *
 * @param {String} url
 * @return {String} the original url, or `'#'` when the scheme is unsafe
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string' || url === '') {
    return url;
  }
  // Strip characters browsers ignore while resolving the scheme (control
  // characters <= 0x20, DEL, and a set of unicode whitespace characters) so
  // that payloads like `java\tscript:` or `java\nscript:` cannot bypass the
  // check. Done via charCodeAt to avoid control characters in regex literals.
  let normalized = '';
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code > 0x20 && code !== 0x7f && URL_IGNORED_UNICODE_WS.indexOf(url[i]) === -1) {
      normalized += url[i];
    }
  }
  if (DANGEROUS_URL_SCHEME_PATTERN.test(normalized)) {
    return '#';
  }
  return url;
}

export default {
  eq,
  eq2,
  peq2,
  ok,
  fail,
  self,
  not,
  and,
  invoke,
  resetUniqueId,
  uniqueId,
  rect2bnd,
  invertObject,
  namespaceToCamel,
  debounce,
  isValidUrl,
  sanitizeUrl,
};
