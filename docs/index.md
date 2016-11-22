---
layout: default
---
<div class="col-12" style="margin-top:2em; margin-bottom:2em;">
Redux Flute - Render an index of records from the cache using <code class="highlighter-rouge">transform</code>
<div style="margin-top:1em;">
{% highlight coffeescript %}
import React, { Component } from "react"
import { connect } from "react-redux"
import flute, { transform } from "redux-flute"
import { push } from "react-router-redux"
import { Link } from "react-router"

const Story = flute.model("Story");

const mapStateToProps = ({models:{Story:{ cache:index }}}) => ({ index })

export default connect(transform(mapStateToProps, "models"))(class Index extends Component {

  componentWillMount(){
    Story.all()
  }

  render() {
    const { props } = this,
          { dispatch, index } = props;
    return(
      <div>
        <h1>All ur stories</h1>
        {index.map(story=>(
          <div key={story.id}>
            <Link to={`/stories/${story.id}`}>{story.title || "Untitled"}</Link> | <a onClick={()=>(story.destroy())} href="javascript:void(0)">Delete</a>
          </div>
        ))}
        <button onClick={()=>Story.create().then(({id})=>(dispatch(push(`/stories/${id}`))))}>NEW STORY</button>
      </div>
    );
  }
}){% endhighlight %}
</div>
</div>
