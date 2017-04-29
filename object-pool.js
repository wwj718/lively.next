import { arr, obj, string } from "lively.lang";
import { isPrimitive } from "./util.js";
import ClassHelper from "./class-helper.js";
import ExpressionSerializer from "./plugins/expression-serializer.js";
import { allPlugins } from "./plugins.js";


/*

This module defines the classes ObjectPool and ObjectRef.  ObjectPool builds an
index of objects.


For serialization, the pool starts with a single root object for which it
creates an object ref.  The object ref then traverses all its properties and
recursively adds non-primitive objects to the pool, building a snapshot (a
serializable copy) of the objects it encounters.  A snapshot is a simple JS
map/object whose keys are ids if the serialized objects and whose values are
the snapshot representation of those objects.


Example:

ObjectPool.withObject({foo: {bar: 23}}).snapshot(); // =>
{
  A1CB461E-9187-4711-BEBA-B9E3D1B6D900: {
    props: {
      bar: {key: "bar",value: 23}
    },
    rev: 0
  },
  EDF8404A-243A-4858-9C98-0BFEE7DB369E: {
    props: {
      foo: {
        key: "foo",
        value: {__ref__: true, id: "A1CB461E-9187-4711-BEBA-B9E3D1B6D900", rev: 0}
      }
    },
    rev: 0
  }
}

For deserialization the process is reversed, i.e. object refs are created from
a snapshot which then re-instantiate objects.  Object properties are hooked up
so that a copy of the original object graph is re-created.


*/


const debugSerialization = false,
      debugDeserialization = false;

export class ObjectPool {

  static withDefaultPlugins(options) {
    return new this({plugins: allPlugins, ...options});
  }

  static fromJSONSnapshot(jsonSnapshoted, options) {
    return this.fromSnapshot(JSON.parse(jsonSnapshoted), options);
  }

  static fromSnapshot(snapshoted, options) {
    return new this(options).readSnapshot(snapshoted);
  }

  static withObject(obj, options) {
    var pool = new this(options);
    pool.add(obj);
    return pool;
  }

  constructor(options) {
    this.options = {ignoreClassNotFound: true, idPropertyName: "id", ...options};
    this.reset()
  }

  reset() {
    this.uuidGen = string.newUUID;
    this._obj_ref_map = new Map();
    this._id_ref_map = {};

    let {options} = this;
    this.classHelper = new ClassHelper(options);
    this.expressionSerializer = new ExpressionSerializer();

    if (options.idPropertyName) this.idPropertyName = options.idPropertyName;
    if (options.uuidGen) this.uuidGen = options.uuidGen;;
    if (options.reinitializeIds) this.reinitializeIds = options.reinitializeIds;
    if (options.hasOwnProperty("ignoreClassNotFound"))
      this.classHelper.options.ignoreClassNotFound = options.ignoreClassNotFound;

    let ps = this.plugins = {
      serializeObject: [],
      additionallySerialize: [],
      propertiesToSerialize: [],
      deserializeObject: [],
      additionallyDeserializeBeforeProperties: [],
      additionallyDeserializeAfterProperties: [],
    };
    if (options.plugins) {
      options.plugins.forEach(p => {
        if (typeof p.serializeObject === "function") ps.serializeObject.push(p);
        if (typeof p.additionallySerialize === "function") ps.additionallySerialize.push(p);
        if (typeof p.propertiesToSerialize === "function") ps.propertiesToSerialize.push(p);
        if (typeof p.deserializeObject === "function") ps.deserializeObject.push(p);
        if (typeof p.additionallyDeserializeBeforeProperties === "function") ps.additionallyDeserializeBeforeProperties.push(p);
        if (typeof p.additionallyDeserializeAfterProperties === "function") ps.additionallyDeserializeAfterProperties.push(p);
      });
    }
  }

  knowsId(id) { return !!this._id_ref_map[id]; }
  refForId(id) { return this._id_ref_map[id]; }
  resolveToObj(id) { var ref = this._id_ref_map[id]; return ref ? ref.realObj : undefined; }
  ref(obj) { return this._obj_ref_map.get(obj); }

  objects() { return Array.from(this._obj_ref_map.keys()); }
  objectRefs() { return Array.from(this._obj_ref_map.values()); }

  internalAddRef(ref) {
    if (ref.realObj)
      this._obj_ref_map.set(ref.realObj, ref);
    this._id_ref_map[ref.id] = ref;
    return ref;
  }

  add(obj) {
    // adds an object to the object pool and returns a "ref" object
    // that is guaranteed to be JSON.stringifyable and that can be used as a place
    // holder in a serialized graph / list

    // primitive objects don't need to be registered
    if (isPrimitive(obj)) return undefined;

    if (Array.isArray(obj)) return obj.map(element => this.add(element));

    var idPropertyName = obj.__serialization_id_property__ || this.idPropertyName;
    return this.ref(obj)
        || this.internalAddRef(
              new ObjectRef(obj[idPropertyName] || this.uuidGen(),
                obj, undefined, this.idPropertyName));
  }

  snapshot() {
    // traverses the object graph and create serialized representation => snapshot
    let snapshot = {};
    for (let i = 0, ids = Object.keys(this._id_ref_map); i < ids.length; i++) {
      let ref = this._id_ref_map[ids[i]];
      ref.snapshotObject(snapshot, this);
    }    
    return snapshot;
  }

  jsonSnapshot() { return JSON.stringify(this.snapshot(), null, 2); }

  readSnapshot(snapshot) {
    // populates object pool with object refs read from the dead snapshot
    for (var i = 0, ids = Object.keys(snapshot); i < ids.length; i++)
      if (!this.resolveToObj(ids[i]))
        ObjectRef.fromSnapshot(ids[i], snapshot, this, [], this.idPropertyName);
    return this;
  }

  readJsonSnapshot(jsonString) {
    return this.readSnapshot(JSON.parse(jsonString));
  }



// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


  plugin_serializeObject(realObj, isProperty, serializedObjMap, path) {
    for (var i = 0; i < this.plugins.serializeObject.length; i++) {
      var p = this.plugins.serializeObject[i],
          serialized = p.serializeObject(realObj, isProperty, this, serializedObjMap, path);
      if (serialized) return serialized
    }
  }
  
  plugin_propertiesToSerialize(ref, snapshot, keys) {
    for (var i = 0; i < this.plugins.propertiesToSerialize.length; i++) {
      var p = this.plugins.propertiesToSerialize[i],
          result = p.propertiesToSerialize(this, ref, snapshot, keys);
      if (result) keys = result;
    }
    return keys;
  }

  plugin_additionallySerialize(ref, snapshot, serializedObjMap, path) {  
    // add more / custom stuff to snapshot or modify it somehow
    var addFn = this.plugins.additionallySerialize.length
              ? __additionally_serialize__addObjectFunction(
                ref, snapshot, serializedObjMap, this, path) : null;
    for (var i = 0; i < this.plugins.additionallySerialize.length; i++) {
      var p = this.plugins.additionallySerialize[i];
      p.additionallySerialize(this, ref, snapshot, addFn);
    }
  }

  plugin_deserializeObject(ref, snapshot, path) {
    for (let i = 0; i < this.plugins.deserializeObject.length; i++) {
      let p = this.plugins.deserializeObject[i],
          newObj = p.deserializeObject(this, ref, snapshot, path);
      if (newObj) return newObj;
    }
  }

  plugin_additionallyDeserializeBeforeProperties(ref, newObj, props, snapshot, serializedObjMap, path) {
    for (let i = 0; i < this.plugins.additionallyDeserializeBeforeProperties.length; i++) {
      let p = this.plugins.additionallyDeserializeBeforeProperties[i],
          result = p.additionallyDeserializeBeforeProperties(
            this, ref, newObj, props, snapshot, serializedObjMap, path);
      if (result) props = result;
    }
    return props;
  }

  plugin_additionallyDeserializeAfterProperties(ref, newObj, snapshot, serializedObjMap, path) {
    for (let i = 0; i < this.plugins.additionallyDeserializeAfterProperties.length; i++) {
      let p = this.plugins.additionallyDeserializeAfterProperties[i];
      p.additionallyDeserializeAfterProperties
        (this, ref, newObj, snapshot, serializedObjMap, path);
    }
  }

}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// ObjectRef

function __additionally_serialize__addObjectFunction(objRef, snapshot, serializedObjMap, pool, path = []) {
  // passed into __additionally_serialize__ as a parameter to allow object to add
  // other objects to serialization

  return (key, value, verbatim = false) =>
    snapshot.props[key] = verbatim ? {key, value, verbatim} :
      {key, value: objRef.snapshotProperty(
        objRef.id, value, path.concat([key]), serializedObjMap, pool)}
}

export class ObjectRef {

  static fromSnapshot(id, snapshot, pool, path = [], idPropertyName) {
    var ref = new this(id, undefined, undefined, idPropertyName);
    return pool.internalAddRef(ref).recreateObjFromSnapshot(snapshot, pool, path);
  }

  constructor(id, realObj, snapshot, idPropertyName = "id") {
    this.id = id;
    this.idPropertyName = idPropertyName;
    this.realObj = realObj;
    this.snapshotVersions = [];
    this.snapshots = {};
    if (snapshot) {
      var rev = snapshot.rev || 0;
      this.snapshotVersions.push(rev);
      this.snapshots[rev] = snapshot;
    }
  }

  get isObjectRef() { return true; }

  get currentSnapshot() {
    let rev;
    if (!this.snapshotVersions.length) {
      rev = 0;
      this.snapshotVersions.push(rev);
    } else rev = arr.last(this.snapshotVersions);
    return this.snapshots[rev]
        || (this.snapshots[rev] = {rev, props: {}});
  }

  get currentRev() {
    return this.snapshotVersions.length ?
      arr.last(this.snapshotVersions) : 0;
  }

  asRefForSerializedObjMap(rev = "????") {
    return {__ref__: true, id: this.id, rev}
  }

  snapshotObject(serializedObjMap, pool, path = []) {
    // serializedObjMap: maps ids to snapshots

    debugSerialization && console.log(`[serialize] ${path.join(".")}`);

    if (path.length > 100) throw new Error(
      `Stopping serializer, encountered a possibly infinit loop: ${path.join(".")}`);

    let {id, realObj, snapshots} = this,
        rev, ref;

    if (!realObj) {
      console.error(`Cannot marshall object ref ${id}, no real object!`);
      return {...this.asRefForSerializedObjMap(), isMissing: true};
    }

    rev = realObj._rev || 0;
    ref = this.asRefForSerializedObjMap(rev);
    arr.pushIfNotIncluded(this.snapshotVersions, rev);

    // do we already have serialized a current version of realObj?
    if (snapshots[rev]) {
      if (!serializedObjMap[id])
        serializedObjMap[id] = snapshots[rev];
      return ref;
    }

    if (typeof id !== "string")
      throw new Error(`Error snapshoting ${realObj}: `
                    + `id is not a string but ${id} `
                    + `(serialization path: ${path.join(".")})`)

    let serialized = pool.plugin_serializeObject(realObj, false, serializedObjMap, path);
    if (serialized) {
      snapshots[rev] = serializedObjMap[id] = serialized;
      return ref;
    }


    // serialize properties
    var keys = Object.getOwnPropertyNames(realObj),
        props = {},
        snapshot = snapshots[rev] = serializedObjMap[id] = {rev, props},
        pluginKeys = pool.plugin_propertiesToSerialize(this, snapshot, keys);
    if (pluginKeys) keys = pluginKeys;

    // do the generic serialization, i.e. enumerate all properties and
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      props[key] = {
        key,
        value: this.snapshotProperty(
                  id, realObj[key], path.concat([key]),
                  serializedObjMap, pool)
      };
    }

    // add more / custom stuff to snapshot or modify it somehow    
    pool.plugin_additionallySerialize(this, snapshot, serializedObjMap, path);

    return ref;
  }

  snapshotProperty(sourceObjId, value, path, serializedObjMap, pool) {
    // returns the value to serialize, i.e. what to put into the snapshot object

    if (typeof value === "function") return undefined; // FIXME

    if (isPrimitive(value)) return value; // stored as is

    let serialized = pool.plugin_serializeObject(value, true, serializedObjMap, path);
    if (serialized) return serialized;

    if (Array.isArray(value))
      return value.map((ea, i) =>
        this.snapshotProperty(sourceObjId, ea, path.concat(i), serializedObjMap, pool));

    var objectRef = pool.add(value);
    return !objectRef || !objectRef.isObjectRef ?
      objectRef :
      objectRef.snapshotObject(serializedObjMap, pool, path);
  }


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


  recreateObjFromSnapshot(serializedObjMap, pool, path) {
    // serializedObjMap: map from ids to object snapshots

    if (this.realObj) return this;

    debugDeserialization && console.log(`[deserialize] ${path.join(".")}`);

    let snapshot = serializedObjMap[this.id];
    if (!snapshot) {
      console.error(`Cannot recreateObjFromSnapshot ObjectRef `
                  + `${this.id} b/c of missing snapshot in snapshot map!`);
      return this;
    }

    let {rev} = snapshot, newObj;
    rev = rev || 0;
    this.snapshotVersions.push(rev);
    this.snapshots[rev] = snapshot;

    newObj = pool.plugin_deserializeObject(this, snapshot, path);

    if (!newObj) newObj = {};
    if (typeof newObj._rev === "undefined" && typeof newObj === "object")
      newObj._rev = rev || 0;

    this.realObj = newObj;

    pool.internalAddRef(this); // for updating realObj

    if (!newObj) return this;

    var props = snapshot.props;

    var pluginProps = pool.plugin_additionallyDeserializeBeforeProperties(
      this, newObj, props, snapshot, serializedObjMap, path);
    if (pluginProps) props = pluginProps;

    if (props) {
      // deserialize generic properties
      for (var key in props)
        this.recreatePropertyAndSetProperty(newObj, props, key, serializedObjMap, pool, path);
    }

    var idPropertyName = newObj.__serialization_id_property__ || this.idPropertyName;
    if (pool.reinitializeIds && newObj.hasOwnProperty(idPropertyName))
      newObj[idPropertyName] = pool.reinitializeIds(this.id, this);

    pool.plugin_additionallyDeserializeAfterProperties(this, newObj, snapshot, serializedObjMap, path);

    return this;
  }

  recreatePropertyAndSetProperty(newObj, props, key, serializedObjMap, pool, path) {
    try {
      var {verbatim, value} = props[key] || {value: "NON EXISTING"};
      newObj[key] = verbatim ? value :
        this.recreateProperty(key, value, serializedObjMap, pool, path.concat(key));
    } catch (e) {
      var objString;
      try { objString = String(newObj); }
      catch (e) { objString = `[some ${newObj.constructor.name}]` }
      if (!e.__seen) {
        var printedProp = `${key} of ${objString} (${JSON.stringify(value)})`;
        console.error(`Error deserializing property ${printedProp}`);
        e.__seen = true;
      } else console.error(`Error deserializing property ${key} of ${objString}`);
      throw e;
    }
  }

  recreateProperty(key, value, serializedObjMap, pool, path) {
    if (typeof value === "string" && pool.expressionSerializer.isSerializedExpression(value))
      return pool.expressionSerializer.deserializeExpr(value);

    if (isPrimitive(value)) return value;

    if (Array.isArray(value)) return value.map((ea, i) =>
      this.recreateProperty(i, ea, serializedObjMap, pool, path.concat(i)));

    var idPropertyName = value.__serialization_id_property__ || this.idPropertyName,
        valueRef = pool.refForId(value[idPropertyName]) ||
                   ObjectRef.fromSnapshot(
                     value[idPropertyName], serializedObjMap,
                     pool, path, this.idPropertyName);
    return valueRef.realObj;
  }

}