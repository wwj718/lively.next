import { config } from "lively.morphic";
import { pt } from "lively.graphics";
import { arr, num, string } from "lively.lang";
// addPathAttributes
// addStyleProps
// addSvgAttributes

export function styleProps(morph) {
  let style = {};
  addFill(morph, style);
  addTransform(morph, style);
  addTransformOrigin(morph, style);
  addDisplay(morph, style);
  addExtentStyle(morph, style);
  addBorder(morph, style);
  addBorderRadius(morph, style);
  addShadowStyle(morph, style);
  if (morph.opacity != null) style.opacity = morph.opacity;
  return style;
}


function addTransform(morph, style) {
  let {position, origin, scale, rotation} = morph;
  style.transform = `translate3d(${Math.round(position.x - origin.x)}px, ${Math.round(position.y - origin.y)}px, 0px) rotate(${rotation.toFixed(2)}rad) scale(${scale.toFixed(2)},${scale.toFixed(2)})`;
}

function addTransformOrigin(morph, style) {
  let {origin} = morph;
  if (origin) style.transformOrigin = `${origin.x}px ${origin.y}px`;
}

function addDisplay(morph, style) {
  let {visible} = morph
  if (visible != null) style.display = visible ? "" : "none";
}

function addBorderRadius(morph, style) {
  let {borderRadiusLeft, borderRadiusRight, borderRadiusBottom, borderRadiusTop} = morph;
  style.borderRadius = `${borderRadiusTop}px ${borderRadiusTop}px ${borderRadiusBottom}px ${borderRadiusBottom}px / ${borderRadiusLeft}px ${borderRadiusRight}px ${borderRadiusRight}px ${borderRadiusLeft}px`;
}

function addBorder(morph, style) {
  let {borderWidthLeft, borderColorLeft, borderStyleLeft,
       borderWidthRight, borderColorRight, borderStyleRight, borderColor,
       borderWidthBottom, borderColorBottom, borderStyleBottom,
       borderWidthTop, borderColorTop, borderStyleTop} = morph;
    style["border-left-style"] =   `${borderStyleLeft}`;
    style["border-right-style"] =  `${borderStyleRight}`;
    style["border-bottom-style"] = `${borderStyleBottom}`;
    style["border-top-style"] =    `${borderStyleTop}`;
    style["border-left-width"] =   `${borderWidthLeft}px`;
    style["border-right-width"] =  `${borderWidthRight}px`;
    style["border-bottom-width"] = `${borderWidthBottom}px`;
    style["border-top-width"] =    `${borderWidthTop}px`;
    style["border-top-color"] =    borderColorTop ? borderColorTop.toString() : "transparent";
    style["border-right-color"] =  borderColorRight ? borderColorRight.toString() : "transparent";
    style["border-bottom-color"] = borderColorBottom ? borderColorBottom.toString() : "transparent";
    style["border-left-color"] =   borderColorLeft ? borderColorLeft.toString() : "transparent";
    if (borderColor && borderColor.isGradient) style["border-image"] = borderColor.toString()

}

function addFill(morph, style) {
  let {fill} = morph;
  if (!fill) return;
  if (fill.isGradient) style.backgroundImage = fill.toString()
  else style.background = fill.toString();
}

function addExtentStyle(morph, style) {
  let {extent} = morph;
  style.width = extent.x + 'px';
  style.height = extent.y + 'px';
}

function shadowCss(morph) {
  return morph.dropShadow ? morph.dropShadow.toFilterCss() : ``;
}

function addShadowStyle(morph, style) {
  if (morph.isSvgMorph || morph.isImage) { style.filter = shadowCss(morph); return; }

  let {dropShadow} = morph
  if (config.fastShadows || (dropShadow && dropShadow.inset)) {
    style.boxShadow = dropShadow ? dropShadow.toCss() : "none"
  } else {
    style.filter = dropShadow ? dropShadow.toFilterCss() : "none"
  }
}

export function addSvgAttributes(morph, style) {
  let {width, height, borderWidth} = morph;
  style.width = width || 1;
  style.height = height || 1;
  style.viewBox = [0, 0, width || 1, height || 1].join(" ");
  return style;
}

export function addPathAttributes(morph, style) {
  let {id, vertices, fill, borderColor, borderWidth} = morph,
      d = "";

  if (vertices.length) {
    let X, Y, lastV;
    {
      let {x, y} = lastV = vertices[0];
      X = x; Y = y;
      d = d + `M ${X} ${Y} `
    }
  
    for (let i = 1; i < vertices.length-1; i++) {
      let vertex = vertices[i],
          {isSmooth, x, y, controlPoints: {previous: p, next: n}} = vertex;
      d = isSmooth ?
        d + `C ${X + lastV.controlPoints.next.x} ${Y + lastV.controlPoints.next.y} ${x + p.x} ${y + p.y} ${x} ${y} ` :
        d + `L ${x} ${y} `
      lastV = vertex;
      X = x; Y = y
    }
  
    {
      let {isSmooth, x, y, controlPoints: {previous: p}} = vertices[vertices.length-1];
      d = isSmooth ?
        d + `C ${X + lastV.controlPoints.next.x} ${Y + lastV.controlPoints.next.y} ${x+p.x} ${y+p.y} ${x} ${y}` :
        d + `L ${x} ${y}`;
    }
  }

  addSvgBorderStyle(morph, style);
  style.d = d;
  style["stroke-width"] = borderWidth.valueOf();
  style["paint-order"] = "stroke";
  style.fill = fill ?
                fill.isGradient ? "url(#gradient-fill" + id + ")" : fill.toString() :
                "transparent";
  style.stroke = borderColor.valueOf().isGradient
                  ? "url(#gradient-borderColor" + id + ")"
                  : borderColor.valueOf().toString();
  return style;
}

function addSvgBorderStyle(morph, style) {
  const bs = morph.borderStyle.valueOf();
  if (bs === "dashed") {
    const bw = morph.borderWidth.valueOf();
    style["stroke-dasharray"] = bw * 1.61 + " " + bw;
  } else if (bs === "dotted") {
    const bw = morph.borderWidth.valueOf();
    style["stroke-dasharray"] = "1 " + bw * 2
    style["stroke-linecap"] = "round";
    style["stroke-linejoin"] = "round";
  }
  return style;
}