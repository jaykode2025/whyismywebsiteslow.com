import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Report } from "./types";

// Minimal JSON persistence to survive restarts.
// Stores reports in .data/reports.json as a simple map by id.

const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "reports.json");

type Stored = {
  status: "queued" | "running" | "done" | "failed";
  report?: Report;
  error?: string;
};

function ensureFile() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    if (!exists()) {
      writeFileSync(FILE_PATH, JSON.stringify({}), "utf-8");
    }
  } catch {
    // ignore init errors; caller will handle read/write failure paths
  }
}

function exists() {
  try {
    readFileSync(FILE_PATH, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function loadReports(): Map<string, Stored> {
  ensureFile();
  try {
    const raw = readFileSync(FILE_PATH, "utf-8");
    const json = JSON.parse(raw) as Record<string, Stored>;
    return new Map(Object.entries(json));
  } catch {
    return new Map();
  }
}

export function persistReports(map: Map<string, Stored>) {
  ensureFile();
  const obj = Object.fromEntries(map.entries());
  writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
}

