import React, { useState } from "react";
import { Button, Grid, Icon, Menu, Segment, Sidebar } from "semantic-ui-react";
import {
  BrowserRouter as Router,
  Switch,
  NavLink,
  Route,
} from "react-router-dom";
import { DashboardPage } from "./pages/dashboard";
import { ControlsPage } from "./pages/controls";
import { BlockExplorerPage } from "./pages/block-explorer";
import logo from "~/assets/concordium-logo-no-text-dark.svg";
import { useDeviceScreen } from "./utils";

export function App() {
  const device = useDeviceScreen();
  const isMobile = device === "mobile";
  const [menuActivated, setMenuActivated] = useState(!isMobile);
  const menuVisible = !isMobile || menuActivated;
  const dimmed = isMobile && menuActivated;
  return (
    <Router>
      <Sidebar.Pushable>
        <Sidebar
          as={Menu}
          icon="labeled"
          vertical
          width="thin"
          animation={isMobile ? "overlay" : "push"}
          visible={menuVisible}
          onHide={() => setMenuActivated(false)}
        >
          <Menu.Item>
            <img src={logo} style={{ width: "5em", margin: "auto" }} />
          </Menu.Item>

          <Menu.Item as={NavLink} to="/" exact>
            <Icon name="dashboard" />
            Dashboard
          </Menu.Item>

          <Menu.Item as={NavLink} to="/controls">
            <Icon name="wrench" />
            Controls
          </Menu.Item>

          <Menu.Item as={NavLink} to="/block-explorer">
            <Icon name="binoculars" />
            Block Explorer
          </Menu.Item>
        </Sidebar>
        <Sidebar.Pusher dimmed={dimmed}>
          {isMobile ? (
            <Menu>
              <Menu.Item onClick={() => setMenuActivated(!menuActivated)}>
                <Icon name="bars" />
              </Menu.Item>
            </Menu>
          ) : null}
          <Switch>
            <Route path="/" exact>
              <DashboardPage />
            </Route>
            <Route path="/controls">
              <ControlsPage />
            </Route>
            <Route path="/block-explorer">
              <BlockExplorerPage />
            </Route>
          </Switch>
        </Sidebar.Pusher>
      </Sidebar.Pushable>
    </Router>
  );
}
