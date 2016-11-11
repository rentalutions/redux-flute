import Model from "./Model"
import Sugar from "sugar-string"
import "sugar-inflections"
import * as utils from "./utils"
export Model from "./Model"
import PS from "./PS"
import "whatwg-fetch"

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

    PS.accept(["save", "updateAttributes", "updateAttribute", "create"],
    ({ modelType, record }, next)=>{
      const model = this.models[modelType],
            method = record.id ? "PUT" : "POST",
            // THE PATH CAN BE SET MANUALLY IN THE MODEL CLASS OR GENERATED FOR EACH TYPE OF REQUEST
            path = this.getPath(model, method, record),
            body = JSON.stringify(record),
            headers = this.apiHeaders,
            credentials = this.apiCredentials;
      //fetch(path, { method, body, headers, credentials })
      //throw "OK FUCK THIS!"
      // saveTheRecord(modelType, record).then(record=>{
      //   next(record)
      // })
    })

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

  getPath(model, method, record){
    /*
      Get path should now lookup on the model itself for a path
      or if the path is allowed .. and if not, generate the path
      It should also interpolate the correct information like
      :id from the params
    */
    // Throw an error like this
    // throw "WHAT THE FUCK ARE YOU TRYING TO DO!? NO!"

    // 1. Check if the method is allowed on the model
    // 2. Establish the route, first use the defined route on the model
    // 3. if none, interpolate the route
    // 4. replace any variables in the route from the record
    // 5. Return the route
    if (!routePermitted(model.routes, method)) throw new TypeError(`Method ${method} is not permitted for model ${model.name}. Check the ${model.name} route configuration.`)

    const delimiter = delimiterType(this.apiDelimiter),
          generatedName = Sugar.String[delimiter](Sugar.String.pluralize(model.name));
    return model.endpoint || `${this.apiPrefix}/${generatedName}`
  }
}
export default new Flute();

function routePermitted({ only, except }, method){
  if ((only instanceof Array && only.indexOf(method) === -1) || (typeof only === "string" && only !== method))
    return false
  if ((except instanceof Array && except.indexOf(method) !== -1) || (typeof except === "string" && except === method))
    return false
  return true
}

function delimiterType(delim="") {
  if (delim.match(/^(underscores?|_)$/)) return "underscore"
  return "dasherize"
}


// static routes = {
//   only: ["GET", "PUT"],
//   PUT: "/api/me",
//   singleton: true
// }