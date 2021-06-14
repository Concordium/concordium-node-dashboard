import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as API from "./api";
import { useQuery } from "react-query";
import { Button, Container, Form, Grid, Header } from "semantic-ui-react";

const ApiClientContext = createContext<API.Client | undefined>(undefined);

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (client === undefined) {
    throw new Error("Failed to provide an ApiClient through a context");
  }
  return client;
}

// If GRPC_WEB_HOST is not set at build time, assume that we can access GRPC on the same host.
// This requires the server to be configured correctly for proxying.
const grpcWebHost =
  process.env.GRPC_WEB_HOST ??
  window.location.protocol + "//" + window.location.host;

const rpcTokenStorageKey = "GRPC_AUTHENTICATION_TOKEN";

function saveRpcToken(value: string) {
  const entry = JSON.stringify({
    version: 0,
    value,
  });
  localStorage.setItem(rpcTokenStorageKey, entry);
}

function getRpcToken(): string | undefined {
  const entry = localStorage.getItem(rpcTokenStorageKey);
  if (entry === null) {
    return undefined;
  }
  return JSON.parse(entry).value;
}

const defaultRpcToken = "rpcadmin";

type ConnectedProps = {
  children: ReactNode;
};

export function ProvideApi(props: ConnectedProps) {
  const [authentication, setAuthentication] = useState(getRpcToken());

  const client = useMemo(
    () =>
      API.connect(grpcWebHost, {
        authentication: authentication ?? defaultRpcToken,
      }),
    [authentication]
  );

  const connectionCheckQuery = useQuery<string, API.ConnectionError>(
    ["nodeVersion", authentication],
    client.nodeVersion,
    { retry: false, refetchOnMount: false, retryOnMount: false }
  );

  useEffect(() => {
    if (connectionCheckQuery.isSuccess && authentication !== undefined) {
      saveRpcToken(authentication);
    }
  }, [authentication, connectionCheckQuery.isSuccess]);

  if (connectionCheckQuery.isLoading) {
    return <Centered>Connecting to the Concordium Node</Centered>;
  }

  if (
    connectionCheckQuery.error !== null &&
    connectionCheckQuery.error.code === API.ErrorCode.UNAUTHENTICATED
  ) {
    return <ConnectionSettings onNewSettings={setAuthentication} />;
  }

  return (
    <ApiClientContext.Provider value={client}>
      {props.children}
    </ApiClientContext.Provider>
  );
}

type ConnectionSettingsProps = {
  onNewSettings: (authentication: string) => void;
};

function ConnectionSettings(props: ConnectionSettingsProps) {
  const [authenticationField, setAuthenticationField] = useState("");

  const onSubmit = () => props.onNewSettings(authenticationField);
  return (
    <Centered>
      <div
        style={{
          border: "1px solid lightgrey",
          borderRadius: 5,
          padding: "1em",
        }}
      >
        <Header>Failed to connect to node: Unauthenticated</Header>
        <p>Check the GRPC token is correct and try again</p>
        <Form>
          <Form.Field>
            <label>GRPC authentication token</label>
            <input
              placeholder={`${defaultRpcToken}`}
              value={authenticationField}
              onChange={(e) => setAuthenticationField(e.target.value)}
            />
          </Form.Field>
          <Button type="submit" onClick={onSubmit} primary>
            Connect
          </Button>
        </Form>
      </div>
    </Centered>
  );
}

type CenteredProps = {
  children: ReactNode;
};

function Centered(props: CenteredProps) {
  return (
    <Container style={{ height: "100%" }}>
      <Grid
        verticalAlign="middle"
        columns={3}
        centered
        style={{ height: "100%" }}
      >
        <Grid.Row>
          <Grid.Column>{props.children}</Grid.Column>
        </Grid.Row>
      </Grid>
    </Container>
  );
}
