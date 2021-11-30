"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.recordDiff = recordDiff;
exports.isEmptyObject = isEmptyObject;
exports.generateID = generateID;
exports.pruneDeep = pruneDeep;
exports.pruneArray = pruneArray;
exports.regexIndexOf = regexIndexOf;
exports.checkResponseStatus = checkResponseStatus;
exports.routePermitted = routePermitted;
exports.generateRoute = generateRoute;
exports.interpolateRoute = interpolateRoute;
exports.delimiterType = delimiterType;
exports.setReadOnlyProps = setReadOnlyProps;
exports.setWriteableProps = setWriteableProps;
exports.mergeRecordsIntoCache = mergeRecordsIntoCache;
exports.createThisRecord = createThisRecord;
exports.tmpRecordProps = tmpRecordProps;
exports.objToQueryString = objToQueryString;
exports.queryStringToObj = queryStringToObj;

var _sugar = require("./sugar");

var _sugar2 = _interopRequireDefault(_sugar);

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function recordDiff(a, b) {
  if (a instanceof Array && b instanceof Array) return JSON.stringify(a) === JSON.stringify(b);
  if (a instanceof Date && b instanceof Date) return JSON.stringify(a) === JSON.stringify(b);
  if (a !== null && (typeof a === "undefined" ? "undefined" : _typeof(a)) === "object" && b !== null && (typeof b === "undefined" ? "undefined" : _typeof(b)) === "object") return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function isEmptyObject(obj) {
  for (var name in obj) {
    return false;
  }
  return true;
}

function generateID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return "_" + (s4() + s4() + s4()) + (s4() + s4() + s4());
}

function pruneDeep(obj) {
  return function prune(current) {
    for (var key in current) {
      if (current.hasOwnProperty(key)) {
        if (current[key] instanceof Array) {
          current[key] = pruneArray(current[key]);
        }

        var value = current[key];
        if (typeof value === "undefined" || value == null || value != null && (typeof value === "undefined" ? "undefined" : _typeof(value)) === "object" && isEmptyObject(prune(value)) || value instanceof Array && value.length === 0) {
          delete current[key];
        }
      }
    }
    return current;
  }(Object.assign({}, obj));
}

function pruneArray(arr) {
  var newArray = new Array();
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] != null && _typeof(arr[i]) === "object") arr[i] = pruneDeep(arr[i]);

    if (typeof arr[i] === "undefined" || arr[i] === null) continue;
    if (_typeof(arr[i]) === "object" && isEmptyObject(arr[i])) continue;
    if (typeof arr[i] === "number" && isNaN(arr[i])) continue;

    newArray.push(arr[i]);
  }
  return newArray;
}

function regexIndexOf(regex, string) {
  var startpos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var indexOf = string.substring(startpos).search(regex);
  return indexOf >= 0 ? indexOf + (startpos || 0) : indexOf;
}

function checkResponseStatus(response) {
  var status = response.status,
      error = new Error();
  // If no error, great, return the response.
  if (status >= 200 && status < 300) return response;

  // Begin parsing this error
  error.status = status;
  error.response = response;
  throw error;
}

function routePermitted(_ref, methodOrAction) {
  var only = _ref.only,
      except = _ref.except;


  var method = methodOrAction === "INDEX" ? "GET" : methodOrAction;

  if (only instanceof Array && only.indexOf(method) === -1 || typeof only === "string" && only !== method) return false;
  if (except instanceof Array && except.indexOf(method) !== -1 || typeof except === "string" && (except === method || except === methodOrAction)) return false;
  return true;
}

function generateRoute(name, method, apiDelimiter, prefix) {
  var index = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  var isSingleton = arguments[5];

  /*
  GET    /stories      #index
  GET    /stories/:id  #show
  POST   /stories      #create
  PUT    /stories/:id  #update
  DELETE /stories/:id  #destroy
  */
  var delimiter = delimiterType(apiDelimiter),
      modelInflection = isSingleton ? name : _sugar2.default.String.pluralize(name),
      modelWithDelimiter = "/" + _sugar2.default.String[delimiter](modelInflection),
      id = method === "POST" || index ? "" : "/:id";
  return "" + prefix + modelWithDelimiter + id;
}

function interpolateRoute(route, record) {
  var initialQuery = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


  var query = typeof initialQuery === "string" ? queryStringToObj(initialQuery) : initialQuery;

  return route.replace(/:([^\/\?]*)/g, function (match, capture) {
    var replacement = query[capture];


    if (replacement) delete query[capture];

    return replacement ? replacement : record.hasOwnProperty(capture) ? record[capture] : match;
  }) + objToQueryString(query);
}

function delimiterType() {
  var delim = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

  if (delim.match(/^(underscores?|_)$/)) return "underscore";
  return "dasherize";
}

function setReadOnlyProps(params, _timestamps, modelName, _obj, flute) {
  var id = params.id,
      _id = params._id;
  // Establish the ID, also _id

  if (id || _id) _obj.record.id = id || _id;

  Object.defineProperty(_obj, "id", {
    enumerable: true,
    get: function get() {
      return _obj.record.id || null;
    },
    // ID can only be set on instantiation, otherwise it stays undefined
    set: function set() {
      throw new TypeError("#<" + modelName + "> property `id` cannot be redefined.");
    }
  });

  var defineVersion = function defineVersion(newValue) {
    delete this._version;
    Object.defineProperty(this, "_version", {
      enumerable: false,
      configurable: true,
      get: function get() {
        return newValue || 0;
      },
      set: defineVersion.bind(this)
    });
  };
  defineVersion.call(_obj, params._version);

  Object.defineProperty(_obj, "_request", {
    enumerable: false,
    value: _extends({
      version: 0,
      status: null,
      body: null
    }, params._request)
  });
  Object.defineProperty(_obj._request, "clear", {
    enumerable: false,
    value: function value() {
      for (var property in _obj._request) {
        if (property != "clear" && property != "version") _obj._request[property] = null;
        if (property == "version") _obj._request[property] = 0;
      }
    }
  });
  Object.defineProperty(_obj, "errors", {
    enumerable: false,
    value: _extends({}, params.errors)
  });
  Object.defineProperty(_obj.errors, "clear", {
    enumerable: false,
    value: function value() {
      for (var property in _obj.errors) {
        if (property != "clear") delete _obj.errors[property];
      }
    }
  });

  if (_timestamps) {
    // Timestamps aren't something we're going to ever
    // update on the record, so let's separate it early on
    Object.defineProperty(_obj, "timestamps", {
      enumerable: false,
      value: {}
    });
    // Handle the createdAt
    // Let it be undefined if nothing was given
    _obj.timestamps.createdAt = params.created_at || params.createdAt || null;
    Object.defineProperty(_obj, "createdAt", {
      enumerable: true,
      get: function get() {
        return _obj.timestamps.createdAt ? new Date(_obj.timestamps.createdAt) : null;
      },
      // createdAt can only be set on instantiation, otherwise it stays undefined
      set: function set() {
        throw new TypeError("#<" + modelName + "> property `createdAt` cannot be redefined.");
      }
    });

    // Handle the updatedAt
    // Let it be undefined if nothing was given
    _obj.timestamps.updatedAt = params.updated_at || params.updatedAt || null;
    Object.defineProperty(_obj, "updatedAt", {
      enumerable: true,
      get: function get() {
        return _obj.timestamps.updatedAt ? new Date(_obj.timestamps.updatedAt) : null;
      },
      // updatedAt can only be set on instantiation, otherwise it stays undefined
      set: function set() {
        throw new TypeError("#<" + modelName + "> property `updatedAt` cannot be redefined.");
      }
    });
  }
}

function setWriteableProps(params, schema, _obj, flute) {
  var _loop = function _loop(prop) {
    var initialValue = params.hasOwnProperty(prop) ? params[prop] : null;
    _obj.record[prop] = initialValue;

    var get = function get() {
      return _obj.record[prop];
    };
    // @TODO: The set function should dispatch an action that something was set, which
    // would be used to increase the version number, and thus invalidate errors
    var set = function set(newValue) {
      /* flute.setModel(_obj, prop, newValue) */
      return _obj.record[prop] = newValue;
    };

    if (schema[prop].name === "Object") get = function get() {
      return _obj.record[prop] || {};
    };
    if (schema[prop].name === "Array") get = function get() {
      return _obj.record[prop] || [];
    };
    if (schema[prop].name === "Date") get = function get() {
      return _obj.record[prop] === null ? null : new Date(_obj.record[prop]);
    };
    if (schema[prop].name === "Number") get = function get() {
      return _obj.record[prop] === null ? null : Number(_obj.record[prop]);
    };
    if (schema[prop].name === "Boolean") {
      if (_obj.record[prop] !== null) {
        _obj.record[prop] = initialValue === "false" ? false : Boolean(initialValue);
      }
      set = function set(newValue) {
        /* flute.setModel(_obj, prop, newValue) */
        return _obj.record[prop] = newValue === "false" ? false : Boolean(newValue);
      };
    }

    Object.defineProperty(_obj, prop, { get: get, set: set, enumerable: true });
  };

  for (var prop in schema) {
    _loop(prop);
  }
}

function mergeRecordsIntoCache(cache, records, keyStr, model) {
  // Get the records ready for the cache
  var recordsForCache = records.map(function (record) {
    return _extends({}, _constants.singleRecordProps, { record: createThisRecord(model, record) });
  });

  // Update any existing members of the cache
  return [].concat(cache.map(function (cacheItem) {
    var updatedCacheItem = cacheItem;
    recordsForCache = recordsForCache.filter(function (recordsItem) {
      // When a match is found, remove it from the recordsForCache
      if (recordsItem.record[keyStr] == cacheItem.record[keyStr]) {
        updatedCacheItem = recordsItem;
        return false;
      }
      return true;
    });
    return updatedCacheItem;
    // Then concat the remaining records for cache at the end
  }), recordsForCache);
}

function createThisRecord(model, rawRecord) {
  var newInstance = new model(rawRecord);
  return _extends({}, newInstance.record, newInstance.timestamps);
}

function tmpRecordProps() {
  return _extends({
    id: generateID()
  }, _constants.versioningProps, _constants.recordProps, {
    creating: false
  });
};

function objToQueryString(obj) {
  return Object.keys(obj).reduce(function (final, current) {
    var prefix = final.length ? "&" : "?",
        key = encodeURIComponent(current),
        value = encodeURIComponent(obj[current]);
    return "" + final + prefix + key + "=" + value;
  }, "");
}

function queryStringToObj(str) {
  return str ? JSON.parse("{\"" + str.replace(/^\?/, "").replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (k, v) {
    return k === "" ? v : decodeURIComponent(v);
  }) : {};
}