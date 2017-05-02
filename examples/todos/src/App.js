import React, { Component } from "react";
import { connect } from "react-redux";
import flute, { transform } from "./redux-flute";
const Todo = flute.model("Todo")
const mapStateToProps = ({ models: { Todo: { cache:todos }} }) => ({ todos })

export default connect(transform(mapStateToProps, "models"))(class App extends Component {
  componentDidMount(){
    this.props.dispatch({ type:"FIRST_ACTION" })
    Todo.all()
  }
  render() {
    return (
      <div>
        {this.props.todos.map( todo => (
          <div key={todo.id}>
            {todo.title}
            <a href={`/todo/${todo.id}/delete`} onClick={(e) => {e.preventDefault(); todo.destroy();}}>Delete</a>
          </div>
        ))}
      </div>
    );
  }
})
