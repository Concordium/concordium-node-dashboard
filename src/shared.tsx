import { formatDistanceStrict } from "date-fns";
import { add, capitalize, isEmpty } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "react-query";
import {
  Button,
  Icon,
  Label,
  Popup,
  StrictTableProps,
  Table,
} from "semantic-ui-react";
import * as API from "./api";
import { FixedSizeList } from "react-window";
import { useTable, TableOptions, useFlexLayout } from "react-table";
import { useHistory, useLocation } from "react-router-dom";

/**
 * Hook for reading and manipulating the url search query parameters
 */
export function useSearchParams() {
  const location = useLocation();
  const history = useHistory();
  return [
    new URLSearchParams(location.search),
    (setter: () => URLSearchParams) => {
      const searchString = setter().toString();
      if (searchString !== location.search) {
        history.push({ search: searchString === "" ? "" : `?${searchString}` });
      }
    },
  ] as const;
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
