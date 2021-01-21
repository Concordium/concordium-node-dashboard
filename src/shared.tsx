import { formatDistanceStrict } from "date-fns";
import React, { useCallback, useEffect, useState } from "react";
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

type TimeRelatedToNowDistance = {
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
