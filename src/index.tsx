import React from "react";
import * as ReactDom from "react-dom";
import { App } from "./app";
import "semantic-ui-css/semantic.min.css";
import "./style.less";

if (module.hot) {
  module.hot.accept();
}

ReactDom.render(<App />, document.getElementById("app-mount"));
