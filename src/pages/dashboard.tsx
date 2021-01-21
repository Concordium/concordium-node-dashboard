import React, { useState } from "react";
import {
  Container,
  Dimmer,
  Grid,
  Header,
  Icon,
  Label,
  Loader,
  Message,
  Rail,
  Statistic,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import { QueryObserverResult, useQuery } from "react-query";
import * as API from "../api";
import {
  formatBytes,
  formatDate,
  formatDurationInMillis,
  formatPercentage,
  UnwrapPromiseRec,
} from "../utils";
import { memoize, range } from "lodash";
import { Account, TimeRelativeToNow } from "../shared";

async function fetchDashboadInfo() {
  const [node, peer, peersInfo, consensus] = await Promise.all([
    API.fetchNodeInfo(),
    API.fetchPeerInfo(),
    API.fetchPeersInfo(),
    API.fetchConsensusInfo(),
  ]);
  const birk = await memoize(API.fetchBirkParameters)(consensus.bestBlock);

  return { node, peer, peersInfo, consensus, birk };
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
    <Container className="page-content">
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
              active={infoQuery.isFetching && infoQuery.isFetched}
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

      <Dimmer.Dimmable>
        <Grid stackable doubling>
          <Grid.Row>
            <Grid.Column tablet={8} computer={8}>
              <NodeInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column tablet={8} computer={8}>
              <ConsensusInfo infoQuery={infoQuery} />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column computer={10} tablet={16}>
              <PeersInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column computer={6} tablet={16}>
              <BakersInfo infoQuery={infoQuery} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Dimmer active={infoQuery.isLoading || infoQuery.isError} inverted>
          <Loader size="massive" />
        </Dimmer>
      </Dimmer.Dimmable>
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
      data !== undefined ? formatDate(data?.node.localTime) : undefined,
    "Average sent":
      data !== undefined ? formatBytes(data.peersInfo.avgBpsOut) : undefined,
    "Average received":
      data !== undefined ? formatBytes(data.peersInfo.avgBpsIn) : undefined,
    Baking:
      data === undefined
        ? undefined
        : data.node.inBakingCommittee
        ? "Yes"
        : "No",
  };
  return (
    <>
      <Header>
        Node
        <Header.Subheader>Node specific information</Header.Subheader>
      </Header>
      <KeyValueTable color="blue" keyValues={info} />
    </>
  );
}

function ConsensusInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  let info = {
    "Last block received":
      data !== undefined && data.consensus.blockLastReceivedTime !== null ? (
        <TimeRelativeToNow time={data.consensus.blockLastReceivedTime} />
      ) : undefined,
    "Last finalization":
      data !== undefined && data.consensus.lastFinalizedTime !== null ? (
        <TimeRelativeToNow time={data.consensus.lastFinalizedTime} />
      ) : undefined,
    "Finalization period average (EMA)":
      data !== undefined
        ? formatDurationInMillis(data.consensus.finalizationPeriodEMA * 1000)
        : undefined,
  };

  return (
    <>
      <Header>
        Consensus
        <Header.Subheader>Information related to consensus</Header.Subheader>
      </Header>
      <KeyValueTable color="green" keyValues={info} />
    </>
  );
}

function PeersInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  return (
    <>
      <Header>
        Peers
        <Label color="grey" size="mini" circular>
          {data?.peersInfo.peers.length}
        </Label>
        <Header.Subheader>Externally connected peers</Header.Subheader>
      </Header>
      <div style={{ overflowX: "auto" }}>
        <Table unstackable color="red">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>Latency</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data?.peersInfo.peers.map((peer) => (
              <Table.Row key={peer.id}>
                <Table.Cell>{peer.id}</Table.Cell>
                <Table.Cell>{peer.address}</Table.Cell>
                <Table.Cell>{peer.stats?.latency}ms</Table.Cell>
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
                  </Table.Row>
                ))
              : null}
          </Table.Body>
        </Table>
      </div>
    </>
  );
}

function BakersInfo(props: InfoProps) {
  const { data } = props.infoQuery;
  const isBaking = data?.node.bakerId !== undefined;
  return (
    <>
      <Header>
        Bakers
        <Label color="grey" size="mini" circular>
          {data?.birk.bakers.length}
        </Label>
        <Header.Subheader>The bakers in the best block</Header.Subheader>
      </Header>
      <div style={{ overflowX: "auto" }}>
        <Table unstackable color="purple" compact>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Account</Table.HeaderCell>
              <Table.HeaderCell>Lottery Power</Table.HeaderCell>
              {isBaking ? <Table.HeaderCell></Table.HeaderCell> : null}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data?.birk.bakers.map((baker) => {
              const isNode = baker.bakerId === data.node.bakerId;
              return (
                <Table.Row
                  key={baker.bakerId}
                  positive={isNode}
                  className={isNode ? "baking-node-row" : ""}
                >
                  <Table.Cell>{baker.bakerId}</Table.Cell>
                  <Table.Cell>
                    <Account address={baker.bakerAccount} />
                  </Table.Cell>
                  <Table.Cell>
                    {formatPercentage(baker.bakerLotteryPower)}
                  </Table.Cell>
                  {isBaking ? (
                    <Table.Cell>
                      {isNode ? <Icon name="star" fitted /> : null}
                    </Table.Cell>
                  ) : null}
                </Table.Row>
              );
            })}
            {data === undefined
              ? range(8).map((i) => (
                  <Table.Row key={i}>
                    <Table.Cell>-</Table.Cell>
                    <Table.Cell>-</Table.Cell>
                    <Table.Cell>-</Table.Cell>
                  </Table.Row>
                ))
              : null}
          </Table.Body>
        </Table>
      </div>
    </>
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
