import React, { useState } from "react";
import { Icon, Menu, Sidebar } from "semantic-ui-react";
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
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
    </QueryClientProvider>
  );
}

function Navigation() {
  const device = useDeviceScreen(150);
  const allowHidingMenu = device !== "computer";
  const [menuActivated, setMenuActivated] = useState(false);
  const menuVisible = !allowHidingMenu || menuActivated;
  const dimmed = allowHidingMenu && menuActivated;
  return (
    <Router>
      <Sidebar.Pushable>
        <Sidebar
          as={Menu}
          icon="labeled"
          vertical
          width="thin"
          animation={allowHidingMenu ? "overlay" : "push"}
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
          {allowHidingMenu ? (
            <Menu>
              <Menu.Item onClick={() => setMenuActivated(!menuActivated)}>
                <Icon name="bars" />
              </Menu.Item>
            </Menu>
          ) : null}
          <div style={{ overflowY: "auto", height: "100vh" }}>
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
          </div>
        </Sidebar.Pusher>
      </Sidebar.Pushable>
    </Router>
  );
}
