import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type ButlerMode = "fast" | "developer" | "deep" | "review" | "debug" | "architecture" | "release" | "autonomous";

export interface ButlerConfig {
  version: 1;
  defaultMode: ButlerMode;
  projectMemory: boolean;
  autoDetect: boolean;
  skillPaths: string[];
}

const validModes: readonly ButlerMode[] = ["fast", "developer", "deep", "review", "debug", "architecture", "release", "autonomous"];

export const defaultConfig: ButlerConfig = {
  version: 1,
  defaultMode: "developer",
  projectMemory: true,
  autoDetect: true,
  skillPaths: []
};

export function getConfigPath(): string {
  return join(homedir(), ".codex-butler", "config.json");
}

export function isButlerMode(value: unknown): value is ButlerMode {
  return typeof value === "string" && (validModes as readonly string[]).includes(value);
}

export function normalizeConfig(value: unknown): ButlerConfig {
  if (!value || typeof value !== "object") return { ...defaultConfig, skillPaths: [] };
  const parsed = value as Partial<Record<keyof ButlerConfig, unknown>>;
  return {
    version: 1,
    defaultMode: isButlerMode(parsed.defaultMode) ? parsed.defaultMode : defaultConfig.defaultMode,
    projectMemory: typeof parsed.projectMemory === "boolean" ? parsed.projectMemory : defaultConfig.projectMemory,
    autoDetect: typeof parsed.autoDetect === "boolean" ? parsed.autoDetect : defaultConfig.autoDetect,
    skillPaths: Array.isArray(parsed.skillPaths)
      ? parsed.skillPaths.filter((path): path is string => typeof path === "string" && path.length > 0)
      : []
  };
}

export async function loadConfig(): Promise<ButlerConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...defaultConfig, skillPaths: [...defaultConfig.skillPaths] };
  }
}

export async function saveConfig(config: ButlerConfig): Promise<void> {
  const normalized = normalizeConfig(config);
  const path = getConfigPath();
  await mkdir(join(homedir(), ".codex-butler"), { recursive: true });
  await writeFile(path, JSON.stringify(normalized, null, 2) + "\n", "utf8");
}

export async function ensureConfig(): Promise<ButlerConfig> {
  const config = await loadConfig();
  try {
    await readFile(getConfigPath(), "utf8");
  } catch {
    await saveConfig(config);
  }
  return config;
}
