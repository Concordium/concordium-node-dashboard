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

/**
 * Hook for getting the size category of the current screen size.
 * Is determined only on the window width.
 */
export function useDeviceScreen() {
  const width = useWindowWidth();
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "computer";
}
