import { expect } from "chai"
import {
  isEmptyObject, generateID, pruneDeep,
  pruneArray, guid, regexIndexOf, checkResponseStatus,
  parseJSON, routePermitted, generateRoute,
  interpolateRoute, delimiterType, setReadOnlyProps,
  setWriteableProps, mergeRecordsIntoCache
} from "../src/utils"

describe("Utils", ()=>{
  describe("#isEmptyObject", ()=>{

    it("should return true when passing in an empty object", ()=>{
      expect(isEmptyObject({})).to.equal(true)
    });
    it("should return false when passing in an object with properties", ()=>{
      expect(isEmptyObject({prop:true})).to.equal(false)
    });
  });
  describe("#generateID", ()=>{
    it("should create unique IDs even if generated at the same time", ()=>{
      expect(generateID()).to.not.equal(generateID())
    });
  });
  describe("#pruneDeep", ()=>{
    const testObj =
            {
              beTruthy: "something",
              beAnEmptyString: "",
              beUndefined: undefined,
              beNull: null,
              beEmptyObject: {},
              beObjectWithTruthyProperties: {
                someProp: true
              },
              beObjectWithFalsyProperties:{
                someProp: null
              },
              beArrayWithTruthyAndFalsyValues: [
                null,
                undefined,
                NaN,
                "something",
                //Object with TruthyAndFalsy
                { 
                  prop1: null,
                  prop2: "something"
                },
                //Object with falsy only
                {
                  prop1:null
                },
                //EmptyObject
                {}
              ],
              beEmptyArray:[],
              beArrayWithFalsyValues:[null,undefined,NaN],
              beADeepObjectWithProperties:{
                beTruthy: "something",
                beUndefined: undefined,
                beNull: null,
                beEmptyObject: {},
                beObjectWithTruthyProperties: {
                  someProp: true
                },
                beObjectWithFalsyProperties:{
                  someProp: null
                },
                beArrayWithTruthyAndFalsyValues: [
                  null,
                  undefined,
                  NaN,
                  "something",
                  //Object with TruthyAndFalsy
                  { 
                    prop1: null,
                    prop2: "something"
                  },
                  //Object with falsy only
                  {
                    prop1:null
                  },
                  //EmptyObject
                  {}
                ],
                beEmptyArray:[],
                beArrayWithFalsyValues:[null,undefined,NaN]
              }
            },
            prunedTestObject = pruneDeep(testObj),
            manuallyPrunedObject = {
              beTruthy: "something",
              beAnEmptyString: "",
              beObjectWithTruthyProperties: {
                someProp: true
              },
              beArrayWithTruthyAndFalsyValues: [
                "something",
                { 
                  prop2: "something"
                },
              ],
              beADeepObjectWithProperties:{
                beTruthy: "something",
                beObjectWithTruthyProperties: {
                  someProp: true
                },
                beArrayWithTruthyAndFalsyValues: [
                  "something",
                  { 
                    prop2: "something"
                  }
                ]
              }
            }
    it("should return a clean object with no falsy values, except for empty strings", ()=>{
      expect(JSON.stringify(prunedTestObject)).to.equal(JSON.stringify(manuallyPrunedObject))
    });
  });
});
