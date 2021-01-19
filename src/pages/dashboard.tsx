import React from "react";
import {
  Container,
  Grid,
  Header,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import { useQuery } from "react-query";
import * as API from "../api";
import { formatDurationInMillis } from "../utils";
import { formatRFC3339 } from "date-fns";

export function DashboardPage() {
  return (
    <Container className="content">
      <Header dividing textAlign="center">
        Dashboard
      </Header>
      <Grid columns={3} stackable divided>
        <Grid.Row>
          <Grid.Column>
            <NodeInfo />
          </Grid.Column>
          <Grid.Column>
            <BakingInfo />
          </Grid.Column>
          <Grid.Column>
            <ConsensusInfo />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column width={16}>
            <PeersInfo />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Container>
  );
}

function NodeInfo() {
  const query = useQuery("nodeInfo", API.fetchNodeInfo);

  if (query.data === undefined) {
    return null;
  }
  const nodeInfo = {
    ID: <span>{query.data.id}</span>,
    Version: <span>{query.data.version}</span>,
    Uptime: <span>{formatDurationInMillis(query.data.uptime)}</span>,
    Localtime: (
      <span>{formatRFC3339(query.data.localTime, { fractionDigits: 3 })}</span>
    ),
  };
  return <KeyValueTable color="blue" header="Node" keyValues={nodeInfo} />;
}

function BakingInfo() {
  const nodeInfo = {
    ID: <span>arstarst</span>,
    Version: <span>1.0.2</span>,
  };
  return <KeyValueTable color="purple" header="Baking" keyValues={nodeInfo} />;
}

function ConsensusInfo() {
  const nodeInfo = {
    ID: <span>arstarst</span>,
    Version: <span>1.0.2</span>,
  };
  return (
    <KeyValueTable color="green" header="Consensus" keyValues={nodeInfo} />
  );
}

function PeersInfo() {
  const query = useQuery("peersInfo", API.fetchPeersInfo);
  if (query.data === undefined) {
    return null;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <Table celled unstackable color="red">
        <Table.Header>
          <Table.HeaderCell>ID</Table.HeaderCell>
          <Table.HeaderCell>IP</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Latency</Table.HeaderCell>
          <Table.HeaderCell>Sent</Table.HeaderCell>
          <Table.HeaderCell>Received</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {query.data.map((peer) => (
            <Table.Row key={peer.id}>
              <Table.Cell>{peer.id}</Table.Cell>
              <Table.Cell>{peer.ipAddress}</Table.Cell>
              <Table.Cell>{peer.status}</Table.Cell>
              <Table.Cell>{peer.stats?.latency}</Table.Cell>
              <Table.Cell>{peer.stats?.packetsSent}</Table.Cell>
              <Table.Cell>{peer.stats?.packetsReceived}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}

type KeyValueTableProps = {
  header: string;
  color: StrictTableProps["color"];
  keyValues: Record<string, React.ReactNode>;
};

function KeyValueTable(props: KeyValueTableProps) {
  return (
    <Table unstackable definition color={props.color}>
      <Table.Header>
        <Table.HeaderCell colSpan={2}>{props.header}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {Object.entries(props.keyValues).map(([key, value]) => (
          <Table.Row key={key}>
            <Table.Cell>{key}</Table.Cell>
            <Table.Cell>{value}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
