import { Save, Upload, Layers } from "lucide-react";

/**
 * MenuBar
 * -------
 * Simple top bar for persistence actions.
 *
 * Props:
 * - onExport: () => void        // Export current PCB state to JSON
 * - onImport: () => void        // Import PCB state from JSON file
 * - onLoadDemo: () => void      // Load a predefined demo PCB layout
 */
export default function MenuBar({ onExport, onImport, onLoadDemo }) {
  return (
    <div className="absolute top-0 left-0 w-full bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 flex justify-between items-center border-b border-gray-800 z-20">
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-green-500 tracking-tight">
          PCB_CORE_v1.0
        </span>
        <span className="hidden md:inline text-xs text-gray-500">
          JSON Persistence
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <Save size={14} />
          <span>Export JSON</span>
        </button>
        <button
          onClick={onImport}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <Upload size={14} />
          <span>Import JSON</span>
        </button>
        <button
          onClick={onLoadDemo}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <Layers size={14} />
          <span>Load Demo</span>
        </button>
      </div>
    </div>
  );
}