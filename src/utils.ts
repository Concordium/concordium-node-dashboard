import { formatDuration, intervalToDuration } from "date-fns";
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
export function useDeviceScreen() {
  const width = useWindowWidth();
  return width < breakpoints.mobile
    ? "mobile"
    : width < breakpoints.tablet
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
