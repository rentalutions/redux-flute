"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transform = exports.reducer = exports.Model = exports.middleware = exports.Flute = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sugar = require("./sugar");

var _sugar2 = _interopRequireDefault(_sugar);

require("whatwg-fetch");

var _objectDiff = require("object-diff");

var _objectDiff2 = _interopRequireDefault(_objectDiff);

var _utils = require("./utils");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Flute = function () {
  function Flute() {
    _classCallCheck(this, Flute);

    this.models = {};
    this.apiPrefix = "";
    this.apiDelimiter = "-";
    this.apiHeaders = {
      // SHOULD BE ABLE TO PASS IN CUSTOM HEADERS BY SETTING IT IN THE API SETTER
      // Defaults are listed here.
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    /* The default credentials send the cookies along with the request.
       The request can be overriden, but consult the fetch documentation. */
    this.apiCredentials = "same-origin";
    /* DiffMode will only submit the changed/new attributes of a model
       rather than the entire model. It is on by default */
    this.diffMode = true;
  }

  _createClass(Flute, [{
    key: "model",
    value: function model(_model) {
      // If we're just retrieving a model
      if (typeof _model === "string") {
        if (typeof this.models[_model] === "undefined") throw new ReferenceError("Model " + _model + " is not a recognized Flute Model.");
        return this.models[_model];
      }
      // Check if it's an instance of model
      if (!(_model.prototype instanceof Model)) throw new TypeError("Model " + _model.name + " needs to extend from Flute's Model.");
      // Check if there's a schema that isn't empty
      if (typeof _model.schema === "undefined" || (0, _utils.isEmptyObject)(_model.schema)) throw new TypeError("Model #<" + _model.name + "> needs a valid schema.");
      // Assign the model
      this.models[_model.name] = _model;
    }
  }, {
    key: "setAPI",
    value: function setAPI(_ref) {
      var _ref$prefix = _ref.prefix,
          prefix = _ref$prefix === undefined ? this.apiPrefix : _ref$prefix,
          _ref$delimiter = _ref.delimiter,
          delimiter = _ref$delimiter === undefined ? this.apiDelimiter : _ref$delimiter,
          _ref$headers = _ref.headers,
          headers = _ref$headers === undefined ? this.apiHeaders : _ref$headers,
          _ref$credentials = _ref.credentials,
          credentials = _ref$credentials === undefined ? this.apiCredentials : _ref$credentials,
          _ref$diffMode = _ref.diffMode,
          diffMode = _ref$diffMode === undefined ? this.diffMode : _ref$diffMode;

      this.apiPrefix = prefix;
      this.apiDelimiter = delimiter;
      Object.assign(this.apiHeaders, headers);
      this.apiCredentials = credentials;
      this.diffMode = diffMode;
    }
  }, {
    key: "getRoute",
    value: function getRoute(_ref2, method) {
      var routes = _ref2.routes,
          name = _ref2.name,
          singleton = _ref2.store.singleton;
      var record = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var query = arguments[3];

      /*
        Get route should now lookup on the model itself for a path
        or if the path is allowed .. and if not, generate the path
        It should also interpolate the correct information like
        :id from the params
      */
      if (!(0, _utils.routePermitted)(routes, method)) throw new TypeError("Method " + method + " is not permitted for model #<" + name + ">. Check the #<" + name + "> route configuration.");
      if (query instanceof Function || query instanceof Array) throw new TypeError("Route query can only be a String or Object.");

      var isIndex = method === "INDEX",
          indexRoute = isIndex ? routes[method] || routes["GET"] : null,
          route = indexRoute || routes[method] || (0, _utils.generateRoute)(name, method, this.apiDelimiter, this.apiPrefix, isIndex, singleton);

      return (0, _utils.interpolateRoute)(route, record, query);
    }
  }, {
    key: "saveModel",
    value: function saveModel(modelInstance) {
      var _this = this;

      return new Promise(function (resolve, error) {
        try {
          var modelType = modelInstance.constructor.name,
              modelTypeForAction = _sugar2.default.String.underscore(modelType).toUpperCase(),
              model = _this.models[modelType],
              record = (0, _utils.pruneDeep)(modelInstance.record),
              recordForAction = (0, _utils.isEmptyObject)(record) ? null : record,
              version = modelInstance._version,
              method = record.id ? "PUT" : "POST",
              route = _this.getRoute(model, method, record),
              useDiffed = _this.diffMode && method == "PUT",
              body = JSON.stringify(useDiffed ? _objectDiff2.default.custom({ equal: _utils.recordDiff }, (0, _utils.pruneDeep)(modelInstance.pristineRecord), record) : record),
              headers = _this.apiHeaders,
              credentials = _this.apiCredentials;


          if (_this.checkForDispatch()) _this.dispatch({ type: "@FLUTE_" + method + "_" + modelTypeForAction, record: recordForAction });
          fetch(route, { method: method, body: body, headers: headers, credentials: credentials }).then(_utils.checkResponseStatus).then(function (res) {
            return res.json();
          }).then(function (data) {
            // This will overwrite all Rails-style nested attributes (addresses_attributes)
            // to blank objects each time they are successfully sent back to an API.
            // TODO: Should move into a setting and test.
            var recordForActionWithRailsStyleNestedAttributesBlanked = Object.keys(recordForAction || {}).filter(function (attribute) {
              return attribute.match(/_attributes$/);
            }).reduce(function (attrs, attr) {
              attrs[attr] = {};
              return attrs;
            }, _extends({}, recordForAction)),
                newModelData = _extends({}, recordForActionWithRailsStyleNestedAttributesBlanked, data),
                newModel = new model(newModelData);
            _this.dispatch({ type: "@FLUTE_" + method + "_SUCCESS_" + modelTypeForAction, record: newModelData });
            resolve(newModel);
          }).catch(function (_ref3) {
            var status = _ref3.status,
                response = _ref3.response;

            response.json().then(function (_ref4) {
              var _ref4$body = _ref4.body,
                  body = _ref4$body === undefined ? "" : _ref4$body,
                  _ref4$errors = _ref4.errors,
                  errors = _ref4$errors === undefined ? {} : _ref4$errors;

              var requestInfo = { _request: { version: version, status: status, body: body }, errors: errors },
                  newModelData = _extends({}, recordForAction, requestInfo),
                  newModel = new model(newModelData);
              _this.dispatch(_extends({ type: "@FLUTE_REQUEST_INFO_" + modelTypeForAction, record: recordForAction }, requestInfo));
              error(newModel);
            });
            // No matter what, there was an error, so we will need:
            //the requestStatus ... 404, 403, 500
            //the requestBody ... Not saved. Parsed from the JSON of the response ... if any
            //errors ... an object of errors from the API ... if any

            //If the record existed (PUT), update the information for that particular record
            //And let the reducer handle if the record is a singleton or not
            //Also return the request info along with the record in question
            //If the record was a create (POST), create a new version of the model with the request info attached

            //this.dispatch({type: `@FLUTE_${method}_REQUEST_INFO_${modelTypeForAction}` })
          });
        }
        // Generic Client-side error handling
        catch (e) {
          error(e);
        }
      });
    }
  }, {
    key: "setModel",
    value: function setModel(modelInstance) {
      var modelType = modelInstance.constructor.name,
          modelTypeForAction = _sugar2.default.String.underscore(modelType).toUpperCase(),
          record = (0, _utils.pruneDeep)(modelInstance.record),
          recordForAction = (0, _utils.isEmptyObject)(record) ? null : record;
      // Bump version here (because of unsaved records)
      modelInstance._version += 1;
      if (this.checkForDispatch()) this.dispatch({ type: "@FLUTE_SET_" + modelTypeForAction, record: recordForAction });
    }
  }, {
    key: "getModel",
    value: function getModel(model) {
      var _this2 = this;

      var id = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var query = arguments[2];

      return new Promise(function (resolve, error) {
        try {
          var modelType = model.name,
              modelTypeForAction = _sugar2.default.String.underscore(modelType).toUpperCase(),
              method = "GET",
              internalMethod = id ? "GET" : "INDEX",
              route = _this2.getRoute(model, internalMethod, { id: id }, query),
              headers = _this2.apiHeaders,
              credentials = _this2.apiCredentials;

          if (_this2.checkForDispatch()) _this2.dispatch({ type: "@FLUTE_" + method + "_" + modelTypeForAction });
          fetch(route, { method: method, headers: headers, credentials: credentials }).then(_utils.checkResponseStatus).then(function (res) {
            return res.json();
          }).then(function (data) {
            _this2.dispatch({ type: "@FLUTE_" + method + "_SUCCESS_" + modelTypeForAction, record: data });
            var instantiatedModels = [].concat(data).map(function (recordRetrieved) {
              return new model(recordRetrieved);
            });
            if (id) resolve(instantiatedModels[0]);else resolve(instantiatedModels);
          }).catch(function (e) {
            var action = { type: "@FLUTE_REQUEST_INFO_" + modelTypeForAction };
            if (id) action["record"] = { id: id };
            var status = e.status,
                _e$response = e.response;
            _e$response = _e$response === undefined ? {} : _e$response;
            var _e$response$statusTex = _e$response.statusText,
                body = _e$response$statusTex === undefined ? "" : _e$response$statusTex;

            if (status) action._request = { version: 0, status: status, body: body };
            _this2.dispatch(action);
            error(e);
          });
        } catch (e) {
          error(e);
        }
      });
    }
  }, {
    key: "destroyModel",
    value: function destroyModel(modelType, record) {
      var _this3 = this;

      return new Promise(function (resolve, error) {
        try {
          var model = _this3.models[modelType],
              method = "DELETE",
              route = _this3.getRoute(model, method, record),
              headers = _this3.apiHeaders,
              credentials = _this3.apiCredentials,
              recordForAction = record.id ? { id: record.id } : undefined,
              modelTypeForAction = _sugar2.default.String.underscore(modelType).toUpperCase();
          if (!recordForAction) throw new Error("Cannot destroy unsaved #<" + modelType + ">.");
          if (_this3.checkForDispatch()) _this3.dispatch({ type: "@FLUTE_DELETE_" + modelTypeForAction, record: recordForAction });
          fetch(route, { method: method, headers: headers, credentials: credentials }).then(_utils.checkResponseStatus).then(function () {
            _this3.dispatch({ type: "@FLUTE_DELETE_SUCCESS_" + modelTypeForAction, record: recordForAction });
            resolve();
          })
          // Still need to handle errors, which means parsing the json and dispatching the correct actions
          .catch(function (e) {
            return error(e);
          });
        } catch (e) {
          error(e);
        }
      });
    }
  }, {
    key: "checkForDispatch",
    value: function checkForDispatch() {
      if (this.dispatch) return true;
      throw new Error("Please use the Flute middleware with Redux so internal actions can be dispatched.");
      return false;
    }
  }, {
    key: "buildInitialState",
    value: function buildInitialState() {
      var models = _extends({}, this.models),
          state = {};

      for (var model in models) {
        if (models.hasOwnProperty(model)) {
          if (models[model].store.singleton) {
            // If the model is a singleton, treat it like a single record
            state[model] = _extends({}, _constants.singleRecordProps);
          } else {
            state[model] = _extends({}, _constants.restVerbs, {
              cache: []
            });
          }
        }
      }
      return state;
    }
  }]);

  return Flute;
}();

exports.Flute = Flute;


var flute = new Flute();

exports.default = flute;
var middleware = exports.middleware = function middleware(store) {
  return function (next) {
    return function (action) {
      if (!flute.store) {
        flute.store = store;
        flute.dispatch = store.dispatch;
      }
      return next(action);
    };
  };
};

var Model = exports.Model = function () {
  function Model() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Model);

    // Set the model name
    var modelName = this.constructor.name,
        model = flute.models[modelName];

    // Define the internal record
    Object.defineProperty(this, "record", {
      enumerable: false,
      value: {}
    });

    // Extract the timestamps and key declaration from the schema

    var _model$schema = model.schema,
        _timestamps = _model$schema._timestamps,
        _key = _model$schema._key,
        schema = _objectWithoutProperties(_model$schema, ["_timestamps", "_key"]);

    (0, _utils.setReadOnlyProps)(params, _timestamps, modelName, this, flute);
    (0, _utils.setWriteableProps)(params, schema, this, flute);

    // Define a pristine, read-only version of the model for diffing
    var pristineRecord = _extends({}, this.record);
    Object.defineProperty(this, "pristineRecord", {
      enumerable: false,
      get: function get() {
        return _extends({}, pristineRecord);
      },
      set: function set() {
        throw new TypeError("#<" + modelName + "> property `pristineRecord` is read-only.");
      }
    });
  }

  _createClass(Model, [{
    key: "updateAttributes",
    get: function get() {
      var _this4 = this;

      return function () {
        var attributes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        // Includes validations
        Object.assign(_this4, attributes);
        return _this4.save();
      };
    }
  }, {
    key: "updateAttribute",
    get: function get() {
      var _this5 = this;

      return function (name, value) {
        // Excludes validations
        _this5[name] = value;
        return _this5.save({ validate: false });
      };
    }
  }, {
    key: "save",
    get: function get() {
      var _this6 = this;

      return function () {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        return new Promise(function (resolve, error) {
          flute.saveModel(_this6).then(function (savedRecord) {
            // Copy the new properties to this instance
            Object.assign(_this6.record, savedRecord.record);
            _this6._version = 0;
            _this6._request.clear();
            _this6.errors.clear();
            if (savedRecord.timestamps) Object.assign(_this6.timestamps, savedRecord.timestamps);
            resolve(_this6);
          }).catch(function (e) {
            if (e instanceof Model) {
              _this6._request.clear();
              Object.assign(_this6._request, e._request);
              _this6.errors.clear();
              Object.assign(_this6.errors, e.errors);
            }
            error(e);
          });
        });
      };
    }
  }, {
    key: "destroy",
    get: function get() {
      var _this7 = this;

      return function () {
        return new Promise(function (resolve, error) {
          var modelType = _this7.constructor.name;
          flute.destroyModel(modelType, { id: _this7.id }).then(resolve).catch(function (e) {
            return error(e);
          });
        });
      };
    }
  }], [{
    key: "create",
    value: function create(attrs) {
      return new flute.models[this.name](attrs).save();
    }
    // Will retrieve an index from the API as an array

  }, {
    key: "all",
    value: function all() {
      var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return flute.getModel(this, undefined, query);
    }
    // Will retrieve a single record by the model's key

  }, {
    key: "find",
    value: function find(keyStr) {
      var query = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
      return flute.getModel(this, keyStr, query);
    }
  }]);

  return Model;
}();

Model.routes = {};
Model.store = { singleton: false };
var reducer = exports.reducer = function reducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : flute.buildInitialState();
  var _ref5 = arguments[1];

  var type = _ref5.type,
      _ref5$record = _ref5.record,
      record = _ref5$record === undefined ? null : _ref5$record,
      _ref5$_request = _ref5._request,
      _request = _ref5$_request === undefined ? _extends({}, _constants.versioningProps._request) : _ref5$_request,
      _ref5$errors = _ref5.errors,
      errors = _ref5$errors === undefined ? {} : _ref5$errors;

  // If this is a flute action
  if ((0, _utils.regexIndexOf)(_constants.actionMatch, type) === -1) return state;

  // Extract the action's info

  var _type$match = type.match(_constants.actionMatch),
      _type$match2 = _slicedToArray(_type$match, 4),
      internalAction = _type$match2[1],
      _type$match2$ = _type$match2[2],
      isSuccessful = _type$match2$ === undefined ? false : _type$match2$,
      actionModelName = _type$match2[3],
      modelName = _sugar2.default.String.camelize(actionModelName),
      model = flute.models[modelName],
      singleton = model.store.singleton,
      keyStr = model.schema._key || "id",
      newState = _extends({}, state);

  switch (internalAction) {
    case "SET":
      if (record && record[keyStr]) {
        if (singleton) {
          newState[modelName]._version += 1;
        } else {
          newState[modelName].cache = newState[modelName].cache.map(function (item) {
            if (item.record[keyStr] === record[keyStr]) {
              item._version += 1;
              return _extends({}, item);
            }
            return item;
          });
        }
      }
      break;
    case "GET":
      // Set the model getting state
      newState[modelName] = _extends({}, state[modelName], { getting: !isSuccessful });
      // If we have new information
      if (isSuccessful && record) {
        // If the model is a singleton, easy update the record
        if (singleton) {
          newState[modelName].record = record instanceof Array ? record[0] : record;
          newState[modelName].version = 0;
        } else {
          newState[modelName].cache = (0, _utils.mergeRecordsIntoCache)(newState[modelName].cache, [].concat(record), keyStr, model);
        }
      } else if (!singleton && record && record[keyStr]) {
        // It is the start of a get request, so if there is record
        // Set that record's getting prop to true
        newState[modelName].cache = newState[modelName].cache.map(function (item) {
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr]) return _extends({}, item, { getting: true });else return item;
        });
      }
      break;
    case "POST":
      newState[modelName] = _extends({}, state[modelName], { posting: !isSuccessful });
      // If we have new information
      if (isSuccessful && record) {
        // If this is singleton, update the main record
        if (singleton) {
          newState[modelName].record = (0, _utils.createThisRecord)(model, record);
          newState[modelName].version = 0;
          // If it's a traditional cache, add the results to the index
        } else {
          var recordsForCache = [].concat(record).map(function (item) {
            return _extends({}, _constants.singleRecordProps, { record: (0, _utils.createThisRecord)(model, item) });
          });
          newState[modelName].cache = [].concat(newState[modelName].cache, recordsForCache);
        }
      }
      break;
    case "PUT":
      newState[modelName] = _extends({}, state[modelName], { putting: !isSuccessful });
      // If we have new information
      if (isSuccessful && record) {
        // If the model is a singleton, easy update the record
        if (singleton) {
          newState[modelName].record = (0, _utils.createThisRecord)(model, record);
          newState[modelName].version = 0;
        } else {
          newState[modelName].cache = (0, _utils.mergeRecordsIntoCache)(newState[modelName].cache, [].concat(record), keyStr, model);
        }
      } else if (!singleton && record[keyStr]) {
        // It is the start of a get request, so if there is record
        // Set that record's getting prop to true
        newState[modelName].cache = newState[modelName].cache.map(function (item) {
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr]) return _extends({}, item, { putting: true });else return item;
        });
      }
      break;
    case "DELETE":
      newState[modelName] = _extends({}, state[modelName], { deleting: !isSuccessful });
      // If we have new information
      if (isSuccessful && record[keyStr]) {
        if (singleton) {
          // For singleton records, empty the record
          newState[modelName].record = {};
          newState[modelName].version = 0;
        } else {
          // For traditional cache's, filter the record out
          newState[modelName].cache = newState[modelName].cache.filter(function (item) {
            return item.record[keyStr] !== record[keyStr];
          });
        }
      } else if (!singleton && record[keyStr]) {
        //This is the start of the request, so mark a record for deletion
        newState[modelName].cache = newState[modelName].cache.map(function (item) {
          if (item.record[keyStr] && item.record[keyStr] == record[keyStr]) return _extends({}, item, { deleting: true });else return item;
        });
      }
      break;
    case "REQUEST_INFO":
      newState[modelName] = _extends({}, state[modelName], {
        getting: false,
        posting: false,
        putting: false,
        deleting: false
      });
      // We only care about permanent records (for now)
      if (record && record[keyStr]) {
        if (singleton) {
          newState[modelName]._request = _request;
          newState[modelName].errors = errors;
        } else {
          newState[modelName].cache = newState[modelName].cache.map(function (item) {
            if (item.record[keyStr] === record[keyStr]) {
              return _extends({}, item, { _request: _request, errors: errors });
            }
            return item;
          });
        }
      }
      break;
  }
  return newState;
};
var transform = exports.transform = function transform(mapStateToProps) {
  var reducerName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "reducer";
  return function (store, ownProps) {
    var reducerModels = _extends({}, store[reducerName]);

    var _loop = function _loop(modelName) {
      var model = flute.models[modelName],
          isSingular = model.store.singleton,
          modelShape = reducerModels[modelName];
      if (isSingular) reducerModels[modelName] = _extends({}, modelShape, { record: new model(_extends({}, modelShape.record, {
          errors: _extends({}, modelShape.errors),
          _request: _extends({}, modelShape._request),
          _version: modelShape._version
        })) });else reducerModels[modelName] = _extends({}, modelShape, { cache: modelShape.cache.map(function (item) {
          return new model(_extends({}, item.record, {
            errors: _extends({}, item.errors),
            _request: _extends({}, item._request),
            _version: item._version
          }));
        }) });
    };

    for (var modelName in reducerModels) {
      _loop(modelName);
    }
    return mapStateToProps(_extends({}, store, _defineProperty({}, reducerName, _extends({}, reducerModels))), ownProps);
  };
};
// Documentation notes
// id is the default key, which works for id and _id ... passing _id as the default key will not work as _id is converted to id
// Add the ability to define the plural version of the model in the model definition ...
//Test:should create properties according to schema, giving a null value if not defined
// Eventually, provide a way to add a default value to the model definition ... so this test can read:
//Test:should create properties according to schema, giving a null OR DEFAULT value if not defined

// The ID should not be part of the JSON object ... nor should really association IDs