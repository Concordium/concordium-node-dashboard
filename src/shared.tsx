import { formatDistanceStrict } from "date-fns";
import { capitalize } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "react-query";
import {
  Button,
  Grid,
  Header,
  Icon,
  Label,
  Modal,
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

type AccountProps = {
  blockHash?: string;
  address: string;
  consensus: API.ConsensusInfo;
};

/** Display account, when clicked shows the account info in modal */
export function Account(props: AccountProps) {
  const blockHash = props.blockHash ?? props.consensus.bestBlock;
  const [open, setOpen] = useState(false);

  const accountInfoQuery = useQuery(
    ["AccountInfo", blockHash, props.address],
    () => API.fetchAccountInfo(blockHash, props.address),
    { enabled: open, keepPreviousData: true }
  );

  const identityProvidersQuery = useQuery(
    ["IdentityProviders"],
    () => API.fetchIdentityProviders(blockHash),
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

  const onCopy = useCallback(
    () => navigator.clipboard.writeText(props.address ?? ""),
    [props.address]
  );

  return (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
      trigger={
        <Label basic as="a">
          <Icon name="user" />
          <span className="monospace">{props.address.slice(0, 8)}</span>
        </Label>
      }
    >
      <Header>
        <Icon name="user" />
        <Header.Content>
          Account information{" "}
          <Button icon onClick={onCopy} basic labelPosition="right" compact>
            <span className="monospace">{props.address?.slice(0, 8)}</span>
            <Icon name="clipboard" />
          </Button>
        </Header.Content>
      </Header>
      <Modal.Content>
        <Grid>
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
                </Table.Body>
              </Table>
            </Grid.Column>
            <Grid.Column width={8}>
              {whenDefined((accountBaker) => {
                const changeAtDate = whenDefined(
                  (epoch) => (
                    <TimeRelativeToNow
                      time={epochDate(
                        epoch,
                        props.consensus.epochDuration,
                        props.consensus.genesisTime
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
                          Reducing stake to {formatAmount(pending.newStake)} at{" "}
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
        </Grid>
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
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </Modal.Actions>
    </Modal>
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
