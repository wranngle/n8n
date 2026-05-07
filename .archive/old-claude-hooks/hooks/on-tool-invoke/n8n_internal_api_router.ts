#!/usr/bin/env bun
/**
 * HOOK: n8n Internal API Router
 * LAYER: ADVISORY
 * PURPOSE: Detects n8n internal API operations (data table creation, workflow
 *          activation) and routes to utils/n8n-session.ts instead of raw probing.
 *
 * TRIGGERS ON:
 *   - Bash commands containing n8n REST endpoints or curl to n8n
 *   - Bash commands probing /rest/ endpoints on n8n
 *   - Write/Edit to files containing n8n internal API fetch calls
 *
 * ROOT CAUSE: Issue #15 — 30 minutes spent probing undocumented n8n endpoints
 *   that are now codified in config/n8n-internal-api.json and utils/n8n-session.ts
 */

const N8N_INTERNAL_PATTERNS = [
	/n8n\.wranngle\.com\/rest\//,
	/\/rest\/projects\/.+\/data-tables/,
	/\/rest\/workflows\/.+\/activate/,
	/\/rest\/workflows\/.+\/deactivate/,
	/\/rest\/login/,
	/n8n-auth=/,
	/emailOrLdapLoginId/,
];

const DATA_TABLE_PATTERNS = [
	/data.table/i,
	/create.*table/i,
	/n8n.*table.*creat/i,
	/dataTableId/,
];

const ACTIVATION_PATTERNS = [
	/workflow.*activ/i,
	/activ.*workflow/i,
	/versionId/,
];

function output(response: {continue: boolean; systemMessage?: string}) {
	process.stdout.write(JSON.stringify(response));
}

async function main() {
	try {
		let raw = '';
		for await (const chunk of Bun.stdin.stream()) {
			raw += new TextDecoder().decode(chunk);
		}
		const input = JSON.parse(raw);
		const toolName: string = input.tool_name || '';
		const toolInput: Record<string, unknown> = input.tool_input || {};

		const command = String(toolInput.command || '');
		const content = String(toolInput.content || toolInput.new_string || '');
		const combined = command + ' ' + content;

		// Only trigger on Bash, Write, or Edit
		if (!['Bash', 'Write', 'Edit'].includes(toolName)) {
			output({continue: true});
			return;
		}

		// Check for n8n internal API endpoint probing
		const hitsInternal = N8N_INTERNAL_PATTERNS.some(p => p.test(combined));
		if (hitsInternal) {
			output({
				continue: true,
				systemMessage: [
					'[n8n INTERNAL API ROUTER]',
					'Detected n8n internal REST API usage. Use the codified utility instead of raw requests:',
					'',
					'  import { login, listDataTables, createDataTable, activateWorkflow, deactivateWorkflow } from "~/.claude/utils/n8n-session.ts"',
					'',
					'  CLI: bun run ~/.claude/utils/n8n-session.ts tables|create-table|activate|deactivate',
					'',
					'  Config: ~/.claude/config/n8n-internal-api.json (endpoint docs + gotchas)',
					'',
					'Key gotchas:',
					'  - Internal endpoints use session cookie auth (n8n-auth), NOT API key',
					'  - Data Table node needs: resource:"row", dataTableId:{mode:"name",value:"..."}, returnAll:true',
					'  - Workflow activation requires CURRENT versionId (stale IDs silently fail)',
				].join('\n'),
			});
			return;
		}

		// Check for data table creation intent
		const hitsDataTable = DATA_TABLE_PATTERNS.some(p => p.test(combined));
		if (hitsDataTable && toolName === 'Bash') {
			output({
				continue: true,
				systemMessage: [
					'[n8n DATA TABLE ROUTER]',
					'For n8n Data Table operations, use:',
					'  bun run ~/.claude/utils/n8n-session.ts create-table <name> <col:type> ...',
					'  bun run ~/.claude/utils/n8n-session.ts tables',
					'',
					'Example: bun run ~/.claude/utils/n8n-session.ts create-table my-table phone:string count:number',
				].join('\n'),
			});
			return;
		}

		// Check for activation intent
		const hitsActivation = ACTIVATION_PATTERNS.some(p => p.test(combined));
		if (hitsActivation && toolName === 'Bash') {
			output({
				continue: true,
				systemMessage: [
					'[n8n ACTIVATION ROUTER]',
					'For workflow activation/deactivation, use:',
					'  bun run ~/.claude/utils/n8n-session.ts activate <workflowId>',
					'  bun run ~/.claude/utils/n8n-session.ts deactivate <workflowId>',
					'',
					'This auto-fetches the current versionId (stale IDs silently fail).',
				].join('\n'),
			});
			return;
		}

		output({continue: true});
	} catch {
		output({continue: true});
	}
}

main().catch(() => output({continue: true}));
