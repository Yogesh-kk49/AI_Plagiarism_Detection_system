import { useState, useEffect } from "react";

/**
 * Returns live viewport info so components can adapt their inline
 * `styles` objects at render time instead of relying on CSS media
 * queries (which inline style objects can't express).
 *
 * Usage:
 *   const { isMobile, isTablet, width } = useResponsive();
 *   const wrapperStyle = { ...styles.wrapper, ...(isMobile && styles.wrapperMobile) };
 */
export default function useResponsive() {
  const getState = () => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1280;
    return {
      width,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
    };
  };

  const [state, setState] = useState(getState);

  useEffect(() => {
    let frame = null;
    const handleResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setState(getState()));
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return state;
}