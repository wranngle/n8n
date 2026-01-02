import json

f = open(r'C:\Users\user\.claude\projects\D--Things-Work-Wranngle-n8n-workflow-development\059ce185-567f-4c27-b20c-5fdcec7a0a48\tool-results\mcp-n8n-mcp-n8n_get_execution-1766988618510.txt')
d = json.load(f)
data = json.loads(d[0]['text'])

print('Top level keys:', list(data.keys()))
print('Status:', data.get('status'))
print('Finished:', data.get('finished'))
print('Mode:', data.get('mode'))
print()

# Check data structure
exec_data = data.get('data', {})
print('data keys:', list(exec_data.keys()))
print()

# Check resultData
result_data = exec_data.get('resultData', {})
print('resultData keys:', list(result_data.keys()))

# Check executionData
execution_data = exec_data.get('executionData', {})
print('executionData keys:', list(execution_data.keys()))

# Print first 2000 chars of the raw data structure
print()
print('Raw data (first 2000 chars):')
print(json.dumps(data, indent=2)[:2000])
