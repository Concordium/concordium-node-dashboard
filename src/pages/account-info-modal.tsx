import {
  ClickToCopy,
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
import React, { useCallback } from "react";
import { Button, Grid, Header, Icon, Modal, Table } from "semantic-ui-react";
import { capitalize, isEmpty } from "lodash";

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

  return (
    <Modal onClose={hideModal} open={showing}>
      <Header>
        <Icon name="user" />
        <Header.Content>
          Account information <ClickToCopy copied={address || ""} />
        </Header.Content>
      </Header>
      <Modal.Content>
        <Grid doubling stackable>
          <Grid.Row verticalAlign="middle">
            <Grid.Column width={8}>
              <Table unstackable definition>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell width={5}>Balance</Table.Cell>
                    <Table.Cell>
                      {whenDefined(
                        formatAmount,
                        accountInfoQuery.data?.accountAmount
                      )}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell width={5}>Scheduled</Table.Cell>
                    <Table.Cell>
                      {whenDefined(
                        formatAmount,
                        accountInfoQuery.data?.accountReleaseSchedule.total
                      )}
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Grid.Column>
            <Grid.Column width={8}>
              {whenDefined((accountBaker) => {
                const changeAtDate = whenDefined(
                  (epoch, consensus) =>
                    formatDate(
                      epochDate(
                        epoch,
                        consensus.epochDuration,
                        consensus.genesisTime
                      )
                    ),
                  accountBaker.pendingChange?.epoch,
                  consensusInfoQuery.data
                );

                const pendingChangeInfo =
                  whenDefined(
                    (pending) =>
                      pending.change === "RemoveBaker" ? (
                        <>
                          Removing baker at{" "}
                          <Unbreakable>{changeAtDate}</Unbreakable>
                        </>
                      ) : (
                        <>
                          Reducing stake to {formatAmount(pending.newStake)} at{" "}
                          <Unbreakable>{changeAtDate}</Unbreakable>
                        </>
                      ),
                    accountBaker?.pendingChange
                  ) ?? "None";

                const bakerInfo = {
                  "Baker ID": accountInfoQuery.data?.accountBaker?.bakerId,
                  "Staked amount": formatAmount(accountBaker.stakedAmount),
                  "Restake rewards": formatBool(accountBaker?.restakeEarnings),
                  "Pending change": pendingChangeInfo,
                };

                return (
                  <>
                    <Header>Baker information</Header>
                    <KeyValueTable color="purple" keyValues={bakerInfo} />
                  </>
                );
              }, accountInfoQuery.data?.accountBaker)}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column width={8}>
              <Header>Release schedule</Header>
              {whenDefined(
                (schedule) =>
                  isEmpty(schedule) ? (
                    <span>None</span>
                  ) : (
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell>Released at</Table.HeaderCell>
                          <Table.HeaderCell>Amount</Table.HeaderCell>
                          <Table.HeaderCell>Transactions</Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {schedule.map((item) => (
                          <Table.Row key={item.timestamp.getTime()}>
                            <Table.Cell>
                              {formatDate(item.timestamp)}
                            </Table.Cell>
                            <Table.Cell>{formatAmount(item.amount)}</Table.Cell>
                            <Table.Cell>
                              {item.transactions.map((tx) => (
                                <ClickToCopy
                                  key={tx}
                                  display={tx.slice(0, 8)}
                                  copied={tx}
                                />
                              ))}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  ),
                accountInfoQuery.data?.accountReleaseSchedule.schedule
              )}
            </Grid.Column>
            <Grid.Column width={8}>
              <Header>Contract instances</Header>
              {whenDefined(
                (instances) =>
                  isEmpty(instances) ? (
                    <span>None</span>
                  ) : (
                    instances.map((address) => {
                      const addressJSON = JSON.stringify(address);
                      return (
                        <ClickToCopy
                          key={addressJSON}
                          display={`<${address.index},${address.subindex}>`}
                          copied={addressJSON}
                        />
                      );
                    })
                  ),
                accountInfoQuery.data?.accountInstances
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
