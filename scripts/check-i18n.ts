import fs from "fs";
import path from "path";

const LOCALES = ["uz", "ru", "en"] as const;
const MESSAGES_DIR = path.join(process.cwd(), "src", "messages");
const FORBIDDEN_HARDCODED_BRAND = /transflow/i;

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function flattenLeafStrings(
  obj: JsonValue,
  prefix = ""
): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    out.set(prefix, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      const child = flattenLeafStrings(item, `${prefix}[${idx}]`);
      child.forEach((v, k) => out.set(k, v));
    });
    return out;
  }
  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      const child = flattenLeafStrings(value, nextKey);
      child.forEach((v, k) => out.set(k, v));
    }
  }
  return out;
}

/**
 * Extracts ICU argument variable names like `{brand}` or `{count, plural, ...}`.
 */
function extractPlaceholders(str: string): string[] {
  const names = new Set<string>();
  const simpleRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?:,|})/g;
  let match: RegExpExecArray | null;
  while ((match = simpleRegex.exec(str)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names).sort();
}

function main() {
  const loaded = new Map<string, Map<string, string>>();

  for (const locale of LOCALES) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`[i18n] Missing translation file: ${filePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as JsonValue;
    loaded.set(locale, flattenLeafStrings(parsed));
  }

  const baseKeys = Array.from(loaded.get("uz")!.keys()).sort();
  let errors = 0;

  for (const locale of LOCALES) {
    const map = loaded.get(locale)!;
    for (const key of baseKeys) {
      if (!map.has(key)) {
        console.error(`[i18n] Missing key in ${locale}.json: ${key}`);
        errors += 1;
      }
    }
    for (const key of map.keys()) {
      if (!loaded.get("uz")!.has(key)) {
        console.error(`[i18n] Extra key in ${locale}.json not in uz.json: ${key}`);
        errors += 1;
      }
    }
  }

  for (const key of baseKeys) {
    const baseVal = loaded.get("uz")!.get(key)!;
    const basePlaceholders = extractPlaceholders(baseVal).join(",");

    for (const locale of LOCALES) {
      const val = loaded.get(locale)!.get(key) ?? "";
      if (!val.trim()) {
        console.error(`[i18n] Empty translation in ${locale}.json at: ${key}`);
        errors += 1;
      }
      if (FORBIDDEN_HARDCODED_BRAND.test(val)) {
        console.error(
          `[i18n] Hardcoded brand name found in ${locale}.json at ${key}; use {brand} from siteConfig.`
        );
        errors += 1;
      }
      const placeholders = extractPlaceholders(val).join(",");
      if (placeholders !== basePlaceholders) {
        console.error(
          `[i18n] Placeholder mismatch at ${key}: uz=[${basePlaceholders}] vs ${locale}=[${placeholders}]`
        );
        errors += 1;
      }
    }
  }

  // Component scan for hardcoded text
  const componentErrors = checkHardcodedStringsInComponents(path.join(process.cwd(), "src"));
  errors += componentErrors;

  if (errors > 0) {
    console.error(`[i18n] Failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log(
    `[i18n] OK: ${baseKeys.length} keys verified across uz, ru, en. Components scanned cleanly.`
  );
}

function checkHardcodedStringsInComponents(srcDir: string): number {
  let errCount = 0;
  const ALLOWED_FILES = new Set([
    "language-switcher.tsx",
    "driver-profile-view.tsx",
    "problem-section.tsx",
  ]);

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        if (ALLOWED_FILES.has(entry.name)) continue;
        const content = fs.readFileSync(fullPath, "utf8");
        // Look for hardcoded Cyrillic words in component JSX (indicates untranslated Russian copy)
        const cyrillicMatch = content.match(/[\u0400-\u04FF]{4,}/g);
        if (cyrillicMatch) {
          console.error(
            `[i18n] Hardcoded Cyrillic text in component ${path.relative(process.cwd(), fullPath)}: ${cyrillicMatch.slice(0, 3).join(", ")}`
          );
          errCount += 1;
        }
      }
    }
  }

  walk(path.join(srcDir, "components"));
  return errCount;
}

main();
