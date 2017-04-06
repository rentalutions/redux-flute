import Sugar from "./sugar"
import "whatwg-fetch"
import diff from "object-diff"
import {
  isEmptyObject, generateID, pruneDeep,
  pruneArray, regexIndexOf, checkResponseStatus,
  routePermitted, generateRoute,
  interpolateRoute, delimiterType, setReadOnlyProps,
  setWriteableProps, mergeRecordsIntoCache, createThisRecord
} from "./utils"
import { actionMatch, singleRecordProps, recordProps, versioningProps, restVerbs } from "./constants"

export class Flute {
  constructor(){
    this.models = {}
    this.apiPrefix = ""
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
    /* DiffMode will only submit the changed/new attributes of a model
       rather than the entire model. It is on by default */
    this.diffMode = true
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
    if (typeof model.schema === "undefined" || isEmptyObject(model.schema))
      throw new TypeError(`Model #<${model.name}> needs a valid schema.`)
    // Assign the model
    this.models[model.name] = model;
  }

  setAPI({ prefix=this.apiPrefix, delimiter=this.apiDelimiter, headers=this.apiHeaders, credentials=this.apiCredentials, diffMode=this.diffMode }){
    this.apiPrefix = prefix;
    this.apiDelimiter = delimiter;
    Object.assign(this.apiHeaders, headers);
    this.apiCredentials = credentials;
    this.diffMode = diffMode;
  }

  getRoute({ routes, name, store:{ singleton } }, method, record={}){
    /*
      Get route should now lookup on the model itself for a path
      or if the path is allowed .. and if not, generate the path
      It should also interpolate the correct information like
      :id from the params
    */
    if (!routePermitted(routes, method)) throw new TypeError(`Method ${method} is not permitted for model #<${name}>. Check the #<${name}> route configuration.`)
    const route = routes[method] || generateRoute(name, method, this.apiDelimiter, this.apiPrefix, !!!record.id, singleton)
    return interpolateRoute(route, record)
  }

  saveModel(modelInstance){
    return new Promise((resolve, error)=>{
      try {
        const modelType = modelInstance.constructor.name,
              modelTypeForAction = Sugar.String.underscore(modelType).toUpperCase(),
              model = this.models[modelType],
              record = pruneDeep(this.diffMode? diff(modelInstance.pristineRecord, modelInstance.record) : modelInstance.record),
              recordForAction = isEmptyObject(record) ? null : record,
              { _version:version } = modelInstance,
              method = record.id ? "PUT" : "POST",
              route = this.getRoute(model, method, record),
              body = JSON.stringify(record),
              headers = this.apiHeaders,
              credentials = this.apiCredentials;

        if (this.checkForDispatch())
          this.dispatch({ type: `@FLUTE_${method}_${modelTypeForAction}`, record:recordForAction })
        fetch(route, { method, body, headers, credentials })
          .then(checkResponseStatus)
          .then(res=>(res.json()))
          .then(data=>{
                  // This will overwrite all Rails-style nested attributes (addresses_attributes)
                  // to blank objects each time they are successfully sent back to an API.
                  // TODO: Should move into a setting and test.
            const recordForActionWithRailsStyleNestedAttributesBlanked = Object.keys(recordForAction)
                                                                               .filter(attribute=>(attribute.match(/_attributes$/)))
                                                                               .reduce((attrs, attr)=>{
                                                                                 attrs[attr] = {}
                                                                                 return attrs;
                                                                               }, {...recordForAction}),
                  newModelData = {...recordForActionWithRailsStyleNestedAttributesBlanked, ...data},
                  newModel = new model(newModelData);
            this.dispatch({ type: `@FLUTE_${method}_SUCCESS_${modelTypeForAction}`, record:newModelData })
            resolve(newModel)
          })
          .catch(({ status, response })=>{
              response.json().then(({ body="", errors={} })=>{
              const requestInfo = { _request:{ version, status, body }, errors },
                    newModelData = { ...recordForAction, ...requestInfo },
                    newModel = new model(newModelData);
              this.dispatch({ type: `@FLUTE_REQUEST_INFO_${modelTypeForAction}`, record:recordForAction, ...requestInfo })
              error(newModel)
            })
            // No matter what, there was an error, so we will need:
            //the requestStatus ... 404, 403, 500
            //the requestBody ... Not saved. Parsed from the JSON of the response ... if any
            //errors ... an object of errors from the API ... if any

            //If the record existed (PUT), update the information for that particular record
            //And let the reducer handle if the record is a singleton or not
            //Also return the request info along with the record in question
            //If the record was a create (POST), create a new version of the model with the request info attached

            //this.dispatch({type: `@FLUTE_${method}_REQUEST_INFO_${modelTypeForAction}` })
          })
      }
      // Generic Client-side error handling
      catch(e) { error(e) }
    })
  }

  setModel(modelInstance){
    const modelType = modelInstance.constructor.name,
          modelTypeForAction = Sugar.String.underscore(modelType).toUpperCase(),
          record = pruneDeep(modelInstance.record),
          recordForAction = isEmptyObject(record) ? null : record;
    // Bump version here (because of unsaved records)
    modelInstance._version += 1
    if (this.checkForDispatch())
      this.dispatch({ type: `@FLUTE_SET_${modelTypeForAction}`, record:recordForAction })
  }

  getModel(model, id=false){
    return new Promise((resolve, error)=>{
      try {
        const modelType = model.name,
              modelTypeForAction = Sugar.String.underscore(modelType).toUpperCase(),
              method = "GET",
              route = this.getRoute(model, method, { id }),
              headers = this.apiHeaders,
              credentials = this.apiCredentials;

        if (this.checkForDispatch())
          this.dispatch({ type: `@FLUTE_${method}_${modelTypeForAction}`})
        fetch(route, { method, headers, credentials })
          .then(checkResponseStatus)
          .then(res=>(res.json()))
          .then(data=>{
            this.dispatch({ type: `@FLUTE_${method}_SUCCESS_${modelTypeForAction}`, record:data })
            const instantiatedModels = [].concat(data).map(recordRetrieved=>(new model(recordRetrieved)))
            if (id) resolve(instantiatedModels[0])
            else resolve(instantiatedModels)
          })
          .catch(e=>{
            const action = { type: `@FLUTE_REQUEST_INFO_${modelTypeForAction}` }
            if (id) action["record"] = { id }
            this.dispatch(action)
            error(e)
          })
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
        if (!recordForAction) throw new Error(`Cannot destroy unsaved #<${modelType}>.`)
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
            cache:[]
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

export class Model {
  constructor(params={}){
    // Set the model name
    const modelName = this.constructor.name,
          model = flute.models[modelName]

    // Define the internal record
    Object.defineProperty(this, "record", {
      enumerable: false,
      value: {}
    })

    // Extract the timestamps and key declaration from the schema
    const { _timestamps, _key, ...schema } = model.schema;
    setReadOnlyProps(params, _timestamps, modelName, this, flute);
    setWriteableProps(params, schema, this, flute);

    // Define a pristine, read-only version of the model for diffing
    const pristineRecord = { ...this.record }
    Object.defineProperty(this, "pristineRecord", {
      enumerable: false,
      get: ()=>({ ...pristineRecord }),
      set: ()=>{throw new TypeError(`#<${modelName}> property \`pristineRecord\` is read-only.`)}
    })
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
        flute.saveModel(this)
        .then(savedRecord=>{
          // Copy the new properties to this instance
          Object.assign(this.record, savedRecord.record)
          this._version = 0
          this._request.clear()
          this.errors.clear()
          if (savedRecord.timestamps)
            Object.assign(this.timestamps, savedRecord.timestamps)
          resolve(this)
        })
        .catch(e=>{
          if (e instanceof Model) {
            this._request.clear()
            Object.assign(this._request, e._request)
            this.errors.clear()
            Object.assign(this.errors, e.errors)
          }
          error(e)
        })
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
  static create(attrs){
    return new flute.models[this.name](attrs).save()
  }
  // Will retrieve an index from the API as an array
  static all(options){ return flute.getModel(this) }
  // Will retrieve a single record by the model's key
  static find(keyStr){ return flute.getModel(this,keyStr) }
  static routes = {}
  static store = { singleton: false }
}

export const reducer = (state = flute.buildInitialState(), { type, record=null, _request={...versioningProps._request}, errors={} })=>{
  // If this is a flute action
  if (regexIndexOf(actionMatch, type) === -1) return state

  // Extract the action's info
  const [,internalAction, isSuccessful=false, actionModelName] = type.match(actionMatch),
        modelName = Sugar.String.camelize(actionModelName),
        model = flute.models[modelName],
        { singleton } = model.store,
        keyStr = model.schema._key || "id",
        newState = {...state};

  switch (internalAction) {
    case "SET":
      if (record && record[keyStr]) {
        if (singleton) {
          newState[modelName]._version += 1
        } else {
          newState[modelName].cache = newState[modelName].cache.map(item=>{
            if (item.record[keyStr] === record[keyStr]) {
              item._version += 1
              return { ...item }
            }
            return item
          })
        }
      }
      break;
    case "GET":
      // Set the model getting state
      newState[modelName] = { ...state[modelName], getting:!isSuccessful }
      // If we have new information
      if (isSuccessful && record) {
        // If the model is a singleton, easy update the record
        if (singleton) {
          newState[modelName].record = record instanceof Array ? record[0] : record
          newState[modelName].version = 0
        } else {
          newState[modelName].cache = mergeRecordsIntoCache(newState[modelName].cache, [].concat(record), keyStr, model)
        }
      }
      else if(!singleton && record && record[keyStr]) {
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
          newState[modelName].record = createThisRecord(model, record)
          newState[modelName].version = 0
          // If it's a traditional cache, add the results to the index
        } else {
          const recordsForCache = [].concat(record).map(item=>({...singleRecordProps, record: createThisRecord(model, item) }));
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
          newState[modelName].record = createThisRecord(model, record)
          newState[modelName].version = 0
        } else {
          newState[modelName].cache = mergeRecordsIntoCache(newState[modelName].cache, [].concat(record), keyStr, model)
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
          newState[modelName].cache = newState[modelName].cache.filter(item=>{
            return item.record[keyStr] !== record[keyStr]
          })
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
      // We only care about permanent records (for now)
      if (record && record[keyStr]) {
        if (singleton) {
          newState[modelName]._request = _request
          newState[modelName].errors = errors
        } else {
          newState[modelName].cache = newState[modelName].cache.map(item=>{
            if (item.record[keyStr] === record[keyStr]) {
              return { ...item, _request, errors }
            }
            return item
          })
        }
      }
      break;
  }
  return newState;
}
export const transform = (mapStateToProps, reducerName="reducer") => (store, ownProps) => {
  const reducerModels = {...store[reducerName]};
  for (let modelName in reducerModels) {
    const model = flute.models[modelName],
          isSingular = model.store.singleton,
          modelShape = reducerModels[modelName];
    if (isSingular)
      reducerModels[modelName] = {...modelShape, record: new model({
        ...modelShape.record,
        errors:{...modelShape.errors},
        _request:{...modelShape._request},
        _version:modelShape._version
      })}
    else
      reducerModels[modelName] = {...modelShape, cache:modelShape.cache.map(item=>(new model({
        ...item.record,
        errors:{...item.errors},
        _request:{...item._request},
        _version:item._version
      }))) }
  }
  return mapStateToProps({...store, [reducerName]:{...reducerModels}}, ownProps)
}
// Documentation notes
// id is the default key, which works for id and _id ... passing _id as the default key will not work as _id is converted to id
// Add the ability to define the plural version of the model in the model definition ...
//Test:should create properties according to schema, giving a null value if not defined
// Eventually, provide a way to add a default value to the model definition ... so this test can read:
//Test:should create properties according to schema, giving a null OR DEFAULT value if not defined

// The ID should not be part of the JSON object ... nor should really association IDs