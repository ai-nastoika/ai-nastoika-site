import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Scrolls the window to the top on every route change.
 * Ensures recipe cards, place details, etc. always open from the top edge.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
