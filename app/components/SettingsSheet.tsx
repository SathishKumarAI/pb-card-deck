"use client";

import { Settings, GraduationCap } from "lucide-react";
import { GameConfig, GameType } from "@/lib/game";
import { Sheet } from "./HistoryPanel";

export default function SettingsSheet({
  config,
  open,
  onClose,
  onUpdate,
  onReset,
  onReplayIntro,
}: {
  config: GameConfig;
  open: boolean;
  onClose: () => void;
  onUpdate: (key: keyof GameConfig, value: boolean | number | string) => void;
  onReset: () => void;
  onReplayIntro?: () => void;
}) {
  if (!open) return null;

  return (
    <Sheet title="Settings" icon={<Settings size={18} />} onClose={onClose}>
        {/* Game type */}
        <SettingRow label="Game type">
          <div className="flex gap-1.5">
            {(["singles", "doubles", "mixed-doubles"] as GameType[]).map((t) => (
              <Chip key={t} active={config.gameType === t} onClick={() => onUpdate("gameType", t)}>
                {t === "singles" ? "Singles" : t === "doubles" ? "Doubles" : "Mixed"}
              </Chip>
            ))}
          </div>
        </SettingRow>

        {/* Points to win */}
        <SettingRow label="Points to win">
          <div className="flex gap-1.5">
            {[7, 11, 15, 21].map((n) => (
              <Chip key={n} active={config.pointsToWin === n} onClick={() => onUpdate("pointsToWin", n)}>
                {n}
              </Chip>
            ))}
          </div>
        </SettingRow>

        {/* Match length */}
        <SettingRow label="Match length">
          <div className="flex gap-1.5">
            {([[1, "Single"], [3, "Best of 3"], [5, "Best of 5"]] as [number, string][]).map(([n, label]) => (
              <Chip key={n} active={(config.bestOf ?? 3) === n} onClick={() => onUpdate("bestOf", n)}>
                {label}
              </Chip>
            ))}
          </div>
        </SettingRow>

        <Toggle label="Win by 2" value={config.winByTwo} onChange={(v) => onUpdate("winByTwo", v)} />
        <Toggle label="Side-out scoring" value={config.sideOutScoring} onChange={(v) => onUpdate("sideOutScoring", v)} />
        <Toggle label="Confirm before scoring" value={config.confirmScore} onChange={(v) => onUpdate("confirmScore", v)} />
        <Toggle label="Sound effects" value={config.soundEnabled} onChange={(v) => onUpdate("soundEnabled", v)} />
        <Toggle label="Announce score aloud" value={!!config.announceScore} onChange={(v) => onUpdate("announceScore", v)} />
        <Toggle label="Commentator voice (longer card text)" value={config.commentaryMode} onChange={(v) => onUpdate("commentaryMode", v)} />

        <div className="mt-6 pt-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          {onReplayIntro && (
            <button onClick={onReplayIntro} className="pressable w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              <GraduationCap size={16} /> Replay how-to-play
            </button>
          )}
          <button onClick={onReset} className="pressable w-full py-3 rounded-xl text-sm font-medium" style={{ background: "var(--bg-elevated)", color: "var(--red)" }}>
            Reset Score to 0 - 0
          </button>
        </div>
    </Sheet>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className="w-11 h-6 rounded-full transition-colors relative"
        style={{ background: value ? "var(--accent)" : "var(--bg-elevated)" }}
      >
        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="pressable px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? "var(--accent)" : "var(--bg-elevated)",
        color: active ? "#fff" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
