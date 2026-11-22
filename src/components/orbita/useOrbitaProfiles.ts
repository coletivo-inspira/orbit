"use client";

import { useMemo } from "react";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { selectOrbitaProfiles, sharedTopics } from "@/lib/orbitaFilters";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Profiles matching the current intention chip, advanced filters and sort order. */
export function useOrbitaProfiles() {
  const { state } = useOrbit();
  const { orbitaFilter, orbitaFilters, orbitaSort } = state;
  const userTopics = state.user.topics;
  return useMemo(() => {
    const profiles = selectOrbitaProfiles(SIMULATED_PROFILES, {
      intention: orbitaFilter,
      filters: orbitaFilters,
      sort: orbitaSort,
      userTopics,
    });
    const affinity = new Map(profiles.map((p) => [p.id, sharedTopics(userTopics, p.topics).length]));
    return { profiles, affinity };
  }, [orbitaFilter, orbitaFilters, orbitaSort, userTopics]);
}
