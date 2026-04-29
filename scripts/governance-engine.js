const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const TARGET_FILE = ARGS[0];

if (!TARGET_FILE) {
    console.error("Usage: node governance-engine.js <workflow-file.json>");
    process.exit(1);
}

// Helper to find all workflows for similarity check
function getAllWorkflows(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.resolve(path.join(dir, file));
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllWorkflows(filePath));
        } else if (file.endsWith('.json') && filePath !== path.resolve(TARGET_FILE)) {
            results.push(filePath);
        }
    });
    return results;
}

// Simple Jaccard similarity for node types
function calculateSimilarity(w1, w2) {
    const types1 = new Set(w1.nodes.map(n => n.type));
    const types2 = new Set(w2.nodes.map(n => n.type));
    
    const intersection = new Set([...types1].filter(x => types2.has(x)));
    const union = new Set([...types1, ...types2]);
    
    return intersection.size / union.size;
}

try {
    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    const workflow = JSON.parse(content);
    const errors = [];

    // 1. Tagging (Literal Check)
    // We check for the ID or strict name presence in tags array
    const hasDevTag = workflow.tags && workflow.tags.some(t => t.id === 'Nbnc0KJVYlJeasQJ' || t.name === 'DEV');
    const hasArchivedTag = workflow.tags && workflow.tags.some(t => t.id === '4k9QbQQTpxNkOoJQ' || t.name === 'ARCHIVED');

    if (!hasDevTag && !hasArchivedTag) {
        errors.push("CRITICAL: Workflow must be literally tagged with DEV (Nbnc0KJVYlJeasQJ) or ARCHIVED (4k9QbQQTpxNkOoJQ). Name prefix is not enough.");
    }

    // 2. Archiving (Literal Check)
    if (hasArchivedTag && workflow.active !== false) {
        errors.push("CRITICAL: Archived workflows must be literally inactive (active: false).");
    }

    // 3. Workflow Naming
    if (workflow.name.match(/v\d+/i)) {
        errors.push("Naming: Version numbers banned from workflow name.");
    }
    const bannedWords = ['agent', 'orchestrator', 'super', 'hyper', 'mega', 'synapse', 'synthesized'];
    bannedWords.forEach(word => {
        if (workflow.name.toLowerCase().includes(word)) {
            errors.push(`Naming: Buzzword '${word}' is banned from workflow name.`);
        }
    });

    // 4. Node Rules
    workflow.nodes.forEach(node => {
        const isTrigger = node.type.includes('trigger') || node.type.includes('webhook');
        
        // Snake Case & Generic Trigger Names
        if (isTrigger) {
            const allowedTriggers = ['webhook_trigger', 'schedule_trigger', 'cron_trigger', 'poll_trigger'];
            if (!allowedTriggers.includes(node.name)) {
                 errors.push(`Node Naming: Trigger node '${node.name}' must be generic and snake_case (e.g., 'webhook_trigger').`);
            }
        } else {
            const isSnake = /^[a-z0-9_]+$/.test(node.name);
            if (!isSnake) {
                errors.push(`Node Naming: Node '${node.name}' must be snake_case (e.g., 'process_data').`);
            }
        }

        // Notes Check
        if (!node.notes || node.notes.trim().length === 0) {
            errors.push(`Compliance: Node '${node.name}' is missing notes.`);
        }
    });

    // 5. Webhook Structure
    workflow.nodes.forEach(node => {
        if (node.type.includes('webhook')) {
            const pathParam = node.parameters?.path;
            if (pathParam) {
                if (pathParam.includes('/')) {
                    errors.push(`Webhook: Path '${pathParam}' must be unnested (no slashes).`);
                }
                if (!/^[a-z0-9-]+$/.test(pathParam)) {
                    errors.push(`Webhook: Path '${pathParam}' must be kebab-case.`);
                }
            }
        }
    });

    // 5.5 Research Preaction (New Rule)
    // "Workflow changes must follow an external research preaction"
    if (!workflow.meta || !workflow.meta.research_proof) {
        // We allow missing proof ONLY if the workflow is ARCHIVED
        if (!hasArchivedTag) {
             errors.push("Process: Workflow missing 'meta.research_proof'. Changes must follow external research preaction.");
        }
    }

    // 6. Duplication Check
    // This assumes we are in the project root
    const allWorkflows = getAllWorkflows('workflows');
    for (const otherFile of allWorkflows) {
        try {
            const otherWf = JSON.parse(fs.readFileSync(otherFile, 'utf8'));
            const similarity = calculateSimilarity(workflow, otherWf);
            if (similarity > 0.95) { // Very strict threshold
                 // Check if it's not the same ID (re-saving same file)
                 // But we excluded TARGET_FILE in get function
                 errors.push(`Duplication: Workflow is too similar (${(similarity*100).toFixed(1)}%) to '${otherFile}'. Update existing flow instead.`);
            }
        } catch (e) {
            // Ignore parse errors in other files
        }
    }

    // Output
    if (errors.length > 0) {
        console.error("GOVERNANCE FAILURE:");
        errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
    } else {
        console.log("Governance Check: PASSED");
    }

} catch (err) {
    console.error("Governance Engine Error:", err.message);
    process.exit(1);
}
