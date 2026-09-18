import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

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
  const directory = dirname(path);
  const temporaryPath = join(directory, `.config-${process.pid}-${randomUUID()}.tmp`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporaryPath, JSON.stringify(normalized, null, 2) + "\n", {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function ensureConfig(): Promise<ButlerConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const config = normalizeConfig(JSON.parse(raw));
    const canonical = JSON.stringify(config, null, 2) + "\n";
    if (raw !== canonical) await saveConfig(config);
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    const config = { ...defaultConfig, skillPaths: [...defaultConfig.skillPaths] };
    await saveConfig(config);
    return config;
  }
}
