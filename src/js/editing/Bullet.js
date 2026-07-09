import $$ from '../core/dom-query.js';
import lists from '../core/lists';
import func from '../core/func';
import dom from '../core/dom';
import range from '../core/range';

export default class Bullet {
  
  insertOrderedList(editable) {
    this.toggleList('OL', editable);
  }

  insertUnorderedList(editable) {
    this.toggleList('UL', editable);
  }

  indent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    $$.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        const previousList = this.findList(head.previousSibling);
        if (previousList) {
          paras.map((para) => previousList.appendChild(para));
        } else {
          this.wrapList(paras, head.parentNode.nodeName);
          paras.map((para) => para.parentNode).map((para) => this.appendToPrevious(para));
        }
      } else {
        $$.each(paras, (idx, para) => {
          const marginLeft = parseInt($$(para).css('marginLeft'), 10) || 0;
          $$(para).css('marginLeft', marginLeft + 25);
        });
      }
    });

    rng.select();
  }

  outdent(editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    const paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    $$.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      if (dom.isLi(head)) {
        this.releaseList([paras]);
      } else {
        $$.each(paras, (idx, para) => {
          const marginLeft = parseInt($$(para).css('marginLeft'), 10) || 0;
          $$(para).css('marginLeft', marginLeft > 25 ? marginLeft - 25 : '');
        });
      }
    });

    rng.select();
  }

  /* @param {String} */
  toggleList(listName, editable) {
    const rng = range.create(editable).wrapBodyInlineWithPara();

    let paras = rng.nodes(dom.isPara, { includeAncestor: true });
    const bookmark = rng.paraBookmark(paras);
    const clustereds = lists.clusterBy(paras, func.peq2('parentNode'));

    if (lists.find(paras, dom.isPurePara)) {
      let wrappedParas = [];
      $$.each(clustereds, (idx, paras) => {
        wrappedParas = wrappedParas.concat(this.wrapList(paras, listName));
      });
      paras = wrappedParas;
      
    } else {
      const diffLists = rng
        .nodes(dom.isList, {
          includeAncestor: true,
        })
        .filter((listNode) => {
          return (listNode.nodeName !== listName);
        });

      if (diffLists.length) {
        $$.each(diffLists, (idx, listNode) => {
          dom.replace(listNode, listName);
        });
      } else {
        paras = this.releaseList(clustereds, true);
      }
    }

    range.createFromParaBookmark(bookmark, paras).select();
  }

  /* @param {Node[]} @param {String} @return {Node[]} */
  wrapList(paras, listName) {
    const head = lists.head(paras);
    const last = lists.last(paras);

    const prevList = dom.isList(head.previousSibling) && head.previousSibling;
    const nextList = dom.isList(last.nextSibling) && last.nextSibling;

    const listNode = prevList || dom.insertAfter(dom.create(listName || 'UL'), last);

    paras = paras.map((para) => {
      return dom.isPurePara(para) ? dom.replace(para, 'LI') : para;
    });

    dom.appendChildNodes(listNode, paras, true);

    if (nextList) {
      dom.appendChildNodes(listNode, lists.from(nextList.childNodes), true);
      dom.remove(nextList);
    }

    return paras;
  }

  /* @param {Array[]} @param {Boolean} @return {Node[]} */
  releaseList(clustereds, isEscapseToBody) {
    let releasedParas = [];

    $$.each(clustereds, (idx, paras) => {
      const head = lists.head(paras);
      const last = lists.last(paras);

      const headList = isEscapseToBody ? dom.lastAncestor(head, dom.isList) : head.parentNode;
      const parentItem = headList.parentNode;

      if (headList.parentNode.nodeName === 'LI') {
        paras.map((para) => {
          const newList = this.findNextSiblings(para);

          if (parentItem.nextSibling) {
            parentItem.parentNode.insertBefore(para, parentItem.nextSibling);
          } else {
            parentItem.parentNode.appendChild(para);
          }

          if (newList.length) {
            this.wrapList(newList, headList.nodeName);
            para.appendChild(newList[0].parentNode);
          }
        });

        if (headList.children.length === 0) {
          parentItem.removeChild(headList);
        }

        if (parentItem.childNodes.length === 0) {
          parentItem.parentNode.removeChild(parentItem);
        }
      } else {
        const lastList =
          headList.childNodes.length > 1
            ? dom.splitTree(
              headList,
              {
                node: last.parentNode,
                offset: dom.position(last) + 1,
              },
              {
                isSkipPaddingBlankHTML: true,
              },
            )
            : null;

        const middleList = dom.splitTree(
          headList,
          {
            node: head.parentNode,
            offset: dom.position(head),
          },
          {
            isSkipPaddingBlankHTML: true,
          },
        );

        paras = isEscapseToBody
          ? dom.listDescendant(middleList, dom.isLi)
          : lists.from(middleList.childNodes).filter(dom.isLi);

        if (isEscapseToBody || !dom.isList(headList.parentNode)) {
          paras = paras.map((para) => {
            return dom.replace(para, 'P');
          });
        }

        $$.each(lists.from(paras).reverse(), (idx, para) => {
          dom.insertAfter(para, headList);
        });

        const rootLists = lists.compact([headList, middleList, lastList]);
        $$.each(rootLists, (idx, rootList) => {
          const listNodes = [rootList].concat(dom.listDescendant(rootList, dom.isList));
          $$.each(listNodes.reverse(), (idx, listNode) => {
            if (!dom.nodeLength(listNode)) {
              dom.remove(listNode, true);
            }
          });
        });
      }

      releasedParas = releasedParas.concat(paras);
    });

    return releasedParas;
  }

  /* @param {HTMLNode} @return {HTMLNode} */
  appendToPrevious(node) {
    return node.previousSibling ? dom.appendChildNodes(node.previousSibling, [node]) : this.wrapList([node], 'LI');
  }

  /* @param {HTMLNode} @return {Array[]} */
  findList(node) {
    return node ? lists.find(node.children, (child) => ['OL', 'UL'].indexOf(child.nodeName) > -1) : null;
  }

  /* @param {HTMLNode} @return {HTMLNode} */
  findNextSiblings(node) {
    const siblings = [];
    while (node.nextSibling) {
      siblings.push(node.nextSibling);
      node = node.nextSibling;
    }
    return siblings;
  }
}