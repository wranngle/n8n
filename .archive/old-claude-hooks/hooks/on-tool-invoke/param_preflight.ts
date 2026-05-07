#!/usr/bin/env bun
/**
 * HOOK: param_preflight.ts
 * EVENT: PreToolUse (all tool invocations)
 * PURPOSE: Pre-flight parameter validation against tool-schemas.json
 *
 * ENFORCEMENT: 🔴 BLOCKING for schema-registered tools
 * - Validates required params present
 * - Catches wrong param names (e.g. 'values' vs 'elements')
 * - Basic type checking (string vs array vs object)
 * - Unregistered tools pass through silently
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {output, readStdin, type ToolInvokeInput} from '../types';

const SCHEMA_FILE = path.join(process.env.HOME || '', '.claude', 'config', 'tool-schemas.json');

interface ParamDef {
  type: string;
  required?: boolean;
  items?: string;
}

interface ToolSchema {
  params: Record<string, ParamDef>;
  gotchas?: string[];
  example?: Record<string, unknown>;
  confused_with?: Record<string, string>;
}

interface SchemaConfig {
  tools: Record<string, ToolSchema>;
}

function loadSchemas(): SchemaConfig | null {
  try {
    if (fs.existsSync(SCHEMA_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

function checkType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    default: return true;
  }
}

async function main(): Promise<void> {
  const input = await readStdin<ToolInvokeInput>();
  const toolName = input.tool_name;
  const toolInput = (input.tool_input || {}) as Record<string, unknown>;

  if (!toolName) {
    output({continue: true});
    return;
  }

  const schemas = loadSchemas();
  if (!schemas) {
    output({continue: true});
    return;
  }

  const schema = schemas.tools[toolName];
  if (!schema) {
    output({continue: true});
    return;
  }

  const errors: string[] = [];
  const providedKeys = Object.keys(toolInput);
  const schemaKeys = Object.keys(schema.params);

  // Check required params
  for (const [paramName, paramDef] of Object.entries(schema.params)) {
    if (paramDef.required && !(paramName in toolInput)) {
      errors.push(`Missing required param '${paramName}' (${paramDef.type})`);
    }
  }

  // Check unknown params (likely wrong name)
  for (const key of providedKeys) {
    if (!(key in schema.params)) {
      const suggestions = schemaKeys.filter(sk =>
        sk.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(sk.toLowerCase())
      );
      const hint = suggestions.length > 0
        ? ` Did you mean '${suggestions[0]}'?`
        : ` Valid params: ${schemaKeys.join(', ')}`;
      errors.push(`Unknown param '${key}'.${hint}`);
    }
  }

  // Basic type checks
  for (const [paramName, paramDef] of Object.entries(schema.params)) {
    if (paramName in toolInput) {
      if (!checkType(toolInput[paramName], paramDef.type)) {
        errors.push(`Param '${paramName}' should be ${paramDef.type}, got ${typeof toolInput[paramName]}`);
      }
    }
  }

  if (errors.length > 0) {
    const gotchaStr = schema.gotchas?.length
      ? `\nGotchas: ${schema.gotchas.join('; ')}`
      : '';
    const exampleStr = schema.example
      ? `\nExample: ${JSON.stringify(schema.example)}`
      : '';
    const confusedStr = schema.confused_with
      ? `\nDid you mean? ${Object.entries(schema.confused_with).map(([t, d]) => `${t}: ${d}`).join('; ')}`
      : '';

    output({
      continue: false,
      reason: `PARAM PREFLIGHT FAILED for ${toolName}:\n${errors.join('\n')}${gotchaStr}${exampleStr}${confusedStr}`
    });
    return;
  }

  output({continue: true});
}

main();
