import { round } from "lodash";
import React, { useCallback } from "react";
import { Icon, Label, Popup } from "semantic-ui-react";

type AccountProps = {
  address: string;
};

/** Display an account address with click to copy */
export function Account(props: AccountProps) {
  const onCopy = useCallback(
    () => navigator.clipboard.writeText(props.address),
    [props.address]
  );
  return (
    <Popup
      size="small"
      trigger={
        <Label basic onClick={onCopy} as="a">
          <Icon name="user" />
          <span className="monospace">{props.address.slice(0, 8)}</span>
        </Label>
      }
    >
      <span className="monospace">{props.address}</span>
      <br />
      Click to copy
    </Popup>
  );
}

type PercentageProps = {
  fraction: number;
};

export function Percentage(props: PercentageProps) {
  return <>{round(props.fraction * 100, 6) + "%"}</>;
}
