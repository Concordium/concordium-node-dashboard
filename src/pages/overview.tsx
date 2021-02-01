import React, { useMemo } from "react";
import {
  Button,
  Container,
  Dimmer,
  Grid,
  Header,
  Label,
  Loader,
  Message,
  Popup,
} from "semantic-ui-react";
import { useQuery } from "react-query";
import * as API from "../api";
import {
  formatAmount,
  formatBool,
  formatBytes,
  formatDate,
  formatDurationInMillis,
  useEpochIndex,
  whenDefined,
} from "../utils";
import { isEmpty, uniq } from "lodash";
import {
  Account,
  ClickToCopy,
  KeyValueTable,
  FixedTable,
  PendingChange,
  TimeInterpolate,
} from "../shared";
import { Column } from "react-table";
import { useAccountInfoSearchQuery } from "./account-info-modal";

export function OverviewPage() {
  const accountInfo = useAccountInfoSearchQuery();

  const nodeQuery = useQuery<API.NodeInfo, Error>(
    ["NodeInfo"],
    API.fetchNodeInfo,
    {
      refetchInterval: 10000,
      enabled: !accountInfo.showing,
    }
  );
  const consensusQuery = useQuery<API.ConsensusInfo, Error>(
    ["ConsensusInfo"],
    API.fetchConsensusInfo,
    {
      refetchInterval: 4000,
      enabled: !accountInfo.showing,
    }
  );
  const peerQuery = useQuery<API.PeerInfo, Error>(
    ["PeerInfo"],
    API.fetchPeerInfo,
    {
      refetchInterval: 10000,
      enabled: !accountInfo.showing,
    }
  );
  const peersQuery = useQuery<API.PeersInfo, Error>(
    ["PeersInfo"],
    API.fetchPeersInfo,
    {
      refetchInterval: 10000,
      enabled: !accountInfo.showing,
    }
  );

  const nodeBakerId = nodeQuery.data?.bakerId;

  const epochIndex = useEpochIndex(
    consensusQuery.data?.epochDuration,
    consensusQuery.data?.genesisTime
  );

  const birkQuery = useQuery<API.BirkParametersInfo | undefined, Error>(
    ["BirkInfo", epochIndex],
    () =>
      whenDefined(
        (block) => API.fetchBirkParameters(block),
        consensusQuery.data?.bestBlock
      ),
    {
      enabled:
        !accountInfo.showing &&
        consensusQuery.data?.bestBlock !== undefined &&
        nodeBakerId !== undefined,
    }
  );

  const nodeBirkBaker = birkQuery.data?.bakers.find(
    (b) => b.bakerId === nodeBakerId
  );

  const bakerAccountQuery = useQuery<API.AccountInfo | undefined, Error>(
    [
      "AccountInfo",
      consensusQuery.data?.bestBlock,
      nodeBirkBaker?.bakerAccount,
    ],
    () =>
      whenDefined(
        (blockHash, address) => API.fetchAccountInfo(blockHash, address),
        consensusQuery.data?.bestBlock,
        nodeBirkBaker?.bakerAccount
      ),
    {
      enabled:
        consensusQuery.data?.bestBlock !== undefined &&
        nodeBirkBaker?.bakerAccount !== undefined,
      keepPreviousData: true,
    }
  );

  const queries = useMemo(
    () => [
      nodeQuery,
      consensusQuery,
      peerQuery,
      peersQuery,
      birkQuery,
      bakerAccountQuery,
    ],
    [
      bakerAccountQuery,
      birkQuery,
      consensusQuery,
      nodeQuery,
      peerQuery,
      peersQuery,
    ]
  );

  const peers = useMemo(() => peersQuery.data?.peers ?? [], [
    peersQuery.data?.peers,
  ]);
  const banned = useMemo(() => peersQuery.data?.banned ?? [], [
    peersQuery.data?.banned,
  ]);

  const uptime = useMemo(
    () =>
      whenDefined(
        (uptime) => (
          <TimeInterpolate time={uptime}>
            {(time) => <span>{formatDurationInMillis(time)}</span>}
          </TimeInterpolate>
        ),
        peerQuery.data?.uptime
      ),
    [peerQuery.data?.uptime]
  );

  const localtime = useMemo(
    () =>
      whenDefined(
        (localtime) => (
          <TimeInterpolate time={localtime.getTime()}>
            {(time) => <span>{formatDate(new Date(time))}</span>}
          </TimeInterpolate>
        ),
        nodeQuery.data?.localTime
      ),
    [nodeQuery.data?.localTime]
  );

  const nodeInfo = useMemo(
    () => ({
      ID: whenDefined((id) => <ClickToCopy copied={id} />, nodeQuery.data?.id),
      Version: peerQuery.data?.version,
      Uptime: uptime,
      "Local time": localtime,
      "Average sent": whenDefined(formatBytes, peersQuery.data?.avgBpsOut),
      "Average received": whenDefined(formatBytes, peersQuery.data?.avgBpsIn),
      Baking: whenDefined(formatBool, nodeQuery.data?.inBakingCommittee),
    }),
    [
      localtime,
      nodeQuery.data?.id,
      nodeQuery.data?.inBakingCommittee,
      peerQuery.data?.version,
      peersQuery.data?.avgBpsIn,
      peersQuery.data?.avgBpsOut,
      uptime,
    ]
  );

  const bakerInfo = useMemo(
    () =>
      whenDefined(
        (accountBaker, bakerAccount) => {
          const pendingChangeInfo =
            whenDefined(
              (pending, consensus) => (
                <PendingChange
                  epochDuration={consensus.epochDuration}
                  genesisTime={consensus.genesisTime}
                  pending={pending}
                />
              ),
              accountBaker.pendingChange,
              consensusQuery.data
            ) ?? "None";

          return {
            "Baker ID": accountBaker.bakerId,
            Account: (
              <Account
                address={bakerAccount}
                onClick={() => accountInfo.showModal(bakerAccount)}
              />
            ),
            "Staked amount": formatAmount(accountBaker.stakedAmount),
            "Restake rewards": formatBool(accountBaker.restakeEarnings),
            "Pending change": pendingChangeInfo,
          };
        },
        bakerAccountQuery.data?.accountBaker,
        nodeBirkBaker?.bakerAccount
      ),
    [
      accountInfo,
      bakerAccountQuery.data?.accountBaker,
      consensusQuery.data,
      nodeBirkBaker?.bakerAccount,
    ]
  );

  type Peer = API.PeersInfo["peers"][number];
  type BannedPeer = API.PeersInfo["banned"][number];

  const peersColumns: Column<Peer>[] = useMemo(
    () => [
      {
        Header: "ID",
        width: 5,
        accessor: (peer) =>
          whenDefined((id) => <ClickToCopy copied={id} />, peer.id),
      },
      {
        Header: "Address",
        width: 4,
        accessor: (peer) =>
          peer.ip === "*" ? "Any" : `${peer.ip}:${peer.port}`,
      },
      {
        Header: "Latency",
        width: 2,
        accessor: (peer) => whenDefined((l) => l + "ms", peer.stats?.latency),
      },
      {
        Header: "Status",
        width: 2,
        accessor: (peer) => peer.status,
      },
      // Button for banning a node, should be used as soon as the banning has been fixed.
      /* {
        id: "ban",
        accessor: function Ban(peer) {
          return (
            <Popup
              trigger={
                <Button
                  icon="ban"
                  basic
                  color="red"
                  onClick={() => whenDefined((id) => API.banNode(id), peer.id)}
                />
              }
            >
              Ban node
            </Popup>
          );
        },
       },*/
    ],
    []
  );

  const bannedPeersColumns: Column<BannedPeer>[] = useMemo(
    () => [
      {
        Header: "ID",
        width: 8,
        accessor: (peer: BannedPeer) =>
          whenDefined((id) => <ClickToCopy copied={id} key={id} />, peer.id),
      },
      {
        Header: "Address",
        width: 8,
        accessor: (peer: BannedPeer) =>
          peer.ip === "*" ? "Any" : `${peer.ip}:${peer.port}`,
      },
      {
        id: "unban",
        accessor: function Unban(peer: BannedPeer) {
          return (
            <Popup
              trigger={
                <Button
                  icon="handshake outline"
                  basic
                  onClick={() =>
                    whenDefined((id) => API.unbanNode(id), peer.id)
                  }
                />
              }
            >
              Unban node
            </Popup>
          );
        },
      },
    ],
    []
  );

  const errors = useMemo(
    () =>
      uniq(
        queries.filter((q) => q.isError).map((query) => query.error?.message)
      ),
    [queries]
  );

  return (
    <Container className="page-content">
      <Header dividing textAlign="center" as="h1">
        Overview
      </Header>
      {isEmpty(errors) ? null : (
        <Message negative>
          <Message.Header>Failed polling node</Message.Header>
          {errors.map((msg) => (
            <p key={msg}>With error message: {msg}</p>
          ))}
        </Message>
      )}

      <Dimmer.Dimmable>
        <Grid stackable doubling>
          <Grid.Row>
            <Grid.Column computer={6} tablet={16}>
              <Header>
                Node
                <Header.Subheader>Node specific information</Header.Subheader>
              </Header>
              <KeyValueTable color="blue" keyValues={nodeInfo} />
              {whenDefined(
                (bakerInfo) => (
                  <>
                    <Header>
                      Baker
                      <Header.Subheader>
                        Baker specific information
                      </Header.Subheader>
                    </Header>
                    <KeyValueTable color="purple" keyValues={bakerInfo} />
                  </>
                ),
                bakerInfo
              )}
            </Grid.Column>
            <Grid.Column computer={10} tablet={16}>
              <Header>
                Peers
                <Label color="grey" size="mini" circular>
                  {peers.length}
                </Label>
                <Header.Subheader>Externally connected peers</Header.Subheader>
              </Header>
              <FixedTable
                itemHeight={55}
                bodyMaxHeight={610}
                color="red"
                columns={peersColumns}
                data={peers}
              />
              {isEmpty(banned) ? null : (
                <>
                  <Header>
                    Banned peers{" "}
                    <Label color="grey" size="mini" circular>
                      {banned.length}
                    </Label>
                  </Header>
                  <FixedTable
                    itemHeight={55}
                    bodyMaxHeight={500}
                    color="red"
                    columns={bannedPeersColumns}
                    data={banned}
                  />
                </>
              )}
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Dimmer
          active={queries.some((q) => q.isLoading && q.isSuccess)}
          inverted
        >
          <Loader size="massive" />
        </Dimmer>
      </Dimmer.Dimmable>
    </Container>
  );
}
