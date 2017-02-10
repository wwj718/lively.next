import {
  patch as applySerializedPatch,
} from "./vdom-serialized-patch-browserified.js";

import {
  VNode, VText,
  create as createElement,
} from "./node_modules/virtual-dom/dist/virtual-dom.js";
import EventCollector from "./client-events.js";

import L2LClient from "lively.2lively/client.js";

const debug = true;

export default class Client {

  static installLively2LivelyServices(options = {}) {
    var {l2lClient} = options;
    l2lClient = l2lClient || L2LClient.default();
    Object.keys(this.services).forEach(name =>
      l2lClient.addService(name,
        async (tracker, msg, ackFn) => this.services[name](tracker, msg, ackFn)));
    debug && console.log(`[lively.morphic-mirror client] services installed`);
  }

  static uninstallLively2LivelyServices(options = {}) {
    var {l2lClient} = options;
    l2lClient = l2lClient || L2LClient.default()
    Object.keys(this.services).forEach(name => l2lClient.removeService(name));
    debug && console.log(`[lively.morphic-mirror client] services uninstalled`);
  }

  static invokeServices(selector, data, ackFn) {
    this.services[selector](null, {data}, ackFn);
  }

  static get services() {
    if (this._services) return this._services;
    return this._services = {

      "lively.morphic-mirror.install-l2l-channel": (_, {data: {masterId, id}}, ackFn) => {
        debug && console.log(`[lively.morphic-mirror client] install l2l channel`);
        id = id || "__default__";
        var status = "OK"
        try {
          var mirror = Client.getInstance(id);
          mirror.channel = {
            send(selector, data) {
              var l2lClient = L2LClient.default();
              return l2lClient.sendToAndWait(masterId, selector, data);
            }
          }
        } catch (e) {
          console.error(e);
          status = String(e);
        }
    
        if (typeof ackFn === "function") ackFn({status});
      },
    
      "lively.morphic-mirror.render": (_, {data: {id, node}}, ackFn) => {
        debug && console.log(`[lively.morphic-mirror client] rendering initial node`);
        id = id || "__default__";
        var status = "OK"
        try {
          var mirror = Client.getInstance(id);
          mirror.render(node);
        } catch (e) {
          console.error(e);
          status = String(e);
        }
    
        if (typeof ackFn === "function") ackFn({status});
      },
    
      "lively.morphic-mirror.render-patch": (_, {data: {id, patch}}, ackFn) => {
        debug && console.log(`[lively.morphic-mirror client] rendering patch`);
        id = id || "__default__";
        var status = "OK"
        try {
          var mirror = Client.getInstance(id);
          mirror.patch(patch);
        } catch (e) {
          console.error(e);
          status = String(e);
        }
    
        if (typeof ackFn === "function") ackFn({status});
      },
    
      "lively.morphic-mirror.disconnect": (_, {data: {id}}, ackFn) => {
        debug && console.log(`[lively.morphic-mirror client] disconnect`);
        id = id || "__default__";
        var status = "OK"
        try {
          var mirror = Client.getInstance(id);
          mirror.reset();
        } catch (e) {
          console.error(e);
          status = String(e);
        }
    
        if (typeof ackFn === "function") ackFn({status});
      }
    
    }
  
  }

  static get instances() {
    if (!this._instances) this._instances = new Map();
    return this._instances;
  }

  static getInstance(id) {
    var instance = this.instances.get(id);
    if (!instance) {
      instance = this.createInstance(id);
      this.instances.set(id, instance);
    }
    return instance;
  }

  static removeInstance(id) {
    if (!this.instances) return
    var instance = this.instances.get(id);
    if (!instance) return;
    instance.reset();
    this.instances.delete(id)
  }

  static createInstance(id, channel, rootNode) {
    var instance = this.instances.get(id);
    if (instance) instance.reset();
    rootNode = rootNode || (id !== "__default__" ? document.getElementById(id) : document.body);
    instance = new this(id, channel, rootNode);
    this.instances.set(id, instance)
    return instance;
  }

  constructor(id, channel, rootNode) {
    this.id = id;
    this.channel = channel;
    this.rootNode = rootNode;
    this.reset();
  }

  reset() {
    this.rootNode.innerHTML = "disconnected";
    if (this.eventCollector) this.eventCollector.uninstall();
    if (this.eventSendProcess) clearInterval(this.eventSendProcess);
    this.eventCollector = null;
    this.eventSendInProgress = false;
    this.eventSendProcess = null;
    this.initialized = false;
  }

  deserializeNode(vdomNode) {
    if (vdomNode instanceof VNode || vdomNode instanceof VText) return vdomNode;
    var {text, tagName, properties, children, key, namespace} = vdomNode;
    if (text) return new VText(text);
    if (children && children.length) children = children.map(ea => this.deserializeNode(ea));
    return new VNode(tagName, properties, children, key, namespace);
  }

  render(vdomNode) {
    if (this.initialized) this.reset();
    vdomNode = this.deserializeNode(vdomNode);
    var domNode = createElement(vdomNode);
    this.rootNode.innerHTML = "";
    this.rootNode.appendChild(domNode);
    this.eventCollector = new EventCollector(this.rootNode);
    this.eventCollector.install();
    this.eventSendProcess = setInterval(() => this.sendEvents(), 200);
    this.initialized = true;
  }

  patch(patch) {
    if (!this.initialized)
      throw new Error("[lively.morphic-mirror client] trying to apply patch but client wasn't rendered yet");
    applySerializedPatch(this.rootNode.childNodes[0], patch);
  }

  sendEvents() {
    if (!this.eventCollector
     || !this.eventCollector.collectedEvents.length
     || !this.channel
     || this.eventSendInProgress) return;

    this.eventSendInProgress = true;
    var events = this.eventCollector.collectedEvents.slice();
    this.eventCollector.collectedEvents.length = 0;

    this.channel.send("lively.morphic-mirror.process-client-events", {events})
      .then(() => debug && console.log(`[lively.morphic-mirror client] ${events.length} events send`))
      .catch(err => console.error(err))
      .then(() => this.eventSendInProgress = false);

    // var l2lClient = L2LClient.default();
    // l2lClient.sendToAndWait(this.master, "lively.morphic-mirror.process-client-events", {events})
    //   .then(() => debug && console.log(`[lively.morphic-mirror client] ${events.length} events send`))
    //   .catch(err => console.error(err))
    //   .then(() => this.eventSendInProgress = false);
  }

}
