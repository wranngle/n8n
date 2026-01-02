#!/usr/bin/env python3
"""Parse workflow list and identify governance issues"""
import json
import re
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Read the workflow list
with open(r'C:\Users\user\.claude\projects\D--Things-Work-Wranngle-n8n-workflow-development\059ce185-567f-4c27-b20c-5fdcec7a0a48\tool-results\mcp-n8n-mcp-n8n_list_workflows-1767044595761.txt') as f:
    data = json.load(f)

raw = json.loads(data[0]['text'])
workflows = raw['data']['workflows']

print(f"Total workflows: {len(workflows)}")
print("=" * 80)

# Governance analysis
issues = {
    'no_phase_tag': [],
    'has_alpha_or_higher': [],
    'duplicates': [],
    'nonsense_names': [],
    'inactive': [],
    'archived': []
}

seen_names = {}
phase_pattern = re.compile(r'^\[(DEV|ALPHA|BETA|GA|PROD|ARCHIVED)\]\s+')

for w in workflows:
    name = w.get('name', 'Unnamed')
    wid = w.get('id', 'unknown')
    active = w.get('active', False)
    is_archived = w.get('isArchived', False)

    # Check for phase tag
    match = phase_pattern.match(name)
    if not match:
        issues['no_phase_tag'].append((wid, name, active))
    else:
        phase = match.group(1)
        if phase in ['ALPHA', 'BETA', 'GA', 'PROD']:
            issues['has_alpha_or_higher'].append((wid, name, phase))

    # Check for duplicates (similar base names)
    base_name = phase_pattern.sub('', name).strip().lower()
    # Remove version suffixes for comparison
    base_name = re.sub(r'\s*v\d+(\.\d+)*\s*$', '', base_name)
    base_name = re.sub(r'\s*-\s*(bulletproof|test|copy|backup).*$', '', base_name, flags=re.I)

    if base_name in seen_names:
        issues['duplicates'].append((wid, name, seen_names[base_name]))
    else:
        seen_names[base_name] = (wid, name)

    # Check for nonsense/test names
    nonsense_patterns = ['test', 'copy of', 'untitled', 'my workflow', 'new workflow', 'backup', 'old']
    if any(x in name.lower() for x in nonsense_patterns):
        issues['nonsense_names'].append((wid, name, active))

    # Check inactive
    if not active:
        issues['inactive'].append((wid, name))

    # Check archived
    if is_archived:
        issues['archived'].append((wid, name))

# Print findings
print("\nWORKFLOW INVENTORY ANALYSIS")
print("=" * 80)

print(f"\n[X] NO PHASE TAG ({len(issues['no_phase_tag'])}):")
for wid, name, active in sorted(issues['no_phase_tag'], key=lambda x: x[1]):
    status = "[ACTIVE]" if active else "[inactive]"
    print(f"  {wid}: {name} {status}")

print(f"\n[!] HAS ALPHA/BETA/GA/PROD TAG - should be DEV only ({len(issues['has_alpha_or_higher'])}):")
for wid, name, phase in issues['has_alpha_or_higher']:
    print(f"  {wid}: {name}")

print(f"\n[~] POTENTIAL DUPLICATES ({len(issues['duplicates'])}):")
for wid, name, original in issues['duplicates']:
    print(f"  {wid}: {name}")
    print(f"    -> Similar to: {original[0]}: {original[1]}")

print(f"\n[?] NONSENSE/TEST NAMES ({len(issues['nonsense_names'])}):")
for wid, name, active in issues['nonsense_names']:
    status = "[ACTIVE]" if active else "[inactive]"
    print(f"  {wid}: {name} {status}")

print(f"\n[A] ALREADY ARCHIVED ({len(issues['archived'])}):")
for wid, name in issues['archived']:
    print(f"  {wid}: {name}")

print("\n" + "=" * 80)
print("SUMMARY:")
print(f"  Total workflows: {len(workflows)}")
print(f"  Active: {len([w for w in workflows if w.get('active')])}")
print(f"  Inactive: {len(issues['inactive'])}")
print(f"  Missing phase tag: {len(issues['no_phase_tag'])}")
print(f"  Wrong phase (not DEV): {len(issues['has_alpha_or_higher'])}")
print(f"  Potential duplicates: {len(issues['duplicates'])}")
print(f"  Nonsense names: {len(issues['nonsense_names'])}")
print(f"  Already archived: {len(issues['archived'])}")

# Output JSON for action planning
print("\n" + "=" * 80)
print("RECOMMENDED ACTIONS (JSON):")
actions = []
for wid, name, active in issues['no_phase_tag']:
    actions.append({"id": wid, "name": name, "action": "add_phase_tag", "new_name": f"[DEV] {name}"})
for wid, name, original in issues['duplicates']:
    actions.append({"id": wid, "name": name, "action": "archive_duplicate", "reason": f"duplicate of {original[1]}"})
for wid, name, active in issues['nonsense_names']:
    if not active:
        actions.append({"id": wid, "name": name, "action": "archive_nonsense"})
print(json.dumps(actions, indent=2))
