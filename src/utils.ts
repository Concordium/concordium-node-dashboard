import { formatDuration, intervalToDuration } from "date-fns";
import { round } from "lodash";
import { useState, useEffect } from "react";

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
export function useDeviceScreen(offset: number = 0) {
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

/** Format a date into a string */
export function formatDate(date: Date) {
  return date.toLocaleString(undefined, {
    timeZoneName: "short",
    year: "numeric",
    hour: "numeric",
    // second: "numeric",
    minute: "numeric",
    month: "short",
    day: "numeric",
    hour12: false,
  });
}

export function formatBytes(numberOfBytes: number) {
  const str = numberOfBytes.toString().padStart(4, "0");
  const int = str.slice(0, -3);
  const decimals = str.slice(-3);
  return `${int}.${decimals} kB/s`;
}
