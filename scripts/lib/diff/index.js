// Workflow diff core: pure functions, no I/O.
// Compares two n8n workflow JSON objects and returns a structured delta.

function indexNodesById(workflow) {
  const out = new Map();
  const nodes = Array.isArray(workflow && workflow.nodes) ? workflow.nodes : [];
  for (const node of nodes) {
    if (node && typeof node.id === 'string') out.set(node.id, node);
  }
  return out;
}

function indexNodesByName(workflow) {
  const out = new Map();
  const nodes = Array.isArray(workflow && workflow.nodes) ? workflow.nodes : [];
  for (const node of nodes) {
    if (node && typeof node.name === 'string') out.set(node.name, node);
  }
  return out;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function diffNodeParameters(a, b) {
  const aKeys = Object.keys((a && a.parameters) || {});
  const bKeys = Object.keys((b && b.parameters) || {});
  const all = Array.from(new Set([...aKeys, ...bKeys])).sort();
  const changed = [];
  for (const key of all) {
    const av = a && a.parameters ? a.parameters[key] : undefined;
    const bv = b && b.parameters ? b.parameters[key] : undefined;
    if (stableStringify(av) !== stableStringify(bv)) {
      changed.push({ key, before: av, after: bv });
    }
  }
  return changed;
}

function flattenConnections(workflow) {
  // n8n connections: { "<from-node-name>": { "<output-name>": [ [ { node, type, index } ] ] } }
  // Returns a Set of canonical strings "from -> to (output#branch#index)".
  const edges = new Set();
  const conns = (workflow && workflow.connections) || {};
  for (const fromName of Object.keys(conns)) {
    const outputs = conns[fromName] || {};
    for (const outputName of Object.keys(outputs)) {
      const branches = outputs[outputName] || [];
      for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
        const targets = branches[branchIdx] || [];
        for (const t of targets) {
          if (!t) continue;
          const key = `${fromName} -> ${t.node} (${outputName}#${branchIdx}#${t.index != null ? t.index : 0})`;
          edges.add(key);
        }
      }
    }
  }
  return edges;
}

function collectEnvVars(workflow) {
  // Scans parameter values for ${{ $env.NAME }} or $env.NAME references.
  const found = new Set();
  const re = /\$env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  function walk(value) {
    if (value === null) return;
    const t = typeof value;
    if (t === 'string') {
      let m;
      while ((m = re.exec(value)) !== null) found.add(m[1]);
      return;
    }
    if (t === 'object') {
      if (Array.isArray(value)) {
        for (const v of value) walk(v);
        return;
      }
      for (const k of Object.keys(value)) walk(value[k]);
    }
  }
  walk((workflow && workflow.nodes) || []);
  return found;
}

function diffWorkflows(a, b) {
  const aById = indexNodesById(a);
  const bById = indexNodesById(b);

  const addedIds = [];
  const removedIds = [];
  const commonIds = [];
  for (const id of bById.keys()) if (!aById.has(id)) addedIds.push(id);
  for (const id of aById.keys()) if (!bById.has(id)) removedIds.push(id);
  for (const id of aById.keys()) if (bById.has(id)) commonIds.push(id);
  addedIds.sort();
  removedIds.sort();
  commonIds.sort();

  const nodesAdded = addedIds.map((id) => bById.get(id));
  const nodesRemoved = removedIds.map((id) => aById.get(id));
  const nodesModified = [];
  for (const id of commonIds) {
    const an = aById.get(id);
    const bn = bById.get(id);
    if (stableStringify(an) === stableStringify(bn)) continue;
    const fieldChanges = [];
    for (const field of ['name', 'type', 'typeVersion', 'position']) {
      const av = an && an[field];
      const bv = bn && bn[field];
      if (stableStringify(av) !== stableStringify(bv)) {
        fieldChanges.push({ field, before: av, after: bv });
      }
    }
    const paramChanges = diffNodeParameters(an, bn);
    nodesModified.push({ id, before: an, after: bn, fieldChanges, paramChanges });
  }
  nodesModified.sort((x, y) => x.id.localeCompare(y.id));

  const aEdges = flattenConnections(a);
  const bEdges = flattenConnections(b);
  const connectionsAdded = [];
  const connectionsRemoved = [];
  for (const e of bEdges) if (!aEdges.has(e)) connectionsAdded.push(e);
  for (const e of aEdges) if (!bEdges.has(e)) connectionsRemoved.push(e);
  connectionsAdded.sort();
  connectionsRemoved.sort();

  const aEnv = collectEnvVars(a);
  const bEnv = collectEnvVars(b);
  const envAdded = [];
  const envRemoved = [];
  for (const v of bEnv) if (!aEnv.has(v)) envAdded.push(v);
  for (const v of aEnv) if (!bEnv.has(v)) envRemoved.push(v);
  envAdded.sort();
  envRemoved.sort();

  return {
    nodesAdded,
    nodesRemoved,
    nodesModified,
    connectionsAdded,
    connectionsRemoved,
    envVarsChanged: { added: envAdded, removed: envRemoved },
  };
}

module.exports = { diffWorkflows, stableStringify };
