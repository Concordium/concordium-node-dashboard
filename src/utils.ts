import { addMilliseconds, formatDuration, intervalToDuration } from "date-fns";
import { round } from "lodash";
import { useState, useEffect } from "react";
import { Amount } from "./api";

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

/** Recursively unwraps a type from a Promise or anything with a `then` method.
 * Ex. UnwrapPromiseRec<Promise<Promise<string>>> = string
 */
export type UnwrapPromiseRec<T> = T extends PromiseLike<infer U>
  ? UnwrapPromiseRec<U>
  : T;

/** Format a duration in milliseconds to a human readable string of years, month, weeks, days, hours, minutes and seconds  */
export function formatDurationInMillis(millis: number) {
  return formatDuration(
    intervalToDuration({
      start: 0,
      end: millis,
    }),
    {
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

export function formatBytes(numberOfBytes: number) {
  return `${formatIntAsDecimal(numberOfBytes, 3)} kB/s`;
}

export function formatAmount(amount: Amount) {
  return `${formatIntAsDecimal(amount, 6)} GTU`;
}

export function formatBool(bool: boolean) {
  return bool ? "Yes" : "No";
}

export function whenDefined<A, B>(fn: (a: A) => B, a: A | undefined) {
  return a === undefined ? undefined : fn(a);
}

export function whenNotNull<A, B>(fn: (a: A) => B, a: A | null) {
  return a === null ? null : fn(a);
}

export function epochDate(
  epochIndex: number,
  epochDurationMillis: number,
  genesisTime: Date
) {
  return addMilliseconds(genesisTime, epochIndex * epochDurationMillis);
}
