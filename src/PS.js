const PS = class {
  constructor() {
    this.ports = {}
  }

  accept(type, callback){
    if (type instanceof Array) {
      for (let i=0; i<type.length; i++) {
        this.ports[type[i]] = callback
      }
    }
    else this.ports[type] = callback
  }

  send({ type, ...payload }) {
    return new Promise((resolve, error)=>{
      const port = this.ports[type];
      if (port) {
        try { port(payload, resolve) }
        catch(e) { error(e) }
      }
    })
  }
}
export default new PS();

// {
//   type:"save",
//   modelType:"Story",
//   record: {
//     title: "Cool Story",
//     body: "Bro!"
//   }
// }

// PS.send({ type, modelType, record })
//   .then(record=>res(this))
//   .catch(e=>err(e))
//
// PS.accept("save",
// ({ modelType, record }, next)=>{
//   saveTheRecord(modelType, record).then(record=>{
//     next(record)
//   })
// })
//
// PS.accept(["save", "updateAttributes", "updateAttribute", "create"],
// ({ modelType, record }, next)=>{
//   saveTheRecord(modelType, record).then(record=>{
//     next(record)
//   })
// })
