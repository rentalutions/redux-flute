import Model from "./Model"
import Sugar from "sugar-string"
import "sugar-inflections"
import * as utils from "./utils"

class Flute {
  constructor(){
    this.models = {}
    this.apiPrefix = "/"
    this.apiDelimiter = "-"
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
  setAPI({ prefix = this.apiPrefix, delimiter = this.urlDelimiter }){
    this.apiPrefix = prefix;
    this.apiDelimiter = delimiter;
  }

  getPath(model){
    const delimiter = delimiterType(this.apiDelimiter),
          generatedName = Sugar.String[delimiter](Sugar.String.pluralize(model.name));
    return model.endpoint || `${this.apiPrefix}/${generatedName}`
  }
}
export default new Flute();

function delimiterType(delim="") {
  if (delim.match(/^(underscores?|_)$/)) return "underscore"
  return "dasherize"
}

export Model from "./Model"
