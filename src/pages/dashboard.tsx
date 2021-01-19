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
  return (
    <Table unstackable celled color="red">
      <Table.Header>
        <Table.HeaderCell colSpan={2}>Peers</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {[["text", "test"]].map(([key, value]) => (
          <Table.Row key={key}>
            <Table.Cell>{key}</Table.Cell>
            <Table.Cell>{value}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
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
