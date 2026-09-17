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

export async function loadConfig(): Promise<ButlerConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ButlerConfig>;
    return {
      ...defaultConfig,
      ...parsed,
      version: 1,
      skillPaths: Array.isArray(parsed.skillPaths) ? parsed.skillPaths.filter((p): p is string => typeof p === "string") : defaultConfig.skillPaths
    };
  } catch {
    return { ...defaultConfig, skillPaths: [...defaultConfig.skillPaths] };
  }
}

export async function saveConfig(config: ButlerConfig): Promise<void> {
  const path = getConfigPath();
  await mkdir(join(homedir(), ".codex-butler"), { recursive: true });
  await writeFile(path, JSON.stringify({ ...config, version: 1 }, null, 2) + "\n", "utf8");
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
