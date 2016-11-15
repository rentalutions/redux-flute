import { expect } from "chai"
import {
  isEmptyObject, generateID, pruneDeep,
  pruneArray, regexIndexOf, checkResponseStatus,
  routePermitted, generateRoute,
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

  describe("#pruneArray", ()=>{
    it("should remove falsy values from an array, except empty strings", ()=>{
      const testArr = [null, undefined, NaN, "something",""]
      expect(pruneArray(testArr).length).to.equal(2)
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

  describe("#regexIndexOf", ()=>{
    it("should return the index of a Regex match", ()=>{
      const regexSearch = /(sweet|cool|awesome)/
      expect(regexIndexOf(regexSearch, "That would be sweet!")).to.equal(14)
    });
  });

  describe("#checkResponseStatus", ()=>{
    it("should give the response back if the status is 200-something", ()=>{
      const response = { status: 201 };
      expect(checkResponseStatus(response)).to.equal(response)
    });
    it("should throw an error if the response is an error-type", ()=>{
      const response = { status: 403 };
      expect(()=>(checkResponseStatus(response))).to.throw(Error)
    });
  });

  describe("#routePermitted", ()=>{
    it("should allow a string as an only clause", ()=>{
      expect(routePermitted({ only: "GET" }, "GET")).to.equal(true)
      expect(routePermitted({ only: "GET" }, "POST")).to.equal(false)
    });

    it("should allow a string as an except clause", ()=>{
      expect(routePermitted({ except: "POST" }, "GET")).to.equal(true)
      expect(routePermitted({ except: "POST" }, "POST")).to.equal(false)
    });

    it("should allow an array as an only clause", ()=>{
      expect(routePermitted({ only: ["GET", "POST"] }, "GET")).to.equal(true)
      expect(routePermitted({ only: ["GET", "POST"] }, "POST")).to.equal(true)
    });

    it("should allow an array as an except clause", ()=>{
      expect(routePermitted({ except: ["POST", "PUT"] }, "GET")).to.equal(true)
      expect(routePermitted({ except: ["POST", "PUT"] }, "POST")).to.equal(false)
    });
  });

});
