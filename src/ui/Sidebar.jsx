/* eslint-disable */
import { useEffect, useState } from "react";
import { ChevronRight, Info, X } from "lucide-react";

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
  const hasDescription = selected && typeof selected.description === "string" && selected.description.trim().length > 0;
  const hasNet = selected && typeof selected.net === "string" && selected.net.trim().length > 0;
  const hasLayer = selected && typeof selected.layer === "string" && selected.layer.trim().length > 0;
  const hasComponentRef =
    selected &&
    (typeof selected.component === "string" || typeof selected.refdes === "string") &&
    String(selected.component ?? selected.refdes).trim().length > 0;
  const hasPin = selected && (typeof selected.pin === "number" || typeof selected.pin === "string") && String(selected.pin).trim().length > 0;
  const padType = selected?.pad_type ?? selected?.padType;
  const hasPadType = selected && typeof padType === "string" && padType.trim().length > 0;
  const hasTraceLength = selected && selected.type === "trace" && typeof selected.length_mm === "number" && Number.isFinite(selected.length_mm) && selected.length_mm > 0;

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex flex-col items-stretch">
      {/* Top inspector bar, sits visually with MenuBar */}
      <div className="pointer-events-auto mt-10 mx-4 rounded-md bg-black/80 backdrop-blur-md border border-gray-800 text-gray-200 font-mono shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ChevronRight
              size={16}
              className={`transition-transform ${isOpen ? "rotate-90 text-green-400" : "text-gray-500"}`}
            />
            <span className="text-xs font-semibold tracking-[0.2em] text-green-400 uppercase">
              Inspector
            </span>
            {selected && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-200">
                {selected.type === "pad" ? "Pad" : "Trace"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded bg-gray-900/70 hover:bg-gray-800 px-2 py-1 text-xs text-gray-300"
            aria-label={isOpen ? "Hide inspector" : "Show inspector"}
          >
            {isOpen ? <X size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Collapsible content */}
        <div
          className={`px-4 pb-3 pt-2 text-xs transition-[max-height,opacity] duration-200 ease-out overflow-hidden ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {!selected && (
            <div className="mt-4 flex flex-col items-center text-gray-500">
              <Info className="mb-2" size={20} />
              <span className="text-sm font-semibold">No Component Selected</span>
              <span className="mt-1 text-[11px] italic">
                Click a pad or trace to inspect properties
              </span>
            </div>
          )}

          {selected && (
            <div className="space-y-3">
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
                <div className="text-[11px] text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 mr-2">ID</span>
                    <span className="truncate max-w-36">{selected.id}</span>
                  </div>
                  {hasNet && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-2">Net</span>
                      <span className="text-green-400 truncate max-w-36">{selected.net}</span>
                    </div>
                  )}
                  {hasLayer && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-2">Layer</span>
                      <span className="text-gray-200 truncate max-w-36">{selected.layer}</span>
                    </div>
                  )}
                  {hasComponentRef && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-2">Component</span>
                      <span className="text-gray-200 truncate max-w-36">
                        {String(selected.component ?? selected.refdes)}
                      </span>
                    </div>
                  )}
                  {hasPin && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-2">Pin</span>
                      <span className="text-gray-200 truncate max-w-36">{String(selected.pin)}</span>
                    </div>
                  )}
                  {isPad && hasPadType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-2">Pad Type</span>
                      <span className="text-gray-200 truncate max-w-36">{padType}</span>
                    </div>
                  )}
                  {!isPad && hasTraceLength && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 mr-2">Length</span>
                      <span className="text-green-400">
                        {selected.length_mm.toFixed(2)} <span className="text-gray-500">mm</span>
                      </span>
                    </div>
                  )}
                  {hasDescription && (
                    <div className="flex flex-col mt-1">
                      <span className="text-gray-500 mr-2">Description</span>
                      <span className="text-gray-200 max-w-56 wrap-break-word whitespace-pre-wrap">
                        {selected.description}
                      </span>
                    </div>
                  )}
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
                        className="rounded bg-black/70 border border-gray-700 px-2 py-1 text-[11px] focus:outline-none focus:border-green-500"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}