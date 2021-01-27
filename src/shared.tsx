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
} from "./utils";
import { FixedSizeList } from "react-window";
import { useTable, TableOptions, useFlexLayout } from "react-table";

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
    { enabled: open, keepPreviousData: open }
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
                  (epoch, consensus) =>
                    formatDate(
                      epochDate(
                        epoch,
                        consensus.epochDuration,
                        consensus.genesisTime
                      )
                    ),
                  accountBaker.pendingChange?.epoch,
                  consensus
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
        <Button
          onClick={onCopy}
          basic
          icon="clipboard"
          content={
            <span className="monospace">{props.display ?? props.copied}</span>
          }
          compact
        />
      }
    >
      Copied: {props.copied}
    </Popup>
  );
}

/** A span of text which will not wrap around */
export function Unbreakable(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <div {...props} className={(props.className ?? "") + " unbreakable"} />
  );
}

type FixedTableProps<A extends Record<string, any>> = {
  columns: TableOptions<A>["columns"];
  data: TableOptions<A>["data"];
  itemHeight: number;
  bodyMaxHeight: number;
  color?: "red" | "purple";
};

/** Table where items are fixed height, which is used to ensure proper
 * performance for large tables. */
export function FixedTable<A extends Record<string, any>>(
  props: FixedTableProps<A>
) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    { columns: props.columns, data: props.data, defaultColumn: { width: 1 } },
    useFlexLayout
  );

  const showScrollbar = props.bodyMaxHeight < rows.length * props.itemHeight;

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div {...row.getRowProps({ style })} className="tr">
          {row.cells.map((cell) => (
            <div {...cell.getCellProps()} key={cell.column.id} className="td">
              {cell.render("Cell")}
            </div>
          ))}
        </div>
      );
    },
    [prepareRow, rows]
  );

  // Render the UI for your table
  return (
    <div className="table-wrapper">
      <div
        {...getTableProps()}
        className={
          "concordium table " +
          (props.color ?? "") +
          (showScrollbar ? " scrollbar" : "")
        }
      >
        <div className="thead">
          {headerGroups.map((headerGroup) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              key={headerGroup.id}
              className="tr"
            >
              {headerGroup.headers.map((column) => (
                <div
                  {...column.getHeaderProps()}
                  key={column.id}
                  className="th"
                >
                  {column.render("Header")}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div {...getTableBodyProps()} className="tbody">
          <FixedSizeList
            height={Math.min(
              props.bodyMaxHeight,
              rows.length * props.itemHeight
            )}
            itemCount={rows.length}
            itemSize={props.itemHeight}
            width="100%"
          >
            {RenderRow}
          </FixedSizeList>
        </div>
      </div>
    </div>
  );
}
