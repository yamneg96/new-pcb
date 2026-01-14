/* eslint-disable */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

/**
 * Sidebar (Property Inspector)
 * ----------------------------
 * CAD-style property inspector for selected components.
 *
 * Props:
 * - selected: {
 *     id: string,
 *     type: "pad" | "trace",
 *     position: [x, y, z],
 *     size?: [w, h],
 *     width?: number,
 *     area?: number
 *   } | null
 * - onUpdate: (update: { x?, z?, width?, height? }) => void
 */
export default function Sidebar({ selected, onUpdate }) {
  const [isOpen, setIsOpen] = useState(true);

  const [xValue, setXValue] = useState("");
  const [zValue, setZValue] = useState("");
  const [wValue, setWValue] = useState("");
  const [hValue, setHValue] = useState("");

  // Sync local form state when selection changes
  useEffect(() => {
    if (!selected) {
      setXValue("");
      setZValue("");
      setWValue("");
      setHValue("");
      return;
    }

    const [x, , z] = selected.position || [0, 0, 0];
    const baseX = Number.isFinite(x) ? x : 0;
    const baseZ = Number.isFinite(z) ? z : 0;

    const baseW =
      selected.type === "pad" && selected.size && Number.isFinite(selected.size[0])
        ? selected.size[0]
        : "";
    const baseH =
      selected.type === "pad" && selected.size && Number.isFinite(selected.size[1])
        ? selected.size[1]
        : "";

    const nextX = baseX === "" ? "" : baseX.toFixed(2);
    const nextZ = baseZ === "" ? "" : baseZ.toFixed(2);
    const nextW = baseW === "" ? "" : baseW.toFixed(2);
    const nextH = baseH === "" ? "" : baseH.toFixed(2);

    setXValue(nextX);
    setZValue(nextZ);
    setWValue(nextW);
    setHValue(nextH);
  }, [selected]);

  const handleNumberChange = (setter, field) => (e) => {
    const raw = e.target.value;
    setter(raw);
    if (!selected || !onUpdate) return;

    const value = parseFloat(raw);
    if (Number.isNaN(value)) return;

    if (field === "x") onUpdate({ x: value });
    if (field === "z") onUpdate({ z: value });
    if (field === "w") onUpdate({ width: value });
    if (field === "h") onUpdate({ height: value });
  };

  const area =
    selected && selected.type === "pad" && selected.size
      ? selected.size[0] * selected.size[1]
      : selected?.area ?? 0;

  const isPad = selected?.type === "pad";

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-30 flex items-stretch">
      {/* Collapse handle */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="pointer-events-auto relative mt-24 mr-1 flex h-10 w-6 items-center justify-center rounded-l-md bg-black/70 text-gray-300 hover:bg-black/90 border border-gray-700 border-r-0"
        aria-label={isOpen ? "Collapse inspector" : "Expand inspector"}
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Panel */}
      <div
        className={`pointer-events-auto h-full w-80 bg-black/75 backdrop-blur-md border-l border-gray-800 text-gray-200 font-mono transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-[0.2em] text-green-400 uppercase">
              Inspector
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {!selected && (
            <div className="mt-10 flex flex-col items-center text-gray-500">
              <Info className="mb-2" size={20} />
              <span className="text-sm font-semibold">No Component Selected</span>
              <span className="mt-1 text-[11px] italic">
                Click a pad or trace to inspect properties
              </span>
            </div>
          )}

          {selected && (
            <>
              {/* Metadata */}
              <div className="space-y-2 bg-white/5 rounded border border-gray-800 px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Metadata
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-200">
                    {selected.type === "pad" ? "Pad" : "Trace"}
                  </span>
                </div>
                <div className="text-[11px] text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500 mr-2">ID</span>
                    <span className="truncate max-w-36">{selected.id}</span>
                  </div>
                  {isPad && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 mr-2">Area</span>
                      <span className="text-green-400">
                        {area.toFixed(2)} <span className="text-gray-500">mm²</span>
                      </span>
                    </div>
                  )}
                  {!isPad && selected.width != null && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 mr-2">Width</span>
                      <span className="text-green-400">
                        {selected.width.toFixed(2)} <span className="text-gray-500">mm</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transform */}
              <div className="space-y-2 bg-white/5 rounded border border-gray-800 px-3 py-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Transform (World)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500">X</span>
                    <input
                      type="number"
                      step="0.01"
                      value={xValue}
                      onChange={handleNumberChange(setXValue, "x")}
                      className="rounded bg-black/70 border border-gray-700 px-2 py-1 text-[11px] focus:outline-none focus:border-green-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500">Z</span>
                    <input
                      type="number"
                      step="0.01"
                      value={zValue}
                      onChange={handleNumberChange(setZValue, "z")}
                      className="rounded bg-black/70 border border-gray-700 px-2 py-1 text-[11px] focus:outline-none focus:border-green-500"
                    />
                  </label>
                </div>
              </div>

              {/* Dimensions (pads only) */}
              {isPad && (
                <div className="space-y-2 bg-white/5 rounded border border-gray-800 px-3 py-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Dimensions
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500">Width</span>
                      <input
                        type="number"
                        step="0.01"
                        value={wValue}
                        onChange={handleNumberChange(setWValue, "w")}
                        className="rounded bg-black/70 border border-gray-700 px-2 py-1 text-[11px] focus:outline-none focus:border-green500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500">Height</span>
                      <input
                        type="number"
                        step="0.01"
                        value={hValue}
                        onChange={handleNumberChange(setHValue, "h")}
                        className="rounded bg-black/70 border border-gray-700 px-2 py-1 text-[11px] focus:outline-none focus:border-green-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}