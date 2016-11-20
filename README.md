# redux-flute
![](https://circleci.com/gh/kyleramirez/flute.svg?style=shield&circle-token=f96dcd523b80bba77a924ec8d293eb47c0934bd5)

### What does it do?
Flute is a front-end-only Object Data-store Mapping (ODM) implementation that lets you interact with RESTful APIs. By defining models on the front end and integrating closely with the popular state container, Redux, Flute offers a Ruby-on-Rails-esque, ActiveRecord-ey syntax. Think ActiveRecord for JavaScript. Flute is agnostic to back-end architecture. It's built for APIs which respond to GET/POST/POST/DELETE requests for resources identified by predefined keys, so Rails, Express, Sinatra, CouchDB UNAMEIT! Flute allows you to write syntax like this:

```js
const userAddress = new Address

userAddress.address1 = "1100 Congress Ave"
userAddress.city = "Austin"
userAddress.state = "TX"

userAddress.save()
/* 
  REQUEST:
    Method: POST 
    URL: /api/addresses
    Data: {
      "address1": "1100 Congress Ave",
      "city": "Austin",
      "state": "TX"
    }
  RESPONSE:
    Status: 201 Created
    Body: {
      "_id": "583132c8edc3b79a853b8d69",
      "createdAt": "2016-11-20T05:21:12.988Z",
      "updatedAt": "2016-11-20T05:21:12.988Z",
      "userId": "580432279153ea2679095acd",
      "address1": "1100 Congress Ave",
      "city": "Austin",
      "state": "TX"
    }
*/
userAddress.id
// Returns 583132c8edc3b79a853b8d69
userAddress.destroy()
// Does what you would expect (A DELETE request to the same resource)
```

### Installation

    npm install --save-dev redux-flute
    
### Prerequisites
This library was made to solve problems in my current project stacks (insert buzz words: React/Redux/Webpack/ES6). The only real assumptions are:

 - You are using NPM as a package manager
 - You are using Redux

The nice-to-haves are:

 - React
 - React Redux

I'm open to suggestion on making this library more widely supported.

# Minimum Setup

### Defining Models
```js
// In a file like /models/Story.js
import flute, { Model } from "redux-flute";
class Story extends Model {
  static schema = {
    title: String,
    body: String,
    isActive: Boolean,
    userId: String,
    _timestamps: true
  }
}
export default flute.model(Story);
```

### In your reducers setup
```js
// In a file like /reducers.js
import { combineReducers } from "redux"
import flute, { reducer as models } from "redux-flute"
flute.setAPI({ prefix: "/api" })
import "models"
export default combineReducers({
  models,
  // your other reducers
});
```

### In your store setup
```js
// In a file like /store.js
import { createStore, applyMiddleware, compose } from "redux";
import reducer from "./reducers";
import { middleware as fluteMiddleware } from "redux-flute";
export default createStore(reducer, compose( applyMiddleware(fluteMiddleware /* , ...your other middlewares*/)));
```

# Coming Soon!

 - **Model associations** syntax a-la `userAddress.user` with declarations like:
 
 ```js
  const User = flute.model("User")
  class Address extends Model {
    static associations = [
      {belongsTo: User}
    ]
  }
 ```
 - **Validations**, with the ability to exclude local validation like `userAddress.save({validate: false})`, with declarations a-la Mongoose like:

 ```js
  class Address extends Model {
    static schema = {
      address1: {
        type: String,
        required: [true, "A street address is required."]
      }
      zip: {
        type: String,
        length: {
          min: 5,
          message: "ZIP codes must be at least 5 numbers."
        }
      }
     // ... other schema
    }
  }
 ```
 Also planned is the creation of a flute validations API, with the ability to include local and remote validations.
 - **Scopes** and default scope syntax like `orders.completed`
 - **Order** and default ordering `cards.orderBy("price", "ASC")`
 - **Custom schema types** such as automatic conversions to U.S. dollar
