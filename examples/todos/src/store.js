import { createStore, applyMiddleware, compose } from "redux";
import reducer from "./reducers";
import { middleware as fluteMiddleware } from "./redux-flute";
export default createStore(reducer, compose(applyMiddleware(fluteMiddleware)));
