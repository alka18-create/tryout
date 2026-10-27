"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { SessionIdleTimer } from "@/components/auth/session-idle-timer";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SessionIdleTimer />
    </SessionProvider>
  );
}
