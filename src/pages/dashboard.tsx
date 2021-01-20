import React, { useState } from "react";
import {
  Container,
  Grid,
  Header,
  Icon,
  Label,
  Loader,
  Message,
  Segment,
  Statistic,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import { QueryObserverResult, useQuery } from "react-query";
import * as API from "../api";
import { formatDurationInMillis, UnwrapPromiseRec } from "../utils";
import { formatRFC3339 } from "date-fns";
import { range } from "lodash";

async function fetchDashboadInfo() {
  const [node, peer, peers, consensus] = await Promise.all([
    API.fetchNodeInfo(),
    API.fetchPeerInfo(),
    API.fetchPeersInfo(),
    API.fetchConsensusInfo(),
  ]);
  return { node, peer, peers, consensus };
}

type DashboardInfo = UnwrapPromiseRec<ReturnType<typeof fetchDashboadInfo>>;

export function DashboardPage() {
  const [refetchInterval, setRefetchInterval] = useState(2000);
  const infoQuery = useQuery<DashboardInfo, Error>(
    "dashboardInfo",
    fetchDashboadInfo,
    {
      refetchInterval,
    }
  );
  return (
    <Container className="content">
      <Header dividing textAlign="center">
        Dashboard
      </Header>
      {infoQuery.error !== null ? (
        <Message negative>
          <Message.Header>Failed polling node</Message.Header>
          <p>With error message: {infoQuery.error?.message}</p>
        </Message>
      ) : null}
      <Grid verticalAlign="middle">
        <Grid.Row>
          <Grid.Column width={8} floated="left">
            <Loader
              active={infoQuery.isFetching}
              inline
              indeterminate
              size="small"
            ></Loader>
          </Grid.Column>
          <Grid.Column width={8} floated="right">
            <Statistic size="mini" floated="right">
              <Statistic.Value>
                {(refetchInterval / 1000).toFixed(1)}s
              </Statistic.Value>
              <Statistic.Label>Polling interval</Statistic.Label>
              <input
                type="range"
                min={1000}
                step={500}
                max={10000}
                value={refetchInterval}
                onChange={(e) => setRefetchInterval(parseInt(e.target.value))}
              />
            </Statistic>
          </Grid.Column>
        </Grid.Row>
      </Grid>

      <Segment loading={infoQuery.isLoading || infoQuery.isError}>
        <Grid stackable padded>
          <Grid.Row>
            <Grid.Column tablet={8} computer={5}>
              <NodeInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column tablet={8} computer={4}>
              <BakingInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column tablet={16} computer={7}>
              <ConsensusInfo infoQuery={infoQuery} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={16}>
              <PeersInfo infoQuery={infoQuery} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
    </Container>
  );
}

type InfoProps = {
  infoQuery: QueryObserverResult<DashboardInfo>;
};

function NodeInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  const info = {
    ID: data?.node.id,
    Version: data?.peer.version,
    Uptime:
      data !== undefined ? formatDurationInMillis(data.peer.uptime) : undefined,
    Localtime:
      data !== undefined ? formatRFC3339(data?.node.localTime) : undefined,
  };
  return (
    <>
      <Header>Node</Header>
      <KeyValueTable color="blue" keyValues={info} />
    </>
  );
}

function BakingInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  const info = {
    "Baker ID": data === undefined ? undefined : data.node.bakerId ?? "None",
    "Baking Committee":
      data === undefined
        ? undefined
        : data.node.inBakingCommittee
        ? "Yes"
        : "No",
    "Finalization Committee":
      data === undefined
        ? undefined
        : data?.node.inFinalizationCommittee
        ? "Yes"
        : "No",
  };
  return (
    <>
      <Header>Baking</Header>
      <KeyValueTable color="purple" keyValues={info} />
    </>
  );
}

function ConsensusInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  let info = {
    "Last block received":
      data !== undefined
        ? formatRFC3339(data.consensus.blockLastReceivedTime)
        : undefined,
    "Last finalization":
      data !== undefined
        ? formatRFC3339(data.consensus.lastFinalizedTime)
        : undefined,
    "Finalization period average (EMA)":
      data !== undefined
        ? formatDurationInMillis(data.consensus.finalizationPeriodEMA * 1000)
        : undefined,
  };

  return (
    <>
      <Header>Consensus</Header>
      <KeyValueTable color="green" keyValues={info} />
    </>
  );
}

function PeersInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  return (
    <div style={{ overflowX: "auto" }}>
      <Header>Peers</Header>
      <Table celled unstackable color="red">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Address</Table.HeaderCell>
            <Table.HeaderCell>Latency (ms)</Table.HeaderCell>
            <Table.HeaderCell>Sent</Table.HeaderCell>
            <Table.HeaderCell>Received</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data?.peers.map((peer) => (
            <Table.Row key={peer.id}>
              <Table.Cell>{peer.id}</Table.Cell>
              <Table.Cell>{peer.address}</Table.Cell>
              <Table.Cell>{peer.stats?.latency}</Table.Cell>
              <Table.Cell>{peer.stats?.packetsSent}</Table.Cell>
              <Table.Cell>{peer.stats?.packetsReceived}</Table.Cell>
              <Table.Cell>{peer.status}</Table.Cell>
            </Table.Row>
          ))}
          {data === undefined
            ? range(8).map((i) => (
                <Table.Row key={i}>
                  <Table.Cell>-</Table.Cell>
                  <Table.Cell>-</Table.Cell>
                  <Table.Cell>-</Table.Cell>
                  <Table.Cell>-</Table.Cell>
                  <Table.Cell>-</Table.Cell>
                  <Table.Cell>-</Table.Cell>
                </Table.Row>
              ))
            : null}
        </Table.Body>
      </Table>
    </div>
  );
}

type KeyValueTableProps = {
  color: StrictTableProps["color"];
  keyValues: Record<string, React.ReactNode>;
};

function KeyValueTable(props: KeyValueTableProps) {
  return (
    <Table unstackable definition color={props.color}>
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
