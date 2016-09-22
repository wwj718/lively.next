import { lessPosition, eqPosition, minPosition, maxPosition } from "./position.js"
import { Range, defaultRange } from "./range.js";
import { StyleRange } from "./style.js";
import config from "../config.js";
import { string, arr } from "lively.lang";
import { signal } from "lively.bindings";

var newline = "\n";


export class Selection {

  constructor(textMorph, range) {
    this.textMorph = textMorph;
    this._goalColumn = undefined;
    this._isReverse = false;

    var id = string.newUUID();
    this.startAnchor = textMorph.addAnchor("selection-start-" + id);
    this.endAnchor = textMorph.addAnchor("selection-end-" + id);

    this.range = Range.isValidLiteral(range) ? range : defaultRange;
    this._cursorVisible = true;
    this.cursorBlinkProcess = null;
  }

  get isSelection() { return true; }

  uninstall() {
    this.cursorBlinkStop();
    this.textMorph.removeAnchor(this.startAnchor);
    this.textMorph.removeAnchor(this.endAnchor);
  }

  mergeWith(otherSel) {
    if (!otherSel || !otherSel.isSelection)
        return false;
    if (Math.abs(Range.compare(this.range, otherSel.range)) > 4)
        return false;
    this.range = this.range.merge(otherSel.range);
    return true;
  }

  get range() { return this._range; }
  set range(range) {
    if (!range) return;
    let {start, end} = range;
    if (start === undefined || end === undefined) return;

    var d = this.textMorph.document;
    if (typeof start === "number") range.start = start = d.indexToPosition(start);
    if (typeof end === "number") range.end = end = d.indexToPosition(end);
    if (!Range.isValidLiteral(range)) return;

    start = d.clipPositionToLines(start);
    end = d.clipPositionToLines(end);

    var isReverse = this._isReverse = lessPosition(end, start);
    if (isReverse) [start, end] = [end, start];

    range.start = start;
    range.end = end;
    if (!range.isRange) range = new Range(range);

    if (range.equals(this._range)) return;

    this._range = range;
    this._goalColumn = this.lead.column;

    this.startAnchor.position = range.start;
    this.endAnchor.position = range.end;

    this.textMorph.makeDirty();
    signal(this.textMorph, "selectionChange");
  }

  updateFromAnchors() {
    this.range = {start: this.startAnchor.position, end: this.endAnchor.position};
  }

  get start() { return this.range.start; }
  set start(val) { this.range = Range.fromPositions(val, this.end); }

  get end() { return this.range.end }
  set end(val) { this.range = Range.fromPositions(this.start, val); }

  get anchor() { return this.isReverse() ? this.range.end : this.range.start }
  set anchor(pos) {
    this.range = {start: pos, end: this.lead};
  }
  get lead() { return this.isReverse() ? this.range.start : this.range.end }
  set lead(pos) {
    this.range = {start: this.anchor, end: pos}
  }

  get text() { return this.textMorph.document.textInRange(this.range); }

  get selectedRows() {
    return {first: this.start.row, last: this.end.row}
  }

  set text(val) {
    let {range, textMorph} = this,
        reversed = this.isReverse();
    this.range = textMorph.replace(range, val);
    if (reversed) this.reverse();
  }

  reverse() { this._isReverse = !this.isEmpty() && !this._isReverse; return this; }
  isReverse() { return this._isReverse && !this.isEmpty(); }
  isEmpty() { return this.range.isEmpty(); }

  collapse(pos = this.start) { this.range = {start: pos, end: pos}; return this; }
  collapseToEnd() { this.collapse(this.end); return this; }

  growLeft(n) {
    let {textMorph: {document: d}} = this,
        endIndex = d.positionToIndex(this.end),
        startIndex = Math.min(endIndex, d.positionToIndex(this.start) - n),
        r = this.isReverse();
    this.start = d.indexToPosition(startIndex);
    this._isReverse = r;
    return this;
  }

  growRight(n) {
    let {textMorph: {document: d}} = this,
        startIndex = d.positionToIndex(this.start),
        endIndex = Math.max(startIndex, d.positionToIndex(this.end) + n),
        r = this.isReverse();
    this.end = d.indexToPosition(endIndex);
    this._isReverse = r;
    return this;
  }

  selectAll() {
    this.range = {start: {row: 0, column: 0}, end: this.textMorph.document.endPosition};
    return this;
  }

  selectLine(row = this.lead.row, includingLineEnd = false) {
    this.range = {
    start: {row, column: 0},
    end: {row: includingLineEnd ? row + 1 : row, column: includingLineEnd ? 0 : this.textMorph.getLine(row).length}};
    return this;
  }

  gotoLineEnd(row = this.lead.row) {
    var pos = {row, column: this.textMorph.getLine(row).length};
    this.range = {start: pos, end: pos};
  }

  selectLeft(n = 1) {
    if (this.isEmpty()) { this.growLeft(n); this.reverse(); }
    else this.isReverse() ? this.growLeft(n) : this.growRight(-n);
    return this;
  }
  selectRight(n = 1) { this.isReverse() ? this.growLeft(-n) : this.growRight(n); return this; }
  selectUp(n = 1) {
    var goalColumn = this._goalColumn;
    this.lead = {row: this.lead.row-n, column: goalColumn};
    this._goalColumn = goalColumn;
    return this;
  }
  selectDown(n = 1) { return this.selectUp(-n); }

  goUp(n = 1) {
    var goalColumn = this._goalColumn;
    this.lead = {row: this.lead.row-n, column: goalColumn};
    this.anchor = this.lead;
    this._goalColumn = goalColumn;
    return this;
  }
  goDown(n = 1) { return this.goUp(-n); }

  goLeft(n = 1) {
    this.isEmpty() && this.growLeft(n);
    this.collapse();
    return this;
  }

  goRight(n = 1) {
    this.isEmpty() && this.growRight(n);
    this.collapseToEnd();
    return this;
  }

  get cursorVisible() {
    return this._cursorVisible
        && this.textMorph.isFocused()
        && !this.textMorph.rejectsInput()
  }

  cursorBlinkStart() {
    this.cursorBlinkStop();
    let timeout = config.text.cursorBlinkPeriod;
    if (timeout)
      this.cursorBlinkProcess = setInterval(() => {
        this._cursorVisible = !this._cursorVisible;
        this.textMorph.makeDirty();
      }, timeout*1000);
  }

  cursorBlinkStop() {
    if (this.cursorBlinkProcess)
      clearInterval(this.cursorBlinkProcess);
    this.cursorBlinkProcess = null;
    this._cursorVisible = true;
  }

  set style(style) {
    let {textMorph} = this,
        styleRange = new StyleRange(style, this);
    this.textMorph.addStyleRange(styleRange);
  }

  getStyleRanges() {
    let {styleRanges} = this.textMorph.document,
        result = [];
    styleRanges.map(ea => {
      let intersection = this.range.intersect(ea);
      if (!intersection.isEmpty()) {
        let styleRange = new StyleRange(ea.style, intersection);
        result.push(styleRange);
      }
    });
    return result;
  }

  toString() {
    let {row, column} = this.anchor,
        {row: endRow, column: endColumn} = this.lead;
    return `Selection(${row}/${column} -> ${endRow}/${endColumn})`;
  }
}

export class MultiSelection extends Selection {

  constructor(textMorph, range) {
    this.textMorph = textMorph;
    this.selections = [new Selection(textMorph, range)];
  }

  get isMultiSelection() { return true; }

  uninstall() {
    this.selections.forEach(ea => ea.uninstall());
  }

  get defaultSelection() { return arr.last(this.selections); }
  removeSelections(startingAt = 1) {
    var toRemove = this.selections.slice(startingAt)
    toRemove.forEach(ea => ea.uninstall());
    this.selections = arr.withoutAll(this.selections, toRemove);
  }

  disableMultiSelect() {
    arr.without(this.selections, this.defaultSelection).forEach(ea => ea.uninstall());
    this.selections = [this.defaultSelection];
  }

  get range() { return this.defaultSelection.range; }
  set range(range) {
    this.disableMultiSelect();
    this.defaultSelection.range = range;
  }

  updateFromAnchors() {
    this.selections.forEach(ea => ea.updateFromAnchors());
  }

  get start() { return this.defaultSelection.start; }
  set start(val) { this.defaultSelection.start = val; }

  get end() { return this.defaultSelection.end }
  set end(val) { this.defaultSelection.end = val; }

  get anchor() { return this.defaultSelection.anchor; }
  set anchor(pos) { this.defaultSelection.anchor = pos; }
  get lead() { return this.defaultSelection.lead; }
  set lead(pos) { this.defaultSelection.lead = pos; }

  get text() { return this.selections.map(sel => sel.text).join(""); }
  set text(val) { this.selections.forEach(sel => sel.text = val); }

  get selectedRows() { return this.defaultSelection.selectedRows; }


  reverse() { this.defaultSelection.reverse(); }
  isReverse() { return this.defaultSelection.isReverse(); }
  isEmpty() { return this.defaultSelection.isEmpty(); }

  collapse(pos) { this.defaultSelection.collapse(pos); return this; }
  collapseToEnd() { this.defaultSelection.collapseToEnd(); return this; }

  growLeft(n) { this.defaultSelection.growLeft(n); return this; }

  growRight(n) { this.defaultSelection.growRight(n); return this; }

  selectAll() {
    this.disableMultiSelect();
    this.defaultSelection.selectAll();
    return this;
  }

  selectLine(row, includingLineEnd) {
    this.defaultSelection.selectLine(row, includingLineEnd);
    return this;
  }

  gotoLineEnd(row) { this.defaultSelection.gotoLineEnd(row); }

  selectLeft(n) { this.defaultSelection.selectLeft(n); return this; }
  selectRight(n) { this.defaultSelection.selectRight(n); return this; }
  selectUp(n) { this.defaultSelection.selectUp(n); return this; }
  selectDown(n) { this.defaultSelection.selectDown(n); return this; }

  goUp(n) { return this.defaultSelection.goUp(n); return this; }
  goDown(n) { return this.defaultSelection.goDown(n); return this; }
  goLeft(n) { return this.defaultSelection.goLeft(n); return this; }
  goRight(n) { return this.defaultSelection.goRight(n); return this; }

  get cursorVisible() { return this.defaultSelection.cursorVisible; }

  cursorBlinkStart() {
    this.cursorBlinkStop();
    let timeout = config.text.cursorBlinkPeriod;
    if (timeout)
      this.cursorBlinkProcess = setInterval(() => {
        this._cursorVisible = !this._cursorVisible;
        this.selections.forEach(sel => sel._cursorVisible = this._cursorVisible);
        this.textMorph.makeDirty();
      }, timeout*1000);
  }
  
  cursorBlinkStop() {
    super.cursorBlinkStop();
    this.selections.forEach(sel => sel._cursorVisible = true);
  }

  set style(style) { this.defaultSelection.style = style; }

  getStyleRanges() { return this.defaultSelection.getStyleRanges(); }

  toString() {
    return `MultiSelection(${this.selections.join(", ")})`;
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  mergeSelections() {
    var sels = this.selections.slice();
    for (var i = sels.length-1; i >= 0; i--) {
      for (var j = sels.length-1; j >= 0; j--) {
        if (i === j) continue;
        if (sels[j].mergeWith(sels[i])) {
          sels.splice(i, 1)
          break;
        }
      }
    }
    this.selections = sels;
  }

  get ranges() { return this.selections.map(ea => ea.range); }
  set ranges(ranges) {
    for (var i = 0; i < ranges.length; i++) {
      var sel = this.selections[i];
      if (sel) sel.range = ranges[i];
      else this.addRange(ranges[i]);
    }
    this.removeSelections(i);
    this.mergeSelections();
  }

  addRange(range) {
    this.selections.push(new Selection(this.textMorph, range));
    this.mergeSelections();
    return arr.last(this.selections).range;
  }
}
