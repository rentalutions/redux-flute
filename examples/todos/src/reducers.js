import { combineReducers } from "redux"
import flute, { reducer as models } from "./redux-flute"
flute.setAPI({ prefix: "https://jsonplaceholder.typicode.com" });
import "./models"
export default combineReducers({
  models
});
