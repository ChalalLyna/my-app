"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Mission } from "@/app/data/missions";

interface MissionContextType {
  activeMission: Mission | null;
  enterMission:  (mission: Mission) => void;
  exitMission:   () => void;
}

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  return (
    <MissionContext.Provider value={{
      activeMission,
      enterMission: (m) => setActiveMission(m),
      exitMission:  () => setActiveMission(null),
    }}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionProvider");
  return ctx;
}
