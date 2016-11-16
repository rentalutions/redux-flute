import Sugar from "sugar-inflections"
import "sugar-string"

console.log("Sugar is:", Sugar)
console.log("Sugar::String is:", Sugar.String)
console.log("Sugar::String::pluralize is:", Sugar.String.pluralize)
console.log("Sugar::String::underscore is:", Sugar.String.underscore)
console.log("Sugar::String::dasherize is:", Sugar.String.dasherize)

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
  if (status >= 200 && status < 300)
    return response
  error.message = response.statusText
  error.response = response
  throw error
}

export function routePermitted({ only, except }, method) {
  if ((only instanceof Array && only.indexOf(method) === -1) || (typeof only === "string" && only !== method))
    return false
  if ((except instanceof Array && except.indexOf(method) !== -1) || (typeof except === "string" && except === method))
    return false
  return true
}

export function generateRoute(name, method, apiDelimiter, prefix, index=false) {
  /*
  GET    /stories      #index
  GET    /stories/:id  #show
  POST   /stories      #create
  PUT    /stories/:id  #update
  DELETE /stories/:id  #destroy
  */
  const delimiter = delimiterType(apiDelimiter),
        pluralizedModelWithDelimiter = `/${Sugar.String[delimiter](Sugar.String.pluralize(name))}`,
        id = method === "POST" || index ? "" : "/:id";
  return `${prefix}${pluralizedModelWithDelimiter}${id}`
}

export function interpolateRoute(route, record) {
  return route.replace(/:([^\/]*)/g, (match, capture)=>(
    record.hasOwnProperty(capture) && record[capture] ? record[capture] : match
  ))
}

export function delimiterType(delim="") {
  if (delim.match(/^(underscores?|_)$/)) return "underscore"
  return "dasherize"
}

export function setReadOnlyProps(params, _timestamps, modelName, _this){
  const { id, _id } = params;
  // Establish the ID, also _id
  if (id || _id) _this.record.id = id || _id;

  Object.defineProperty(_this, "id", {
    get: ()=>(_this.record.id || null),
    // ID can only be set on instantiation, otherwise it stays undefined
    set: ()=>{throw new TypeError(`#<${modelName}> property \`id\` cannot be redefined.`)}
  })

  if (_timestamps) {
    // Timestamps aren't something we're going to ever
    // update on the record, so let's separate it early on
    Object.defineProperty(_this, "timestamps", {
      enumerable: false,
      value: {}
    })
    // Handle the createdAt
    // Let it be undefined if nothing was given
    _this.timestamps.createdAt = params.created_at || params.createdAt
    Object.defineProperty(_this, "createdAt", {
      get: ()=>(_this.timestamps.createdAt ? new Date(_this.timestamps.createdAt) : null),
      // createdAt can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`#<${modelName}> property \`createdAt\` cannot be redefined.`)}
    })

    // Handle the updatedAt
    // Let it be undefined if nothing was given
    _this.timestamps.updatedAt = params.updated_at || params.updatedAt
    Object.defineProperty(_this, "updatedAt", {
      get: ()=>(_this.timestamps.updatedAt ? new Date(_this.timestamps.updatedAt) : null),
      // updatedAt can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`#<${modelName}> property \`updatedAt\` cannot be redefined.`)}
    })
  }
}

export function setWriteableProps(params, schema, _this){
  for (let prop in schema){
    const initialValue = params[prop] || null;
    _this.record[prop] = initialValue

    let get = ()=>(_this.record[prop])
    // @TODO: The set function should dispatch an action that something was set, which
    // would be used to increase the version number, and thus invalidate errors
    let set = (newValue)=>(_this.record[prop] = newValue)

    if (schema[prop].name === "Date")
      get = ()=> (_this.record[prop] === null ? null : new Date(_this.record[prop]))
    if (schema[prop].name === "Number")
      get = ()=> (_this.record[prop] === null ? null : Number(_this.record[prop]))
    if (schema[prop].name === "Boolean") {
      if (_this.record[prop] !== null) {
        _this.record[prop] = initialValue === "false" ? false : Boolean(initialValue)
      }
      set = (newValue)=> (_this.record[prop] = newValue === "false" ? false : Boolean(newValue))
    }

    Object.defineProperty(_this, prop, { get, set })
  }
}

export function mergeRecordsIntoCache(cache, records, keyStr) {
  // First remove anything in the cache that matches keys in the records
  const filteredCache = cache.filter(cacheItem=>{
          let match = false;
          records.map(recordsItem=>{
            match = recordsItem[keyStr] == cacheItem.record[keyStr]
          })
          return !match;
        }),
        // Get the records ready for the cache
        recordsForCache = records.map(record=>({...singleRecordProps, record}));
  // Finally, merge the new records and the filtered records
  return [].concat(filteredCache, recordsForCache);
}
