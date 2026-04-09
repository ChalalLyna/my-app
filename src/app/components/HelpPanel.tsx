"use client";
 
import { useState } from "react";
import { X, BookOpen, ChevronDown, ChevronRight, Lightbulb, HelpCircle } from "lucide-react";
 
export interface HelpSection {
  title: string;
  content: string;
  tip?: string;
}
 
interface HelpPanelProps {
  title: string;
  sections: HelpSection[];
}
 
// ─── Bouton flottant + panneau ────────────────────────────────────────────────
export default function HelpPanel({ title, sections }: HelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);
 
  return (
    <>
      {/* Panneau fixe à droite */}
      <div
        className={`fixed top-14 right-0 h-[calc(100vh-3.5rem)] bg-gray-950 border-l border-gray-800/60 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-white">{title}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={15} />
          </button>
        </div>
 
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {sections.map((section, i) => (
            <div
              key={i}
              className="bg-gray-900/60 border border-gray-800/50 rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => setOpenSection(openSection === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-200">{section.title}</span>
                </div>
                {openSection === i
                  ? <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
                  : <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                }
              </button>
 
              {/* Section body */}
              {openSection === i && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-gray-400 leading-relaxed">{section.content}</p>
                  {section.tip && (
                    <div className="flex gap-2 p-2.5 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                      <Lightbulb size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-300/80 leading-relaxed">{section.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
 
        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800/40 flex-shrink-0">
          <p className="text-[10px] text-gray-600 text-center">
            Guide pédagogique CyberLab
          </p>
        </div>
      </div>
 
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-8 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 font-semibold text-sm ${
          isOpen
            ? "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
        }`}
      >
        <HelpCircle size={17} />
        {isOpen ? "Fermer l'aide" : "Aide"}
      </button>
    </>
  );
}