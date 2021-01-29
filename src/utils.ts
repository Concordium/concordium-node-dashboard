import { addMilliseconds, formatDuration, intervalToDuration } from "date-fns";
import { round } from "lodash";
import { useState, useEffect } from "react";
import { Amount } from "./api";
import { useHistory, useLocation } from "react-router-dom";

/**
 * Hook for getting the current width of the window.
 */
export function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

const breakpoints = {
  mobile: 768,
  tablet: 1024,
};

/**
 * Hook for getting the size category of the current screen size.
 * Is determined only on the window width.
 */
export function useDeviceScreen(offset = 0) {
  const width = useWindowWidth();
  return width < breakpoints.mobile + offset
    ? "mobile"
    : width < breakpoints.tablet + offset
    ? "tablet"
    : "computer";
}

/** Calls function at a given rate */
export function useInterval(fn: () => void, rate: number, enable = true) {
  useEffect(() => {
    if (enable) {
      const interval = setInterval(fn, rate);
      return () => clearInterval(interval);
    }
  }, [enable, fn, rate]);
}

/** Hook for reading the current time, given a refresh rate. */
export function useCurrentDate(refreshRate: number) {
  const [date, setDate] = useState(new Date());
  useInterval(() => setDate(new Date()), refreshRate);
  return date;
}

/** Calls function every epoch with the current epochIndex */
export function useEveryEpoch(
  fn: (epochIndex: number) => void,
  epochDurationMillis?: number,
  genesisTime?: Date
) {
  const [nextEpoch, setNextEpoch] = useState<undefined | number>();
  useEffect(() => {
    if (epochDurationMillis === undefined || genesisTime === undefined) {
      return;
    }
    const now = new Date();
    const epochIndex = getEpochIndexAt(now, epochDurationMillis, genesisTime);
    const nextEpoch = epochDate(
      epochIndex + 1,
      epochDurationMillis,
      genesisTime
    );
    fn(epochIndex);
    setNextEpoch(nextEpoch.getTime());
  }, [epochDurationMillis, fn, genesisTime]);
  useEffect(() => {
    if (
      epochDurationMillis === undefined ||
      genesisTime === undefined ||
      nextEpoch === undefined
    ) {
      return;
    }
    const timeToNextEpoch = nextEpoch - Date.now();
    const timeout = setTimeout(() => {
      const epochIndex = getEpochIndexAt(
        new Date(),
        epochDurationMillis,
        genesisTime
      );
      const nextEpoch = epochDate(
        epochIndex + 1,
        epochDurationMillis,
        genesisTime
      );
      fn(epochIndex);
      setNextEpoch(nextEpoch.getTime());
    }, timeToNextEpoch);
    return () => clearTimeout(timeout);
  }, [epochDurationMillis, fn, genesisTime, nextEpoch]);
}

/** Hook for getting the current epoch index */
export function useEpochIndex(
  epochDurationMillis?: number,
  genesisTime?: Date
) {
  const now = new Date();
  const [epochIndex, setEpochIndex] = useState<undefined | number>(
    whenDefined(
      (epochDurationMillis, genesisTime) =>
        getEpochIndexAt(now, epochDurationMillis, genesisTime),
      epochDurationMillis,
      genesisTime
    )
  );
  useEveryEpoch(setEpochIndex, epochDurationMillis, genesisTime);
  return epochIndex;
}

/**
 * Hook for reading and manipulating the url search query parameters.
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

/** Recursively unwraps a type from a Promise or anything with a `then` method.
 * Ex. UnwrapPromiseRec<Promise<Promise<string>>> = string
 */
export type UnwrapPromiseRec<T> = T extends PromiseLike<infer U>
  ? UnwrapPromiseRec<U>
  : T;

/** Format a duration in milliseconds to a human readable string of years, month, weeks, days, hours, minutes and seconds  */
export function formatDurationInMillis(
  millis: number,
  { hideSeconds = false } = {}
) {
  return formatDuration(
    intervalToDuration({
      start: 0,
      end: millis,
    }),
    {
      format: [
        "years",
        "months",
        "weeks",
        "days",
        "hours",
        "minutes",
        ...(hideSeconds ? [] : ["seconds"]),
      ],
      delimiter: ", ",
    }
  );
}

/** Turn a float into a percentage string */
export function formatPercentage(fraction: number) {
  return round(fraction * 100, 6) + "%";
}

type formatDateOptions = {
  onlyYearMonth?: boolean;
};

/** Format a date into a string */
export function formatDate(date: Date, options: formatDateOptions = {}) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    ...(options.onlyYearMonth ?? false
      ? {}
      : {
          hour12: false,
          timeZoneName: "short",
          hour: "numeric",
          day: "numeric",
          minute: "numeric",
        }),
  });
}

/** Safe way to display integers as a decimal number */
function formatIntAsDecimal(n: number | BigInt, numberOfdecimals: number) {
  const str = n.toString().padStart(numberOfdecimals + 1, "0");
  const int = str.slice(0, -numberOfdecimals);
  const decimals = str.slice(-numberOfdecimals);
  return `${int}.${decimals}`;
}

/** Display number representing bytes as kB/s */
export function formatBytes(numberOfBytes: number) {
  return `${formatIntAsDecimal(numberOfBytes, 3)} kB/s`;
}

/** Display an amount of microGTU in GTU with unit */
export function formatAmount(amount: Amount) {
  return `${formatIntAsDecimal(amount, 6)} Ǥ`;
}

/** Display a boolean as Yes or No */
export function formatBool(bool: boolean) {
  return bool ? "Yes" : "No";
}

/** Run function on value if value is not undefined, otherwise return undefined.
 */
export function whenDefined<A1, A2, B>(
  fn: (a1: A1, a2: A2) => B,
  a1: A1 | undefined,
  a2: A2 | undefined
): B | undefined;
export function whenDefined<A, B>(
  fn: (a: A) => B,
  a: A | undefined
): B | undefined;
export function whenDefined<A extends any[], B>(
  fn: (...args: A) => B,
  ...args: A
): B | undefined {
  return args.some((a) => a === undefined) ? undefined : fn(...args);
}

/** Calculates the start date of an epoch index */
export function epochDate(
  epochIndex: number,
  epochDurationMillis: number,
  genesisTime: Date
): Date {
  return addMilliseconds(genesisTime, epochIndex * epochDurationMillis);
}

/** Calculates the epoch index from a given date */
export function getEpochIndexAt(
  epochAtDate: Date,
  epochDurationMillis: number,
  genesisTime: Date
) {
  const genesis = genesisTime.getTime();
  const now = epochAtDate.getTime();
  const millisSinceGenesis = now - genesis;
  return Math.floor(millisSinceGenesis / epochDurationMillis);
}

/** Takes an object of promises and awaits all the keys in the object */
export async function awaitObject<A extends Record<string, any>>(
  promises: A
): Promise<{ [K in keyof A]: UnwrapPromiseRec<A[K]> }> {
  const res: any = {};
  for (const [key, promise] of Object.entries(promises)) {
    res[key] = await promise;
  }
  return res;
}
