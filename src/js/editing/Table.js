import $$ from '../core/dom-query.js';
import dom from '../core/dom';
import range from '../core/range';
import lists from '../core/lists';

/* @param {object} @param {enum} @param {enum} @param {object} */
const TableResultAction = function(startPoint, where, action, domTable) {
  const _startPoint = { 'colPos': 0, 'rowPos': 0 };
  const _virtualTable = [];
  const _actionCellList = [];

  function setStartPoint() {
    _startPoint.colPos = startPoint.cellIndex;
    _startPoint.rowPos = startPoint.parentElement.rowIndex;
  }

  /* @param {int} @param {int} @param {object} @param {object} @param {bool} */
  function setVirtualTablePosition(rowIndex, cellIndex, baseRow, baseCell, isRowSpan, isColSpan, isVirtualCell) {
    const objPosition = {
      'baseRow': baseRow,
      'baseCell': baseCell,
      'isRowSpan': isRowSpan,
      'isColSpan': isColSpan,
      'isVirtual': isVirtualCell,
    };
    if (!_virtualTable[rowIndex]) {
      _virtualTable[rowIndex] = [];
    }
    _virtualTable[rowIndex][cellIndex] = objPosition;
  }

  /* @param {object} @param {enum} */
  function getActionCell(virtualTableCellObj, resultAction, virtualRowPosition, virtualColPosition) {
    return {
      'baseCell': virtualTableCellObj.baseCell,
      'action': resultAction,
      'virtualTable': {
        'rowIndex': virtualRowPosition,
        'cellIndex': virtualColPosition,
      },
    };
  }

  /* @param {int} @param {int} */
  function recoverCellIndex(rowIndex, cellIndex) {
    if (!_virtualTable[rowIndex]) {
      return cellIndex;
    }
    if (!_virtualTable[rowIndex][cellIndex]) {
      return cellIndex;
    }

    let newCellIndex = cellIndex;
    while (_virtualTable[rowIndex][newCellIndex]) {
      newCellIndex++;
      if (!_virtualTable[rowIndex][newCellIndex]) {
        return newCellIndex;
      }
    }
  }

  /* @param {object} @param {object} */
  function addCellInfoToVirtual(row, cell) {
    const cellIndex = recoverCellIndex(row.rowIndex, cell.cellIndex);
    const cellHasColspan = (cell.colSpan > 1);
    const cellHasRowspan = (cell.rowSpan > 1);
    const isThisSelectedCell = (row.rowIndex === _startPoint.rowPos && cell.cellIndex === _startPoint.colPos);
    setVirtualTablePosition(row.rowIndex, cellIndex, row, cell, cellHasRowspan, cellHasColspan, false);

    const rowspanNumber = cell.attributes.rowSpan ? parseInt(cell.attributes.rowSpan.value, 10) : 0;
    if (rowspanNumber > 1) {
      for (let rp = 1; rp < rowspanNumber; rp++) {
        const rowspanIndex = row.rowIndex + rp;
        adjustStartPoint(rowspanIndex, cellIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(rowspanIndex, cellIndex, row, cell, true, cellHasColspan, true);
      }
    }

    const colspanNumber = cell.attributes.colSpan ? parseInt(cell.attributes.colSpan.value, 10) : 0;
    if (colspanNumber > 1) {
      for (let cp = 1; cp < colspanNumber; cp++) {
        const cellspanIndex = recoverCellIndex(row.rowIndex, (cellIndex + cp));
        adjustStartPoint(row.rowIndex, cellspanIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(row.rowIndex, cellspanIndex, row, cell, cellHasRowspan, true, true);
      }
    }
  }

  /* @param {int} @param {int} @param {object} @param {bool} */
  function adjustStartPoint(rowIndex, cellIndex, cell, isSelectedCell) {
    if (rowIndex === _startPoint.rowPos && _startPoint.colPos >= cell.cellIndex && cell.cellIndex <= cellIndex && !isSelectedCell) {
      _startPoint.colPos++;
    }
  }

  function createVirtualTable() {
    const rows = domTable.rows;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].cells;
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        addCellInfoToVirtual(rows[rowIndex], cells[cellIndex]);
      }
    }
  }

  /* @param {object} */
  function getDeleteResultActionToCell(cell) {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
      case TableResultAction.where.Row:
        if (!cell.isVirtual && cell.isRowSpan) {
          return TableResultAction.resultAction.AddCell;
        } else if (cell.isRowSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
    }
    return TableResultAction.resultAction.RemoveCell;
  }

  /* @param {object} */
  function getAddResultActionToCell(cell) {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isRowSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
      case TableResultAction.where.Row:
        if (cell.isRowSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isColSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
    }
    return TableResultAction.resultAction.AddCell;
  }

  function init() {
    setStartPoint();
    createVirtualTable();
  }

  this.getActionList = function() {
    const fixedRow = (where === TableResultAction.where.Row) ? _startPoint.rowPos : -1;
    const fixedCol = (where === TableResultAction.where.Column) ? _startPoint.colPos : -1;

    let actualPosition = 0;
    while (true) {
      const rowPosition = (fixedRow >= 0) ? fixedRow : actualPosition;
      const colPosition = (fixedCol >= 0) ? fixedCol : actualPosition;
      const row = _virtualTable[rowPosition];
      if (!row) {
        return _actionCellList;
      }
      const cell = row[colPosition];
      if (!cell) {
        return _actionCellList;
      }

      let resultAction = TableResultAction.resultAction.Ignore;
      switch (action) {
        case TableResultAction.requestAction.Add:
          resultAction = getAddResultActionToCell(cell);
          break;
        case TableResultAction.requestAction.Delete:
          resultAction = getDeleteResultActionToCell(cell);
          break;
      }
      _actionCellList.push(getActionCell(cell, resultAction, rowPosition, colPosition));
      actualPosition++;
    }
  };

  init();
};

TableResultAction.where = { 'Row': 0, 'Column': 1 };

TableResultAction.requestAction = { 'Add': 0, 'Delete': 1 };

TableResultAction.resultAction = { 'Ignore': 0, 'SubtractSpanCount': 1, 'RemoveCell': 2, 'AddCell': 3, 'SumSpanCount': 4 };

export default class Table {
  /* @param {WrappedRange} @param {Boolean} */
  tab(rng, isShift) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const table = dom.ancestor(cell, dom.isTable);
    const cells = dom.listDescendant(table, dom.isCell);

    const nextCell = lists[isShift ? 'prev' : 'next'](cells, cell);
    if (nextCell) {
      range.create(nextCell, 0).select();
    }
  }

  /* @param {WrappedRange} @param {String} @return {Node} */
  addRow(rng, position) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);

    const currentTr = $$(cell).closest('tr');
    const trAttributes = this.recoverAttributes(currentTr[0]);
    const html = $$($$.parseHTML('<tr' + trAttributes + '></tr>')[0]);

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Add, currentTr.closest('table')[0]);
    const actions = vTable.getActionList();

    for (let idCell = 0; idCell < actions.length; idCell++) {
      const currentCell = actions[idCell];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          html.append($$.parseHTML('<td' + tdAttributes + '>' + dom.blank + '</td>')[0]);
          break;
        case TableResultAction.resultAction.SumSpanCount:
          {
            if (position === 'top') {
              const tempTd = $$.parseHTML('<td' + tdAttributes + '>' + dom.blank + '</td>')[0];
              tempTd.removeAttribute('rowspan');
              html.append(tempTd);
              break;
            }
            let rowspanNumber = parseInt(currentCell.baseCell.rowSpan, 10);
            rowspanNumber++;
            currentCell.baseCell.setAttribute('rowSpan', rowspanNumber);
          }
          break;
      }
    }

    if (position === 'top') {
      currentTr.before(html);
    } else {
      const cellHasRowspan = (cell.rowSpan > 1);
      if (cellHasRowspan) {
        const lastTrIndex = currentTr[0].rowIndex + (cell.rowSpan - 2);
        const parentTr = currentTr.parent();
        const trs = parentTr.find('tr');
        $$(trs[lastTrIndex]).after(html);
        return;
      }
      currentTr.after(html);
    }
  }

  /* @param {WrappedRange} @param {String} @return {Node} */
  addCol(rng, position) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $$(cell).closest('tr');

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Add, row.closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const currentCell = actions[actionIndex];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          if (position === 'right') {
            $$(currentCell.baseCell).after($$.parseHTML('<td' + tdAttributes + '>' + dom.blank + '</td>')[0]);
          } else {
            $$(currentCell.baseCell).before($$.parseHTML('<td' + tdAttributes + '>' + dom.blank + '</td>')[0]);
          }
          break;
        case TableResultAction.resultAction.SumSpanCount:
          if (position === 'right') {
            let colspanNumber = parseInt(currentCell.baseCell.colSpan, 10);
            colspanNumber++;
            currentCell.baseCell.setAttribute('colSpan', colspanNumber);
          } else {
            $$(currentCell.baseCell).before($$.parseHTML('<td' + tdAttributes + '>' + dom.blank + '</td>')[0]);
          }
          break;
      }
    }
  }

  /* @param {object} @return {string} */
  recoverAttributes(el) {
    let resultStr = '';

    if (!el) {
      return resultStr;
    }

    const attrList = el.attributes;

    for (let i = 0; i < attrList.length; i++) {
      if (attrList[i].name.toLowerCase() === 'id') {
        continue;
      }

      resultStr += ' ' + attrList[i].name + '=\'' + attrList[i].value + '\'';
    }

    return resultStr;
  }

  /* @param {WrappedRange} @return {Node} */
  deleteRow(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $$(cell).closest('tr');
    const rowEl = row[0];
    const children = Array.from(rowEl.children).filter(c => c.nodeName === 'TD' || c.nodeName === 'TH');
    const cellPos = children.indexOf(cell);

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Delete, row.closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const baseCell = actions[actionIndex].baseCell;
      let rowspanNumber = parseInt(baseCell.rowSpan, 10);
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.AddCell:
          {
            const nextRow = rowEl.nextElementSibling;
            const cloneRow = rowEl.cells[cellPos];
            const keepsRowSpan = rowspanNumber > 2;

            nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
            if (keepsRowSpan) {
              nextRow.cells[cellPos].setAttribute('rowSpan', rowspanNumber - 1);
            } else {
              nextRow.cells[cellPos].removeAttribute('rowSpan');
            }
            nextRow.cells[cellPos].innerHTML = '';
          }
          continue;
        case TableResultAction.resultAction.SubtractSpanCount:
          if (rowspanNumber > 2) {
            baseCell.setAttribute('rowSpan', rowspanNumber - 1);
          } else {
            baseCell.removeAttribute('rowSpan');
          } 
          continue;
        case TableResultAction.resultAction.RemoveCell:
          
          continue;
      }
    }
    row.remove();
  }

  /* @param {WrappedRange} @return {Node} */
  deleteCol(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const row = $$(cell).closest('tr');
    const rowEl = row[0];
    const children = Array.from(rowEl.children).filter(c => c.nodeName === 'TD' || c.nodeName === 'TH');
    const cellPos = children.indexOf(cell);

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Delete, row.closest('table')[0]);
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.SubtractSpanCount:
          {
            const baseCell = actions[actionIndex].baseCell;
            let colspanNumber = parseInt(baseCell.colSpan, 10);
            const keepsColSpan = colspanNumber > 2;
            if (keepsColSpan) {
              baseCell.setAttribute('colSpan', colspanNumber - 1);
              if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            } else {
              baseCell.removeAttribute('colSpan');
              if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            }
          }
          continue;
        case TableResultAction.resultAction.RemoveCell:
          dom.remove(actions[actionIndex].baseCell, true);
          continue;
      }
    }
  }

  /* @param {Number} @param {Number} @return {Node} */
  createTable(colCount, rowCount, options) {
    const tds = [];
    let tdHTML;
    for (let idxCol = 0; idxCol < colCount; idxCol++) {
      tds.push('<td>' + dom.blank + '</td>');
    }
    tdHTML = tds.join('');

    const trs = [];
    let trHTML;
    for (let idxRow = 0; idxRow < rowCount; idxRow++) {
      trs.push('<tr>' + tdHTML + '</tr>');
    }
    trHTML = trs.join('');
    const table = $$.parseHTML('<table>' + trHTML + '</table>')[0];
    if (options && options.tableClassName) {
      $$(table).addClass(options.tableClassName);
    }

    return table;
  }

  /* @param {WrappedRange} @return {Node} */
  deleteTable(rng) {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    $$(cell).closest('table').remove();
  }
}