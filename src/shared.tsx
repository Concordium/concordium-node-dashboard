import { formatDistanceStrict } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Icon,
  Label,
  Popup,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import { FixedSizeList } from "react-window";
import { useTable, TableOptions, useFlexLayout } from "react-table";
import * as API from "./api";
import {
  epochDate,
  formatAmount,
  formatDate,
  useCurrentTime,
  useInterval,
} from "./utils";

type AccountProps = {
  address: string;
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
  const time = useCurrentTime(1000);
  return (
    <>
      {formatDistanceStrict(props.time, time, {
        addSuffix: true,
      })}
    </>
  );
}

type TimeInterpolateProps = {
  time: number;
  children: (time: number) => JSX.Element;
};

export function TimeInterpolate(props: TimeInterpolateProps) {
  const [updated, setUpdated] = useState(Date.now());
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const now = Date.now();
    setTime(now);
    setUpdated(now);
  }, [props.time]);
  useInterval(() => setTime(Date.now()), 1000);

  return props.children(props.time + time - updated);
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
      Copied: <span className="monospace">{props.copied}</span>
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
  noMinWidth?: boolean;
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
          (showScrollbar ? " scrollbar" : "") +
          (props.noMinWidth ?? false ? "" : " min-width")
        }
      >
        <div className="thead">
          {headerGroups.map((headerGroup) => (
            // eslint-disable-next-line react/jsx-key
            <div {...headerGroup.getHeaderGroupProps()} className="tr">
              {headerGroup.headers.map((column) => (
                // eslint-disable-next-line react/jsx-key
                <div {...column.getHeaderProps()} className="th">
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

type PendingChangeProps = {
  epochDuration: number;
  genesisTime: Date;
  pending: API.BakerChange;
};

/** Render a bakers pending change */
export function PendingChange(props: PendingChangeProps) {
  const changeAtDate = formatDate(
    epochDate(props.pending.epoch, props.epochDuration, props.genesisTime)
  );

  return props.pending.change === "RemoveBaker" ? (
    <>
      Removing baker at <Unbreakable>{changeAtDate}</Unbreakable>
    </>
  ) : (
    <>
      Reducing stake to {formatAmount(props.pending.newStake)} at{" "}
      <Unbreakable>{changeAtDate}</Unbreakable>
    </>
  );
}
