import { formatDistanceStrict } from "date-fns";
import { capitalize, isEmpty } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "react-query";
import {
  Button,
  Grid,
  Header,
  Icon,
  Label,
  Modal,
  Popup,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import * as API from "./api";
import {
  epochDate,
  formatAmount,
  formatBool,
  formatDate,
  whenDefined,
} from "~utils";

/** Hook for displaying the account info modal, the reason for this being a hook
 * is to be able to share the modal view across account labels */
export function useAccountInfoModal(consensus: API.ConsensusInfo | undefined) {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [blockHash, setBlockHash] = useState<string | undefined>(undefined);

  const open = address !== undefined && blockHash !== undefined;

  const onClose = () => setAddress(undefined);
  const onOpen = (blockHash: string, address: string) => {
    setAddress(address);
    setBlockHash(blockHash);
  };

  const accountInfoQuery = useQuery(
    ["AccountInfo", blockHash, address],
    () => whenDefined(API.fetchAccountInfo, blockHash, address),
    { enabled: open, keepPreviousData: true }
  );

  const identityProvidersQuery = useQuery(
    ["IdentityProviders"],
    () => whenDefined(API.fetchIdentityProviders, blockHash),
    { enabled: open, keepPreviousData: true, staleTime: Infinity }
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

  const modalView = (
    <Modal onClose={onClose} open={open}>
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
                  (epoch, consensus) => (
                    <TimeRelativeToNow
                      time={epochDate(
                        epoch,
                        consensus.epochDuration,
                        consensus.genesisTime
                      )}
                    />
                  ),
                  accountBaker.pendingChange?.epoch,
                  consensus
                );

                const pendingChangeInfo =
                  whenDefined(
                    (pending) =>
                      pending.change === "RemoveBaker" ? (
                        <>Removing baker {changeAtDate}</>
                      ) : (
                        <>
                          Reducing stake to {formatAmount(pending.newStake)}{" "}
                          {changeAtDate}
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
        <Button onClick={onClose}>Close</Button>
      </Modal.Actions>
    </Modal>
  );

  return [modalView, onOpen] as const;
}

type AccountProps = {
  blockHash?: string;
  address: string;
  consensus: API.ConsensusInfo;
  onClick?: () => void;
};

/** Display account label */
export function Account(props: AccountProps) {
  return (
    <Popup
      trigger={
        <Label basic as="a" onClick={props.onClick}>
          <Icon name="user" />
          <span className="monospace">{props.address.slice(0, 8)}</span>
        </Label>
      }
    >
      Look up account
    </Popup>
  );
}

export type TimeRelatedToNowDistance = {
  time: Date;
};

/** Display a human readable distance to or from the given time e.g. 5 seconds ago */
export function TimeRelativeToNow(props: TimeRelatedToNowDistance) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <>
      {formatDistanceStrict(props.time, now, {
        addSuffix: true,
      })}
    </>
  );
}

export type KeyValueTableProps = {
  tableProps?: StrictTableProps;
  color?: StrictTableProps["color"];
  keyValues: Record<string, React.ReactNode>;
};

export function KeyValueTable(props: KeyValueTableProps) {
  return (
    <Table unstackable definition color={props.color} {...props.tableProps}>
      <Table.Body>
        {Object.entries(props.keyValues).map(([key, value]) => (
          <Table.Row key={key}>
            <Table.Cell width={5}>{key}</Table.Cell>
            <Table.Cell>{value}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

type ClickToCopyProps = {
  display?: string;
  copied: string;
};
export function ClickToCopy(props: ClickToCopyProps) {
  const onCopy = useCallback(
    () => navigator.clipboard.writeText(props.copied ?? ""),
    [props.copied]
  );

  return (
    <Popup
      on="click"
      trigger={
        <Button icon onClick={onCopy} basic labelPosition="right" compact>
          <span className="monospace">{props.display ?? props.copied}</span>
          <Icon name="clipboard" />
        </Button>
      }
    >
      Copied: {props.copied}
    </Popup>
  );
}

export function CTable(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={(props.className ?? "") + " concordium table purple"}
    />
  );
}

export function CRow(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={(props.className ?? "") + " concordium row"} />
  );
}

export function CFlex(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={(props.className ?? "") + " concordium flex"} />
  );
}
