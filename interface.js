import { string, promise } from "lively.lang";

function nyi(msg) { throw new Error(`Not yet implemented: ${msg}`); }

var debugMessageOrder = true;

export default class L2LConnection {

  constructor(ns) {
    this.id = string.newUUID();
    this.actions = {};
    this.options = {ackTimeout: 500, debug: true};
    this._incomingOrderNumberingBySenders = new Map();
    this._outgoingOrderNumberingByTargets = new Map();
    this._outOfOrderCacheBySenders = new Map();
  }

  isOnline() { nyi("isOnline"); }
  open() { nyi("isOnline"); }
  close() { nyi("close"); }
  remove() { nyi("remove"); }

  get debug() { return this.options.debug; }
  set debug(bool) { this.options.debug = bool; }

  whenOnline(timeout) {
    return promise.waitFor(timeout, () => this.isOnline())
      .then(() => this)
      .catch(err =>
        Promise.reject(/timeout/i.test(String(err)) ?
          new Error(`Timeout in ${this}.whenOnline`) : err))
  }

  onError(err) {
    if (this.debug) console.log(`[${this}] error: ${err}`);
  }

  addService(selector, handlerFn) {
    this.actions[selector] = handlerFn;
  }

  addServices(services) {
    Object.keys(services).forEach(selector =>
      this.addService(selector, services[selector]));
  }

  async ping(target) {
    var t = Date.now(),
        {data: {timestamp: t2}} = await this.sendToAndWait(target, "l2l-ping", {timestamp: t}),
        t3 = Date.now();
    return {
      to: t2-t,
      from: t3-t2,
      roundtrip: t3-t
    }
  }
  send(msg, ackFn) { nyi("send"); }

  async sendAndWait(msg) {
    // timeout actually dealt with on receiver side, see
    // installEventToMessageTranslator, this here is just to notice of things
    // really go wrong
    // FIXME: set timeoutMs to receiver timeout time!
    var timeout = {}, timeoutMs = 1000,
        answer = await Promise.race([
          promise.delay(timeoutMs, timeout),
          new Promise(resolve => this.send(msg, resolve))
        ]);
    if (answer === timeout)
      throw new Error(`Timout sending ${msg.action}`);
    if (answer.data && answer.data.error)
      throw new Error(answer.data.error);
    return answer;
  }

  sendTo(target, action, data, ackFn) {
    return this.send({target, action, data}, ackFn)
  }

  sendToAndWait(target, action, data) {
    return this.sendAndWait({target, action, data});
  }

  prepareSend(msg, ackFn) {
    var {target, action, messageId, data, sender} = msg;
    if (!action) throw new Error(`Trying to send a message without specifying action!`);
    if (!target) throw new Error(`Trying to send message ${action} without specifying target!`);
    if (!messageId) msg.messageId = string.newUUID();
    if (!sender) msg.sender = this.id;
    var n = msg.n = this._outgoingOrderNumberingByTargets.get(target) || 0;
    this._outgoingOrderNumberingByTargets.set(target, n+1);

    if (typeof ackFn === "function") {
      var sender = this,
          expectedNextIncomingN = sender._incomingOrderNumberingBySenders.get(target) || 0,
          originalAckFn = ackFn;
      ackFn = function(msg) {
        // here we receive an ack, we count sender as one more received message
        // as it matters in the message ordering
        var incomingN = sender._incomingOrderNumberingBySenders.get(msg.sender) || 0;

        if (expectedNextIncomingN !== incomingN)
          console.error(`[MSG ORDER] [${sender}] expected ack to be message no ${expectedNextIncomingN} but it is ${incomingN}`);

        (sender.debug || debugMessageOrder) && console.log(`[MSG ORDER] ${sender} received ack for ${msg.action} as msg ${incomingN}`);

        try { originalAckFn.apply(null, arguments); } catch (err) {
          console.error(`Error in ack fn of ${sender}: ${err.stack}`);
        }
        sender._incomingOrderNumberingBySenders.set(msg.sender, incomingN+1);
        setTimeout(() => sender.invokeOutOfOrderMessages(msg.sender), 0);
      }
    }

    (this.debug || debugMessageOrder) && console.log(`[MSG ORDER] ${this} sending ${n} (${msg.action}) to ${target}`);

    return [msg, ackFn];
  }

  installEventToMessageTranslator(socket) {
    var self = this;

    var onevent = socket.onevent;
    socket.onevent = function (packet) {
      var args = packet.data || [];
      onevent.call(this, packet); // original invocation
      packet.data = ["*"].concat(args);
      onevent.call(this, packet); // also invoke with *
    }

    socket.on("*", function(eventName, msg) {
      var lastArg = arguments[arguments.length-1],
          ackFn = typeof lastArg === "function" ? lastArg : null;
      msg = msg === ackFn ? null : msg;

      if (!msg || !msg.data || typeof msg.n !== "number" || !msg.sender) {
        console.warn(`${self} received non-conformant message ${eventName}:`, arguments);
        return;
      }

      self.dispatchL2LMessage(msg, socket, ackFn);
    });
  }

  dispatchL2LMessage(msg, socket, ackFn) {
    var selector = msg.action;
    try {
      var expectedN = this._incomingOrderNumberingBySenders.get(msg.sender) || 0,
          ignoreN = selector === "register" || "unregister";

      if (!ignoreN && msg.n < expectedN) {
        console.error(`[MSG ORDER] [${this}] received message no. ${msg.n} but expected >= ${expectedN}, dropping ${selector}`);
        return;
      }

      if (!ignoreN && msg.n > expectedN) {
        if (this.debug || debugMessageOrder)
          console.log(`[MSG ORDER] [${this}] storing out of order message ${selector} (${msg.n}) for later invocation`);
        var cache = this._outOfOrderCacheBySenders.get(msg.sender);
        if (!cache) { cache = []; this._outOfOrderCacheBySenders.set(msg.sender, cache); }
        cache.push([selector, msg, ackFn, socket]);
        return;
      }

      if (typeof this.actions[selector] === "function") {
        this.invokeServiceHandler(selector, msg, ackFn, socket)
      } else {
        if (socket._events && !Object.keys(socket._events).includes(selector))
          console.warn(`WARNING [${this}] Unhandled message: ${selector}`);
      }

      setTimeout(() => this.invokeOutOfOrderMessages(msg.sender), 0);
    } catch (e) {
      console.error(`Error when handling ${selector}: ${e.stack || e}`);
      // if (typeof ackFn === "function")
        // ackFn({action: "messageError", data: {selector: eventName}})
    }
  }

  invokeOutOfOrderMessages(sender) {
    var outOfOrderMessages = this._outOfOrderCacheBySenders.get(sender);
    if (!outOfOrderMessages || !outOfOrderMessages.length) return;
    var expectedN = this._incomingOrderNumberingBySenders.get(sender) || 0,
        invocationArgsI = outOfOrderMessages.findIndex(([_, {n}]) => n === expectedN);
    if (invocationArgsI === -1) return;
    outOfOrderMessages.splice(invocationArgsI, 1);
    var invocationArgs = outOfOrderMessages[invocationArgsI];
    this.invokeServiceHandler.apply(this, invocationArgs);
  }

  renameTarget(oldId, newId) {
    if (oldId === newId) return;
    var msgN = this._outgoingOrderNumberingByTargets.get(oldId);
    this._outgoingOrderNumberingByTargets.delete(oldId);
    this._outgoingOrderNumberingByTargets.set(newId, msgN);
  }

  invokeServiceHandler(selector, msg, ackFn, socket) {
    if (this.debug || debugMessageOrder)
      console.log(`[MSG ORDER] ${this} received ${msg.n} (${msg.action}) from ${msg.sender}`)

    this._incomingOrderNumberingBySenders.set(msg.sender, msg.n + 1);

    if (typeof ackFn === "function") {
      // in case we send back an ack, other messages send between now and ackFn
      // invocation should be received "later" then the ack
      var ackCalled = false,
          ackTimedout = false,
          timeoutMs = this.options.ackTimeout,
          ackN = this._outgoingOrderNumberingByTargets.get(msg.sender) || 0;

      this._outgoingOrderNumberingByTargets.set(msg.sender, ackN + 1);

      var answerFn = answerData => {
        if (ackTimedout) {
          console.warn(`[${this}] ackFn for ${msg.action} called after it timed out, dropping answer!`);
          return;
        }

        if (ackCalled) {
          console.warn(`[${this}] ack function called repeatedly when handling ${msg.action}`);
          return;
        }
        ackCalled = true;

        ackFn({
          action: msg.action + "-response",
          inResponseTo: msg.messageId,
          target: msg.sender,
          data: answerData,
          sender: this.id
        });

        if (this.debug || debugMessageOrder)
          console.log(`[MSG ORDER] ${this} sending ${ackN} (ack for ${msg.action})`);
      };

      setTimeout(() => {
        if (ackCalled) return;
        answerFn({
          isError: true,
          error: `Timeout error: ${this} did not send answer for ${msg.action} after ${timeoutMs}ms`
        });
        ackTimedout = true;
      }, timeoutMs);

    }

    try {
      this.actions[selector].call(this, this, msg, answerFn, socket);
    } catch (e) {
      console.error(`[${this}] Error handling ${selector}: ${e.stack || e}`);
      answerFn && answerFn({error: e.stack});
    }
  }
}
