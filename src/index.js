import Sugar from "sugar-string"
import "sugar-inflections"
import "whatwg-fetch"
import * as utils from "./utils"

class Flute {
  constructor(){
    this.models = {}
    this.apiPrefix = "/"
    this.apiDelimiter = "-"
    this.apiHeaders = {
      // SHOULD BE ABLE TO PASS IN CUSTOM HEADERS BY SETTING IT IN THE API SETTER
      // Defaults are listed here.
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
    /* The default credentials send the cookies along with the request.
       The request can be overriden, but consult the fetch documentation. */
    this.apiCredentials = "same-origin"
  }

  model(model){
    // If we're just retrieving a model
    if (typeof model === "string") {
      if (typeof this.models[model] === "undefined")
        throw new ReferenceError(`Model ${model} is not a recognized Flute Model.`);
      return this.models[model];
    }
    // Check if it's an instance of model
    if (!(model.prototype instanceof Model))
      throw new TypeError(`Model ${model.name} needs to extend from Flute's Model.`)
    // Check if there's a schema that isn't empty
    if (typeof model.schema === "undefined" || utils.isEmptyObject(model.schema))
      throw new TypeError(`Model ${model.name} needs a valid schema.`)
    // Assign the model
    this.models[model.name] = model;
  }

  setAPI({ prefix=this.apiPrefix, delimiter=this.apiDelimiter, headers=this.apiHeaders, credentials=this.apiCredentials }){
    this.apiPrefix = prefix;
    this.apiDelimiter = delimiter;
    this.apiHeaders = Object.assign({}, this.apiHeaders, headers);
    this.apiCredentials = credentials;
  }

  getRoute({ routes, name }, method, record){
    /*
      Get path should now lookup on the model itself for a path
      or if the path is allowed .. and if not, generate the path
      It should also interpolate the correct information like
      :id from the params
    */
    if (!routePermitted(routes, method)) throw new TypeError(`Method ${method} is not permitted for model \`${name}\`. Check the \`${name}\` route configuration.`)
    const route = routes[method] || generateRoute(name, method, this.apiDelimiter, this.apiPrefix)
    return interpolateRoute(route, record)
  }

  saveModel(modelType, record){
    return new Promise((resolve, error)=>{
      try {
        const model = this.models[modelType],
              method = record.id ? "PUT" : "POST",
              // THE PATH CAN BE SET MANUALLY IN THE MODEL CLASS OR GENERATED FOR EACH TYPE OF REQUEST
              route = this.getRoute(model, method, record),
              body = JSON.stringify(record),
              headers = this.apiHeaders,
              credentials = this.apiCredentials,
              recordForAction = record.id ? record : undefined,
              modelTypeForAction = Sugar.String.underscore(modelType).toUpperCase();
        if (this.checkForDispatch())
          this.dispatch({ type: `@FLUTE_${method}_${modelTypeForAction}`, record:recordForAction })
        fetch(route, { method, body, headers, credentials })
          .then(checkResponseStatus)
          .then(parseJSON)
          .then(data=>{
            const newModel = new model(data)
            this.dispatch({ type: `@FLUTE_${method}_SUCCESS_${modelTypeForAction}`, record:data })
            resolve(newModel)
          })
          // Still need to handle errors, which means parsing the json and dispatching the correct actions
          .catch(e=>error(e))
      }
      catch(e) { error(e) }
    })
  }

  destroyModel(modelType, record){
    return new Promise((resolve, error)=>{
      try {
        const model = this.models[modelType],
              method = "DELETE",
              route = this.getRoute(model, method, record),
              headers = this.apiHeaders,
              credentials = this.apiCredentials,
              recordForAction = record.id ? { id:record.id } : undefined,
              modelTypeForAction = Sugar.String.underscore(modelType).toUpperCase();
        if (!recordForAction) throw new Error(`Cannot destroy unsaved ${modelType}.`)
        if (this.checkForDispatch())
          this.dispatch({ type: `@FLUTE_DELETE_${modelTypeForAction}`, record:recordForAction })
        fetch(route, { method, headers, credentials })
          .then(checkResponseStatus)
          .then(()=>{
            this.dispatch({ type: `@FLUTE_DELETE_SUCCESS_${modelTypeForAction}`, record:recordForAction })
            resolve()
          })
          // Still need to handle errors, which means parsing the json and dispatching the correct actions
          .catch(e=>error(e))
      }
      catch(e) { error(e); }
    })
  }

  checkForDispatch(){
    if (this.dispatch) return true
    throw new Error("Please use the Flute middleware with Redux so internal actions can be dispatched.")
    return false
  }

  buildInitialState(){
    const models = {...this.models},
          state = {}

    for (let model in models) {
      if (models.hasOwnProperty(model)){
        if (models[model].store.singleton) {
          // If the model is a singleton, treat it like a single record
          state[model] = {
            ...singleRecordProps
          }
        } else {
          state[model] = {
            ...restVerbs,
            cache:[],
            tmpCache:[]
          }
        }
      }
    }
    return state;
  }
}
const flute = new Flute();
export default flute;

export const middleware = store => next => action => {
  if (!flute.store) {
    flute.store = store;
    flute.dispatch = store.dispatch;
  }
  return next(action)
}
// Establishing record defaults for store
const restVerbs = 
      {
        getting: false,
        posting: false,
        putting: false,
        deleting: false
      },
      versioningProps = {
        version: 0,
        requestVersion: null,
        requestStatus: null,
        requestBody: null,
      },
      recordProps = {
        record: {},
        errors: {}
      },
      singleRecordProps = {
        ...restVerbs,
        ...versioningProps,
        ...recordProps
      },
      tmpRecordProps = ()=>({
        id: utils.generateID(),
        ...versioningProps,
        ...recordProps,
        creating: false
      });

function checkResponseStatus(response){
  const {status} = response,
        error = new Error;
  if (status >= 200 && status < 300)
    return response
  error.message = response.statusText
  error.response = response
  throw error
}
function parseJSON(response){
  return response.json()
}
function routePermitted({ only, except }, method) {
  if ((only instanceof Array && only.indexOf(method) === -1) || (typeof only === "string" && only !== method))
    return false
  if ((except instanceof Array && except.indexOf(method) !== -1) || (typeof except === "string" && except === method))
    return false
  return true
}
function generateRoute(name, method, apiDelimiter, prefix, index=false) {
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
function interpolateRoute(route, record) {
  return route.replace(/:([^\/]*)/g, (match, capture)=>(
    record.hasOwnProperty(capture) && record[capture] ? record[capture] : match
  ))
}
function delimiterType(delim="") {
  if (delim.match(/^(underscores?|_)$/)) return "underscore"
  return "dasherize"
}

export class Model {
  constructor(params={}){
    // Set the model name
    const modelName = this.constructor.name,
          model = eval(modelName)

    // Define the internal record
    Object.defineProperty(this, "record", {
      enumerable: false,
      value: {}
    })

    // Extract the timestamps declaration from the schema
    const { _timestamps, ...schema } = model.schema;
    setReadOnlyProps(params, _timestamps, modelName, this);
    setWriteableProps(params, schema, this);
  }
  get updateAttributes() {
    return (attributes={})=>{
      // Includes validations
      Object.assign(this, attributes)
      return this.save()
    }
  }
  get updateAttribute() {
    return (name, value)=>{
      // Excludes validations
      this[name] = value;
      return this.save({validate: false})
    }
  }
  get save(){
    return (options = {})=>{
      return new Promise((resolve,error)=>{
        const modelType =  this.constructor.name,
              record = utils.pruneDeep(this.record);
        flute.saveModel(modelType, record)
          // A few things need to happen
          // On success, it should dispatch the actions to put this new record in store
          // it should send the response in the store and hydrate this record in place
          // Errors should be populated automatically
          .then(savedRecord=>{
            // Copy the new properties to this instance
            Object.assign(this.record, savedRecord.record)
            if (savedRecord.timestamps)
              Object.assign(this.timestamps, savedRecord.timeStamps)
            resolve(this)
          })
          .catch(e=>error(e))
      })
    }
  }
  get validate(){
    return (includingServerValidations)=>{
      return new Promise((res,err)=>{
        setTimeout(()=>{
          if (Math.random() < 0.5) return res(this);
          err("woops!")
        },1000)
      })
    }
  }
  get destroy(){
    return ()=>{
      return new Promise((resolve,error)=>{
        const modelType =  this.constructor.name;
        flute.destroyModel(modelType, {id:this.id})
          .then(resolve())
          .catch(e=>error(e))
      })
    }
  }
  static create(){
    return attrs=>{
      const model = eval(this.constructor.name),
            record = new model(attrs)
      return record.save()
    }
  }
  static all(callback){
    //Returns all users from index
    setTimeout(()=>{
      if (typeof callback === "function") {
        callback(["User1","User2"])
      }
    },1000)
  }
  static routes = {}
  static store = { singleton: false }
}
function setReadOnlyProps(params, _timestamps, modelName, _this){
  const { id, _id } = params;
  // Establish the ID, also _id
  if (id || _id) _this.record.id = id || _id;

  Object.defineProperty(_this, "id", {
    get: ()=>(_this.record.id || null),
    // ID can only be set on instantiation, otherwise it stays undefined
    set: ()=>{throw new TypeError(`${modelName} property \`id\` cannot be redefined.`)}
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
      set: ()=>{throw new TypeError(`${modelName} property \`createdAt\` cannot be redefined.`)}
    })

    // Handle the updatedAt
    // Let it be undefined if nothing was given
    _this.timestamps.updatedAt = params.updated_at || params.updatedAt
    Object.defineProperty(_this, "updatedAt", {
      get: ()=>(_this.timestamps.updatedAt ? new Date(_this.timestamps.updatedAt) : null),
      // updatedAt can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`${modelName} property \`updatedAt\` cannot be redefined.`)}
    })
  }
}
function setWriteableProps(params, schema, _this){
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

const actionMatch = /^@FLUTE_(SET|GET|POST|PUT|DELETE|REQUEST_INFO|SAVE)(_TMP)?(_SUCCESS)?_(.*)$/
export const reducer = (state = flute.buildInitialState(), { type,record=null,tmpRecord=null,requestStatus=null,requestBody=null,errors={} })=>{
  // If this is a flute action
  if (utils.regexIndexOf(actionMatch, type) === -1) return state

  // Extract the action's info
  const [,internalAction, isTemp=false, isSuccessful=false, actionModelName] = type.match(actionMatch),
        modelName = Sugar.String.camelize(actionModelName),
        model = flute.models[modelName],
        { singleton } = model.store,
        { keyStr } = model.schema._key || "id",
        newState = {...state};

  switch (internalAction) {
    case "SET":
      //Check if temp
      break;
    case "GET":
      // Set the model getting state
      newState[modelName] = { ...state[modelName], getting:!isSuccessful }
      // If we have new information
      if (isSuccessful && record) {
        // If the model is a singleton, easy update the record
        if (singleton) {
          newState[modelName].record = record
          newState[modelName].version = 0
        } else {
          newState[modelName].cache = mergeRecordsIntoCache(newState[modelName].cache, [].concat(record), keyStr)
        }
      }
      else if(!singleton && record[keyStr]) {
        // It is the start of a get request, so if there is record
        // Set that record's getting prop to true
        newState[modelName].cache = newState[modelName].cache.map(item=>{
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr])
            return { ...item, getting: true }
          else
            return item
        })
      }

      break;
    case "POST":
      newState[modelName] = { ...state[modelName], posting:!isSuccessful }
      // If we have new information
      if (isSuccessful && record) {
        // If this is singleton, update the main record
        if (singleton){
          newState[modelName].record = record
          newState[modelName].version = 0
          // If it's a traditional cache, add the results to the index
        } else {
          const recordsForCache = [].concat(record).map(item=>({...singleRecordProps, record: item}));
          newState[modelName].cache = [].concat(newState[modelName].cache, recordsForCache)
        }
      }
      break;
    case "PUT":
      newState[modelName] = { ...state[modelName], putting:!isSuccessful }
      // If we have new information
      if (isSuccessful && record) {
        // If the model is a singleton, easy update the record
        if (singleton) {
          newState[modelName].record = record
          newState[modelName].version = 0
        } else {
          newState[modelName].cache = mergeRecordsIntoCache(newState[modelName].cache, [].concat(record), keyStr)
        }
      }
      else if(!singleton && record[keyStr]) {
        // It is the start of a get request, so if there is record
        // Set that record's getting prop to true
        newState[modelName].cache = newState[modelName].cache.map(item=>{
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr])
            return { ...item, putting: true }
          else
            return item
        })
      }
      break;
    case "DELETE":
      newState[modelName] = { ...state[modelName], deleting:!isSuccessful }
      // If we have new information
      if (isSuccessful && record[keyStr]) {
        if (singleton) {
          // For singleton records, empty the record
          newState[modelName].record = {}
          newState[modelName].version = 0
        } else {
          // For traditional cache's, filter the record out
          newState[modelName].cache = newState[modelName].cache.filter(item=>(item.record[keyStr] !== record[keyStr]))
        }
      } else if (!singleton && record[keyStr]) {
        //This is the start of the request, so mark a record for deletion
        newState[modelName].cache = newState[modelName].cache.map(item=>{
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr])
            return { ...item, deleting: true }
          else
            return item
        })
      }
      break;
    case "REQUEST_INFO":
      newState[modelName] = {
        ...state[modelName],
        getting: false,
        posting: false,
        putting: false,
        deleting: false
      }
      //Check if temp
      break;
    case "SAVE":
      //Already temp
      break;
  }
  return newState;
}
function mergeRecordsIntoCache(cache, records, keyStr) {
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

// @FLUTE_GET_STORY
// @FLUTE_GET_SUCCESS_STORY
// @FLUTE_PUT_STORY
// @FLUTE_PUT_SUCCESS_STORY
// @FLUTE_POST_STORY
// @FLUTE_POST_SUCCESS_STORY
// @FLUTE_DELETE_STORY
// @FLUTE_DELETE_SUCCESS_STORY
// @FLUTE_SET_STORY
// @FLUTE_REQUEST_INFO_STORY
// @FLUTE_SAVE_TMP_STORY
// @FLUTE_REQUEST_INFO_TMP_STORY

const demoModel = {
  getting: false,
  posting: false,
  putting: false,
  deleting: false,
  // If the model is a singular type
  // The following fields are created
  version: null,
  requestVersion: null,
  requestStatus: null,
  requestBody: null,
  errors: {},
  record: {},
  // If the model is not a singleton, it gets a cache
  tmpCache: [
    {
      // Every change to the record should change the version
      // If the version is the same as the request version,
      // That means the state of the record is in the same state as
      // it was from the most recent request, meaning all the
      // Errors still apply.
      // The moment this TMP record is successfully requested,
      // It should move out of here, because the successful creation
      // Will move it to the index
      id: null, //<-- KEY
      version: null,
      requestVersion: null,
      requestStatus: null,
      requestBody: null,
      errors: {},
      creating: false,
      record:{}
    }
  ],
  cache: [
    {
      getting: false,
      posting: false,
      putting: false,
      deleting: false,
      version: null,
      requestVersion: null,
      requestStatus: null,
      requestBody: null,
      errors: {},
      record: {}
    }
  ],
}
//Uncaught (in promise) TypeError: Cannot assign to read only property 'record' of object '#<Story>'