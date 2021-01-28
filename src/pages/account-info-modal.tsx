import {
  ClickToCopy,
  FixedTable,
  KeyValueTable,
  Unbreakable,
  useSearchParams,
} from "../shared";
import * as API from "../api";
import { useQuery } from "react-query";
import {
  epochDate,
  formatAmount,
  formatBool,
  formatDate,
  whenDefined,
} from "../utils";
import React, { useCallback, useMemo } from "react";
import {
  Button,
  Grid,
  Header,
  Icon,
  Label,
  Modal,
  Table,
} from "semantic-ui-react";
import { capitalize, isEmpty } from "lodash";
import { Column } from "react-table";

const accountInfoSearch = "account-info";
const blockhashSearch = "blockhash";

/** Hook for displaying the account info modal, the reason for this being a hook
 * is to be able to share the modal view across accounts.
 * The hook is using the url search parameters as global state.
 *  */
export function useAccountInfoSearchQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const address = searchParams.get(accountInfoSearch) ?? undefined;
  const blockHash = searchParams.get(blockhashSearch) ?? undefined;
  const showing = address !== undefined;

  const showModal = (newAddress: string, newBlockHash?: string) => {
    setSearchParams(() => {
      const copy = new URLSearchParams(searchParams);
      copy.set(accountInfoSearch, newAddress);
      if (newBlockHash !== undefined) {
        copy.set(blockhashSearch, newBlockHash);
      }
      return copy;
    });
  };

  const hideModal = () => {
    setSearchParams(() => {
      const copy = new URLSearchParams(searchParams);
      copy.delete(accountInfoSearch);
      copy.delete(blockhashSearch);
      return copy;
    });
  };

  return { showing, address, blockHash, showModal, hideModal };
}

/** Account information modal which is shown based on the url search parameters
 *
 * Warning: Only one should be in the view tree as it depends on global state in
 * the form of url search parameters.
 */
export function AccountInfoModal() {
  const {
    showing,
    address,
    hideModal,
    blockHash: queryBlochHash,
  } = useAccountInfoSearchQuery();

  const consensusInfoQuery = useQuery(
    ["ConsensusInfo"],
    API.fetchConsensusInfo,
    { refetchInterval: queryBlochHash === undefined ? 2000 : false }
  );

  const blockHash = queryBlochHash ?? consensusInfoQuery.data?.bestBlock;

  const accountInfoQuery = useQuery(
    ["AccountInfo", blockHash, address],
    () => whenDefined(API.fetchAccountInfo, blockHash, address),
    { enabled: showing, keepPreviousData: showing }
  );

  const identityProvidersQuery = useQuery(
    ["IdentityProviders"],
    () => whenDefined(API.fetchIdentityProviders, blockHash),
    { enabled: showing, keepPreviousData: true, staleTime: Infinity }
  );

  // Lookup the identityProvider and if not found it clears the cache forcing an update
  const getIP = useCallback(
    (id: number) => {
      if (identityProvidersQuery.data === undefined) {
        return undefined;
      }
      const ip = identityProvidersQuery.data.get(id);
      if (ip === undefined) {
        identityProvidersQuery.remove();
      }
      return ip;
    },
    [identityProvidersQuery]
  );

  const scheduleColumns: Column<API.ScheduleItem>[] = useMemo(
    () => [
      {
        Header: "Released at",
        accessor(schedule) {
          return formatDate(schedule.timestamp);
        },
      },
      {
        Header: "Amount",
        accessor(schedule) {
          return formatAmount(schedule.amount);
        },
      },
      {
        Header: "Transactions",
        accessor(schedule) {
          return (
            <>
              {schedule.transactions.map((tx) => (
                <ClickToCopy key={tx} display={tx.slice(0, 8)} copied={tx} />
              ))}
            </>
          );
        },
      },
    ],
    []
  );

  const scheduleItems = useMemo(
    () => accountInfoQuery.data?.accountReleaseSchedule.schedule ?? [],
    [accountInfoQuery.data?.accountReleaseSchedule.schedule]
  );

  const contractInstances = accountInfoQuery.data?.accountInstances ?? [];

  const accountInfo = {
    Address: whenDefined(
      (a) => <ClickToCopy copied={a} display={a.slice(0, 12)} />,
      address
    ),
    Balance: whenDefined(formatAmount, accountInfoQuery.data?.accountAmount),
    "Contract instances": contractInstances.length,
    Scheduled: whenDefined(
      formatAmount,
      accountInfoQuery.data?.accountReleaseSchedule.total
    ),
  };

  const bakerInfo = whenDefined((accountBaker) => {
    const changeAtDate = whenDefined(
      (epoch, consensus) =>
        formatDate(
          epochDate(epoch, consensus.epochDuration, consensus.genesisTime)
        ),
      accountBaker.pendingChange?.epoch,
      consensusInfoQuery.data
    );

    const pendingChangeInfo =
      whenDefined(
        (pending) =>
          pending.change === "RemoveBaker" ? (
            <>
              Removing baker at <Unbreakable>{changeAtDate}</Unbreakable>
            </>
          ) : (
            <>
              Reducing stake to {formatAmount(pending.newStake)} at{" "}
              <Unbreakable>{changeAtDate}</Unbreakable>
            </>
          ),
        accountBaker?.pendingChange
      ) ?? "None";

    return {
      "Baker ID": accountInfoQuery.data?.accountBaker?.bakerId,
      "Staked amount": formatAmount(accountBaker.stakedAmount),
      "Restake rewards": formatBool(accountBaker?.restakeEarnings),
      "Pending change": pendingChangeInfo,
    };
  }, accountInfoQuery.data?.accountBaker);

  return (
    <Modal onClose={hideModal} open={showing}>
      <Header>
        <Icon name="user" />
        <Header.Content>Account information</Header.Content>
      </Header>
      <Modal.Content>
        <Grid doubling stackable>
          <Grid.Row>
            <Grid.Column width={10}>
              <Header>Account</Header>
              <KeyValueTable keyValues={accountInfo} />
            </Grid.Column>
            <Grid.Column width={6}>
              {bakerInfo === undefined ? null : (
                <>
                  <Header>Baker information</Header>
                  <KeyValueTable color="purple" keyValues={bakerInfo} />
                </>
              )}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header>
                Release schedule{" "}
                <Label color="grey" size="mini" circular>
                  {scheduleItems.length}
                </Label>
              </Header>
              {isEmpty(scheduleItems) ? (
                <span>None</span>
              ) : (
                <FixedTable
                  columns={scheduleColumns}
                  data={scheduleItems}
                  bodyMaxHeight={300}
                  itemHeight={50}
                  noMinWidth
                />
              )}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={16}>
              <Header>Credentials</Header>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Version</Table.HeaderCell>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Identity Provider ID</Table.HeaderCell>
                    <Table.HeaderCell>Created at</Table.HeaderCell>
                    <Table.HeaderCell>Valid to</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {accountInfoQuery.data?.accountCredentials.map((cred) => {
                    const ip = getIP(cred.value.contents.ipIdentity);

                    return (
                      <Table.Row key={cred.value.contents.regId}>
                        <Table.Cell>{cred.v}</Table.Cell>
                        <Table.Cell>{capitalize(cred.value.type)}</Table.Cell>
                        <Table.Cell>
                          {whenDefined(
                            (ip) => (
                              <a href={ip.ipDescription.url}>
                                <Icon name="external alternate" />
                                {ip.ipDescription.name}
                              </a>
                            ),
                            ip
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {formatDate(cred.value.contents.policy.createdAt, {
                            onlyYearMonth: true,
                          })}
                        </Table.Cell>
                        <Table.Cell>
                          {formatDate(cred.value.contents.policy.validTo, {
                            onlyYearMonth: true,
                          })}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={hideModal}>Close</Button>
      </Modal.Actions>
    </Modal>
  );
}
