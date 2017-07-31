import Sugar from "./sugar"
import { actionMatch, singleRecordProps, recordProps, versioningProps, restVerbs } from "./constants"

export function recordDiff(a,b) {
  if (a instanceof Array && b instanceof Array)
    return JSON.stringify(a) === JSON.stringify(b);
  if (a instanceof Date && b instanceof Date)
    return JSON.stringify(a) === JSON.stringify(b);
  if (a !== null && typeof a === "object" && b !== null && typeof b === "object")
    return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

export function isEmptyObject(obj){
  for (let name in obj) {
    return false;
  }
  return true;
}

export function generateID() {
  function s4(){
    return Math
      .floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `_${s4()+s4()+s4()}${s4()+s4()+s4()}`;
}

export function pruneDeep(obj){
  return function prune(current){
    for (let key in current) {
      if (current.hasOwnProperty(key)) {
        if (current[key] instanceof Array){
          current[key] = pruneArray(current[key])
        }

        let value = current[key];
        if (typeof value === "undefined" || value == null ||
            (value != null && typeof value === "object" && isEmptyObject(prune(value))) ||
            (value instanceof Array && value.length === 0)
           ) {
          delete current[key]
        }
      }
    }
    return current
  }(Object.assign({}, obj))
}

export function pruneArray(arr) {
  const newArray = new Array();
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] != null && typeof arr[i] === "object")
      arr[i] = pruneDeep(arr[i])

    if (typeof arr[i] === "undefined" || arr[i] === null) continue;
    if (typeof arr[i] === "object" && isEmptyObject(arr[i])) continue;
    if (typeof arr[i] === "number" && isNaN(arr[i])) continue;

    newArray.push(arr[i]);
  }
  return newArray;
}

export function regexIndexOf(regex, string, startpos=0){
  var indexOf = string.substring(startpos).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

export function checkResponseStatus(response){
  const {status} = response,
        error = new Error;
  // If no error, great, return the response.
  if (status >= 200 && status < 300)
    return response

  // Begin parsing this error
  error.status = status
  error.response = response
  throw error
}

export function routePermitted({ only, except }, methodOrAction) {

  const method = methodOrAction === "INDEX" ? "GET" : methodOrAction;

  if ((only instanceof Array && only.indexOf(method) === -1) || (typeof only === "string" && only !== method))
    return false
  if ((except instanceof Array && except.indexOf(method) !== -1) || (typeof except === "string" && (except === method || except === methodOrAction)))
    return false
  return true
}

export function generateRoute(name, method, apiDelimiter, prefix, index=false, isSingleton) {
  /*
  GET    /stories      #index
  GET    /stories/:id  #show
  POST   /stories      #create
  PUT    /stories/:id  #update
  DELETE /stories/:id  #destroy
  */
  const delimiter = delimiterType(apiDelimiter),
        modelInflection = isSingleton ? name : Sugar.String.pluralize(name),
        modelWithDelimiter = `/${Sugar.String[delimiter](modelInflection)}`,
        id = method === "POST" || index ? "" : "/:id";
  return `${prefix}${modelWithDelimiter}${id}`
}

export function interpolateRoute(route, record, initialQuery={}) {

  let query = typeof initialQuery === "string"? queryStringToObj(initialQuery) : initialQuery;

  return route.replace(/:([^\/\?]*)/g, (match, capture)=>{

    const { [capture]:replacement } = query;

    if (replacement) delete query[capture]

    return replacement?
      replacement
    :
      record.hasOwnProperty(capture)?
        record[capture]
      :
        match
  }) + objToQueryString(query);
}

export function delimiterType(delim="") {
  if (delim.match(/^(underscores?|_)$/)) return "underscore"
  return "dasherize"
}

export function setReadOnlyProps(params, _timestamps, modelName, _obj, flute){
  const { id, _id } = params;
  // Establish the ID, also _id
  if (id || _id) _obj.record.id = id || _id;

  Object.defineProperty(_obj, "id", {
    enumerable: true,
    get: ()=>(_obj.record.id || null),
    // ID can only be set on instantiation, otherwise it stays undefined
    set: ()=>{throw new TypeError(`#<${modelName}> property \`id\` cannot be redefined.`)}
  })

  const defineVersion = function(newValue){
    delete this._version;
    Object.defineProperty(this, "_version", {
      enumerable: false,
      configurable: true,
      get:()=>(newValue || 0),
      set:defineVersion.bind(this)
    })
  }
  defineVersion.call(_obj, params._version)

  Object.defineProperty(_obj, "_request", {
    enumerable: false,
    value:{
      version: 0,
      status: null,
      body: null,
      ...params._request
    }
  })
  Object.defineProperty(_obj._request, "clear", {
    enumerable: false,
    value: ()=>{
      for (let property in _obj._request) {
        if (property != "clear" && property != "version")
          _obj._request[property] = null
        if (property == "version")
          _obj._request[property] = 0
      }
    }
  })
  Object.defineProperty(_obj, "errors", {
    enumerable: false,
    value:{...params.errors}
  })
  Object.defineProperty(_obj.errors, "clear", {
    enumerable: false,
    value: ()=>{for (let property in _obj.errors) if (property != "clear") delete _obj.errors[property]}
  })

  if (_timestamps) {
    // Timestamps aren't something we're going to ever
    // update on the record, so let's separate it early on
    Object.defineProperty(_obj, "timestamps", {
      enumerable: false,
      value: {}
    })
    // Handle the createdAt
    // Let it be undefined if nothing was given
    _obj.timestamps.createdAt = params.created_at || params.createdAt || null
    Object.defineProperty(_obj, "createdAt", {
      enumerable: true,
      get: ()=>(_obj.timestamps.createdAt ? new Date(_obj.timestamps.createdAt) : null),
      // createdAt can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`#<${modelName}> property \`createdAt\` cannot be redefined.`)}
    })

    // Handle the updatedAt
    // Let it be undefined if nothing was given
    _obj.timestamps.updatedAt = params.updated_at || params.updatedAt || null
    Object.defineProperty(_obj, "updatedAt", {
      enumerable: true,
      get: ()=>(_obj.timestamps.updatedAt ? new Date(_obj.timestamps.updatedAt) : null),
      // updatedAt can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`#<${modelName}> property \`updatedAt\` cannot be redefined.`)}
    })
  }
}

export function setWriteableProps(params, schema, _obj, flute){
  for (let prop in schema){
    const initialValue = params.hasOwnProperty(prop) ? params[prop] : null;
    _obj.record[prop] = initialValue

    let get = ()=>(_obj.record[prop])
    // @TODO: The set function should dispatch an action that something was set, which
    // would be used to increase the version number, and thus invalidate errors
    let set = (newValue)=>{
      flute.setModel(_obj) //, prop, newValue)
      return _obj.record[prop] = newValue
    }

    if (schema[prop].name === "Object")
      get = ()=> (_obj.record[prop] || {})
    if (schema[prop].name === "Array")
      get = ()=> (_obj.record[prop] || [])
    if (schema[prop].name === "Date")
      get = ()=> (_obj.record[prop] === null ? null : new Date(_obj.record[prop]))
    if (schema[prop].name === "Number")
      get = ()=> (_obj.record[prop] === null ? null : Number(_obj.record[prop]))
    if (schema[prop].name === "Boolean") {
      if (_obj.record[prop] !== null) {
        _obj.record[prop] = initialValue === "false" ? false : Boolean(initialValue)
      }
      set = (newValue)=>{
        flute.setModel(_obj) //, prop, newValue)
        return _obj.record[prop] = newValue === "false" ? false : Boolean(newValue)
      }
    }

    Object.defineProperty(_obj, prop, { get, set, enumerable: true })
  }
}

export function mergeRecordsIntoCache(cache, records, keyStr, model) {
  // Get the records ready for the cache
  let recordsForCache = records.map(record=>({...singleRecordProps, record: createThisRecord(model, record)}));

  // Update any existing members of the cache
  return [].concat(cache.map( cacheItem => {
    let updatedCacheItem = cacheItem;
    recordsForCache = recordsForCache.filter( recordsItem => {
      // When a match is found, remove it from the recordsForCache
      if (recordsItem.record[keyStr] == cacheItem.record[keyStr]) {
        updatedCacheItem = recordsItem;
        return false
      }
      return true;
    });
    return updatedCacheItem;
  // Then concat the remaining records for cache at the end
  }), recordsForCache)
}

export function createThisRecord(model, rawRecord) {
  const newInstance = new model(rawRecord)
  return { ...newInstance.record, ...newInstance.timestamps }
}

export function tmpRecordProps(){
  return({
    id: generateID(),
    ...versioningProps,
    ...recordProps,
    creating: false
  });
};

export function objToQueryString(obj) {
  return Object.keys(obj).reduce( (final, current) => {
    const prefix = final.length? "&" : "?",
          key = encodeURIComponent(current),
          value = encodeURIComponent(obj[current]);
    return `${final}${prefix}${key}=${value}`;
  }, "" )
}

export function queryStringToObj(str) {
  return str?
    JSON.parse(
      `{"${str.replace(/^\?/, "")
              .replace(/&/g, '","')
              .replace(/=/g,'":"')}"}`,
      (k,v) => (k === ""? v : decodeURIComponent(v) )
    )
  :
    {}
}
