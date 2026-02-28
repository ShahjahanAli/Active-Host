"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useDashboard } from "../dashboard-context";
import { inputCls } from "../shared";

/* ─── Types ──────────────────────────────────────────────────── */
type HostOption = { _id: string; name: string; address: string; agentStatus: string };

/* ─── Colours (matches the dashboard palette) ─────────────────── */
const THEME = {
  background:   "#0a0f1e",
  foreground:   "#c9d1d9",
  cursor:       "#6ee7b7",
  cursorAccent: "#0a0f1e",
  selectionBackground: "rgba(99,102,241,0.3)",
  black:   "#0d1117", brightBlack:   "#484f58",
  red:     "#ff7b72", brightRed:     "#ffa198",
  green:   "#3fb950", brightGreen:   "#56d364",
  yellow:  "#d29922", brightYellow:  "#e3b341",
  blue:    "#58a6ff", brightBlue:    "#79c0ff",
  magenta: "#bc8cff", brightMagenta: "#d2a8ff",
  cyan:    "#39c5cf", brightCyan:    "#56d4dd",
  white:   "#b1bac4", brightWhite:   "#f0f6fc",
};

/* ─── Helper: write SSE-streamed output to xterm ─────────────── */
async function streamCommandOutput(
  commandId: string,
  xterm: Terminal,
  onDone: (status: string) => void,
) {
  const es = new EventSource(`/api/commands/${commandId}/stream`);

  es.addEventListener("output", (e) => {
    const chunk = JSON.parse(e.data) as string;
    // Normalise bare \n → \r\n so xterm renders line-breaks correctly
    xterm.write(chunk.replace(/\r?\n/g, "\r\n"));
  });

  es.addEventListener("done", (e) => {
    const status = JSON.parse(e.data) as string;
    es.close();
    onDone(status);
  });

  es.onerror = () => {
    es.close();
    onDone("error");
  };
}

/* ─── Main terminal component ────────────────────────────────── */
export function TerminalView() {
  const { hosts, selectedHostId, setSelectedHostId } = useDashboard();

  const containerRef  = useRef<HTMLDivElement>(null);
  const xtermRef      = useRef<Terminal | null>(null);
  const fitAddonRef   = useRef<FitAddon | null>(null);
  const inputLineRef  = useRef("");      // current line buffer
  const runningRef    = useRef(false);   // is a command executing?
  const promptHostRef = useRef("");      // hostname shown in prompt

  const [ready, setReady]   = useState(false);
  const [hostId, setHostId] = useState(selectedHostId ?? "");

  /* Sync hostId with global context */
  useEffect(() => { if (selectedHostId) setHostId(selectedHostId); }, [selectedHostId]);

  /* Build a prompt string */
  const makePrompt = useCallback((hid: string) => {
    const h = (hosts as HostOption[]).find((x) => x._id === hid);
    const label = h ? h.address : "remote";
    promptHostRef.current = label;
    return `\r\n\x1b[1;32mrsm\x1b[0m@\x1b[1;36m${label}\x1b[0m\x1b[1;33m:~$\x1b[0m `;
  }, [hosts]);

  /* Write prompt */
  const writePrompt = useCallback((term: Terminal, hid: string) => {
    term.write(makePrompt(hid));
  }, [makePrompt]);

  /* Execute a command via the existing API pipeline */
  const runCommand = useCallback(async (term: Terminal, cmd: string, hid: string) => {
    if (!hid) { term.write("\r\n\x1b[33mNo host selected.\x1b[0m"); writePrompt(term, hid); return; }
    if (!cmd.trim()) { writePrompt(term, hid); return; }

    runningRef.current = true;
    term.write("\r\n");

    try {
      /* 1. Queue the command */
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostId: hid, command: cmd }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        term.write(`\x1b[31mError: ${d.message ?? "Failed to queue command"}\x1b[0m\r\n`);
        writePrompt(term, hid);
        runningRef.current = false;
        return;
      }

      const { command: queued } = await res.json() as { command: { _id: string } };

      /* 2. Stream output via SSE */
      await new Promise<void>((resolve) => {
        streamCommandOutput(queued._id, term, (status) => {
          if (status === "failed" || status === "error") {
            term.write("\r\n\x1b[31m[exit: non-zero]\x1b[0m");
          }
          resolve();
        });
      });
    } catch (err) {
      term.write(`\x1b[31m${err instanceof Error ? err.message : "Unknown error"}\x1b[0m`);
    }

    writePrompt(term, hid);
    runningRef.current = false;
  }, [writePrompt]);

  /* Initialise xterm once (client-side only) */
  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;

    let term: Terminal;
    let fitAddon: FitAddon;
    let resizeObs: ResizeObserver;

    const init = async () => {
      const { Terminal }  = await import("@xterm/xterm");
      const { FitAddon }  = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      term = new Terminal({
        theme: THEME,
        fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: "block",
        allowProposedApi: true,
        scrollback: 5000,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current!);
      fitAddon.fit();

      xtermRef.current  = term;
      fitAddonRef.current = fitAddon;

      // Resize observer
      resizeObs = new ResizeObserver(() => fitAddon.fit());
      resizeObs.observe(containerRef.current!);

      /* Welcome banner */
      term.writeln("\x1b[1;35m╔══════════════════════════════════════════╗\x1b[0m");
      term.writeln("\x1b[1;35m║  Remote Server Manager — Terminal        ║\x1b[0m");
      term.writeln("\x1b[1;35m╚══════════════════════════════════════════╝\x1b[0m");
      term.writeln("\x1b[2mSelect a host above, then type any command.\x1b[0m");
      term.writeln("\x1b[2mType \x1b[0m\x1b[1mclear\x1b[0m\x1b[2m to clear the screen.\x1b[0m");

      const currentHid = hostId;
      writePrompt(term, currentHid);

      /* Keyboard input handler */
      term.onKey(({ key, domEvent }) => {
        const evt = domEvent as KeyboardEvent;

        if (runningRef.current) return; // block input while command runs

        /* Ctrl+C — cancel / clear line */
        if (evt.ctrlKey && evt.key === "c") {
          term.write("^C");
          inputLineRef.current = "";
          writePrompt(term, promptHostRef.current);
          return;
        }

        /* Ctrl+L — clear screen */
        if (evt.ctrlKey && evt.key === "l") {
          term.clear();
          writePrompt(term, promptHostRef.current);
          return;
        }

        switch (domEvent.key) {
          case "Enter": {
            const cmd = inputLineRef.current;
            inputLineRef.current = "";
            if (cmd.trim() === "clear") {
              term.clear();
              writePrompt(term, promptHostRef.current);
            } else {
              void runCommand(term, cmd, promptHostRef.current || hostId);
            }
            break;
          }

          case "Backspace": {
            if (inputLineRef.current.length > 0) {
              inputLineRef.current = inputLineRef.current.slice(0, -1);
              term.write("\b \b");
            }
            break;
          }

          /* Arrow keys – no history navigation yet; just swallow */
          case "ArrowUp":
          case "ArrowDown":
          case "ArrowLeft":
          case "ArrowRight":
            break;

          default: {
            // Only print printable characters
            if (!evt.ctrlKey && !evt.altKey && key.length === 1) {
              inputLineRef.current += key;
              term.write(key);
            }
          }
        }
      });

      setReady(true);
    };

    void init();

    return () => {
      resizeObs?.disconnect();
      term?.dispose();
      xtermRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* When the host selector changes, update the prompt host ref and re-prompt */
  const handleHostChange = (newHid: string) => {
    setHostId(newHid);
    setSelectedHostId(newHid);
    promptHostRef.current = "";   // will be rebuilt in makePrompt
    if (xtermRef.current && !runningRef.current) {
      xtermRef.current.write("\r\n");
      writePrompt(xtermRef.current, newHid);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 9rem)" }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="mb-1 block text-xs text-slate-500">Target host</label>
          <select
            value={hostId}
            onChange={(e) => handleHostChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a host…</option>
            {(hosts as HostOption[]).map((h) => (
              <option key={h._id} value={h._id}>
                {h.name} ({h.agentStatus === "online" ? "●" : "○"} {h.agentStatus}) — {h.address}
              </option>
            ))}
          </select>
        </div>

        {!ready && (
          <span className="text-xs text-slate-500 animate-pulse mt-5">Loading terminal…</span>
        )}

        {ready && (
          <div className="mt-5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Terminal ready</span>
          </div>
        )}
      </div>

      {/* xterm container */}
      <div
        className="flex-1 min-h-0 rounded-xl border border-slate-800 overflow-hidden"
        style={{ background: THEME.background }}
      >
        {/* The xterm CSS must be imported somewhere — we inject a link tag */}
        <XtermStyles />
        <div
          ref={containerRef}
          className="h-full w-full p-2"
          style={{ minHeight: 400 }}
        />
      </div>
    </div>
  );
}

/* Inject xterm.css via a <link> tag because Next.js can't import it in a
   client component without extra configuration.  We only do this once. */
let stylesInjected = false;
function XtermStyles() {
  useEffect(() => {
    if (stylesInjected) return;
    stylesInjected = true;
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.css";
    document.head.appendChild(link);
  }, []);
  return null;
}
