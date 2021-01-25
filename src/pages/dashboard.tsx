import React, { useRef, useState } from "react";
import {
  Container,
  Dimmer,
  Divider,
  Grid,
  Header,
  Label,
  Loader,
  Message,
  Ref,
  Statistic,
  Sticky,
  Table,
} from "semantic-ui-react";
import { QueryObserverResult, useQuery } from "react-query";
import * as API from "../api";
import {
  epochDate,
  formatAmount,
  formatBool,
  formatBytes,
  formatDate,
  formatDurationInMillis,
  formatPercentage,
  UnwrapPromiseRec,
  useDeviceScreen,
  whenDefined,
} from "../utils";
import { mapValues, memoize, range, round } from "lodash";
import {
  Account,
  KeyValueTable,
  TimeRelativeToNow,
  useAccountModal,
} from "../shared";

const msInADay = 1000 * 60 * 60 * 24;
const msInAWeek = msInADay * 7;
const msInAMonth = msInADay * 30;
const msInAYear = msInAMonth * 12;

async function fetchDashboadInfo() {
  const [node, peer, peersInfo, consensus] = await Promise.all([
    API.fetchNodeInfo(),
    API.fetchPeerInfo(),
    API.fetchPeersInfo(),
    API.fetchConsensusInfo(),
  ]);
  const birk = await memoize(API.fetchBirkParameters)(consensus.bestBlock);

  const blocksPrMilliseconds = birk.electionDifficulty / consensus.slotDuration;
  const expectedBlocks = {
    day: msInADay * blocksPrMilliseconds,
    week: msInAWeek * blocksPrMilliseconds,
    month: msInAMonth * blocksPrMilliseconds,
    year: msInAYear * blocksPrMilliseconds,
  };

  const bakerNode = birk.bakers.find((b) => b.bakerId === node.bakerId);

  const bakerAccount = await whenDefined(
    (b) => API.fetchAccountInfo(consensus.bestBlock, b.bakerAccount),
    bakerNode
  );

  return {
    node,
    peer,
    peersInfo,
    consensus,
    birk,
    expectedBlocks,
    bakerAccount,
    bakerNode,
  };
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

  const deviceScreen = useDeviceScreen();
  const peersRef = useRef<HTMLElement>(null);
  const bakersRef = useRef<HTMLElement>(null);
  const isComputer = deviceScreen === "computer";

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
              <Sticky context={peersRef} active={isComputer}>
                <NodeInfo infoQuery={infoQuery} />
                <BakerInfo infoQuery={infoQuery} />
              </Sticky>
            </Grid.Column>
            <Ref innerRef={peersRef}>
              <Grid.Column computer={10} tablet={16}>
                <PeersInfo infoQuery={infoQuery} />
              </Grid.Column>
            </Ref>
          </Grid.Row>
        </Grid>
        <Divider horizontal>
          <Header>Consensus</Header>
        </Divider>
        <Grid doubling>
          <Grid.Row reversed="computer">
            <Grid.Column computer={6} tablet={16}>
              <Sticky context={bakersRef} active={isComputer}>
                <ConsensusInfo infoQuery={infoQuery} />
              </Sticky>
            </Grid.Column>
            <Ref innerRef={bakersRef}>
              <Grid.Column computer={10} tablet={16}>
                <BakersInfo infoQuery={infoQuery} />
              </Grid.Column>
            </Ref>
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

function BakerInfo(props: InfoProps) {
  const { data } = props.infoQuery;

  const [accountModal, showAccountModal] = useAccountModal();

  if (
    data?.bakerAccount?.accountBaker === undefined ||
    data.bakerNode?.bakerAccount === undefined
  ) {
    return null;
  }

  const { accountBaker } = data.bakerAccount;
  const { bakerAccount } = data.bakerNode;

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
        address={data.bakerNode.bakerAccount}
        onClick={() => showAccountModal(data.consensus.bestBlock, bakerAccount)}
      />
    ),
    "Staked amount": formatAmount(accountBaker.stakedAmount),
    "Restake rewards": formatBool(accountBaker.restakeEarnings),
    "Pending change": pendingChangeInfo,
  };

  return (
    <>
      {accountModal}
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

  const [accountModal, displayAccountModal] = useAccountModal();

  return (
    <>
      {accountModal}
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
              <Table.HeaderCell>Expected blocks</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data !== undefined
              ? data.birk.bakers?.map((baker) => (
                  <Baker
                    key={baker.bakerId}
                    baker={baker}
                    data={data}
                    onDisplayAccount={() =>
                      data === undefined
                        ? undefined
                        : displayAccountModal(
                            data?.consensus.bestBlock,
                            baker.bakerAccount
                          )
                    }
                  />
                ))
              : range(8).map((i) => (
                  <Table.Row key={i}>
                    <Table.Cell>-</Table.Cell>
                    <Table.Cell>-</Table.Cell>
                    <Table.Cell>-</Table.Cell>
                  </Table.Row>
                ))}
          </Table.Body>
        </Table>
      </div>
    </>
  );
}

type BakerProps = {
  baker: API.BirkParametersBaker;
  data: DashboardInfo;
  onDisplayAccount: () => void;
};

function Baker(props: BakerProps) {
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
    <Table.Row positive={isNode} className={isNode ? "baking-node-row" : ""}>
      <Table.Cell>
        {baker.bakerId}
        {isNode ? " (This node)" : ""}
      </Table.Cell>
      <Table.Cell>
        <Account
          address={baker.bakerAccount}
          onClick={props.onDisplayAccount}
        />
      </Table.Cell>
      <Table.Cell>{formatPercentage(baker.bakerLotteryPower)}</Table.Cell>
      <Table.Cell>
        {bakerExpectedBlocksDisplay} block/
        {bakerExpectedBlocksUnit}
      </Table.Cell>
    </Table.Row>
  );
}
