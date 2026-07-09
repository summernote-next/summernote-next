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

function resetUniqueId() {
  idCounter = 0;
}

/* @param {String} */
function uniqueId(prefix) {
  const id = ++idCounter + '';
  return prefix ? prefix + id : id;
}

/* @param {Rect} @return {Object} @return {Number} @return {Number} @return {Number} @return {Number} */
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

/* @param {Object} @return {Object} */
function invertObject(obj) {
  const inverted = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      inverted[obj[key]] = key;
    }
  }
  return inverted;
}

/* @param {String} @param {String} @return {String} */
function namespaceToCamel(namespace, prefix) {
  prefix = prefix || '';
  return prefix + namespace.split('.').map(function(name) {
    return name.substring(0, 1).toUpperCase() + name.substring(1);
  }).join('');
}

/* @param {Function} @param {Number} @param {Boolean} @return {Function} */
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

/* @param {String} @return {Boolean} */
function isValidUrl(url) {
  const expression = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;
  return expression.test(url);
}

const DANGEROUS_URL_SCHEME_PATTERN = /^(?:javascript|vbscript|data|blob|file)\s*:/i;
const URL_IGNORED_UNICODE_WS = '\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

function sanitizeUrl(url) {
  if (typeof url !== 'string' || url === '') {
    return url;
  }

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