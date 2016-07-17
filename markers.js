import { pt, Color, Point, Rectangle, rect } from "lively.graphics";
import { morph, Morph } from "./index.js";


export function show(target) {

  if (!target) return;
  if (target.isMorph) return showRect(morph.world(), morph.globalBounds());
  if (target instanceof Point) return showRect($$world, new Rectangle(target.x-5, target.y-5, 10,10));
  if (typeof Element !== "undefined" && target instanceof Element) return showRect($$world, Rectangle.fromElement(target));
  
  console.warn(`show: cannot "show" ${target}`);

  function showRect(world, rect) {
    var marker = BoundsMarker.highlightBounds(rect);
    return showThenHide(world, marker);
  }

  function showThenHide (world, morphOrMorphs, duration = 3) {
    if (!world) return;
    var morphs = Object.isArray(morphOrMorphs) ? morphOrMorphs : [morphOrMorphs];
    morphs.forEach(ea => world.addMorph(ea));
    if (duration) { // FIXME use scheduler
      setTimeout(() => morphs.invoke('remove'), duration*1000);
    }
    return morphOrMorphs;
  }

}


class BoundsMarker extends Morph {

  // creates a marker that looks like:
  // xxxx     xxxx
  // x           x
  // x           x
  // 
  // x           x
  // x           x
  // xxxx     xxxx


  static highlightMorph(morph) {
    return new this().alignWithMorph(morph);
  }

  static highlightBounds(bounds) {
    return new this().alignWithRect(bounds);
  }

  constructor() {
    super({borderWidth: 0, fill: null, reactsToPointer: false});

    // this.ignoreEvents();
  }

  get isEpiMorph() { return true }

  get markerStyle() {
    return {fill: null, borderWidth: 2, borderColor: Color.red}
  }

  markerLength(forBounds) {
    forBounds = forBounds.insetBy(-2);
    var length = Math.min(forBounds.width, forBounds.height);
    return Math.max(4, Math.floor((length/10) < 10 ? (length / 2) - 5 : length / 10));
  }

  createMarkerEdge() {
      var b = morph(this.markerStyle);
      // b.isEpiMorph = true;
      // b.ignoreEvents();
      return b;
  }

  ensureMarkerCorners() {
    var topLeftH     = this.topLeftH     || (this.topLeftH     = this.addMorph(this.createMarkerEdge())),
        topLeftV     = this.topLeftV     || (this.topLeftV     = this.addMorph(this.createMarkerEdge())),
        topRightH    = this.topRightH    || (this.topRightH    = this.addMorph(this.createMarkerEdge())),
        topRightV    = this.topRightV    || (this.topRightV    = this.addMorph(this.createMarkerEdge())),
        bottomRightH = this.bottomRightH || (this.bottomRightH = this.addMorph(this.createMarkerEdge())),
        bottomRightV = this.bottomRightV || (this.bottomRightV = this.addMorph(this.createMarkerEdge())),
        bottomLeftH  = this.bottomLeftH  || (this.bottomLeftH  = this.addMorph(this.createMarkerEdge())),
        bottomLeftV  = this.bottomLeftV  || (this.bottomLeftV  = this.addMorph(this.createMarkerEdge()));
    return [
      topLeftH, topLeftV,
      topRightH, topRightV,
      bottomRightH, bottomRightV,
      bottomLeftH, bottomLeftV];
  }
  
  alignWithMorph(otherMorph) {
    return this.alignWithRect(otherMorph.globalBounds());
  }

  alignWithRect(r) {
    var corners = this.ensureMarkerCorners(),
        markerLength = this.markerLength(r),
        boundsForMarkers = [
            r.topLeft().     addXY(0,0).               extent(pt(markerLength, 0)),
            r.topLeft().     addXY(0,2).               extent(pt(0, markerLength)),
            r.topRight().    addXY(-markerLength, 0).  extent(pt(markerLength, 0)),
            r.topRight().    addXY(-4,2).              extent(pt(0, markerLength)),
            r.bottomRight(). addXY(-4, -markerLength). extent(pt(0, markerLength)),
            r.bottomRight(). addXY(-markerLength, -2). extent(pt(markerLength, 0)),
            r.bottomLeft().  addXY(0,-2).              extent(pt(markerLength, 0)),
            r.bottomLeft().  addXY(0, -markerLength).  extent(pt(0, markerLength))];
    corners.forEach((corner, i) => corner.setBounds(boundsForMarkers[i]));    
    return this;
  }

}
