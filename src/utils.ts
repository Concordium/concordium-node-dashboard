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
