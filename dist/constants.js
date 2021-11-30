"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var restVerbs = exports.restVerbs = {
  getting: false,
  posting: false,
  putting: false,
  deleting: false
},
    versioningProps = exports.versioningProps = {
  _version: 0,
  _request: {
    version: null,
    status: null,
    body: null
  }
},
    recordProps = exports.recordProps = {
  record: {},
  errors: {}
},
    singleRecordProps = exports.singleRecordProps = _extends({}, restVerbs, versioningProps, recordProps),
    actionMatch = exports.actionMatch = /^@FLUTE_(SET|GET|POST|PUT|DELETE|REQUEST_INFO|SAVE)(_SUCCESS)?_(.*)$/;