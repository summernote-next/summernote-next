import $$ from './dom-query.js';
import func from './func';
import lists from './lists';

const NBSP_CHAR = String.fromCharCode(160);
const ZERO_WIDTH_NBSP_CHAR = '\ufeff';

/* @param {Node} @return {Boolean} */
function isEditable(node) {
  return node && $$(node).hasClass('note-editable');
}

/* @param {Node} @return {Boolean} */
function isControlSizing(node) {
  return node && $$(node).hasClass('note-control-sizing');
}

/* @param {String} @return {Function} */
function makePredByNodeName(nodeName) {
  nodeName = nodeName.toUpperCase();
  return function(node) {
    return node && node.nodeName.toUpperCase() === nodeName;
  };
}

/* @param {Node} @return {Boolean} */
function isText(node) {
  return node && node.nodeType === 3;
}

/* @param {Node} @return {Boolean} */
function isElement(node) {
  return node && node.nodeType === 1;
}

function isVoid(node) {
  return node && /^BR|^IMG|^HR|^IFRAME|^BUTTON|^INPUT|^AUDIO|^VIDEO|^EMBED/.test(node.nodeName.toUpperCase());
}

function isPara(node) {
  if (isEditable(node)) {
    return false;
  }

  return node && /^DIV|^P|^LI|^H[1-7]/.test(node.nodeName.toUpperCase());
}

function isHeading(node) {
  return node && /^H[1-7]/.test(node.nodeName.toUpperCase());
}

const isPre = makePredByNodeName('PRE');

const isLi = makePredByNodeName('LI');

function isPurePara(node) {
  return isPara(node) && !isLi(node);
}

const isTable = makePredByNodeName('TABLE');

const isData = makePredByNodeName('DATA');

function isInline(node) {
  return !isBodyContainer(node) &&
         !isList(node) &&
         !isHr(node) &&
         !isPara(node) &&
         !isTable(node) &&
         !isBlockquote(node) &&
         !isData(node);
}

function isList(node) {
  return node && /^UL|^OL/.test(node.nodeName.toUpperCase());
}

const isHr = makePredByNodeName('HR');

function isCell(node) {
  return node && /^TD|^TH/.test(node.nodeName.toUpperCase());
}

const isBlockquote = makePredByNodeName('BLOCKQUOTE');

function isBodyContainer(node) {
  return isCell(node) || isBlockquote(node) || isEditable(node);
}

const isAnchor = makePredByNodeName('A');
const isImg = makePredByNodeName('IMG');
const isVideo = makePredByNodeName('VIDEO');
const isIframe = makePredByNodeName('IFRAME');

function isParaInline(node) {
  return isInline(node) && !!ancestor(node, isPara);
}

function isBodyInline(node) {
  return isInline(node) && !ancestor(node, isPara);
}

const isBody = makePredByNodeName('BODY');

/* @param {Node} @param {Node} @return {Boolean} */
function isClosestSibling(nodeA, nodeB) {
  return nodeA.nextSibling === nodeB ||
         nodeA.previousSibling === nodeB;
}

/* @param {Node} @param {function} @return {Node[]} */
function withClosestSiblings(node, pred) {
  pred = pred || func.ok;

  const siblings = [];
  if (node.previousSibling && pred(node.previousSibling)) {
    siblings.push(node.previousSibling);
  }
  siblings.push(node);
  if (node.nextSibling && pred(node.nextSibling)) {
    siblings.push(node.nextSibling);
  }
  return siblings;
}

const blankHTML = '<br>';

/* @param {Node} */
function nodeLength(node) {
  if (isText(node)) {
    return node.nodeValue.length;
  }

  if (node) {
    return node.childNodes.length;
  }

  return 0;
}

/* @param {Node} @return {Boolean} */
function deepestChildIsEmpty(node) {
  do {
    if (node.firstElementChild === null || node.firstElementChild.innerHTML === '') break;
  } while ((node = node.firstElementChild));

  return isEmpty(node);
}

/* @param {Node} @return {Boolean} */
function isEmpty(node) {
  const len = nodeLength(node);

  if (len === 0) {
    return true;
  } else if (!isText(node) && len === 1 && node.innerHTML === blankHTML) {
    
    return true;
  } else if (lists.all(node.childNodes, isText) && node.innerHTML === '') {
    
    return true;
  }

  return false;
}

function paddingBlankHTML(node) {
  if (!isVoid(node) && !nodeLength(node)) {
    node.innerHTML = blankHTML;
  }
}

/* @param {Node} @param {Function} */
function ancestor(node, pred) {
  while (node) {
    if (pred(node)) { return node; }
    if (isEditable(node)) { break; }

    node = node.parentNode;
  }
  return null;
}

/* @param {Node} @param {Function} */
function singleChildAncestor(node, pred) {
  node = node.parentNode;

  while (node) {
    if (nodeLength(node) !== 1) { break; }
    if (pred(node)) { return node; }
    if (isEditable(node)) { break; }

    node = node.parentNode;
  }
  return null;
}

/* @param {Node} @param {Function} */
function listAncestor(node, pred) {
  pred = pred || func.fail;

  const ancestors = [];
  ancestor(node, function(el) {
    if (!isEditable(el)) {
      ancestors.push(el);
    }

    return pred(el);
  });
  return ancestors;
}

function lastAncestor(node, pred) {
  const ancestors = listAncestor(node);
  return lists.last(ancestors.filter(pred));
}

/* @param {Node} @param {Node} */
function commonAncestor(nodeA, nodeB) {
  const ancestors = listAncestor(nodeA);
  for (let n = nodeB; n; n = n.parentNode) {
    if (ancestors.indexOf(n) > -1) return n;
  }
  return null; 
}

/* @param {Node} @param {Function} */
function listPrev(node, pred) {
  pred = pred || func.fail;

  const nodes = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.previousSibling;
  }
  return nodes;
}

/* @param {Node} @param {Function} */
function listNext(node, pred) {
  pred = pred || func.fail;

  const nodes = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.nextSibling;
  }
  return nodes;
}

/* @param {Node} @param {Function} */
function listDescendant(node, pred) {
  const descendants = [];
  pred = pred || func.ok;

  (function fnWalk(current) {
    if (node !== current && pred(current)) {
      descendants.push(current);
    }
    for (let idx = 0, len = current.childNodes.length; idx < len; idx++) {
      fnWalk(current.childNodes[idx]);
    }
  })(node);

  return descendants;
}

/* @param {Node} @param {Node} @return {Node} */
function wrap(node, wrapperName) {
  const parent = node.parentNode;
  const wrapper = document.createElement(wrapperName);

  parent.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  return wrapper;
}

/* @param {Node} @param {Node} */
function insertAfter(node, preceding) {
  const next = preceding.nextSibling;
  let parent = preceding.parentNode;
  if (next) {
    parent.insertBefore(node, next);
  } else {
    parent.appendChild(node);
  }
  return node;
}

/* @param {Node} @param {Collection} */
function appendChildNodes(node, aChild, isSkipPaddingBlankHTML) {
  $$.each(aChild, function(idx, child) {
    
    if (!isSkipPaddingBlankHTML && isLi(node) && node.firstChild === null && isList(child)) {
      node.appendChild(create("br"));
    }

    node.appendChild(child);
  });
  return node;
}

/* @param {BoundaryPoint} @return {Boolean} */
function isLeftEdgePoint(point) {
  return point.offset === 0;
}

/* @param {BoundaryPoint} @return {Boolean} */
function isRightEdgePoint(point) {
  return point.offset === nodeLength(point.node);
}

/* @param {BoundaryPoint} @return {Boolean} */
function isEdgePoint(point) {
  return isLeftEdgePoint(point) || isRightEdgePoint(point);
}

/* @param {Node} @param {Node} @return {Boolean} */
function isLeftEdgeOf(node, ancestor) {
  while (node && node !== ancestor) {
    if (position(node) !== 0) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/* @param {Node} @param {Node} @return {Boolean} */
function isRightEdgeOf(node, ancestor) {
  if (!ancestor) {
    return false;
  }
  while (node && node !== ancestor) {
    if (position(node) !== nodeLength(node.parentNode) - 1) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/* @param {BoundaryPoint} @param {Node} @return {Boolean} */
function isLeftEdgePointOf(point, ancestor) {
  return isLeftEdgePoint(point) && isLeftEdgeOf(point.node, ancestor);
}

/* @param {BoundaryPoint} @param {Node} @return {Boolean} */
function isRightEdgePointOf(point, ancestor) {
  return isRightEdgePoint(point) && isRightEdgeOf(point.node, ancestor);
}

/* @param {Node} */
function position(node) {
  let offset = 0;
  while ((node = node.previousSibling)) {
    offset += 1;
  }
  return offset;
}

function hasChildren(node) {
  return !!(node && node.childNodes && node.childNodes.length);
}

/* @param {BoundaryPoint} @param {Boolean} @return {BoundaryPoint} */
function prevPoint(point, isSkipInnerOffset) {
  let node;
  let offset;

  if (point.offset === 0) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode;
    offset = position(point.node);
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset - 1];
    offset = nodeLength(node);
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? 0 : point.offset - 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/* @param {BoundaryPoint} @param {Boolean} @return {BoundaryPoint} */
function nextPoint(point, isSkipInnerOffset) {
  let node, offset;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    let nextTextNode = getNextTextNode(point.node);
    if (nextTextNode) {
      node = nextTextNode;
      offset = 0;
    } else {
      node = point.node.parentNode;
      offset = position(point.node) + 1;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/* @param {BoundaryPoint} @param {Boolean} @return {BoundaryPoint} */
function nextPointWithEmptyNode(point, isSkipInnerOffset) {
  let node;
  let offset;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode;
    offset = position(point.node) + 1;

    if (isEditable(node)) {
      node = point.node.nextSibling;
      offset = 0;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

function getNextTextNode(actual) {
  if(!actual.nextSibling) return undefined;
  if(actual.parent !== actual.nextSibling.parent) return undefined;

  if(isText(actual.nextSibling) ) return actual.nextSibling;
  else return getNextTextNode(actual.nextSibling);
}

/* @param {BoundaryPoint} @param {BoundaryPoint} @return {Boolean} */
function isSamePoint(pointA, pointB) {
  return pointA.node === pointB.node && pointA.offset === pointB.offset;
}

/* @param {BoundaryPoint} @return {Boolean} */
function isVisiblePoint(point) {
  if (isText(point.node) || !hasChildren(point.node) || isEmpty(point.node)) {
    return true;
  }

  const leftNode = point.node.childNodes[point.offset - 1];
  const rightNode = point.node.childNodes[point.offset];
  if ((!leftNode || isVoid(leftNode)) && (!rightNode || isVoid(rightNode)) || isTable(rightNode)) {
    return true;
  }

  return false;
}

/* @param {BoundaryPoint} @param {Function} @return {BoundaryPoint} */
function prevPointUntil(point, pred) {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = prevPoint(point);
  }

  return null;
}

/* @param {BoundaryPoint} @param {Function} @return {BoundaryPoint} */
function nextPointUntil(point, pred) {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = nextPoint(point);
  }

  return null;
}

/* @param {Point} @return {Boolean} */
function isCharPoint(point) {
  if (!isText(point.node)) {
    return false;
  }

  const ch = point.node.nodeValue.charAt(point.offset - 1);
  return ch && (ch !== ' ' && ch !== NBSP_CHAR);
}

/* @param {Point} @return {Boolean} */
function isSpacePoint(point) {
  if (!isText(point.node)) {
    return false;
  }

  const ch = point.node.nodeValue.charAt(point.offset - 1);
  return ch === ' ' || ch === NBSP_CHAR;
}

/* @param {BoundaryPoint} @param {BoundaryPoint} @param {Function} @param {Boolean} */
function walkPoint(startPoint, endPoint, handler, isSkipInnerOffset) {
  let point = startPoint;

  while (point && point.node) {
    handler(point);

    if (isSamePoint(point, endPoint)) {
      break;
    }

    const isSkipOffset = isSkipInnerOffset &&
                       startPoint.node !== point.node &&
                       endPoint.node !== point.node;
    point = nextPointWithEmptyNode(point, isSkipOffset);
  }
}

/* @param {Node} @param {Node} */
function makeOffsetPath(ancestor, node) {
  const ancestors = listAncestor(node, func.eq(ancestor));
  return ancestors.map(position).reverse();
}

/* @param {Node} @param {array} */
function fromOffsetPath(ancestor, offsets) {
  let current = ancestor;
  for (let i = 0, len = offsets.length; i < len; i++) {
    if (current.childNodes.length <= offsets[i]) {
      current = current.childNodes[current.childNodes.length - 1];
    } else {
      current = current.childNodes[offsets[i]];
    }
  }
  return current;
}

/* @param {BoundaryPoint} @param {Object} @param {Boolean} @param {Boolean} @param {Boolean} @return {Node} */
function splitNode(point, options) {
  let isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
  const isNotSplitEdgePoint = options && options.isNotSplitEdgePoint;
  const isDiscardEmptySplits = options && options.isDiscardEmptySplits;

  if (isDiscardEmptySplits) {
    isSkipPaddingBlankHTML = true;
  }

  if (isEdgePoint(point) && (isText(point.node) || isNotSplitEdgePoint)) {
    if (isLeftEdgePoint(point)) {
      return point.node;
    }
    return point.node.nextSibling;
  }

  if (isText(point.node)) {
    return point.node.splitText(point.offset);
  } else {
    const childNode = point.node.childNodes[point.offset];
    let childNodes = listNext(childNode);

    const clone = insertAfter(point.node.cloneNode(false), point.node);
    appendChildNodes(clone, childNodes);

    if (!isSkipPaddingBlankHTML) {
      paddingBlankHTML(point.node);
      paddingBlankHTML(clone);
    }

    if (isDiscardEmptySplits) {
      if (isEmpty(point.node)) {
        remove(point.node);
      }
      if (isEmpty(clone)) {
        remove(clone);
        return point.node.nextSibling;
      }
    }

    return clone;
  }
}

/* @param {Node} @param {BoundaryPoint} @param {Object} @param {Boolean} @param {Boolean} @return {Node} */
function splitTree(root, point, options) {
  
  let ancestors = listAncestor(point.node, func.eq(root));

  if (!ancestors.length) {
    return null;
  } else if (ancestors.length === 1) {
    return splitNode(point, options);
  }
  
  if (ancestors.length > 2) {
    let domList = ancestors.slice(0, ancestors.length - 1);
    let ifHasNextSibling = domList.find(item => item.nextSibling);
    if (ifHasNextSibling && point.offset != 0 && isRightEdgePoint(point)) {
      let nestSibling = ifHasNextSibling.nextSibling;
      let textNode;
      if (nestSibling.nodeType == 1) {
        textNode = nestSibling.childNodes[0];
        ancestors = listAncestor(textNode, func.eq(root));
        point = {
          node: textNode,
          offset: 0,
        };
      }
      else if (nestSibling.nodeType == 3 && !nestSibling.data.match(/[\n\r]/g)) {
        textNode = nestSibling;
        ancestors = listAncestor(textNode, func.eq(root));
        point = {
          node: textNode,
          offset: 0,
        };
      }
    }
  }
  return ancestors.reduce(function(node, parent) {
    if (node === point.node) {
      node = splitNode(point, options);
    }

    return splitNode({
      node: parent,
      offset: node ? position(node) : nodeLength(parent),
    }, options);
  });
}

/* @param {Point} @param {Boolean} @return {Object} */
function splitPoint(point, isInline) {
  
  const pred = isInline ? isPara : isBodyContainer;
  const ancestors = listAncestor(point.node, pred);
  const topAncestor = lists.last(ancestors);

  let splitRoot, container;
  if (pred(topAncestor)) {
    splitRoot = ancestors[ancestors.length - 2];
    container = topAncestor;
  } else {
    splitRoot = topAncestor;
    container = splitRoot.parentNode;
  }

  let pivot = splitRoot && splitTree(splitRoot, point, {
    isSkipPaddingBlankHTML: isInline,
    isNotSplitEdgePoint: isInline,
  });

  if (!pivot && container === point.node) {
    pivot = point.node.childNodes[point.offset];
  }

  return {
    rightNode: pivot,
    container: container,
  };
}

function create(nodeName) {
  return document.createElement(nodeName);
}

function createText(text) {
  return document.createTextNode(text);
}

/* @param {Node} @param {Boolean} */
function remove(node, isRemoveChild) {
  if (!node || !node.parentNode) { return; }
  if (node.removeNode) { return node.removeNode(isRemoveChild); }

  const parent = node.parentNode;
  if (!isRemoveChild) {
    const nodes = [];
    for (let i = 0, len = node.childNodes.length; i < len; i++) {
      nodes.push(node.childNodes[i]);
    }

    for (let i = 0, len = nodes.length; i < len; i++) {
      parent.insertBefore(nodes[i], node);
    }
  }

  parent.removeChild(node);
}

/* @param {Node} @param {Function} */
function removeWhile(node, pred) {
  while (node) {
    if (isEditable(node) || !pred(node)) {
      break;
    }

    const parent = node.parentNode;
    remove(node);
    node = parent;
  }
}

/* @param {Node} @param {String} @return {Node} */
function replace(node, nodeName) {
  if (node.nodeName.toUpperCase() === nodeName.toUpperCase()) {
    return node;
  }

  const newNode = create(nodeName);

  if (node.style.cssText) {
    newNode.style.cssText = node.style.cssText;
  }

  appendChildNodes(newNode, lists.from(node.childNodes));
  insertAfter(newNode, node);
  remove(node);

  return newNode;
}

const isTextarea = makePredByNodeName('TEXTAREA');

/* @param {DomQuery|Element} @param {Boolean} */
function value($node, stripLinebreaks) {
  const el = $node.get ? $node.get(0) : $node[0];
  const val = isTextarea(el) ? (el.value || $node.val()) : $node.html();
  if (stripLinebreaks) {
    return val.replace(/[\n\r]/g, '');
  }
  return val;
}

/* @param {DomQuery|Element} @param {Boolean} */
function html($node, isNewlineOnBlock) {
  let markup = value($node);

  if (isNewlineOnBlock) {
    const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
    markup = markup.replace(regexTag, function(match, endSlash, name) {
      name = name.toUpperCase();
      const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) &&
                                   !!endSlash;
      const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);

      return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
    });
    markup = markup.trim();
  }

  return markup;
}

function posFromPlaceholder(placeholder) {
  const $placeholder = $$(placeholder);
  const pos = $placeholder.offset();
  const height = $placeholder.outerHeight(true); 

  return {
    left: pos.left,
    top: pos.top + height,
  };
}

function attachEvents($node, events) {
  Object.keys(events).forEach(function(key) {
    $node.on(key, events[key]);
  });
}

function detachEvents($node, events) {
  Object.keys(events).forEach(function(key) {
    $node.off(key, events[key]);
  });
}

/* @param {Node} */
function isCustomStyleTag(node) {
  return node && !isText(node) && lists.contains(node.classList, 'note-styletag');
}

export default {
  
  NBSP_CHAR,
  
  ZERO_WIDTH_NBSP_CHAR,
  
  blank: blankHTML,
  
  emptyPara: `<p>${blankHTML}</p>`,
  makePredByNodeName,
  isEditable,
  isControlSizing,
  isText,
  isElement,
  isVoid,
  isPara,
  isPurePara,
  isHeading,
  isInline,
  isBlock: func.not(isInline),
  isBodyInline,
  isBody,
  isParaInline,
  isPre,
  isList,
  isTable,
  isData,
  isCell,
  isBlockquote,
  isBodyContainer,
  isAnchor,
  isDiv: makePredByNodeName('DIV'),
  isLi,
  isBR: makePredByNodeName('BR'),
  isSpan: makePredByNodeName('SPAN'),
  isB: makePredByNodeName('B'),
  isU: makePredByNodeName('U'),
  isS: makePredByNodeName('S'),
  isI: makePredByNodeName('I'),
  isImg,
  isVideo,
  isIframe,
  isVideoMedia: function(node) {
    return !!(node && (isVideo(node) || (isIframe(node) && $$(node).hasClass('note-video-clip'))));
  },
  isTextarea,
  deepestChildIsEmpty,
  isEmpty,
  isEmptyAnchor: func.and(isAnchor, isEmpty),
  isClosestSibling,
  withClosestSiblings,
  nodeLength,
  isLeftEdgePoint,
  isRightEdgePoint,
  isEdgePoint,
  isLeftEdgeOf,
  isRightEdgeOf,
  isLeftEdgePointOf,
  isRightEdgePointOf,
  prevPoint,
  nextPoint,
  nextPointWithEmptyNode,
  isSamePoint,
  isVisiblePoint,
  prevPointUntil,
  nextPointUntil,
  isCharPoint,
  isSpacePoint,
  walkPoint,
  ancestor,
  singleChildAncestor,
  listAncestor,
  lastAncestor,
  listNext,
  listPrev,
  listDescendant,
  commonAncestor,
  wrap,
  insertAfter,
  appendChildNodes,
  position,
  hasChildren,
  makeOffsetPath,
  fromOffsetPath,
  splitTree,
  splitPoint,
  create,
  createText,
  remove,
  removeWhile,
  replace,
  html,
  value,
  posFromPlaceholder,
  attachEvents,
  detachEvents,
  isCustomStyleTag,
};