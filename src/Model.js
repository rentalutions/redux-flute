export default class Model {
  constructor(params={}){
    const modelName = this.constructor.name,
          model = eval(modelName)

    Object.defineProperty(this, "record", {
      enumerable: false,
      value: {}
    })
    if (params._id)
      this.record.id = params._id
    Object.defineProperty(this, "id", {
      get: ()=>(this.record.id),
      set: ()=>{throw new TypeError(`${modelName} property \`id\` cannot be redefined.`)}
    })
    for (let prop in model.schema){
      const initialValue = params[prop] || null;
      this.record[prop] = initialValue

      let get = ()=>(this.record[prop])
      let set = (newValue)=>(this.record[prop] = newValue)

      if (model.schema[prop].name === "Date")
        get = ()=> (this.record[prop] === null ? null : new Date(this.record[prop]))
      if (model.schema[prop].name === "Number")
        get = ()=> (this.record[prop] === null ? null : Number(this.record[prop]))
      if (model.schema[prop].name === "Boolean")
        if (this.record[prop] !== null)
          this.record[prop] = initialValue === "false" ? false : Boolean(initialValue)
        set = (newValue)=> (this.record[prop] = newValue === "false" ? false : Boolean(newValue))

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
