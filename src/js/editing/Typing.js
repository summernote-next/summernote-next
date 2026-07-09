import $$ from '../core/dom-query.js';
import dom from '../core/dom';
import range from '../core/range';
import Bullet from '../editing/Bullet';

export default class Typing {
  constructor(context) {
    
    this.bullet = new Bullet();
    this.options = context.options;
  }

  /* @param {WrappedRange} @param {Number} */
  insertTab(rng, tabsize) {
    const tab = dom.createText(new Array(tabsize + 1).join(dom.NBSP_CHAR));
    rng = rng.deleteContents();
    rng.insertNode(tab, true);

    rng = range.create(tab, tabsize);
    rng.select();
  }

  /* @param {Element} @param {WrappedRange} */
  insertParagraph(editable, rng) {
    rng = rng || range.create(editable);

    rng = rng.deleteContents();

    rng = rng.wrapBodyInlineWithPara();

    const splitRoot = dom.ancestor(rng.sc, dom.isPara);

    let nextPara;
    
    if (splitRoot) {
      
      if (dom.isLi(splitRoot) && (dom.isEmpty(splitRoot) || dom.deepestChildIsEmpty(splitRoot))) {
        
        this.bullet.toggleList(splitRoot.parentNode.nodeName);
        return;
      } else {
        let blockquote = null;
        if (this.options.blockquoteBreakingLevel === 1) {
          blockquote = dom.ancestor(splitRoot, dom.isBlockquote);
        } else if (this.options.blockquoteBreakingLevel === 2) {
          blockquote = dom.lastAncestor(splitRoot, dom.isBlockquote);
        }

        if (blockquote) {
          
          nextPara = $$.parseHTML(dom.emptyPara)[0];
          
          if (dom.isRightEdgePoint(rng.getStartPoint()) && dom.isBR(rng.sc.nextSibling)) {
            $$(rng.sc.nextSibling).remove();
          }
          const split = dom.splitTree(blockquote, rng.getStartPoint(), { isDiscardEmptySplits: true });
          if (split) {
            split.parentNode.insertBefore(nextPara, split);
          } else {
            dom.insertAfter(nextPara, blockquote); 
          }
        } else {
          nextPara = dom.splitTree(splitRoot, rng.getStartPoint());

          let emptyAnchors = dom.listDescendant(splitRoot, dom.isEmptyAnchor);
          emptyAnchors = emptyAnchors.concat(dom.listDescendant(nextPara, dom.isEmptyAnchor));

          $$.each(emptyAnchors, (idx, anchor) => {
            dom.remove(anchor);
          });

          if ((dom.isHeading(nextPara) || dom.isPre(nextPara) || dom.isCustomStyleTag(nextPara)) && dom.isEmpty(nextPara)) {
            nextPara = dom.replace(nextPara, 'p');
          }
        }
      }
    
    } else {
      const next = rng.sc.childNodes[rng.so];
      nextPara = $$.parseHTML(dom.emptyPara)[0];
      if (next) {
        rng.sc.insertBefore(nextPara, next);
      } else {
        rng.sc.appendChild(nextPara);
      }
    }

    range.create(nextPara, 0).normalize().select().scrollIntoView(editable);
  }
}