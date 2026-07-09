import func from './func';

/* @param {Array} */
function head(array) {
  return array[0];
}

/* @param {Array} */
function last(array) {
  return array[array.length - 1];
}

/* @param {Array} */
function initial(array) {
  return array.slice(0, array.length - 1);
}

/* @param {Array} */
function tail(array) {
  return array.slice(1);
}

function find(array, pred) {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    const item = array[idx];
    if (pred(item)) {
      return item;
    }
  }
}

function all(array, pred) {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!pred(array[idx])) {
      return false;
    }
  }
  return true;
}

function contains(array, item) {
  if (array && array.length && item) {
    if (array.indexOf) {
      return array.indexOf(item) !== -1;
    } else if (array.contains) {
      
      return array.contains(item);
    }
  }
  return false;
}

/* @param {Array} @param {Function} */
function sum(array, fn) {
  fn = fn || func.self;
  return array.reduce(function(memo, v) {
    return memo + fn(v);
  }, 0);
}

/* @param {Collection} */
function from(collection) {
  const result = [];
  const length = collection.length;
  let idx = -1;
  while (++idx < length) {
    result[idx] = collection[idx];
  }
  return result;
}

function isEmpty(array) {
  return !array || !array.length;
}

/* @param {Array} @param {Function} @param {Array[]} */
function clusterBy(array, fn) {
  if (!array.length) { return []; }
  const aTail = tail(array);
  return aTail.reduce(function(memo, v) {
    const aLast = last(memo);
    if (fn(last(aLast), v)) {
      aLast[aLast.length] = v;
    } else {
      memo[memo.length] = [v];
    }
    return memo;
  }, [[head(array)]]);
}

/* @param {Array} @param {Function} */
function compact(array) {
  const aResult = [];
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (array[idx]) { aResult.push(array[idx]); }
  }
  return aResult;
}

/* @param {Array} */
function unique(array) {
  const results = [];

  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!contains(results, array[idx])) {
      results.push(array[idx]);
    }
  }

  return results;
}

/* @param {Array} */
function next(array, item) {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx + 1];
  }
  return null;
}

/* @param {Array} */
function prev(array, item) {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx - 1];
  }
  return null;
}

export default {
  head,
  last,
  initial,
  tail,
  prev,
  next,
  find,
  contains,
  all,
  sum,
  from,
  isEmpty,
  clusterBy,
  compact,
  unique,
};