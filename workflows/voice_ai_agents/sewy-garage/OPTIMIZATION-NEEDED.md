# SEWY Agent Optimization Required

**Agent**: [DEV] Southeastern Wyoming Garage Doors - Sarah
**Agent ID**: agent_8801kdhbm6ane7wbxrq0vfenmsj9
**Test Date**: 2025-12-31
**Pass Rate**: 33.3% (10/30)

## Failed Tests (20)

Priority fixes needed:

### Critical Failures
1. **Emergency Response** - Not acknowledging urgency for crashed door
2. **Service Area** - Not clarifying SE Wyoming boundary for Denver caller
3. **Happy Path Flow** - SMS consent + tool execution sequence broken
4. **Diagnostic Questioning** - Not patient with confused callers

### Tool Execution Failures
5. Premature SMS confirmation (claiming sent before tool executes)
6. Phone number parsing issues
7. Data extraction incomplete

### Conversation Handling
8. Hostility + correction + topic switch handling
9. Privacy concerns not addressed
10. Escalation requests not handled professionally

## Passing Tests (10)
- Spring replacement complete flow ✓
- SMS retry/recovery ✓
- Price haggler professional response ✓
- After hours availability ✓
- Channel transition handling ✓
- Existing customer handling ✓
- Technical question + skepticism + timeline ✓
- Email preference handling ✓
- Single SMS send (no duplicates) ✓
- Responds appropriately ✓

## Recommended Prompt Changes

1. Add explicit emergency response protocol
2. Reinforce SE Wyoming service area boundaries
3. Strengthen SMS consent discipline
4. Add patience rules for confused callers
5. Improve phone number parsing instructions

## Full Results
See: sewy-test-results.json
