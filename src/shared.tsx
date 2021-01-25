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
import { fetchAccountInfo } from "~api";
import { formatAmount, formatDate, whenDefined } from "~utils";

/** Hook for opening a modal containing account information on a given block.
 * The reason for this being a hook and not just a plain JSX element, is to be
 * able to reuse the modal view across multible account, resulting in improved
 * performance.
 */
export function useAccountModal() {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [blockHash, setBlockHash] = useState<string | undefined>(undefined);
  const open = address !== undefined && blockHash !== undefined;

  const query = useQuery(
    ["AccountInfo", blockHash, address],
    () =>
      address === undefined || blockHash === undefined
        ? undefined
        : fetchAccountInfo(blockHash, address),
    { enabled: open }
  );

  const onCopy = useCallback(
    () => navigator.clipboard.writeText(address ?? ""),
    [address]
  );

  const showModal = (blockHash: string, address: string) => {
    setBlockHash(blockHash);
    setAddress(address);
  };

  const modalView = (
    <Modal onClose={() => setAddress(undefined)} open={open}>
      <Header>
        <Icon name="user" />
        <Header.Content>
          Account information{" "}
          <Button icon onClick={onCopy} basic labelPosition="right" compact>
            <span className="monospace">{address?.slice(0, 8)}</span>
            <Icon name="clipboard" />
          </Button>
        </Header.Content>
      </Header>
      <Modal.Content>
        <Grid>
          <Grid.Row>
            <Grid.Column width={8}>
              <Table unstackable definition>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell width={5}>Balance</Table.Cell>
                    <Table.Cell>
                      {whenDefined(formatAmount, query.data?.accountAmount)}
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Grid.Column>
            <Grid.Column width={8}></Grid.Column>
          </Grid.Row>
        </Grid>
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
            {query.data?.accountCredentials.map((cred) => (
              <Table.Row key={cred.value.contents.regId}>
                <Table.Cell>{cred.v}</Table.Cell>
                <Table.Cell>{capitalize(cred.value.type)}</Table.Cell>
                <Table.Cell>{cred.value.contents.ipIdentity}</Table.Cell>
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
            ))}
          </Table.Body>
        </Table>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={() => setAddress(undefined)}>Close</Button>
      </Modal.Actions>
    </Modal>
  );

  return [modalView, showModal] as const;
}

type AccountProps = {
  address: string;
  onClick?: () => void;
};

/** Display an account address */
export function Account(props: AccountProps) {
  return (
    <Label basic onClick={props.onClick} as="a">
      <Icon name="user" />
      <span className="monospace">{props.address.slice(0, 8)}</span>
    </Label>
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
