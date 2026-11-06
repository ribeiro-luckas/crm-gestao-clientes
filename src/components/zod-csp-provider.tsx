"use client";

import type { ReactNode } from "react";
import { z } from "zod";

// Avoid Zod's dynamic `new Function` capability probe under strict CSP.
z.config({ jitless: true });

export function ZodCspProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
