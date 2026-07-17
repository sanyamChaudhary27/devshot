import { z } from "zod";

export const MAX_UNIFIED_DIFF_CHARACTERS = 200_000;
export const MAX_UNIFIED_DIFF_LINES = 12_000;
export const MAX_UNIFIED_DIFF_FILES = 100;

export const unifiedDiffInputSchema = z.string().trim().min(1).max(MAX_UNIFIED_DIFF_CHARACTERS);

export type ChangedDiffFile = {
  path: string;
  additions: number;
  deletions: number;
  isMigrationPath: boolean;
};

export type UnifiedDiffSummary = {
  changedFiles: readonly ChangedDiffFile[];
  additions: number;
  deletions: number;
  migrationPaths: readonly string[];
};

type MutableChangedDiffFile = {
  path: string;
  additions: number;
  deletions: number;
};

const pathIsSafe = (path: string): boolean => {
  if (path.length === 0 || path.length > 320 || path.includes("\0") || path.startsWith("/")) {
    return false;
  }
  return !path.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
};

const pathFromGitHeader = (line: string): string | undefined => {
  const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
  if (match === null) {
    return undefined;
  }
  const destination = match[2];
  if (destination === undefined) {
    return undefined;
  }
  return pathIsSafe(destination) ? destination : undefined;
};

const pathFromUnifiedHeader = (line: string, prefix: "--- " | "+++ "): string | undefined => {
  const rawPath = line.slice(prefix.length).split("\t", 1)[0]?.trim();
  if (rawPath === undefined || rawPath === "/dev/null") {
    return rawPath;
  }
  const normalized = rawPath.startsWith("a/") || rawPath.startsWith("b/") ? rawPath.slice(2) : rawPath;
  return pathIsSafe(normalized) ? normalized : undefined;
};

const migrationPathPattern = /(?:^|\/)(?:prisma\/migrations?|migrations?|migrate|supabase\/migrations?)(?:\/|$)/i;

export const isMigrationPath = (path: string): boolean => migrationPathPattern.test(path);

const malformed = (detail: string): never => {
  throw new Error(`Invalid unified diff: ${detail}`);
};

/**
 * Parses a bounded, textual unified diff. Counts only lines inside hunk bodies;
 * metadata such as +++/--- headers never contributes to additions or deletions.
 */
export const parseUnifiedDiff = (input: unknown): UnifiedDiffSummary => {
  const parsedInput = unifiedDiffInputSchema.safeParse(input);
  const diff = parsedInput.success
    ? parsedInput.data
    : malformed("input must be a non-empty diff no larger than 200,000 characters");
  const lines = diff.replaceAll("\r\n", "\n").split("\n");
  if (lines.length > MAX_UNIFIED_DIFF_LINES) {
    malformed(`input exceeds ${MAX_UNIFIED_DIFF_LINES} lines`);
  }

  const files: MutableChangedDiffFile[] = [];
  let current: MutableChangedDiffFile | undefined;
  let currentUsesGitHeader = false;
  let inHunk = false;
  let pendingOldPath: string | undefined;

  const startFile = (path: string, usesGitHeader: boolean): void => {
    if (files.length >= MAX_UNIFIED_DIFF_FILES) {
      malformed(`input exceeds ${MAX_UNIFIED_DIFF_FILES} changed files`);
    }
    current = { path, additions: 0, deletions: 0 };
    files.push(current);
    currentUsesGitHeader = usesGitHeader;
    inHunk = false;
    pendingOldPath = undefined;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }
    if (line.length > 10_000) {
      malformed("input contains an overlong line");
    }

    if (line.startsWith("diff --git ")) {
      const path = pathFromGitHeader(line) ?? malformed("git file header has an unsupported or unsafe path");
      startFile(path, true);
      continue;
    }

    const startsPlainHeaderPair = line.startsWith("--- ") && lines[index + 1]?.startsWith("+++ ") === true;
    if ((!inHunk || startsPlainHeaderPair) && line.startsWith("--- ")) {
      const path = pathFromUnifiedHeader(line, "--- ") ?? malformed("old file header has an unsafe path");
      pendingOldPath = path;
      if (!currentUsesGitHeader) {
        current = undefined;
      }
      inHunk = false;
      continue;
    }

    if (!inHunk && line.startsWith("+++ ")) {
      const path = pathFromUnifiedHeader(line, "+++ ") ?? malformed("new file header has an unsafe path");
      if (current === undefined) {
        const effectivePath = path === "/dev/null" ? pendingOldPath : path;
        const namedPath = effectivePath !== undefined && effectivePath !== "/dev/null"
          ? effectivePath
          : malformed("file headers do not name a changed file");
        startFile(namedPath, false);
      }
      inHunk = false;
      pendingOldPath = undefined;
      continue;
    }

    if (line.startsWith("@@ ")) {
      if (current === undefined) {
        malformed("hunk appears before a file header");
      }
      inHunk = true;
      continue;
    }

    if (inHunk && current !== undefined) {
      if (line.startsWith("+")) {
        current.additions += 1;
      } else if (line.startsWith("-")) {
        current.deletions += 1;
      }
    }
  }

  if (files.length === 0) {
    malformed("no changed file headers were found");
  }

  const changedFiles = files.map((file) => ({ ...file, isMigrationPath: isMigrationPath(file.path) }));
  return {
    changedFiles,
    additions: changedFiles.reduce((total, file) => total + file.additions, 0),
    deletions: changedFiles.reduce((total, file) => total + file.deletions, 0),
    migrationPaths: changedFiles.filter((file) => file.isMigrationPath).map((file) => file.path)
  };
};
