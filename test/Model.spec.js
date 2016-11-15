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
      expect(Person.prototype instanceof Model).to.equal(true)
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
});
