"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { VenusCompanionCanvasStage } from "@/components/VenusCompanionCanvasStage";
import {
  type CompanionOverlaySession,
  type CompanionOverlaySettings,
  type CompanionTriggerEvent,
  DEFAULT_COMPANION_SESSION,
  DEFAULT_COMPANION_SETTINGS,
  isCompanionSessionActive,
  normalizeCompanionSession,
  normalizeCompanionSettings
} from "@/lib/venus-companions";

interface CompanionRemoteState {
  companions?: Partial<CompanionOverlaySettings>;
  cursor?: string;
  session?: Partial<CompanionOverlaySession>;
  triggers?: CompanionTriggerEvent[];
}

export default function VenusCompanionOverlayClient() {
  const [companions, setCompanions] = useState<CompanionOverlaySettings>(DEFAULT_COMPANION_SETTINGS);
  const [session, setSession] = useState<CompanionOverlaySession>(DEFAULT_COMPANION_SESSION);
  const [triggerEvents, setTriggerEvents] = useState<CompanionTriggerEvent[]>([]);
  const cursorRef = useRef<string | undefined>(undefined);
  const sessionActive = isCompanionSessionActive(session);

  useEffect(() => {
    let cancelled = false;

    async function refreshState() {
      try {
        const search = cursorRef.current ? `?cursor=${encodeURIComponent(cursorRef.current)}` : "";
        const response = await fetch(`/api/private-workspace/companions/state${search}`, {
          cache: "no-store",
          credentials: "include"
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as CompanionRemoteState;
        if (cancelled) {
          return;
        }

        setCompanions(normalizeCompanionSettings(payload.companions ?? DEFAULT_COMPANION_SETTINGS));
        setSession(normalizeCompanionSession(payload.session ?? DEFAULT_COMPANION_SESSION));
        const nextTriggers = Array.isArray(payload.triggers) ? payload.triggers : [];
        if (nextTriggers.length) {
          setTriggerEvents((current) => [...current, ...nextTriggers].slice(-40));
        }
        if (typeof payload.cursor === "string" && payload.cursor.trim()) {
          cursorRef.current = payload.cursor;
        }
      } catch {
        // Leave the current runtime state visible while polling retries.
      }
    }

    void refreshState();
    const intervalId = window.setInterval(() => {
      void refreshState();
    }, sessionActive ? 2_000 : 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionActive]);

  const activeCharacterIds = useMemo(
    () => (sessionActive ? session.enabledCharacterIds : []),
    [session.enabledCharacterIds, sessionActive]
  );

  return (
    <main
      style={{
        background: "transparent",
        height: "100vh",
        margin: 0,
        overflow: "hidden",
        width: "100vw"
      }}
    >
      {sessionActive ? (
        <VenusCompanionCanvasStage
          activeCharacterIds={activeCharacterIds}
          settings={companions}
          triggerEvents={triggerEvents}
        />
      ) : null}
    </main>
  );
}
