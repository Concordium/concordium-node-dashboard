import React, { useState } from "react";
import {
  Container,
  Dimmer,
  Divider,
  Grid,
  Header,
  Label,
  Loader,
  Message,
  Statistic,
  Table,
} from "semantic-ui-react";
import { QueryObserverResult, useQuery } from "react-query";
import * as API from "../api";
import {
  awaitObject,
  epochDate,
  formatAmount,
  formatBool,
  formatBytes,
  formatDate,
  formatDurationInMillis,
  formatPercentage,
  UnwrapPromiseRec,
  whenDefined,
} from "../utils";
import { mapValues, memoize, range, round } from "lodash";
import {
  Account,
  ClickToCopy,
  CFlex,
  KeyValueTable,
  CRow,
  TimeRelativeToNow,
  CTable as CTable,
  useAccountInfoModal,
} from "../shared";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

const msInADay = 1000 * 60 * 60 * 24;
const msInAWeek = msInADay * 7;
const msInAMonth = msInADay * 30;
const msInAYear = msInAMonth * 12;

const memoizedFetchBirkParameters = memoize(API.fetchBirkParameters);
const memoizedFetchAccountInfo = memoize(
  API.fetchAccountInfo,
  (blockHash, account) => blockHash + account
);

function fetchDashboardInfo() {
  const peerPromise = API.fetchPeerInfo();
  const nodePromise = API.fetchNodeInfo();
  const peersInfoPromise = API.fetchPeersInfo();
  const consensusPromise = API.fetchConsensusInfo();
  const birkPromise = consensusPromise.then((c) =>
    memoizedFetchBirkParameters(c.bestBlock)
  );
  const expectedBlocksPromise = (async () => {
    const birk = await birkPromise;
    const consensus = await consensusPromise;
    const blocksPrMilliseconds =
      birk.electionDifficulty / consensus.slotDuration;
    return {
      day: msInADay * blocksPrMilliseconds,
      week: msInAWeek * blocksPrMilliseconds,
      month: msInAMonth * blocksPrMilliseconds,
      year: msInAYear * blocksPrMilliseconds,
    };
  })();

  const bakerNodePromise = (async () => {
    const birk = await birkPromise;
    const node = await nodePromise;
    return birk.bakers.find((b) => b.bakerId === node.bakerId);
  })();

  const bakerAccountPromise = (async () => {
    const bakerNode = await bakerNodePromise;
    const consensus = await consensusPromise;
    return whenDefined(
      (b) => memoizedFetchAccountInfo(consensus.bestBlock, b.bakerAccount),
      bakerNode
    );
  })();

  return awaitObject({
    node: nodePromise,
    peer: peerPromise,
    peersInfo: peersInfoPromise,
    consensus: consensusPromise,
    birk: birkPromise,
    expectedBlocks: expectedBlocksPromise,
    bakerAccount: bakerAccountPromise,
    bakerNode: bakerNodePromise,
  });
}

type DashboardInfo = UnwrapPromiseRec<ReturnType<typeof fetchDashboardInfo>>;

export function DashboardPage() {
  const [refetchInterval, setRefetchInterval] = useState(2000);
  const infoQuery = useQuery<DashboardInfo, Error>(
    "dashboardInfo",
    fetchDashboardInfo,
    {
      refetchInterval,
      keepPreviousData: true,
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
        <Divider horizontal>
          <Header>Network</Header>
        </Divider>
        <Grid stackable doubling>
          <Grid.Row>
            <Grid.Column computer={6} tablet={16}>
              <NodeInfo infoQuery={infoQuery} />
              <BakerInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column computer={10} tablet={16}>
              <PeersInfo infoQuery={infoQuery} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Divider horizontal>
          <Header>Consensus</Header>
        </Divider>
        <Grid doubling stackable>
          <Grid.Row reversed="computer">
            <Grid.Column computer={6} tablet={16}>
              <ConsensusInfo infoQuery={infoQuery} />
            </Grid.Column>
            <Grid.Column computer={10} tablet={16}>
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
    ID: whenDefined((id) => <ClickToCopy copied={id} />, data?.node.id),
    Version: data?.peer.version,
    Uptime:
      data !== undefined
        ? formatDurationInMillis(data.peer.uptime, { hideSeconds: true })
        : undefined,
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

function BakerInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  if (
    data?.bakerAccount?.accountBaker === undefined ||
    data.bakerNode?.bakerAccount === undefined
  ) {
    return null;
  }

  const { accountBaker } = data.bakerAccount;

  const changeAtDate = whenDefined(
    (epoch) => (
      <TimeRelativeToNow
        time={epochDate(
          epoch,
          data.consensus.epochDuration,
          data.consensus.genesisTime
        )}
      />
    ),
    accountBaker.pendingChange?.epoch
  );

  const pendingChangeInfo =
    whenDefined(
      (pending) =>
        pending.change === "RemoveBaker" ? (
          <>Removing baker at {changeAtDate}</>
        ) : (
          <>
            Reducing stake to {formatAmount(pending.newStake)} at {changeAtDate}
          </>
        ),
      accountBaker.pendingChange
    ) ?? "None";

  const info = {
    "Baker ID": accountBaker.bakerId,
    Account: (
      <Account
        consensus={data.consensus}
        address={data.bakerNode.bakerAccount}
      />
    ),
    "Staked amount": formatAmount(accountBaker.stakedAmount),
    "Restake rewards": formatBool(accountBaker.restakeEarnings),
    "Pending change": pendingChangeInfo,
  };

  return (
    <>
      <Header>
        Baker
        <Header.Subheader>Baker specific information</Header.Subheader>
      </Header>
      <KeyValueTable color="purple" keyValues={info} />
    </>
  );
}

function ConsensusInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  const info = {
    "Last block received":
      data === undefined ||
      data.consensus.blockLastReceivedTime === null ? undefined : (
        <TimeRelativeToNow time={data.consensus.blockLastReceivedTime} />
      ),
    "Last finalization":
      data === undefined ||
      data.consensus.lastFinalizedTime === null ? undefined : (
        <TimeRelativeToNow time={data.consensus.lastFinalizedTime} />
      ),
    "Finalization period average (EMA)":
      data === undefined
        ? undefined
        : formatDurationInMillis(data.consensus.finalizationPeriodEMA * 1000),
    "Expected blocks":
      data === undefined ? undefined : data.expectedBlocks.day + " block/day",
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
      <div className="table-wrapper">
        <Table unstackable color="red">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Latency</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data?.peersInfo.peers.map((peer) => (
              <Table.Row key={peer.id}>
                <Table.Cell>
                  {whenDefined(
                    (id) => (
                      <ClickToCopy copied={id} />
                    ),
                    peer.id
                  )}
                </Table.Cell>
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

  const [accountInfoModal, lookupAccount] = useAccountInfoModal(
    data?.consensus
  );

  return (
    <>
      {accountInfoModal}
      <Header>
        Bakers
        <Label color="grey" size="mini" circular>
          {data?.birk.bakers.length}
        </Label>
        <Header.Subheader>The bakers in the best block</Header.Subheader>
      </Header>
      <CTable>
        <CRow className="head">
          <CFlex>ID</CFlex>
          <CFlex>Account</CFlex>
          <CFlex>Lottery Power</CFlex>
          <CFlex>Expected blocks</CFlex>
        </CRow>
        <div style={{ height: 500 }}>
          {data !== undefined ? (
            <AutoSizer>
              {({ width, height }) => (
                <List
                  height={height}
                  itemCount={data.birk.bakers.length}
                  itemSize={50}
                  width={width}
                  itemKey={(index) => data.birk.bakers[index].bakerId}
                >
                  {({ style, index }) => {
                    const baker = data.birk.bakers[index];
                    return (
                      <BakerRow
                        key={baker.bakerId}
                        baker={baker}
                        data={data}
                        style={style}
                        onLookupAccount={() =>
                          lookupAccount(
                            data.consensus.bestBlock,
                            baker.bakerAccount
                          )
                        }
                      />
                    );
                  }}
                </List>
              )}
            </AutoSizer>
          ) : (
            range(8).map((i) => (
              <CRow className="thead" key={i}>
                <CFlex>-</CFlex>
                <CFlex>-</CFlex>
                <CFlex>-</CFlex>
                <CFlex>-</CFlex>
              </CRow>
            ))
          )}
        </div>
      </CTable>
    </>
  );
}

type BakerRowProps = {
  baker: API.BirkParametersBaker;
  data: DashboardInfo;
  onLookupAccount: () => void;
  style: any;
};

function BakerRow(props: BakerRowProps) {
  const { data, baker } = props;
  const isNode = baker.bakerId === data.node.bakerId;

  // Calculate the expected blocks for different durations (rounded)
  const bakerExpectedBlocks = mapValues(data.expectedBlocks, (blocks) =>
    round(baker.bakerLotteryPower * blocks)
  );
  // Take the first non-zero blocks
  const [bakerExpectedBlocksUnit, bakerExpectedBlocksDisplay] = Object.entries(
    bakerExpectedBlocks
  ).find(([, expected]) => expected > 0) ?? ["year", 0];

  return (
    <CRow
      // positive={isNode}
      className={isNode ? "baking-node-row" : ""}
      style={props.style}
    >
      <CFlex>
        {baker.bakerId}
        {isNode ? " (This node)" : ""}
      </CFlex>
      <CFlex>
        <Account
          consensus={data.consensus}
          address={baker.bakerAccount}
          onClick={props.onLookupAccount}
        />
      </CFlex>
      <CFlex>{formatPercentage(baker.bakerLotteryPower)}</CFlex>
      <CFlex>
        {bakerExpectedBlocksDisplay} block/
        {bakerExpectedBlocksUnit}
      </CFlex>
    </CRow>
  );
}
