import { expect } from "chai"
import { Flute, Model } from "../src"

describe("Flute", ()=>{
  describe("#model", ()=>{
    const fluteTest = new Flute();

    it("should return true when passing in a Model class", ()=>{
      class Person extends Model {
        static schema = {
          name: String,
          age: Number
        }
      }
      const fluteReturn = fluteTest.model(Person);
      expect(fluteReturn).to.equal(true)
    });

    it("should retrieve a Flute #<Model> when passed a string", ()=>{
      const Person = fluteTest.model("Person");
      expect(Person.prototype instanceof Model).to.equal(true)
    });

    it("should throw an error if getting a non-existant model.",()=>{})

  });
});
