import { parse as parseYaml } from "yaml"

export type PreprocessFormat = "json" | "yaml"

export interface PreprocessNote {
  code:
    | "STRIPPED_FENCES"
    | "STRIPPED_COMMENTS"
    | "YAML_DETECTED"
  message: string
  severity: "info" | "warning"
}

export interface PreprocessResult {
  cleaned: string
  format: PreprocessFormat
  notes: PreprocessNote[]
  normalizedJson?: string
}

const FENCE_RE =
  /^[\s﻿]*```(?:json|jsonc|json5|yaml|yml)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/

export function stripCodeFences(raw: string): {
  output: string
  stripped: boolean
} {
  const trimmed = raw.replace(/^﻿/, "")
  const m = trimmed.match(FENCE_RE)
  if (m) {
    return { output: m[1], stripped: true }
  }
  return { output: raw, stripped: false }
}

export function stripJsonComments(raw: string): {
  output: string
  stripped: boolean
} {
  let result = ""
  let i = 0
  let stripped = false
  const len = raw.length
  while (i < len) {
    const c = raw[i]
    if (c === '"') {
      let j = i + 1
      while (j < len) {
        if (raw[j] === "\\") {
          j += 2
          continue
        }
        if (raw[j] === '"') break
        j++
      }
      result += raw.slice(i, Math.min(j + 1, len))
      i = j + 1
      continue
    }
    if (c === "/" && raw[i + 1] === "/") {
      stripped = true
      i += 2
      while (i < len && raw[i] !== "\n") i++
      continue
    }
    if (c === "/" && raw[i + 1] === "*") {
      stripped = true
      i += 2
      while (i < len - 1 && !(raw[i] === "*" && raw[i + 1] === "/")) i++
      i += 2
      continue
    }
    result += c
    i++
  }
  return { output: result, stripped }
}

function looksLikeJson(s: string): boolean {
  const t = s.trimStart()
  return t.startsWith("{") || t.startsWith("[")
}

export function tryYaml(
  raw: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const data = parseYaml(raw, { strict: false })
    if (data === null || data === undefined) {
      return { ok: false, error: "YAML parsed to null" }
    }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function preprocess(raw: string): PreprocessResult {
  const notes: PreprocessNote[] = []

  const fenceStripped = stripCodeFences(raw)
  let cleaned = fenceStripped.output
  if (fenceStripped.stripped) {
    notes.push({
      code: "STRIPPED_FENCES",
      message: "Removed surrounding markdown code fences before parsing.",
      severity: "info",
    })
  }

  let parsedAsJson: unknown
  let jsonOk = false
  try {
    parsedAsJson = JSON.parse(cleaned)
    jsonOk = true
  } catch {}

  if (!jsonOk) {
    const commentStripped = stripJsonComments(cleaned)
    if (commentStripped.stripped) {
      try {
        parsedAsJson = JSON.parse(commentStripped.output)
        jsonOk = true
        cleaned = commentStripped.output
        notes.push({
          code: "STRIPPED_COMMENTS",
          message:
            "Stripped // and /* */ comments. JSON does not support comments — most hosts will reject this file as-is.",
          severity: "warning",
        })
      } catch {}
    }
  }

  if (jsonOk) {
    return {
      cleaned,
      format: "json",
      notes,
      normalizedJson:
        notes.length > 0 ? safeStringify(parsedAsJson) : undefined,
    }
  }

  if (!looksLikeJson(cleaned)) {
    const yamlAttempt = tryYaml(cleaned)
    if (yamlAttempt.ok) {
      const json = safeStringify(yamlAttempt.data)
      notes.push({
        code: "YAML_DETECTED",
        message:
          "Input parsed as YAML, not JSON. Validation ran on the converted JSON.",
        severity: "info",
      })
      return {
        cleaned: json,
        format: "yaml",
        notes,
        normalizedJson: json,
      }
    }
  }

  return { cleaned, format: "json", notes }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ""
  }
}
