import { isEmpty, orderBy, round, uniq } from "lodash";
import React, { useMemo } from "react";
import { Column } from "react-table";
import {
  Container,
  Dimmer,
  Divider,
  Grid,
  Header,
  Label,
  Loader,
  Message,
} from "semantic-ui-react";
import {
  Account,
  FixedTable,
  KeyValueTable,
  TimeRelativeToNow,
} from "../shared";
import {
  formatDurationInMillis,
  formatPercentage,
  whenDefined,
  useEpochIndex,
} from "../utils";
import * as API from "../api";
import { useAccountInfoSearchQuery } from "./account-info-modal";
import { useQuery } from "react-query";

const msInADay = 1000 * 60 * 60 * 24;
const msInAWeek = msInADay * 7;
const msInAMonth = msInADay * 30;
const msInAYear = msInAMonth * 12;

export function ConsensusPage() {
  const accountInfo = useAccountInfoSearchQuery();

  const consensusQuery = useQuery<API.ConsensusInfo, Error>(
    ["ConsensusInfo"],
    API.fetchConsensusInfo,
    {
      refetchInterval: 4000,
      keepPreviousData: true,
      enabled: !accountInfo.showing,
    }
  );
  const nodeQuery = useQuery<API.NodeInfo, Error>(
    ["NodeInfo"],
    API.fetchNodeInfo,
    {
      refetchInterval: 4000,
      keepPreviousData: true,
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
    { enabled: consensusQuery.data?.bestBlock !== undefined }
  );

  const queries = useMemo(() => [consensusQuery, nodeQuery, birkQuery], [
    birkQuery,
    consensusQuery,
    nodeQuery,
  ]);

  const expectedBlocks = useMemo(
    () =>
      whenDefined(
        (electionDifficulty, slotDuration) => {
          const blocksPrMilliseconds = electionDifficulty / slotDuration;
          return {
            day: msInADay * blocksPrMilliseconds,
            week: msInAWeek * blocksPrMilliseconds,
            month: msInAMonth * blocksPrMilliseconds,
            year: msInAYear * blocksPrMilliseconds,
          };
        },
        birkQuery.data?.electionDifficulty,
        consensusQuery.data?.slotDuration
      ),
    [birkQuery.data?.electionDifficulty, consensusQuery.data?.slotDuration]
  );

  const bakers = birkQuery.data?.bakers ?? [];
  const sortedBakers = orderBy(bakers, (b) => b.bakerLotteryPower, "desc");

  const info = {
    "Last block received": whenDefined(
      (time) => <TimeRelativeToNow time={time} />,
      consensusQuery.data?.blockLastReceivedTime ?? undefined
    ),
    "Last finalization": whenDefined(
      (time) => <TimeRelativeToNow time={time} />,
      consensusQuery.data?.lastFinalizedTime ?? undefined
    ),
    "Finalization period average (EMA)": whenDefined(
      (period) => formatDurationInMillis(round(period) * 1000),
      consensusQuery.data?.finalizationPeriodEMA
    ),
    "Expected blocks": whenDefined(
      (day) => `${day} block/day`,
      expectedBlocks?.day
    ),
  };

  const columns: Column<API.BirkParametersBaker>[] = useMemo(
    () => [
      {
        Header: "Baker ID",
        accessor: (baker) =>
          baker.bakerId + (baker.bakerId === nodeBakerId ? "(This node)" : ""),
      },
      {
        Header: "Account",
        width: 2,
        accessor: function TableAccount(baker: API.BirkParametersBaker) {
          return (
            <Account
              address={baker.bakerAccount}
              onClick={() => accountInfo.showModal(baker.bakerAccount)}
            />
          );
        },
      },
      {
        Header: "Lottery Power",
        width: 2,
        accessor: (baker: API.BirkParametersBaker) =>
          formatPercentage(baker.bakerLotteryPower),
      },
      {
        Header: "Expected blocks",
        width: 2,
        accessor: (baker: API.BirkParametersBaker) => {
          return whenDefined((expectedBlocks) => {
            const bakerBlocks = Object.entries(expectedBlocks).map(
              ([unit, blocks]) =>
                [unit, round(baker.bakerLotteryPower * blocks)] as const
            );
            const [unit, blocks] =
              bakerBlocks.find(([, expected]) => expected >= 1) ??
              bakerBlocks[bakerBlocks.length - 1];
            return `${blocks} block/${unit}`;
          }, expectedBlocks);
        },
      },
    ],
    [accountInfo, expectedBlocks, nodeBakerId]
  );

  const errors = useMemo(
    () => uniq(queries.filter((q) => q.isError).map((q) => q.error?.message)),
    [queries]
  );

  return (
    <Container className="page-content">
      <Header textAlign="center" as="h1">
        Consensus
      </Header>
      <Divider />
      {isEmpty(errors) ? null : (
        <Message negative>
          <Message.Header>Failed polling node</Message.Header>
          {errors.map((msg) => (
            <p key={msg}>With error message: {msg}</p>
          ))}
        </Message>
      )}

      <Dimmer.Dimmable>
        <Grid doubling stackable>
          <Grid.Row reversed="computer">
            <Grid.Column computer={10} tablet={16}>
              <Header>
                Bakers
                <Label color="grey" size="mini" circular>
                  {sortedBakers.length}
                </Label>
                <Header.Subheader>
                  The bakers in the best block
                </Header.Subheader>
              </Header>
              <FixedTable
                itemHeight={55}
                bodyMaxHeight={500}
                color="purple"
                columns={columns}
                data={sortedBakers}
              />
            </Grid.Column>
            <Grid.Column computer={6} tablet={16}>
              <Header>
                Consensus
                <Header.Subheader>
                  Summary of the current to consensus
                </Header.Subheader>
              </Header>
              <KeyValueTable color="green" keyValues={info} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Dimmer
          active={queries.some((q) => q.isLoading && !q.isSuccess)}
          inverted
        >
          <Loader size="massive" />
        </Dimmer>
      </Dimmer.Dimmable>
    </Container>
  );
}
