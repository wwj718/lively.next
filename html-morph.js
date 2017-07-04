/*global show*/
import { obj, promise, string } from "lively.lang";
import { pt } from "lively.graphics";
import { Morph } from "./index.js";
import vdom from "virtual-dom";
import { delay } from "lively.lang/promise.js";
var { diff, patch, h, create: createElement } = vdom

// see https://github.com/Matt-Esch/virtual-dom/blob/master/docs/widget.md
class CustomVNode {

  constructor(morph, renderer) {
    this.morph = morph;
    this.renderer = renderer;
    this.morphVtree = null;
  }

  get type() { return "Widget"; }

  renderMorph() {
    var vtree = this.morphVtree = this.renderer.renderMorph(this.morph);
    // The placeholder in vdom that our real dom node will replace
    var key = "customNode-key-" + this.morph.id;
    if (!vtree.children[0] || vtree.children[0].key !== key)
      vtree.children.unshift(h("div", {key}, []));
    return vtree;
  }

  init() {
    var domNode = createElement(this.renderMorph(), this.renderer.domEnvironment);
    // here we replace the placeholder node with our custom node, this only
    // needs to happen when we create the DOM node for the entire morph
    domNode.replaceChild(this.morph.domNode, domNode.childNodes[0]);
    return domNode;
  }

  update(previous, domNode) {
    var oldTree = previous.morphVtree || this.renderMorph(),
        newTree = this.renderMorph(),
        patches = diff(oldTree, newTree);
    // We patch the node representing the morph. Since oldVnode and newVNode
    // both include the same virtual placeholder, the customNode
    // will be left alone by the patch operation
    patch(domNode, patches);
    return null;
  }

  destroy(domNode) { console.log(`[HTMLMorph] node of ${this} gets removed from DOM`); }
}

// Usage:
// var htmlMorph = $world.addMorph(new HTMLMorph({position: pt(10,10)}));
// You can set either the html content directly
// htmlMorph.html
// htmlMorph.html = "<h1>a test</h1>"
// Or create a dom node
// htmlMorph.domNode = document.createElement("div");
// htmlMorph.domNode.textContent = "Hello world"

export class HTMLMorph extends Morph {

  static get properties() {
    return {
      extent: {defaultValue: pt(420, 330)},

      html: {
        initialize() { this.html = this.defaultHTML; },
        get() { return this.domNode.innerHTML; },
        set(value) { this.domNode.innerHTML = value; }
      },

      domNode: {
        derived: true,/*FIXME only for dont serialize...*/
        get() {
          if (!this._domNode) {
            this._domNode = this.document.createElement("div")
            this._domNode.setAttribute("style", "position: absolute; width: 100%; height: 100%;");
          }
          return this._domNode
        },
        set(node) {
          if (this.domNode.parentNode)
            this.domNode.parentNode.replaceChild(node, this.domNode);
          return this._domNode = node;
        }
      },

      document: {
        readOnly: true,
        get() { return this.env.domEnv.document; }
      },

      scrollExtent: {
        readOnly: true,
        get() { return pt(this.domNode.scrollWidth, this.domNode.scrollHeight); }
      }

    }
  }

  get defaultHTML() {
     return `
<div style="display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: -webkit-gradient(linear, 0% 0%, 0% 100%, color-stop(0%, rgba(242,243,244,1)),color-stop(100%, rgba(229,231,233,1)))">
  <p style="font: bold 40pt Inconsolata, monospace; color: lightgray;">&lt;HTML&#x2F;&gt;</p>
</div>`
  }

  render(renderer) {
    return new CustomVNode(this, renderer);
  }

}


export class IFrameMorph extends HTMLMorph {

  static async example() {
    let iframeMorph = new IFrameMorph().openInWindow({title: "iframe"}).targetMorph;

    iframeMorph.srcDoc = ""
    iframeMorph.src = "http://localhost:9011/worlds/html%20export"

    await iframeMorph.loadURL("https://google.com");
iframeMorph.iframe.src
iframeMorph.iframe.srcDoc
iframeMorph.src = ""
iframeMorph.srcDoc = "fooo"
    await iframeMorph.reload()

  }

  static get properties() {

    return {
    
      html: {
        initialize() {
          this.html = this.defaultHTML;
          this.srcDoc = this.defaultSrcDoc;
        },
      },

      iframe: {
        derived: true, readOnly: true, after: ["domNode"],
        get() {
          return this.domNode.querySelector("iframe");
        }
      },

      src: {
        derived: true, after: ["iframe"],
        get() { return this.iframe.src; },
        set(val) {
          this.iframe.removeAttribute("srcDoc");
          this.iframe.src = val;
          let {promise: p, resolve, reject} = promise.deferred();
          this._whenLoaded = promise;
          this.iframe.onload = arg => resolve(arg);
        }
      },

      srcDoc: {
        derived: true, after: ["iframe"],
        get() { return this.iframe.srcdoc; },
        set(val) {
          this.iframe.removeAttribute("src");
          this.iframe.srcdoc = val;
          this._whenLoaded = this.whenRendered().then(() => delay(20));
        }
      },

      iframeScroll: {
        derived: true, after: ["iframe"],
        get() {
          try {
            var {scrollX: x, scrollY: y} = this.iframe.contentWindow;
            return pt(x, y);
          } catch (err) { return pt(0,0); }
        },
        set(val) {
          try {
            this.iframe.contentWindow.scrollTo(val.x, val.y);
          } catch (err) {}
        }
      }
    }
  }

  reload() {
    return this.src
      ? this.loadURL(this.src)
      : this.srcDoc ? this.displayHTML(this.srcDoc) : null;
  }

  whenLoaded() {
    return this._whenLoaded || Promise.resolve();
  }

  async displayHTML(html, opts = {}) {
    var {keepScroll = true} = opts, scroll;
    if (keepScroll) scroll = this.iframeScroll;
    this.srcDoc = html;
    await this.whenLoaded();
    if (keepScroll && scroll) this.iframeScroll = scroll;

    return this;
  }

  async loadURL(url, opts = {}) {
    var {keepScroll = true} = opts, scroll;
    if (keepScroll) scroll = this.iframeScroll;
    this.src = url;
    await this.whenLoaded();
    if (keepScroll && scroll) this.iframeScroll = scroll;
    return this;
  }

  get defaultSrcDoc() {
    return `
    <div style=\"display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: -webkit-gradient(linear, 0% 0%, 0% 100%, color-stop(0%, rgba(242,243,244,1)),color-stop(100%, rgba(229,231,233,1)))\">
      <p style=\"font: bold 40pt Inconsolata, monospace; color: lightgray;\">&lt;iFrame&#x2F;&gt;</p>
    </div>`;
  }

  get defaultHTML() {
    return `<iframe width="100%" height="100%" frameBorder="false" srcdoc=""></iframe>`;
  }

}