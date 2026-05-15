// Markdown renderer for diffWorkflows() output.

const { stableStringify } = require('./index.js');

function fmtValue(v) {
  if (v === undefined) return '_unset_';
  if (typeof v === 'string') return '`' + v + '`';
  return '`' + stableStringify(v) + '`';
}

function renderMarkdown(diff, { aLabel = 'a', bLabel = 'b' } = {}) {
  const lines = [];
  lines.push(`# Workflow diff (${aLabel} → ${bLabel})`);
  lines.push('');

  lines.push('### Nodes added');
  if (diff.nodesAdded.length === 0) {
    lines.push('_none_');
  } else {
    for (const n of diff.nodesAdded) {
      lines.push(`+ \`${n.id}\` ${n.name || ''} _(${n.type || 'unknown-type'})_`);
    }
  }
  lines.push('');

  lines.push('### Nodes removed');
  if (diff.nodesRemoved.length === 0) {
    lines.push('_none_');
  } else {
    for (const n of diff.nodesRemoved) {
      lines.push(`- \`${n.id}\` ${n.name || ''} _(${n.type || 'unknown-type'})_`);
    }
  }
  lines.push('');

  lines.push('### Nodes modified');
  if (diff.nodesModified.length === 0) {
    lines.push('_none_');
  } else {
    for (const m of diff.nodesModified) {
      lines.push(`* \`${m.id}\``);
      for (const fc of m.fieldChanges) {
        lines.push(`  - ${fc.field}: ${fmtValue(fc.before)} → ${fmtValue(fc.after)}`);
      }
      for (const pc of m.paramChanges) {
        lines.push(`  - parameters.${pc.key}: ${fmtValue(pc.before)} → ${fmtValue(pc.after)}`);
      }
    }
  }
  lines.push('');

  lines.push('### Connections delta');
  if (diff.connectionsAdded.length === 0 && diff.connectionsRemoved.length === 0) {
    lines.push('_none_');
  } else {
    for (const e of diff.connectionsAdded) lines.push(`+ ${e}`);
    for (const e of diff.connectionsRemoved) lines.push(`- ${e}`);
  }
  lines.push('');

  lines.push('### Env vars changed');
  const env = diff.envVarsChanged;
  if (env.added.length === 0 && env.removed.length === 0) {
    lines.push('_none_');
  } else {
    for (const v of env.added) lines.push(`+ \`${v}\``);
    for (const v of env.removed) lines.push(`- \`${v}\``);
  }
  lines.push('');

  return lines.join('\n');
}

module.exports = { renderMarkdown };
