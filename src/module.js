import { parse, query } from "lively.ast";
import { arr, obj, graph, properties } from "lively.lang";
import { computeRequireMap } from  "./dependencies.js";
import { moduleSourceChange } from "./change.js";
import { scheduleModuleExportsChange, runScheduledExportChanges } from "./import-export.js";
import { livelySystemEnv } from "./system.js";
import { Package } from "./packages.js";
import { isURL, join } from "./url-helpers.js";
import { emit, subscribe } from "lively.notifications";

export var detectModuleFormat = (function() {
  const esmFormatCommentRegExp = /['"]format (esm|es6)['"];/,
        cjsFormatCommentRegExp = /['"]format cjs['"];/,
        // Stolen from SystemJS
        esmRegEx = /(^\s*|[}\);\n]\s*)(import\s+(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s+from\s+['"]|\{)|export\s+\*\s+from\s+["']|export\s+(\{|default|function|class|var|const|let|async\s+function))/;

  return (source, metadata) => {
    if (metadata && metadata.format) {
      if (metadata.format == 'es6') metadata.format == 'esm';
      return metadata.format;
    }

    if (esmFormatCommentRegExp.test(source.slice(0,5000))
     || !cjsFormatCommentRegExp.test(source.slice(0,5000)) && esmRegEx.test(source))
       return "esm";

    return "global";
  }
})();

export default function module(System, moduleName, parent) {
  var sysEnv = livelySystemEnv(System),
      id = System.decanonicalize(moduleName, parent);
  return sysEnv.loadedModules[id] || (sysEnv.loadedModules[id] = new ModuleInterface(System, id));
}


// ModuleInterface is primarily used to provide an API that integrates the System
// loader state with lively.modules extensions.
// It does not hold any mutable state.
class ModuleInterface {

  constructor(System, id) {
    // We assume module ids to be a URL with a scheme

    if (!isURL(id) && !/^@/.test(id))
      throw new Error(`ModuleInterface constructor called with ${id} that does not seem to be a fully normalized module id.`);
    this.System = System;
    this.id = id;

    // Under what variable name the recorder becomes available during module
    // execution and eval
    this.recorderName = "__lvVarRecorder";
    this._recorder = null;

    // cached values
    this._source = null;
    this._ast = null;
    this._scope = null;
    this._observersOfTopLevelState = [];

    this._evaluationsInProgress = 0;

    subscribe("lively.modules/modulechanged", data => {
      if (data.module === this.id) this.reset();
    });
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // properties
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  // returns Promise<string>
  fullName() { return this.id; }

  source() {
    // returns Promise<string>

    // rk 2016-06-24:
    // We should consider using lively.resource here. Unfortunately
    // System.fetch (at least with the current systemjs release) will not work in
    // all cases b/c modules once loaded by the loaded get cached and System.fetch
    // returns "" in those cases
    //
    // cs 2016-08-06:
    // Changed implementation, so it uses System.resource to be consistent
    // with module loading

    if (this.id === "@empty") return Promise.resolve("")

    if (this._source) return Promise.resolve(this._source);

    return this.System.resource(this.id).read()
      .then(source => this._source = source);
  }

  setSource(source) {
    this._source = source;
  }

  async ast() {
    if (this._ast) return this._ast;
    return this._ast = parse(await this.source());
  }

  async scope() {
    if (this._scope) return this._scope;
    const ast = await this.ast();
    return this._scope = query.topLevelDeclsAndRefs(ast).scope;
  }

  async resolvedScope() {
    return this._scope = query.resolveReferences(await this.scope());
  }

  metadata() {
    var load = this.System.loads ? this.System.loads[this.id] : null;
    return load ? load.metadata : null;
  }

  format() {
    // assume esm by default
    var meta = this.metadata();
    if (meta && meta.format) return meta.format;
    if (this._source) return detectModuleFormat(this._source);
    return "global";
  }

  reset() {
    this._source = null;
    this._ast = null;
    this._scope = null;
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // loading
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async load() {
    let m = this.System.get(this.id);
    if (!m) {
      m = await this.System.import(this.id);
      emit("lively.modules/moduleloaded", {module: this.id}, Date.now(), this.System);
    }
    return m;
  }

  isLoaded() { return !!this.System.get(this.id); }

  unloadEnv() {
    this._recorder = null;
    this._observersOfTopLevelState = [];
    // FIXME this shouldn't be necessary anymore....
    delete livelySystemEnv(this.System).loadedModules[this.id];
  }

  unloadDeps(opts) {
    opts = obj.merge({forgetDeps: true, forgetEnv: true}, opts);
    this.dependents().forEach(ea => {
      this.System.delete(ea.id);
      if (this.System.loads) delete this.System.loads[ea.id];
      if (opts.forgetEnv) ea.unloadEnv();
    });
  }

  unload(opts) {
    opts = obj.merge({reset: true, forgetDeps: true, forgetEnv: true}, opts);
    if (opts.reset) this.reset();
    if (opts.forgetDeps) this.unloadDeps(opts);
    this.System.delete(this.id);
    if (this.System.loads) {
      delete this.System.loads[this.id];
    }
    if (this.System.meta)
      delete this.System.meta[this.id];
    if (opts.forgetEnv)
      this.unloadEnv();
    emit("lively.modules/moduleunloaded", {module: this.id}, Date.now(), this.System);
  }

  async reload(opts) {
    opts = obj.merge({reloadDeps: true, resetEnv: true}, opts);
    var toBeReloaded = [this];
    if (opts.reloadDeps) toBeReloaded = this.dependents().concat(toBeReloaded);
    this.unload({forgetDeps: opts.reloadDeps, forgetEnv: opts.resetEnv});
    await Promise.all(toBeReloaded.map(ea => ea.id !== this.id && ea.load()));
    await this.load();
  }

  whenLoaded(cb) {
    if (this.isLoaded()) {
      try { cb(this); } catch (e) { console.error(e); }
      return;
    }
    livelySystemEnv(this.System).onLoadCallbacks.push(
      {moduleName: this.id, resolved: true, callback: cb});
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // change
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async changeSourceAction(changeFunc) {
    const source = await this.source(),
          newSource = await changeFunc(source);
    return this.changeSource(newSource, {doEval: true});
  }

  async changeSource(newSource, options) {
    if (!options || options.doSave !== false) {
      await this.System.resource(this.id).write(newSource);
    }
    this.setSource(newSource);
    return moduleSourceChange(this.System, this.id, newSource, this.format(), options);
  }

  addDependencyToModuleRecord(dependency, setter = function() {}) {
    // `dependency is another module, setter is the function that gets
    // triggered when a dependency's binding changes so that "this" module is updated
    var record = this.record(),
        dependencyRecord = dependency.record();

    if (record && dependencyRecord) {
      // 1. update the record so that when its dependencies change and cause a
      // re-execute, the correct code (new version) is run
      var depIndex, hasDepenency = record.dependencies.some((ea, i) => {
        if (!ea) return; depIndex = i; return ea && ea.name === dependency.id; });
      if (!hasDepenency) {
        record.dependencies.push(dependencyRecord)
      } else if (dependencyRecord !== record.dependencies[depIndex] /*happens when a dep is reloaded*/)
        record.dependencies.splice(depIndex, 1, dependencyRecord);

      // setters are for updating module bindings, the position of the record
      // in dependencies should be the same as the position of the setter for that
      // dependency...
      if (!hasDepenency || !record.setters[depIndex])
        record.setters[hasDepenency ? depIndex : record.dependencies.length-1] = setter;

      // 2. update records of dependencies, so that they know about this module as an importer
      var impIndex, hasImporter = dependencyRecord.importers.some((imp, i) => {
        if (!imp) return; impIndex = i; return imp && imp.name === this.id });
      if (!hasImporter) dependencyRecord.importers.push(record);
      else if (record !== dependencyRecord.importers[impIndex])
        dependencyRecord.importers.splice(impIndex, 1, record);
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // dependencies
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  dependents() {
    // which modules (module ids) are (in)directly import module with id
    // Let's say you have
    // module1: export var x = 23;
    // module2: import {x} from "module1.js"; export var y = x + 1;
    // module3: import {y} from "module2.js"; export var z = y + 1;
    // `dependents` gives you an answer what modules are "stale" when you
    // change module1 = module2 + module3
    return graph.hull(graph.invert(computeRequireMap(this.System)), this.id)
            .map(mid => module(this.System, mid));
  }

  requirements() {
    // which modules (module ids) are (in)directly required by module with id
    // Let's say you have
    // module1: export var x = 23;
    // module2: import {x} from "module1.js"; export var y = x + 1;
    // module3: import {y} from "module2.js"; export var z = y + 1;
    // `module("./module3").requirements()` will report ./module2 and ./module1
    return graph.hull(computeRequireMap(this.System), this.id)
            .map(mid => module(this.System, mid));
  }

  directRequirements() {
    var dependencies = (this.record() || {}).dependencies || [];
    return arr.pluck(dependencies.filter(Boolean), "name").map(id => module(this.System, id));
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // module environment
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  // What variables to not transform during execution, i.e. what variables
  // should not be accessed as properties of recorder
  get dontTransform() {
    return [
      "__lvVarRecorder",
      "global", "self",
      "_moduleExport", "_moduleImport",
      "localStorage", // for Firefox, see fetch
      "prompt", "alert", "fetch" // doesn't like to be called as a method, i.e. __lvVarRecorder.fetch
    ].concat(arr.withoutAll(query.knownGlobals, ["pt", "rect", "rgb", "$super", "show"]/*remove those once transitioned to lively.next*/));
  }

  // FIXME... better to make this read-only, currently needed for loading
  // global modules, from instrumentation.js
  set recorder(v) { return this._recorder = v; }

  get recorder() {
    if (this._recorder) return this._recorder;

    const S = this.System, self = this;

    return this._recorder = Object.create(S.global, {

      System: {configurable: true, writable: true, value: S},

      __currentLivelyModule: {value: self},

      [this.varDefinitionCallbackName]: {
        value: (name, kind, value, recorder, sourceLoc) =>
          self.define(name, value, false/*signalChangeImmediately*/, sourceLoc)
      },

      _moduleExport: {
        value: (name, val) => {
          scheduleModuleExportsChange(S, self.id, name, val, true/*add export*/);
        }
      },

      _moduleImport: {
        value: (depName, key) => {
          var depId = S.decanonicalize(depName, self.id),
              depExports = S.get(depId);

          if (!depExports) {
            console.warn(`import of ${key} failed: ${depName} (tried as ${self.id}) is not loaded!`);
            return undefined;
          }

          self.addDependencyToModuleRecord(
            module(S, depId),
            // setter is only installed if there isn't a setter already. In
            // those cases we make sure that at least the module varRecorder gets
            // updated, which is good enough for "virtual modules"
            imports => Object.assign(self.recorder, imports));

          if (key == undefined) return depExports;

          if (!depExports.hasOwnProperty(key))
            console.warn(`import from ${depExports}: Has no export ${key}!`);

          return depExports[key];
        }
      }

    });
  }

  get varDefinitionCallbackName() { return "defVar_" + this.id; }

  define(varName, value, exportImmediately = true, sourceLoc) {
    // attaching source info to runtime objects

    var {System, id, recorder} = this;

    System.debug && console.log(`[lively.modules] ${this.package().name}/${this.pathInPackage()} defines ${varName}`);

    var srcLocSym = Symbol.for("lively-source-location"),
        moduleSym = Symbol.for("lively-module-meta");

    if (typeof value === "function" && sourceLoc
     && !Object.getOwnPropertySymbols(value).includes(srcLocSym)) {
      value[srcLocSym] = sourceLoc;
    }

    if (value && value[srcLocSym] && !value[moduleSym]) {
      var pathInPackage = this.pathInPackage(),
          p = this.package();
      value[moduleSym] = {
        package: p ? {name: p.name, version: p.version} : {},
        pathInPackage
      }
    }

    // storing local module state
    recorder[varName] = value;

    // exports update
    scheduleModuleExportsChange(
      System, id, varName, value, false/*force adding export*/);

    // system event
    this.notifyTopLevelObservers(varName);

    // immediately update exports (recursivly) when flagged or when the module
    // is not currently executing. During module execution we wait until the
    // entire module is done to avoid triggering the expensive update process
    // multiple times
    // ...whether or not this is in accordance with an upcoming es6 module spec
    // I don't know...
    exportImmediately = exportImmediately || !this.isEvalutionInProgress();
    if (exportImmediately)
      runScheduledExportChanges(System, id)

    return value;
  }

  undefine(varName) { delete this.recorder[varName]; }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // observing top level state
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  subscribeToToplevelDefinitionChanges(func) {
    this._observersOfTopLevelState.push(func);
    return func;
  }

  notifyTopLevelObservers(key) {
    var ignored = [
          "createOrExtendES6ClassForLively",
          "lively.capturing-declaration-wrapper"],
        rec = this.recorder;
    if (arr.include(ignored, key)) return;
    this._observersOfTopLevelState.forEach(fn => fn(key, rec[key]));
  }

  unsubscribeFromToplevelDefinitionChanges(funcOrName) {
    this._observersOfTopLevelState = typeof funcOrName === "string" ?
      this._observersOfTopLevelState.filter(ea => ea.name !== funcOrName) :
      this._observersOfTopLevelState.filter(ea => ea !== funcOrName);
  }

  // evaluationStart/End are also compiled into instrumented module code so are
  // also activated during module executions
  evaluationStart() {
    this._evaluationsInProgress++;
  }

  evaluationEnd() {
    this._evaluationsInProgress--;
    runScheduledExportChanges(this.System, this.id);
  }

  isEvalutionInProgress() {
    return this._evaluationsInProgress > 0;
  }

  env() { return this; }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // package related
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  package() {
    return Package.forModule(this.System, this);
  }

  pathInPackage() {
    var p = this.package();
    return p && this.id.indexOf(p.address) === 0 ?
      this.id.slice(p.address.length).replace(/^\//, "") :
      this.id;
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // imports and exports
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async imports() {
    const parsed = await this.ast(),
          scope = await this.scope();
    return query.imports(scope);
  }

  async exports() {
    const parsed = await this.ast(),
          scope = await this.scope();
    return query.exports(scope);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // bindings
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async _localDeclForRefAt(pos) {
    const scope = await this.resolvedScope(),
          ref = query.refWithDeclAt(pos, scope);
    return ref && {decl: ref.decl, id: ref.declId, declModule: this};
  }

  async _importForNSRefAt(pos) {
    // if pos points to "x" of a property "m.x" with an import * as "m"
    // then this returns [<importStmt>, <m>, "x"]
    const scope = await this.resolvedScope(),
          ast = scope.node,
          nodes = query.nodesAtIndex(ast, pos);
    if (nodes.length < 2) return [null, null];
    const id = nodes[nodes.length - 1],
          member = nodes[nodes.length - 2];


    if (id.type != "Identifier"
     || member.type != "MemberExpression"
     || member.computed
     || member.object.type !== "Identifier")
       return [null, null];

    var {decl} = scope.resolvedRefMap.get(member.object) || {}

     if (!decl || decl.type !== "ImportDeclaration")
       return [null, null];

    const name = member.object.name,
          spec = decl.specifiers.find(s => s.local.name === name);

    return spec.type !== "ImportNamespaceSpecifier" ?
      [null, null] : [decl, spec.local, id.name];
  }

  async _resolveImportedDecl(decl) {
    if (!decl) return [];
    const {start, name, type} = decl.id,
          imports = await this.imports(),
          im = imports.find(i => i.node.start == start && // can't rely on
                                 i.node.name == name &&   // object identity
                                 i.node.type == type);
    if (im) {
      const imM = module(this.System, im.fromModule, this.id);
      return [decl].concat(await imM.bindingPathForExport(im.imported));
    }
    return [decl];
  }

  async bindingPathForExport(name) {
    await this.resolvedScope();
    const exports = await this.exports(),
          ex = exports.find(e => e.exported === name);
    if (ex.fromModule) {
      const imM = module(this.System, ex.fromModule, this.id);
      const decl = {decl: ex.node, id: ex.declId};
      decl.declModule = this;
      return [decl].concat(await imM.bindingPathForExport(ex.imported));
    } else {
      return this._resolveImportedDecl({
        decl: ex.decl,
        id: ex.declId,
        declModule: ex && ex.decl ? this: null
      });
    }
  }

  async bindingPathForRefAt(pos) {
    const decl = await this._localDeclForRefAt(pos);
    if (decl) return await this._resolveImportedDecl(decl);

    const [imDecl, id, name] = await this._importForNSRefAt(pos);
    if (!imDecl) return [];
    const imM = module(this.System, imDecl.source.value, this.id);
    return [{decl: imDecl, declModule: this, id}].concat(await imM.bindingPathForExport(name));
  }

  async definitionForRefAt(pos) {
    const path = await this.bindingPathForRefAt(pos);
    return path.length < 1 ? null : path[path.length - 1].decl;
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // module records
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  record() {
    const rec = this.System._loader.moduleRecords[this.id];
    if (!rec) return null;
    if (!rec.hasOwnProperty("__lively_modules__"))
      rec.__lively_modules__ = {evalOnlyExport: {}};
    return rec;
  }

  updateRecord(doFunc) {
    var record = this.record();
    if (!record) throw new Error(`es6 environment global of ${this.id}: module not loaded, cannot get export object!`);
    record.locked = true;
    try {
      return doFunc(record);
    } finally { record.locked = false; }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // search
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async search(searchStr, options) {
    options = {excludedModules: [], ...options};

    if (options.excludedModules.some(ex => {
        if (typeof ex === "string") return ex === this.id;
        if (ex instanceof RegExp) return ex.test(this.id);
        if (typeof ex === "function") return ex(this.id);
        return false;
      })) return [];

    const src = await this.source();
    let re;
    if (searchStr instanceof RegExp) {
      let flags = 'g'; // add 'g' flag
      if (searchStr.ignoreCase) flags += 'i';
      if (searchStr.multiline) flags += 'm';
      re = RegExp(searchStr.source, flags);
    } else {
      re = RegExp(searchStr, 'g');
    }

    let match, res = [];
    while ((match = re.exec(src)) !== null)
      res.push([match.index, match[0].length]);

    for (let i = 0, j = 0, line = 1, lineStart = 0;
         i < src.length && j < res.length;
         i++) {
      if (src[i] == '\n') {
        line++;
        lineStart = i + 1;
      }
      const [idx, length] = res[j];
      if (i !== idx) continue;
      var lineEnd = src.slice(lineStart).indexOf("\n");
      if (lineEnd === -1) lineEnd = src.length;
      else lineEnd += lineStart;
      var p = this.package();
      res[j] = {
        moduleId: this.id,
        packageName: p.name,
        pathInPackage: this.pathInPackage(),
        isLoaded: this.isLoaded(),
        length,
        line, column: i - lineStart,
        lineString: src.slice(lineStart, lineEnd)
      };
      j++;
    }

    return res;
  }

  toString() { return `module(${this.id})`; }
}

// update pre-bootstrap modules
/*

var mods = System.get("@lively-env").loadedModules;
Object.keys(mods).forEach(id => {
  if (mods[id].constructor === ModuleInterface) return;
  mods[id] = Object.assign(new ModuleInterface(mods[id].System, mods[id].id), mods[id]);
});

*/
