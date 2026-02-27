"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { btnSecondary, statusBadge, timeAgo } from "../shared";

/* ─── Types ─────────────────────────────────────────────────────── */
type PipelineRun = {
  _id: string;
  projectId: string;
  hostId: string;
  trigger: "manual" | "webhook";
  status: "pending" | "running" | "succeeded" | "failed";
  branch: string;
  commitSha?: string;
  commitMessage?: string;
  pushedBy?: string;
  startedAt?: string;
  completedAt?: string;
};

type Project = { _id: string; name: string };

/* ─── Helpers ────────────────────────────────────────────────────── */
function triggerBadge(trigger: "manual" | "webhook") {
  const cls = trigger === "webhook"
    ? "bg-purple-500/10 text-purple-400 ring-purple-500/20"
    : "bg-slate-500/10 text-slate-400 ring-slate-500/20";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cls}`}>
      {trigger}
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */
export function PipelineView() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(true);
  const [outputLoading, setOutputLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRuns = useCallback(async (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    const res = await fetch(`/api/pipeline-runs${qs}`);
    const data = await res.json();
    setRuns(data.runs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects ?? [])),
      loadRuns(),
    ]);
  }, [loadRuns]);

  useEffect(() => {
    void loadRuns(selectedProjectId || undefined);
  }, [selectedProjectId, loadRuns]);

  async function selectRun(run: PipelineRun) {
    setSelectedRun(run);
    setOutputLoading(true);
    const res = await fetch(`/api/pipeline-runs/${run._id}`);
    const data = await res.json();
    setOutput(data.output ?? "");
    setSelectedRun(data.run ?? run);
    setOutputLoading(false);
  }

  /* Auto-poll output while selected run is active */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedRun || (selectedRun.status !== "pending" && selectedRun.status !== "running")) return;

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/pipeline-runs/${selectedRun._id}`);
      const data = await res.json();
      setOutput(data.output ?? "");
      setSelectedRun(data.run ?? selectedRun);
      if (data.run?.status === "succeeded" || data.run?.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        void loadRuns(selectedProjectId || undefined);
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRun?._id, selectedRun?.status]); // eslint-disable-line

  const projectName = (id: string) => projects.find((p) => p._id === id)?.name ?? id.slice(-6);

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <button
          onClick={() => void loadRuns(selectedProjectId || undefined)}
          className={`${btnSecondary} text-xs`}
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Run list */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : runs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
              No pipeline runs yet.
            </div>
          ) : (
            runs.map((run) => (
              <button
                key={run._id}
                onClick={() => void selectRun(run)}
                className={`w-full text-left rounded-xl border p-4 transition space-y-1.5 ${
                  selectedRun?._id === run._id
                    ? "border-indigo-500/40 bg-indigo-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate">{projectName(run.projectId)}</span>
                  {statusBadge(run.status)}
                </div>
                <div className="flex items-center gap-2">
                  {triggerBadge(run.trigger)}
                  <span className="text-[10px] text-slate-500">{run.branch}</span>
                </div>
                {run.commitMessage && (
                  <p className="text-xs text-slate-500 truncate">{run.commitMessage}</p>
                )}
                <p className="text-[10px] text-slate-600">
                  {run.startedAt ? timeAgo(run.startedAt) : ""}
                  {run.pushedBy && ` · by ${run.pushedBy}`}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Output panel */}
        <div className="lg:col-span-3">
          {selectedRun ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 flex flex-col h-full min-h-[400px] max-h-[70vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{projectName(selectedRun.projectId)}</span>
                    {statusBadge(selectedRun.status)}
                    {triggerBadge(selectedRun.trigger)}
                  </div>
                  {selectedRun.commitSha && (
                    <p className="text-[10px] text-slate-500 font-mono">{selectedRun.commitSha.slice(0, 8)}{selectedRun.commitMessage ? ` — ${selectedRun.commitMessage}` : ""}</p>
                  )}
                </div>
                <div className="text-[10px] text-slate-600 text-right shrink-0">
                  {selectedRun.startedAt && <p>Started {timeAgo(selectedRun.startedAt)}</p>}
                  {selectedRun.completedAt && <p>Finished {timeAgo(selectedRun.completedAt)}</p>}
                </div>
              </div>

              {/* Log output */}
              <div className="flex-1 overflow-y-auto p-4">
                {outputLoading ? (
                  <p className="text-xs text-slate-500">Loading output…</p>
                ) : output ? (
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                    {output}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-600 italic">No output yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500 text-sm lg:h-full flex items-center justify-center">
              Select a pipeline run to view logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
