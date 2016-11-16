import Sugar from "sugar-string"
import "sugar-inflections"
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

  describe("#generateRoute", ()=>{
    it("should generate the correct route for an #index", ()=>{
      expect(generateRoute("BankAccount", "GET", "underscore", "/api", true)).to.equal("/api/bank_accounts")
      expect(generateRoute("BankAccount", "GET", "dasherize", "/api", true)).to.equal("/api/bank-accounts")
    });
    it("should generate the correct route for a #show", ()=>{
      expect(generateRoute("BankAccount", "GET", "underscore", "/api")).to.equal("/api/bank_accounts/:id")
      expect(generateRoute("BankAccount", "GET", "dasherize", "/api")).to.equal("/api/bank-accounts/:id")
    });
    it("should generate the correct route for a #update", ()=>{
      expect(generateRoute("BankAccount", "PUT", "underscore", "/api")).to.equal("/api/bank_accounts/:id")
      expect(generateRoute("BankAccount", "PUT", "dasherize", "/api")).to.equal("/api/bank-accounts/:id")
    });
    it("should generate the correct route for a #create", ()=>{
      expect(generateRoute("BankAccount", "POST", "underscore", "/api")).to.equal("/api/bank_accounts")
      expect(generateRoute("BankAccount", "POST", "dasherize", "/api")).to.equal("/api/bank-accounts")
    });
    it("should generate the correct route for a #destroy", ()=>{
      expect(generateRoute("BankAccount", "DELETE", "underscore", "/api")).to.equal("/api/bank_accounts/:id")
      expect(generateRoute("BankAccount", "DELETE", "dasherize", "/api")).to.equal("/api/bank-accounts/:id")
    });
  });

  describe("#interpolateRoute", ()=>{
    it("should replace variables preceeded by a colon given an object", ()=>{
      expect(interpolateRoute("/leases/:leaseId/users/:userId",{ leaseId:23, userId:44 })).to.equal("/leases/23/users/44")
    });
  });

  describe("#delimiterType", ()=>{
    it("should accept multiple types for underscore", ()=>{
      expect(delimiterType("_")).to.equal("underscore")
      expect(delimiterType("underscores")).to.equal("underscore")
      expect(delimiterType("underscore")).to.equal("underscore")
    });
    it("should return dasherize for anything unknown", ()=>{
      expect(delimiterType("%")).to.equal("dasherize")
      expect(delimiterType()).to.equal("dasherize")
    });
  });

  describe("#setReadOnlyProps", ()=>{
    it("should set an ID if id or _id is present in the params", ()=>{
      const toMutate = { record:{} },
            toMutate2 = { record:{} };
      setReadOnlyProps({_id:"abc"}, false, "Collaboration", toMutate)
      expect(toMutate).to.have.property("id")
      setReadOnlyProps({id:"abc"}, false, "Collaboration", toMutate2)
      expect(toMutate).to.have.property("id")
    });

    it("should set ID to null if not present initially", ()=>{
      const toMutate = { record:{} }
      setReadOnlyProps({}, false, "Collaboration", toMutate)
      expect(toMutate.id).to.equal(null)
    });

    it("should throw an error if trying to redefine ID", ()=>{
      const toMutate = { record: {} }
      setReadOnlyProps({id:"abc"}, false, "Collaboration", toMutate)
      expect(()=>(toMutate.id = "def")).to.throw(TypeError)
    });

    it("should set timestamps if timestamps are specified", ()=>{
      const toMutate = { record:{} },
            toMutate2 = { record:{} };
      setReadOnlyProps({}, true, "Collaboration", toMutate)
      expect(toMutate).to.have.property("timestamps")

      setReadOnlyProps({}, false, "Collaboration", toMutate2)
      expect(toMutate2).to.not.have.property("timestamps")
    });

    it("should allow camelcase createdAt/updatedAt and underscore created_at, updated_at", ()=>{
      const toMutate = { record:{} },
            toMutate2 = { record:{} };
      setReadOnlyProps({createdAt:"2016-11-13T18:14:30.082Z",updatedAt:"2016-11-13T18:14:30.082Z"}, true, "Collaboration", toMutate)
      expect(toMutate.createdAt).to.be.ok
      expect(toMutate.updatedAt).to.be.ok

      setReadOnlyProps({created_at:"2016-11-13T18:14:30.082Z",updated_at:"2016-11-13T18:14:30.082Z"}, true, "Collaboration", toMutate2)
      expect(toMutate.createdAt).to.be.ok
      expect(toMutate.updatedAt).to.be.ok
    });

    it("should set timestamps to null if not present initially", ()=>{
      const toMutate = { record:{} }
      setReadOnlyProps({}, true, "Collaboration", toMutate)
      expect(toMutate.createdAt).to.equal(null)
      expect(toMutate.updatedAt).to.equal(null)
    });

    it("should throw an error if trying to redefine timestamps", ()=>{
      const toMutate = { record:{} }
      setReadOnlyProps({}, true, "Collaboration", toMutate)
      expect(()=>(toMutate.createdAt = Date())).to.throw(TypeError)
      expect(()=>(toMutate.updatedAt = Date())).to.throw(TypeError)
    });

    it("should return the timestamps as a Date object when getting", ()=>{
      const toMutate = { record:{} }
      setReadOnlyProps({createdAt:"2016-11-13T18:14:30.082Z",updatedAt:"2016-11-13T18:14:30.082Z"}, true, "Collaboration", toMutate)
      expect(toMutate.createdAt).to.be.a("date")
      expect(toMutate.updatedAt).to.be.a("date")
    });

    
  });

  describe("#setWriteableProps", ()=>{
    
  });

  describe("#mergeRecordsIntoCache", ()=>{
    
  });
});

