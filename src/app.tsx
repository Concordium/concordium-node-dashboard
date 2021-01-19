import React from "react";
import { Icon, Menu } from "semantic-ui-react";
import {
  BrowserRouter as Router,
  Switch,
  NavLink,
  Route,
} from "react-router-dom";
import logo from "~/assets/concordium-logo-no-text-dark.svg";

export function App() {
  return (
    <Router>
      <Menu icon="labeled" vertical style={{ height: "100%" }}>
        <Menu.Item>
          <img src={logo} style={{ width: "5em", margin: "auto" }} />
        </Menu.Item>

        <Menu.Item as={NavLink} to="/" exact name="dashboard">
          <Icon name="dashboard" />
          Dashboard
        </Menu.Item>

        <Menu.Item as={NavLink} to="/controls" name="controls">
          <Icon name="wrench" />
          Controls
        </Menu.Item>

        <Menu.Item as={NavLink} to="/block-explorer" name="block-explorer">
          <Icon name="video play" />
          Block Explorer
        </Menu.Item>
      </Menu>
      <Switch>
        <Route path="/" exact>
          Dashboard
        </Route>
        <Route path="/controls">Controls</Route>
        <Route path="/block-explorer">Block explorer</Route>
      </Switch>
    </Router>
  );
}
