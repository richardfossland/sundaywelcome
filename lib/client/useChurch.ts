"use client";

// Session context for the admin: who am I, which churches am I in, which one
// is selected (persisted in localStorage so the choice sticks across visits).

import { useCallback, useEffect, useState } from "react";

import type { Role } from "@/lib/server/auth";

import { api } from "./api";

export type MeMembership = {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: Role;
};

export type Me = {
  userId: string;
  email: string | null;
  memberships: MeMembership[];
};

const SELECTED_KEY = "sundaywelcome:selectedChurch";

export function useChurch() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<Me>("/api/me");
      setMe(data);
      const stored = localStorage.getItem(SELECTED_KEY);
      const valid = data.memberships.find((m) => m.churchId === stored);
      const pick = valid?.churchId ?? data.memberships[0]?.churchId ?? null;
      setSelectedId(pick);
      if (pick) localStorage.setItem(SELECTED_KEY, pick);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const select = useCallback((churchId: string) => {
    setSelectedId(churchId);
    localStorage.setItem(SELECTED_KEY, churchId);
  }, []);

  const membership = me?.memberships.find((m) => m.churchId === selectedId) ?? null;

  return { me, loading, membership, select, refresh };
}
