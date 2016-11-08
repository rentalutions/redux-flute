import Model from "./Model"
import Sugar from "sugar-string"
import "sugar-inflections"
import * as utils from "./utils"

class Flute {
  constructor(){
    this.models = {}
    this.paths = {}
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
    this.setPath(model)
    this.models[model.name] = model;
  }
  setAPI(options={}){
    this.apiPrefix = options.prefix || ""
  }
  setPath(model){
    const generatedName = Sugar.String.dasherize(Sugar.String.pluralize(model.name))
    const path = model.endpoint || `/${generatedName}`
    let type = "custom"
    if (typeof model.endpoint === "undefined")
        type = "generated"
    this.paths[model.name] = { path, type }
  }
}
export default new Flute();

export Model from "./Model"