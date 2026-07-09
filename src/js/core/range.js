import $$ from './dom-query.js';
import env from './env';
import func from './func';
import lists from './lists';
import dom from './dom';

/* @param {TextRange} @param {Boolean} @return {BoundaryPoint} */
function textRangeToPoint(textRange, isStart) {
  let container = textRange.parentElement();
  let offset;

  const tester = document.body.createTextRange();
  let prevContainer;
  const childNodes = lists.from(container.childNodes);
  for (offset = 0; offset < childNodes.length; offset++) {
    if (dom.isText(childNodes[offset])) {
      continue;
    }
    tester.moveToElementText(childNodes[offset]);
    if (tester.compareEndPoints('StartToStart', textRange) >= 0) {
      break;
    }
    prevContainer = childNodes[offset];
  }

  if (offset !== 0 && dom.isText(childNodes[offset - 1])) {
    const textRangeStart = document.body.createTextRange();
    textRangeStart.moveToElementText(prevContainer || container);
    textRangeStart.collapse(!prevContainer);
    let curTextNode = prevContainer ? prevContainer.nextSibling : container.firstChild;

    const pointTester = textRange.duplicate();
    pointTester.setEndPoint('StartToStart', textRangeStart);
    let textCount = pointTester.text.replace(/[\r\n]/g, '').length;

    while (textCount > curTextNode.nodeValue.length && curTextNode.nextSibling) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    if (isStart && curTextNode.nextSibling && dom.isText(curTextNode.nextSibling) &&
      textCount === curTextNode.nodeValue.length) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    container = curTextNode;
    offset = textCount;
  }

  return {
    cont: container,
    offset: offset,
  };
}

/* @param {BoundaryPoint} @return {TextRange} */
function pointToTextRange(point) {
  const textRangeInfo = function(container, offset) {
    let node, isCollapseToStart;

    if (dom.isText(container)) {
      const prevTextNodes = dom.listPrev(container, func.not(dom.isText));
      const prevContainer = lists.last(prevTextNodes).previousSibling;
      node = prevContainer || container.parentNode;
      offset += lists.sum(lists.tail(prevTextNodes), dom.nodeLength);
      isCollapseToStart = !prevContainer;
    } else {
      node = container.childNodes[offset] || container;
      if (dom.isText(node)) {
        return textRangeInfo(node, 0);
      }

      offset = 0;
      isCollapseToStart = false;
    }

    return {
      node: node,
      collapseToStart: isCollapseToStart,
      offset: offset,
    };
  };

  const textRange = document.body.createTextRange();
  const info = textRangeInfo(point.node, point.offset);

  textRange.moveToElementText(info.node);
  textRange.collapse(info.collapseToStart);
  textRange.moveStart('character', info.offset);
  return textRange;
}

/* @param {Node} @param {Number} @param {Node} @param {Number} */
class WrappedRange {
  constructor(sc, so, ec, eo) {
    this.sc = sc;
    this.so = so;
    this.ec = ec;
    this.eo = eo;

    this.isOnEditable = this.makeIsOn(dom.isEditable);
    
    this.isOnList = this.makeIsOn(dom.isList);
    
    this.isOnAnchor = this.makeIsOn(dom.isAnchor);
    
    this.isOnCell = this.makeIsOn(dom.isCell);
    
    this.isOnData = this.makeIsOn(dom.isData);
  }

  nativeRange() {
    if (env.isW3CRangeSupport) {
      const w3cRange = document.createRange();
      w3cRange.setStart(this.sc, this.so);
      w3cRange.setEnd(this.ec, this.ec.data ? Math.min(this.eo, this.ec.data.length) : this.eo);

      return w3cRange;
    } else {
      const textRange = pointToTextRange({
        node: this.sc,
        offset: this.so,
      });

      textRange.setEndPoint('EndToEnd', pointToTextRange({
        node: this.ec,
        offset: this.eo,
      }));

      return textRange;
    }
  }

  getPoints() {
    return {
      sc: this.sc,
      so: this.so,
      ec: this.ec,
      eo: this.eo,
    };
  }

  getStartPoint() {
    return {
      node: this.sc,
      offset: this.so,
    };
  }

  getEndPoint() {
    return {
      node: this.ec,
      offset: this.eo,
    };
  }

  select() {
    const nativeRng = this.nativeRange();
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
      selection.addRange(nativeRng);
    } else {
      nativeRng.select();
    }

    return this;
  }

  /* @return {WrappedRange} */
  scrollIntoView(container) {
    const height = $$(container).height();
    if (container.scrollTop + height < this.sc.offsetTop) {
      container.scrollTop += Math.abs(container.scrollTop + height - this.sc.offsetTop);
    }

    return this;
  }

  /* @return {WrappedRange} */
  normalize() {
    /* @param {BoundaryPoint} @param {Boolean} @return {BoundaryPoint} */
    const getVisiblePoint = function(point, isLeftToRight) {
      
      if (dom.isVisiblePoint(point)) {
        if (!dom.isEdgePoint(point) ||
            (dom.isRightEdgePoint(point) && !isLeftToRight) ||
            (dom.isLeftEdgePoint(point) && isLeftToRight) ||
            (dom.isRightEdgePoint(point) && isLeftToRight && dom.isVoid(point.node.nextSibling)) ||
            (dom.isLeftEdgePoint(point) && !isLeftToRight && dom.isVoid(point.node.previousSibling)) ||
            (dom.isBlock(point.node) && dom.isEmpty(point.node))) {
          return point;
        }
      }

      const block = dom.ancestor(point.node, dom.isBlock);
      const prevPoint = dom.prevPoint(point) || { node: null };
      const hasRightNode = (dom.isLeftEdgePointOf(point, block) || dom.isVoid(prevPoint.node)) && !isLeftToRight;

      const immediateNextPoint = dom.nextPoint(point) || { node: null };
      const hasLeftNode = (dom.isRightEdgePointOf(point, block) || dom.isVoid(immediateNextPoint.node)) && isLeftToRight;

      if (hasRightNode || hasLeftNode) {
        
        if (dom.isVisiblePoint(point)) {
          return point;
        }
        
        isLeftToRight = !isLeftToRight;
      }

      const nextVisiblePoint = isLeftToRight ? dom.nextPointUntil(dom.nextPoint(point), dom.isVisiblePoint)
        : dom.prevPointUntil(dom.prevPoint(point), dom.isVisiblePoint);
      return nextVisiblePoint || point;
    };

    const endPoint = getVisiblePoint(this.getEndPoint(), false);
    const startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset,
    );
  }

  /* @param {Function} @param {Object} @param {Boolean} @param {Boolean} @return {Node[]} */
  nodes(pred, options) {
    pred = pred || func.ok;

    const includeAncestor = options && options.includeAncestor;
    const fullyContains = options && options.fullyContains;

    const startPoint = this.getStartPoint();
    const endPoint = this.getEndPoint();

    const nodes = [];
    const leftEdgeNodes = [];

    dom.walkPoint(startPoint, endPoint, function(point) {
      if (dom.isEditable(point.node)) {
        return;
      }

      let node;
      if (fullyContains) {
        if (dom.isLeftEdgePoint(point)) {
          leftEdgeNodes.push(point.node);
        }
        if (dom.isRightEdgePoint(point) && lists.contains(leftEdgeNodes, point.node)) {
          node = point.node;
        }
      } else if (includeAncestor) {
        node = dom.ancestor(point.node, pred);
      } else {
        node = point.node;
      }

      if (node && pred(node)) {
        nodes.push(node);
      }
    }, true);

    return lists.unique(nodes);
  }

  /* @return {Element} */
  commonAncestor() {
    return dom.commonAncestor(this.sc, this.ec);
  }

  /* @param {Function} @return {WrappedRange} */
  expand(pred) {
    const startAncestor = dom.ancestor(this.sc, pred);
    const endAncestor = dom.ancestor(this.ec, pred);

    if (!startAncestor && !endAncestor) {
      return new WrappedRange(this.sc, this.so, this.ec, this.eo);
    }

    const boundaryPoints = this.getPoints();

    if (startAncestor) {
      boundaryPoints.sc = startAncestor;
      boundaryPoints.so = 0;
    }

    if (endAncestor) {
      boundaryPoints.ec = endAncestor;
      boundaryPoints.eo = dom.nodeLength(endAncestor);
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo,
    );
  }

  /* @param {Boolean} @return {WrappedRange} */
  collapse(isCollapseToStart) {
    if (isCollapseToStart) {
      return new WrappedRange(this.sc, this.so, this.sc, this.so);
    } else {
      return new WrappedRange(this.ec, this.eo, this.ec, this.eo);
    }
  }

  splitText() {
    const isSameContainer = this.sc === this.ec;
    const boundaryPoints = this.getPoints();

    if (dom.isText(this.ec) && !dom.isEdgePoint(this.getEndPoint())) {
      this.ec.splitText(this.eo);
    }

    if (dom.isText(this.sc) && !dom.isEdgePoint(this.getStartPoint())) {
      boundaryPoints.sc = this.sc.splitText(this.so);
      boundaryPoints.so = 0;

      if (isSameContainer) {
        boundaryPoints.ec = boundaryPoints.sc;
        boundaryPoints.eo = this.eo - this.so;
      }
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo,
    );
  }

  /* @return {WrappedRange} */
  deleteContents() {
    if (this.isCollapsed()) {
      return this;
    }

    const rng = this.splitText();
    const nodes = rng.nodes(null, {
      fullyContains: true,
    });

    const point = dom.prevPointUntil(rng.getStartPoint(), function(point) {
      return !lists.contains(nodes, point.node);
    });

    const emptyParents = [];
    nodes.forEach(function(node) {
      
      const parent = node.parentNode;
      if (point.node !== parent && dom.nodeLength(parent) === 1) {
        emptyParents.push(parent);
      }
      dom.remove(node, false);
    });

    emptyParents.forEach(function(node) {
      dom.remove(node, false);
    });

    return new WrappedRange(
      point.node,
      point.offset,
      point.node,
      point.offset,
    ).normalize();
  }

  makeIsOn(pred) {
    return function() {
      const ancestor = dom.ancestor(this.sc, pred);
      return !!ancestor && (ancestor === dom.ancestor(this.ec, pred));
    };
  }

  /* @param {Function} @return {Boolean} */
  isLeftEdgeOf(pred) {
    if (!dom.isLeftEdgePoint(this.getStartPoint())) {
      return false;
    }

    const node = dom.ancestor(this.sc, pred);
    return node && dom.isLeftEdgeOf(this.sc, node);
  }

  isCollapsed() {
    return this.sc === this.ec && this.so === this.eo;
  }

  /* @return {WrappedRange} */
  wrapBodyInlineWithPara() {
    if (dom.isBodyContainer(this.sc) && dom.isEmpty(this.sc)) {
      this.sc.innerHTML = dom.emptyPara;
      return new WrappedRange(this.sc.firstChild, 0, this.sc.firstChild, 0);
    }

    const rng = this.normalize();
    if (dom.isParaInline(this.sc) || dom.isPara(this.sc)) {
      return rng;
    }

    let topAncestor;
    if (dom.isInline(rng.sc)) {
      const ancestors = dom.listAncestor(rng.sc, func.not(dom.isInline));
      topAncestor = lists.last(ancestors);
      if (!dom.isInline(topAncestor)) {
        topAncestor = ancestors[ancestors.length - 2];
      }
    } else {
      topAncestor = rng.sc.childNodes[rng.so > 0 ? rng.so - 1 : 0];
    }

    if (topAncestor) {
      
      let inlineSiblings = dom.listPrev(topAncestor, dom.isParaInline).reverse();
      inlineSiblings = inlineSiblings.concat(dom.listNext(topAncestor.nextSibling, dom.isParaInline));

      if (inlineSiblings.length) {
        const para = dom.wrap(lists.head(inlineSiblings), 'p');
        dom.appendChildNodes(para, lists.tail(inlineSiblings));
      }
    }

    return this.normalize();
  }

  /* @param {Node} @param {Boolean} @return {Node} */
  insertNode(node, doNotInsertPara = false) {
    let rng = this;

    if (dom.isText(node) || dom.isInline(node)) {
      rng = this.wrapBodyInlineWithPara().deleteContents();
    }

    const info = dom.splitPoint(rng.getStartPoint(), dom.isInline(node));
    if (info.rightNode) {
      info.rightNode.parentNode.insertBefore(node, info.rightNode);
      if (dom.isEmpty(info.rightNode) && (doNotInsertPara || dom.isPara(node))) {
        info.rightNode.parentNode.removeChild(info.rightNode);
      }
    } else {
      info.container.appendChild(node);
    }

    return node;
  }

  pasteHTML(markup) {
    markup = ((markup || '') + '').trim();

    const contentsContainer = document.createElement('div');
    contentsContainer.innerHTML = markup;
    let childNodes = lists.from(contentsContainer.childNodes).reverse();

    const rng = this;

    childNodes = childNodes.map(function(childNode) {
      return rng.insertNode(childNode, !dom.isInline(childNode));
    });

    return childNodes.reverse();
  }

  /* @return {String} */
  toString() {
    const nativeRng = this.nativeRange();
    return env.isW3CRangeSupport ? nativeRng.toString() : nativeRng.text;
  }

  /* @param {Boolean} @return {WrappedRange} */
  getWordRange(findAfter) {
    let endPoint = this.getEndPoint();

    if (!dom.isCharPoint(endPoint)) {
      return this;
    }

    const startPoint = dom.prevPointUntil(endPoint, function(point) {
      return !dom.isCharPoint(point);
    });

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, function(point) {
        return !dom.isCharPoint(point);
      });
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset,
    );
  }

  /* @param {Boolean} @return {WrappedRange} */
  getWordsRange(findAfter) {
    var endPoint = this.getEndPoint();

    var isNotTextPoint = function(point) {
      return !dom.isCharPoint(point) && !dom.isSpacePoint(point);
    };

    if (isNotTextPoint(endPoint)) {
      return this;
    }

    var startPoint = dom.prevPointUntil(endPoint, isNotTextPoint);

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, isNotTextPoint);
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset,
    );
  }

  /* @param {RegExp} @return {WrappedRange|null} */
  getWordsMatchRange(regex) {
    var endPoint = this.getEndPoint();

    var startPoint = dom.prevPointUntil(endPoint, function(point) {
      if (!dom.isCharPoint(point) && !dom.isSpacePoint(point)) {
        return true;
      }
      var rng = new WrappedRange(
        point.node,
        point.offset,
        endPoint.node,
        endPoint.offset,
      );
      var result = regex.exec(rng.toString());
      return result && result.index === 0;
    });

    var rng = new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset,
    );

    var text = rng.toString();
    var result = regex.exec(text);

    if (result && result[0].length === text.length) {
      return rng;
    } else {
      return null;
    }
  }

  /* @param {Node} */
  bookmark(editable) {
    return {
      s: {
        path: dom.makeOffsetPath(editable, this.sc),
        offset: this.so,
      },
      e: {
        path: dom.makeOffsetPath(editable, this.ec),
        offset: this.eo,
      },
    };
  }

  /* @param {Node[]} */
  paraBookmark(paras) {
    return {
      s: {
        path: lists.tail(dom.makeOffsetPath(lists.head(paras), this.sc)),
        offset: this.so,
      },
      e: {
        path: lists.tail(dom.makeOffsetPath(lists.last(paras), this.ec)),
        offset: this.eo,
      },
    };
  }

  /* @return {Rect[]} */
  getClientRects() {
    const nativeRng = this.nativeRange();
    return nativeRng.getClientRects();
  }
}

export default {
  /* @param {Node} @param {Number} @param {Node} @param {Number} @return {WrappedRange} */
  create: function(sc, so, ec, eo) {
    if (arguments.length === 4) {
      return new WrappedRange(sc, so, ec, eo);
    } else if (arguments.length === 2) { 
      ec = sc;
      eo = so;
      return new WrappedRange(sc, so, ec, eo);
    } else {
      let wrappedRange = this.createFromSelection();

      if (!wrappedRange && arguments.length === 1) {
        let bodyElement = arguments[0];
        if (dom.isEditable(bodyElement)) {
          bodyElement = bodyElement.lastChild;
        }
        return this.createFromBodyElement(bodyElement, dom.emptyPara === arguments[0].innerHTML);
      }
      return wrappedRange;
    }
  },

  createFromBodyElement: function(bodyElement, isCollapseToStart = false) {
    var wrappedRange = this.createFromNode(bodyElement);
    return wrappedRange.collapse(isCollapseToStart);
  },

  createFromSelection: function() {
    let sc, so, ec, eo;
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      } else if (dom.isBody(selection.anchorNode)) {
        
        return null;
      }

      const nativeRng = selection.getRangeAt(0);
      sc = nativeRng.startContainer;
      so = nativeRng.startOffset;
      ec = nativeRng.endContainer;
      eo = nativeRng.endOffset;
    } else { 
      const textRange = document.selection.createRange();
      const textRangeEnd = textRange.duplicate();
      textRangeEnd.collapse(false);
      const textRangeStart = textRange;
      textRangeStart.collapse(true);

      let startPoint = textRangeToPoint(textRangeStart, true);
      let endPoint = textRangeToPoint(textRangeEnd, false);

      if (dom.isText(startPoint.cont) && dom.isLeftEdgePoint({ node: startPoint.cont, offset: startPoint.offset }) &&
        dom.isText(endPoint.cont) && dom.isRightEdgePoint({ node: endPoint.cont, offset: endPoint.offset }) &&
        endPoint.cont.nextSibling === startPoint.cont) {
        startPoint = endPoint;
      }

      sc = startPoint.cont;
      so = startPoint.offset;
      ec = endPoint.cont;
      eo = endPoint.offset;
    }

    return new WrappedRange(sc, so, ec, eo);
  },

  /* @param {Node} @return {WrappedRange} */
  createFromNode: function(node) {
    let sc = node;
    let so = 0;
    let ec = node;
    let eo = dom.nodeLength(ec);

    if (dom.isVoid(sc)) {
      so = dom.listPrev(sc).length - 1;
      sc = sc.parentNode;
    }
    if (dom.isBR(ec)) {
      eo = dom.listPrev(ec).length - 1;
      ec = ec.parentNode;
    } else if (dom.isVoid(ec)) {
      eo = dom.listPrev(ec).length;
      ec = ec.parentNode;
    }

    return this.create(sc, so, ec, eo);
  },

  /* @param {Node} @return {WrappedRange} */
  createFromNodeBefore: function(node) {
    return this.createFromNode(node).collapse(true);
  },

  /* @param {Node} @return {WrappedRange} */
  createFromNodeAfter: function(node) {
    return this.createFromNode(node).collapse();
  },

  /* @param {Node} @param {Object} @return {WrappedRange} */
  createFromBookmark: function(editable, bookmark) {
    const sc = dom.fromOffsetPath(editable, bookmark.s.path);
    const so = bookmark.s.offset;
    const ec = dom.fromOffsetPath(editable, bookmark.e.path);
    const eo = bookmark.e.offset;
    return new WrappedRange(sc, so, ec, eo);
  },

  /* @param {Object} @param {Node[]} @return {WrappedRange} */
  createFromParaBookmark: function(bookmark, paras) {
    const so = bookmark.s.offset;
    const eo = bookmark.e.offset;
    const sc = dom.fromOffsetPath(lists.head(paras), bookmark.s.path);
    const ec = dom.fromOffsetPath(lists.last(paras), bookmark.e.path);

    return new WrappedRange(sc, so, ec, eo);
  },
};