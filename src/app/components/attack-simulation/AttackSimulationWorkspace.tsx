"use client";
 
import { useState } from "react";
import Sidebar from "@/app/components/layout/Sidebar";
import Topbar from "@/app/components/layout/Topbar";
import StepSelectAsset from "@/app/components/attack-simulation/StepSelectAsset";
import StepSelectAdversary from "@/app/components/attack-simulation/StepSelectAdversary";
import StepConfirmLaunch from "@/app/components/attack-simulation/StepConfirmLaunch";
import AssetDetailsPanel from "@/app/components/attack-simulation/AssetDetailsPanel";
import HelpPanel from "@/app/components/HelpPanel";
import { ATTACK_SIMULATION_HELP } from "@/app/config/helpContent";
import { useAuth } from "@/app/context/AuthContext";
import { Asset, Adversary } from "@/app/types/simulation";
import { Zap } from "lucide-react";
 
const STEPS = [
  { id: 1, label: "SELECT TARGET ASSET" },
  { id: 2, label: "SELECT ADVERSARY/TTP" },
  { id: 3, label: "CONFIRM & LAUNCH" },
];
 
export default function AttackSimulationWorkspace() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAdversary, setSelectedAdversary] = useState<Adversary | null>(null);
 
  const isApprenant = user?.role === "apprenant";
 
  const canProceed = () => {
    if (currentStep === 1) return selectedAsset !== null;
    if (currentStep === 2) return selectedAdversary !== null;
    return false;
  };
 
  const handleProceed = () => {
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };
 
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };
 
  const handleReset = () => {
    setSelectedAsset(null);
    setSelectedAdversary(null);
  };
 
  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Sidebar />
      <Topbar />
 
      {/* Main content area */}
      <div className="ml-60 pt-14 flex flex-col min-h-screen">
        <div className="flex flex-1">
 
          {/* Main workspace */}
          <div className="flex-1 p-8 flex flex-col">
            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Attack Simulation Workspace
              </h1>
            </div>
 
            {/* Step tabs */}
            <div className="flex gap-3 mb-6">
              {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isDisabled = step.id > currentStep;
 
                return (
                  <button
                    key={step.id}
                    onClick={() => !isDisabled && setCurrentStep(step.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 flex-1 ${
                      isActive
                        ? "bg-brand-light border-2 border-brand text-brand shadow-sm"
                        : isCompleted
                        ? "bg-gray-800/80 border-2 border-gray-700 text-gray-300 hover:border-gray-600"
                        : "bg-gray-800/40 border-2 border-gray-800 text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isActive
                          ? "bg-brand text-white"
                          : isCompleted
                          ? "bg-gray-600 text-white"
                          : "bg-gray-700 text-gray-500"
                      }`}
                    >
                      {step.id}
                    </span>
                    <span className="truncate">{step.label}</span>
                  </button>
                );
              })}
            </div>
 
            {/* Step content + asset details panel */}
            <div className="flex gap-5 flex-1">
              {/* Step panel */}
              <div className="flex-1 bg-gray-900 border border-gray-800/60 rounded-2xl p-6 flex flex-col">
                {currentStep === 1 && (
                  <StepSelectAsset
                    selectedAsset={selectedAsset}
                    onSelectAsset={setSelectedAsset}
                  />
                )}
                {currentStep === 2 && (
                  <StepSelectAdversary
                    selectedAdversary={selectedAdversary}
                    onSelectAdversary={setSelectedAdversary}
                  />
                )}
                {currentStep === 3 && (
                  <StepConfirmLaunch
                    asset={selectedAsset}
                    adversary={selectedAdversary}
                  />
                )}
 
                {/* Footer buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800/60">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    Reset Selection
                  </button>
                  <div className="flex items-center gap-3">
                    {currentStep > 1 && (
                      <button
                        onClick={handleBack}
                        className="px-5 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        ← Back
                      </button>
                    )}
                    {currentStep < 3 ? (
                      <button
                        onClick={handleProceed}
                        disabled={!canProceed()}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          canProceed()
                            ? "bg-brand text-white hover:bg-brand-dark shadow-lg shadow-brand/25 hover:shadow-brand/40"
                            : "bg-gray-800 text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        Proceed to Step {currentStep + 1}
                        <span className="text-xs">→</span>
                      </button>
                    ) : (
                      <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all">
                        <Zap size={14} />
                        Launch Simulation
                      </button>
                    )}
                  </div>
                </div>
              </div>
 
              {/* Asset details panel */}
              <AssetDetailsPanel asset={selectedAsset} />
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div className="ml-28 flex items-center justify-between px-8 py-3 border-t border-gray-800/40 text-[11px] text-gray-600">
          <span>© 2022 CyberLab Simulation Platform. All rights reserved.</span>
          <div className="flex gap-6">
            <button className="hover:text-gray-400 transition-colors">System Status</button>
            <button className="hover:text-gray-400 transition-colors">Documentation</button>
            <button className="hover:text-gray-400 transition-colors">Support</button>
          </div>
        </div>
      </div>
 
      {/* HelpPanel — uniquement pour les apprenants */}
      {isApprenant && (
        <HelpPanel
          title="Guide — Simulation d'attaque"
          sections={ATTACK_SIMULATION_HELP}
        />
      )}
    </div>
  );
}
 