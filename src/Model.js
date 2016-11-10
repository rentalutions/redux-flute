import * as utils from "./utils"
import PS from "./PS"

export default class Model {
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

  get save(){
    return (options = {})=>{
      return new Promise((res,err)=>{
        const type = "save",
              modelType =  this.constructor.name,
              record = utils.pruneDeep(this.record);

        PS.send({ type, modelType, record })
          .then(record=>res(this))
          .catch(e=>err(e))
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
  static all(callback){
    //Returns all users
    setTimeout(()=>{
      if (typeof callback === "function") {
        callback(["User1","User2"])
      }
    },1000)
  }
  static routes = {}
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
//Catch errors like
//newStory.save().catch(e=>{ console.log(e) })
