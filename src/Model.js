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

    // Establish the ID, also _id
    this.record.id = params._id || params.id || null
    Object.defineProperty(this, "id", {
      get: ()=>(this.record.id),
      // ID can only be set on instantiation, otherwise it stays undefined
      set: ()=>{throw new TypeError(`${modelName} property \`id\` cannot be redefined.`)}
    })

    // Extract the timestamps declaration from the schema
    const { _timestamps, ...schema } = model.schema;
    if (_timestamps) {
      // Timestamps aren't something we're going to ever
      // update on the record, so let's separate it early on
      Object.defineProperty(this, "timestamps", {
        enumerable: false,
        value: {}
      })
      // Handle the createdAt
      // Let it be undefined if nothing was given
      this.timestamps.createdAt = params.created_at || params.createdAt
      Object.defineProperty(this, "createdAt", {
        get: ()=>(this.timestamps.createdAt ? new Date(this.timestamps.createdAt) : null),
        // createdAt can only be set on instantiation, otherwise it stays undefined
        set: ()=>{throw new TypeError(`${modelName} property \`createdAt\` cannot be redefined.`)}
      })

      // Handle the updatedAt
      // Let it be undefined if nothing was given
      this.timestamps.updatedAt = params.updated_at || params.updatedAt
      Object.defineProperty(this, "updatedAt", {
        get: ()=>(this.timestamps.updatedAt ? new Date(this.timestamps.updatedAt) : null),
        // updatedAt can only be set on instantiation, otherwise it stays undefined
        set: ()=>{throw new TypeError(`${modelName} property \`updatedAt\` cannot be redefined.`)}
      })
    }

    for (let prop in schema){
      const initialValue = params[prop] || null;
      this.record[prop] = initialValue

      let get = ()=>(this.record[prop])
      let set = (newValue)=>(this.record[prop] = newValue)

      if (schema[prop].name === "Date")
        get = ()=> (this.record[prop] === null ? null : new Date(this.record[prop]))
      if (schema[prop].name === "Number")
        get = ()=> (this.record[prop] === null ? null : Number(this.record[prop]))
      if (schema[prop].name === "Boolean") {
        if (this.record[prop] !== null) {
          this.record[prop] = initialValue === "false" ? false : Boolean(initialValue)
        }
        set = (newValue)=> (this.record[prop] = newValue === "false" ? false : Boolean(newValue))
      }

      Object.defineProperty(this, prop, { get, set })
    }
  }

  get save(){
    const model = eval(this.constructor.name),
          record = {}
    if (this.id != null)
      record.id = this.id
    for (let prop in model.schema) {
      record[prop] = this[prop]
    }
    return option=>{
      return new Promise((res,err)=>{
        setTimeout(()=>{
          if (Math.random() < 0.5) return res(this);
          err("woops!")
        },1000)
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
}
