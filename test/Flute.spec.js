import { expect } from "chai"
import { Flute, Model } from "../src"

describe("Flute", ()=>{
  describe("#model", ()=>{
    const fluteTest = new Flute();

    class Person extends Model {
      static schema = {
        name: String,
        age: Number
      }
    }

    it("should add a new Model to the Flute instance", ()=>{
      fluteTest.model(Person);
      expect(fluteTest.models).to.have.property("Person")
    });

    it("should retrieve a Flute #<Model> when passed a string", ()=>{
      const Person = fluteTest.model("Person");
      expect(Person.prototype).to.be.instanceof(Model)
    });

    it("should throw an error if getting a non-existant model.",()=>{
      expect(()=>(fluteTest.model("Animal"))).to.throw(ReferenceError)
    });

    it("should throw an error if passed a non-Flute class",()=>{
      expect(()=>(fluteTest.model(class Person {}))).to.throw(TypeError)
    });

    it("should throw an error if the #<Model> has no or an empty schema",()=>{
      expect(()=>(fluteTest.model(class Spreadsheet extends Model {}))).to.throw(TypeError)
      expect(()=>(fluteTest.model(class Spreadsheet extends Model { static schema = {}}))).to.throw(TypeError)
    });
  });

  describe("#setAPI", ()=>{
    const fluteTest = new Flute();

    fluteTest.setAPI({ headers: {
      "Accept": "text/plain",
      "JWT_TOKEN": "thetoken"
    }});

    it("should merge API request headers with the default headers", ()=>{
      expect(fluteTest.apiHeaders["Content-Type"]).to.equal("application/json")
      expect(fluteTest.apiHeaders["JWT_TOKEN"]).to.equal("thetoken")
    });
    it("should leave default API request properties alone if unspecified", ()=>{
      expect(fluteTest.apiPrefix).to.equal("")
    });
  });

  describe("#getRoute", ()=>{
    const fluteTest = new Flute();
    class Person extends Model {
      static schema = { name: String, age: Number }
      static routes = { except: "DELETE", POST: "/correct-route/:id" }
    }
    fluteTest.model(Person);;
    it("should throw an error if a forbidden method is attempted", ()=>{
      expect(()=>{ fluteTest.getRoute(Person, "DELETE", { name: "Jim" }) }).to.throw(TypeError)
    });
    it("should generate the correct route", ()=>{
      expect(fluteTest.getRoute(Person, "PUT", { name: "Jim", id:"123" })).to.equal("/people/123")
    });
    it("should use a route specified in the model definition", ()=>{
      expect(fluteTest.getRoute(Person, "POST", { name: "Jim", id:"123" })).to.equal("/correct-route/123")
    });
  });

  
});
