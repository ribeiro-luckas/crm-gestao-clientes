"use client";

import { useRef, type FocusEvent, type ReactNode } from "react";

type FocusVisibleScrollRegionProps = {
  className: string;
  children: ReactNode;
};

/** Keeps keyboard-focused descendants inside the visible horizontal scrollport. */
export function FocusVisibleScrollRegion({ className, children }: FocusVisibleScrollRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  function handleFocusCapture(event: FocusEvent<HTMLDivElement>) {
    const focused = event.target;
    if (!(focused instanceof HTMLElement) || !focused.matches(":focus-visible")) return;

    requestAnimationFrame(() => {
      const region = regionRef.current;
      if (!region || document.activeElement !== focused || !focused.isConnected) return;

      const regionRect = region.getBoundingClientRect();
      const focusedRect = focused.getBoundingClientRect();
      const regionLeft = regionRect.left + region.clientLeft;
      const regionRight = regionLeft + region.clientWidth;
      const focusStyle = getComputedStyle(focused);
      const outlineWidth = Number.parseFloat(focusStyle.outlineWidth) || 0;
      const outlineOffset = Number.parseFloat(focusStyle.outlineOffset) || 0;
      const outlineBleed = Math.max(0, outlineWidth + outlineOffset);

      if (focusedRect.left - outlineBleed < regionLeft) {
        region.scrollLeft += focusedRect.left - outlineBleed - regionLeft;
      } else if (focusedRect.right + outlineBleed > regionRight) {
        region.scrollLeft += focusedRect.right + outlineBleed - regionRight;
      }
    });
  }

  return <>
          <div ref={regionRef} className={className} onFocusCapture={handleFocusCapture}>
            {children}
          </div>
        </>
}
