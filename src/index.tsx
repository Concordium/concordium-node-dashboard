import React from "react";
import * as ReactDom from "react-dom";
import { App } from "./app";

if (module.hot) {
  module.hot.accept();
}

ReactDom.render(<App />, document.getElementById("app-mount"));
