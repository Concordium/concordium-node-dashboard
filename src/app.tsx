import React, { useState } from "react";
import { Icon, Menu, Sidebar } from "semantic-ui-react";
import { HashRouter as Router, Switch, NavLink, Route } from "react-router-dom";
import { OverviewPage } from "./pages/overview";
import { ConsensusPage } from "./pages/consensus";
import { BlockExplorerPage } from "./pages/block-explorer";
import logoNoTextDark from "./assets/concordium-logo-no-text-dark.svg";
import logoNoTextLight from "./assets/concordium-logo-no-text-light.svg";
import logoWithText from "./assets/concordium-text.svg";
import { useDeviceScreen } from "./utils";
import { QueryClient, QueryClientProvider } from "react-query";
import { AccountInfoModal } from "./pages/account-info-modal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
    </QueryClientProvider>
  );
}

function Navigation() {
  const device = useDeviceScreen(290);
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
          animation="overlay"
          visible={menuVisible}
          onHide={() => setMenuActivated(false)}
        >
          <Menu.Item>
            <img
              src={logoNoTextDark}
              style={{ width: "5em", margin: "auto" }}
            />
          </Menu.Item>

          <Menu.Item as={NavLink} to="/" exact>
            <Icon name="dashboard" />
            Overview
          </Menu.Item>

          <Menu.Item as={NavLink} to="/consensus">
            <Icon name="handshake outline" />
            Consensus
          </Menu.Item>

          {/* <Menu.Item as={NavLink} to="/block-explorer">
            <Icon name="binoculars" />
            Block Explorer
          </Menu.Item> */}
        </Sidebar>
        <Sidebar.Pusher dimmed={dimmed}>
          <div style={{ marginLeft: allowHidingMenu ? undefined : 150 + "px" }}>
            {allowHidingMenu ? (
              <Menu inverted fluid attached="bottom">
                <Menu.Item onClick={() => setMenuActivated(!menuActivated)}>
                  <Icon name="bars" />
                </Menu.Item>
                <Menu.Item style={{ flex: 1, justifyContent: "center" }}>
                  <div>
                    <img
                      src={logoNoTextLight}
                      style={{
                        height: "1em",
                        marginRight: "0.5em",
                        width: "auto",
                        color: "white",
                        fill: "white",
                      }}
                    />
                    <img
                      src={logoWithText}
                      style={{
                        height: "1em",
                        width: "auto",
                      }}
                    />
                  </div>
                </Menu.Item>
              </Menu>
            ) : null}
            <Switch>
              <Route path="/" exact>
                <OverviewPage />
              </Route>
              <Route path="/consensus">
                <ConsensusPage />
              </Route>
              <Route path="/block-explorer">
                <BlockExplorerPage />
              </Route>
            </Switch>
            <AccountInfoModal />
          </div>
        </Sidebar.Pusher>
      </Sidebar.Pushable>
    </Router>
  );
}
