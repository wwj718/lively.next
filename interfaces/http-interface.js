import { HttpEvalStrategy } from "lively.vm/lib/eval-strategies.js";
import { AbstractCoreInterface } from "./interface";
import * as ast from "lively.ast";

// ast.transform.wrapInFunction("var x = 23; x + foo + bar; class Foo {}; Foo")
// var s = new HttpEvalStrategy("http://localhost:3000/eval")
// s.keysOfObject(_x17, _x18)
// await s.runEval("1 + 2", {targetModule: moduleId()})
// livelySystem.localInterface.dynamicCompletionsForPrefix(moduleName, prefix, options)

// var server2 = new HTTPCoreInterface("http://localhost:3000/eval")
// server.constructor === HTTPCoreInterface
// server.dynamicCompletionsForPrefix("lively://remote-lively-system/", "proces", {targetModule: "lively://remote-lively-system/"})
// server.runEval("var x = {foo: 23}; console.log(x)", {targetModule: moduleId()})


// var m = "file:///Users/robert/Lively/LivelyKernel2/packages/lively-system-interface/index.js"
// var source = await server.resourceRead(m)
// await server.importsAndExportsOf(m, source)
// await server.importModule(m)
// await server.keyValueListOfVariablesInModule(m, source)
// var result = await server.resourceWrite("file:///Users/robert/Lively/LivelyKernel2/test.js", "bar")
// var result = await server.resourceRead("file:///Users/robert/Lively/LivelyKernel2/test.js")
// var result = await server.normalizeSync("lively.modules")
// var result = await server.normalize("lively.modules")
// var result = await server.printSystemConfig("lively.modules")
// var result = await server.getConfig()
// var result = await server.moduleFormat("file:///Users/robert/Lively/LivelyKernel2/packages/lively-system-interface/index.js")
// var result = await server.moduleFormat("file:///Users/robert/Lively/LivelyKernel2/test.js")
// System.getConfig

class HTTPCoreInterface extends AbstractCoreInterface {

  constructor(url) {
    super();
    this.url = url;
    this.server = new HttpEvalStrategy(url);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // lively.vm
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  dynamicCompletionsForPrefix(moduleName, prefix, options) {
    return this.runEvalAndStringify(`await livelySystem.localInterface.dynamicCompletionsForPrefix("${moduleName}", '${prefix}', ${JSON.stringify(options)})`);
  }

  async runEvalAndStringify(source, opts) {
    var result = await this.runEval(`
var result;
try {
  result = JSON.stringify(await (async ${ast.transform.wrapInFunction(source)})());
} catch (e) { result = {isError: true, value: e}; }
typeof result === "string" ?
  result :
  JSON.stringify(result.isError ? {isError: true, value: result.value.stack || String(result.value)} : result)
;
`, Object.assign({targetModule: "lively://remote-lively-system/runEvalAndStringify"}, opts));

    if (result.isError) return Promise.reject(result.value);

    try {
      return JSON.parse(result.value);
    } catch (e) {
      throw new Error(`Could not JSON.parse the result of runEvalAndStringify: ${result.value}\n(Evaluated expression:\n ${source})`);
    }
  }

  runEval(source, options) {
    return this.server.runEval(source, options);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // resources
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  evalWithResource(url, method, arg) {
    return this.runEvalAndStringify(`var {resource} = await System.import("lively.resources"); await resource("${url}").${method}(${arg ? JSON.stringify(arg) : ""})`);
  }

  resourceExists(url) { return this.evalWithResource(url, "exists"); }
  resourceEnsureExistance(url, optContent) { return this.evalWithResource(url, "ensureExistance", optContent); }
  resourceMkdir(url) { return this.evalWithResource(url, "mkdir"); }
  resourceRead(url) { return this.evalWithResource(url, "read");}
  resourceRemove(url) { return this.evalWithResource(url, "remove");}
  resourceWrite(url, source) { return this.evalWithResource(url, "write", source); }
  resourceCreateFiles(baseDir, spec) {
    return this.runEvalAndStringify(`var {createFiles} = await System.import("lively.resources"); await createFiles("${baseDir}", ${JSON.stringify(spec)})`);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // system related
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  normalizeSync(name, parentName, isPlugin) {
    return this.runEvalAndStringify(`lively.modules.System.decanonicalize(${JSON.stringify(name)}, ${JSON.stringify(parentName)}, ${isPlugin})`);
  }

  normalize(name, parent, parentAddress) {
    return this.runEvalAndStringify(`lively.modules.System.normalize(${JSON.stringify(name)}, ${JSON.stringify(parent)}, ${JSON.stringify(parentAddress)})`);
  }

  printSystemConfig() {
    return this.runEvalAndStringify(`lively.modules.printSystemConfig()`);
  }

  getConfig() {
    return this.runEvalAndStringify(`var c = Object.assign({}, lively.modules.System.getConfig()); for (var name in c) if (name.indexOf("__lively.modules__") === 0 || name.indexOf("loads") === 0) delete c[name]; c`);
  }

  setConfig(conf) {
    return this.runEvalAndStringify(`lively.modules.System.config(${JSON.stringify(conf)})`);
  }

  getPackages() {
    return this.runEvalAndStringify(`lively.lang.obj.values(lively.modules.getPackages())`);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // package related
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  async importPackage(packageURL) {
    return this.runEvalAndStringify(`lively.modules.importPackage(${packageURL})`);
  }

  async removePackage(packageURL) {
    return this.runEvalAndStringify(`lively.modules.removePackage(${packageURL})`);
  }

  async reloadPackage(packageURL) {
    return this.runEvalAndStringify(`lively.modules.reloadPackage(${packageURL})`);
  }

  packageConfChange(source, confFile) {
    return this.runEvalAndStringify(`await livelySystem.localInterface.packageConfChange(${source}, ${confFile})`);
  }


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // module related
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  importModule(name) {
    return this.runEvalAndStringify(`lively.modules.System.import(${JSON.stringify(name)})`);
  }

  forgetModule(name, opts) {
    return this.runEvalAndStringify(`lively.modules.forgetModule(${JSON.stringify(name)}, ${JSON.stringify(opts)})`);
  }

  reloadModule(name, opts) {
    return this.runEvalAndStringify(`lively.modules.reloadModule(${JSON.stringify(name)}, ${JSON.stringify(opts)})`);
  }

  moduleFormat(moduleName) {
    return this.runEvalAndStringify(`
    var loads = lively.modules.System.loads;
    var moduleName = ${JSON.stringify(moduleName)};
    loads && loads[moduleName] && loads[moduleName].metadata && loads[moduleName].metadata.format;
  `);
  }

  moduleSourceChange(moduleName, newSource, options) {
    return this.runEvalAndStringify(`lively.modules.moduleSourceChange(${moduleName}, ${newSource}, ${options})`);
  }

  importsAndExportsOf(modId, sourceOrAst) {
    return this.runEvalAndStringify(`lively.modules.importsAndExportsOf(${modId}, ${sourceOrAst})`);
  }

  keyValueListOfVariablesInModule(moduleName, sourceOrAst) {
    return this.runEvalAndStringify(`await livelySystem.localInterface.keyValueListOfVariablesInModule(${moduleName}, ${sourceOrAst})`);
  }

}