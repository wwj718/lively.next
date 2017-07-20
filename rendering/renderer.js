/*global System,WeakMap*/
import { promise, arr, tree, obj, num } from "lively.lang";
import { addOrChangeCSSDeclaration, addOrChangeLinkedCSS } from "./dom-helper.js";
import {
  defaultStyle,
  renderGradient,
  defaultAttributes,
  defaultCSS,
  pathAttributes,
  svgAttributes,
  renderMorph
} from "./morphic-default.js";
import { h } from "virtual-dom";
import { Transform, pt } from "lively.graphics";
import { diff, patch, create as createNode } from "virtual-dom";
import { requestAnimationFrameStacked, cancelAnimationFrameStacked } from "lively.lang/promise.js";

export class Renderer {

  static default() { return this._default || new this() }

  constructor(world, rootNode, domEnvironment) {
    if (!world || !world.isMorph)
      throw new Error(`Trying to initialize renderer with an invalid world morph: ${world}`)
    if (!rootNode || !("nodeType" in rootNode))
      throw new Error(`Trying to initialize renderer with an invalid root node: ${rootNode}`)
    if (!domEnvironment) {
      var doc = rootNode.ownerDocument;
      domEnvironment = {window: System.global, document: doc};
    }
    this.worldMorph = world;
    world._renderer = this;
    this.rootNode = rootNode;
    this.domNode = null;
    this.domEnvironment = domEnvironment;
    this.renderMap = new WeakMap();
    this.fixedMorphNodeMap = new Map();
    this.renderWorldLoopProcess = null;
    this.renderWorldLoopLater = null;
    this.requestAnimationFrame = requestAnimationFrameStacked;
    this.cancelAnimationFrame = cancelAnimationFrameStacked;
  }

  clear() {
    this.stopRenderWorldLoop();
    this.domNode && this.domNode.parentNode.removeChild(this.domNode);
    this.domNode = null;
    this.renderMap = new WeakMap();
  }

  ensureDefaultCSS() {
    return promise.waitFor(3000, () => this.domNode.ownerDocument)
      .then(doc => Promise.all([
        addOrChangeCSSDeclaration("lively-morphic-css", defaultCSS, doc),
        addOrChangeLinkedCSS("lively-font-awesome", System.decanonicalize("lively.morphic/assets/font-awesome/css/font-awesome.css"), doc),
        addOrChangeLinkedCSS("lively-font-inconsolata", System.decanonicalize("lively.morphic/assets/inconsolata/inconsolata.css"), doc)]));
  }

  startRenderWorldLoop() {
    this.renderWorldLoopProcess = this.requestAnimationFrame(() => this.startRenderWorldLoop());
    return this.renderStep();
  }

  stopRenderWorldLoop() {
    this.cancelAnimationFrame(this.renderWorldLoopProcess);
    this.renderWorldLoopProcess = null;
    this.cancelAnimationFrame(this.renderWorldLoopLater);
    this.renderWorldLoopLater = null;
  }

  renderLater(n = 10) {
    this.renderWorldLoopLaterCounter = n;
    if (this.renderWorldLoopLater) return;
    this.renderWorldLoopLater = this.requestAnimationFrame(() => {
      this.renderWorldLoopLater = null;
      if (this.renderWorldLoopLaterCounter > 0)
        this.renderLater(this.renderWorldLoopLaterCounter-1);
      try { this.renderStep(); } catch (err) {
        console.error(`Error rendering morphs:`, err);
      }
    });
  }

  renderStep() {
    this.worldMorph.renderAsRoot(this);
    return this;
  }

  getNodeForMorph(morph) {
    // Hmm, this also finds dom nodes not associated with this renderer, its
    // domNode... Is this a problem?
    // return this.domNode.ownerDocument.getElementById(morph.id);

    // test, for scoped lookup, fixing the issue mentioned above
    return this.domNode ? this.domNode.querySelector("#" + morph.id) : null;
  }

  getMorphForNode(node) {
    return this.worldMorph ?
      this.worldMorph.withAllSubmorphsDetect(morph => morph.id === node.id) :
      null;
  }

  render(x) {
    if (!x.needsRerender()) {
      var renderedTree = this.renderMap.get(x);
      if (renderedTree) return renderedTree;
    }

    x.aboutToRender(this);

    var tree = x.render(this);
    this.renderMap.set(x, tree);
    return tree;
  }

  renderAsFixed(morph) {
    let tree = this.render(morph);
    tree.properties.style.position = "fixed";
    return tree;
  }

  renderFixedMorphs(fixedMorphs, world) {
    let {domNode, fixedMorphNodeMap} = this;
    if (!fixedMorphs.length && !fixedMorphNodeMap.size) return;
    if (!domNode || !domNode.parentNode) return;

    for (let [morph, node] of fixedMorphNodeMap) {
      if (!fixedMorphs.includes(morph)) {
        node.parentNode.removeChild(node);
        fixedMorphNodeMap.delete(morph);
      }
    }

    for (let morph of fixedMorphs) {

      var tree = this.renderMap.get(morph) || this.renderAsFixed(morph),
          newTree = this.renderAsFixed(morph),
          patches = diff(tree, newTree);

      var morphNode = fixedMorphNodeMap.get(morph);
      if (!morphNode) {
        morphNode = createNode(tree, this.domEnvironment);
        fixedMorphNodeMap.set(morph, morphNode);
      }
      if (!morphNode.parentNode)
        domNode.parentNode.appendChild(morphNode);
    
      patch(morphNode, patches);
    }

  }

  renderMorph(morph) {
    let submorphs = this.renderSubmorphs(morph);
    return h("div", {
      ...defaultAttributes(morph, this),
      style: defaultStyle(morph)
    }, submorphs);
  }

  renderSubmorphs(morph) {
    return this.renderSelectedSubmorphs(morph, morph.submorphs);
  }

  renderSelectedSubmorphs(morph, submorphs) {
    let {borderWidthLeft, borderWidthTop, origin: {x: oX, y: oY}} = morph;
    return h("div", {
      style: {
        position: "absolute",
        transform: `translate(${oX - borderWidthLeft}px,${oY - borderWidthTop}px)`
      }
    }, submorphs.map(m => this.render(m)));
  }

  renderWorld(world) {
    let {submorphs} = world,
        normalSubmorphs = [],fixedMorphs = [];
    for (let i = 0; i < submorphs.length; i++) {
      let morph = submorphs[i];
      if (morph.hasFixedPosition) fixedMorphs.push(morph);
      else normalSubmorphs.push(morph);
    }
    let renderedSubmorphs = this.renderSelectedSubmorphs(world, normalSubmorphs),
        vnode = h("div", {
          ...defaultAttributes(world, this),
          style: defaultStyle(world),
        }, renderedSubmorphs);
    vnode.fixedMorphs = fixedMorphs;
    return vnode;
  }

  renderImage(image) {
    return h("div", {
      ...defaultAttributes(image, this),
        style: defaultStyle(image)
      }, [
        h("img", {
          src: image.imageUrl,
          draggable: false,
          style: {
            "pointer-events": "none",
            position: "absolute",
            width: "100%", height: "100%"
          }
        }),
        this.renderSubmorphs(image)
      ]);
  }

  renderCanvas(canvas) {
    const CanvasHook = function(){}
    CanvasHook.prototype.hook = function(node, prop, prev) {
      canvas._canvas = node;    // remember HTML canvas node for drawing
    }
    return h("div", {
      ...defaultAttributes(canvas, this),
        style: defaultStyle(canvas),
      }, [
        h("canvas", {
          width: canvas.width,
          height: canvas.height,
          style: {"pointer-events": "none", position: "absolute"},
          canvasHook: new CanvasHook(),
        }),
        this.renderSubmorphs(canvas)
      ]);
  }

  renderCheckBox(checkbox) {
    return h("div", {
      ...defaultAttributes(checkbox, this),
        style: defaultStyle(checkbox)
      }, [
        h("input", {
          type: "checkbox",
          checked: checkbox.checked,
          disabled: !checkbox.active,
          draggable: false,
          style: {
            "pointer-events": "none",
            width: "100%", height: "100%",
            position: "absolute"
          }
        }),
        this.renderSubmorphs(checkbox)
    ]);
  }

  // FIXME: The gradient handling is inconsistent to the way its handled in "vanilla" morphs

  renderPath(path) {
    const vertices = h("path", {
      namespace: "http://www.w3.org/2000/svg",
      id: "svg" + path.id,
      ...pathAttributes(path)
    });
    return this.renderSvgMorph(path, vertices);
  }

  renderSvgMorph(morph, svg) {
    const {
            position,
            filter,
            display,
            opacity,
            transform,
            transformOrigin,
            cursor
          } = defaultStyle(morph),
          {width, height} = morph.innerBounds(),
          defs = h("defs", {namespace: "http://www.w3.org/2000/svg"}, [
            morph.fill && morph.fill.isGradient ?
              [renderGradient(morph, "fill")] : null,
            morph.borderColor && morph.borderColor.valueOf().isGradient ?
              [renderGradient(morph, "borderColor")] : null
          ]);

    return h("div",
      {
        ...defaultAttributes(morph, this),
        style: {
          transform,
          transformOrigin,
          position,
          opacity,
          cursor,
          width: width + "px",
          height: height + "px",
          display,
          filter,
          "pointer-events": morph.reactsToPointer ? "auto" : "none",
        }
      },
      [
        h("svg",
          {
            namespace: "http://www.w3.org/2000/svg",
            version: "1.1",
            style: {
              position: "absolute",
              "pointer-events": "none",
              overflow: "visible"
            },
            ...svgAttributes(morph)
          },
          [defs, svg]
        ),
        this.renderSubmorphs(morph)
      ]);
  }

  renderPreview(morph, opts) {
    // Creates a DOM node that is a "preview" of the morph, i.e. a
    // representation that looks like the morph but doesn't morphic behavior
    // attached

    // FIXME doesn't work with scale yet...!

    let {width = 100, height = 100, center = true, asNode = false} = opts,
        {
          borderWidthLeft, borderWidthTop, borderWidthBottom, borderWidthRight,
          scale, position, origin, rotation
        } = morph,
        // goalWidth = width - (borderWidthLeft + borderWidthRight),
        // goalHeight = height - (borderWidthTop + borderWidthBottom),
        goalWidth = width,
        goalHeight = height,
        invTfm = new Transform(position.negated(), 0, pt(1/morph.scale,1/scale)),
        bbox = invTfm.transformRectToRect(morph.bounds()),
        w = bbox.width, h = bbox.height,
        ratio = Math.min(goalWidth/w, goalHeight/h),
        node = renderMorph(morph),
        tfm = new Transform(
          bbox.topLeft().negated().scaleBy(ratio).subPt(origin),
          rotation, pt(ratio, ratio));

    if (center) {
      var previewBounds = tfm.transformRectToRect(
            morph.extent.extentAsRectangle()),
          offsetX = previewBounds.width < goalWidth ?
            (goalWidth-previewBounds.width) / 2 : 0,
          offsetY = previewBounds.height < goalHeight ?
            (goalHeight-previewBounds.height) / 2 : 0;
      tfm = tfm.preConcatenate(new Transform(pt(offsetX, offsetY)))
    }

    node.style.transform = tfm.toCSSTransformString();
    node.style.pointerEvents = "";

    // preview nodes must not appear like nodes of real morphs otherwise we
    // mistaken them for morphs and do wrong stuff in event dispatch etc.
    tree.prewalk(node, (node) => {
      if (typeof node.className !== "string") return;
        let cssClasses = node.className
              .split(" ")
              .map(ea => ea.trim())
              .filter(Boolean),
            isMorph = cssClasses.includes("Morph");
      if (!isMorph) return;
      node.className = arr.withoutAll(cssClasses, ["morph", "Morph"]).join(" ");
      node.id = "";
    },
    node => Array.from(node.childNodes));

    return asNode ? node : node.outerHTML;
  }

}
