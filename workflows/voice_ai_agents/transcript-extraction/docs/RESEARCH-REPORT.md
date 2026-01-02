# Research Report: Transcript Field Extractor

**Generated**: 2025-12-28
**Workflow**: Transcript Field Extractor - AI Agent
**Complexity**: MODERATE
**Research Quota**: 25 sources minimum

---

## Research Sources (31/25 minimum)

| # | Type | Source | Relevance |
|---|------|--------|-----------|
| 1 | Template | #2679 - AI-Powered YouTube Video Summarization | Webhook→Process→LLM→Respond pattern |
| 2 | Template | #3900 - YouTube Transcript + AI Metadata | Transcript extraction pattern |
| 3 | Template | #4368 - AI Real Estate Agent Voice + Transcription | ElevenLabs + AI processing |
| 4 | Template | #2846 - Voice RAG Chatbot ElevenLabs + OpenAI | ElevenLabs webhook integration |
| 5 | Template | #4641 - Summarize Calls & Notify Teams | Call transcript processing |
| 6 | Template | #3912 - RetellAI Phone Agent Lead Qualification | Voice agent qualification pattern |
| 7 | Template | #4887 - Podcast from YouTube Transcript | Transcript + GPT processing |
| 8 | Template | #5292 - YouTube Summarizer for Social Media | Gemini + transcript pattern |
| 9 | YouTube | "ElevenLabs Voice Agents Can Now Send SMS" | Voice agent webhooks |
| 10 | YouTube | "ElevenLabs Voice Agents Are So Easy to Build" | Agent configuration |
| 11 | YouTube | "FIRST EVER No Code ElevenLabs Voice Agent" | Basic setup |
| 12 | YouTube | "EASIEST way to build NO-CODE ElevenLabs Voice Agents" | n8n integration |
| 13 | YouTube | "Having an ACTUAL conversation with my data" | RAG + voice pattern |
| 14 | YouTube | "How To Connect ElevenLabs Conversational AI to Twilio" | API integration |
| 15 | YouTube | "How to get Structured Output using AI (EASY!)" | JSON structured output |
| 16 | YouTube | "How to Use OpenAI's New Structured Outputs" | Structured extraction |
| 17 | Discord | "structured output parser not returning data" | Parser troubleshooting |
| 18 | Discord | "structured output node attached to llm chain" | Schema injection |
| 19 | Discord | "Basic LLM Chain with JSON output format" | JSON mode config |
| 20 | Discord | "information extractor vs basic llm chain" | Tool selection |
| 21 | Discord | "AI agent node with structured output parser" | Agent output handling |
| 22 | Discord | "WhatsApp webhook creating 4 executions" | Webhook deduplication |
| 23 | Node Doc | HTTP Request node documentation | Full API reference |
| 24 | Node Doc | Code node documentation | JS patterns |
| 25 | Node Doc | Respond to Webhook essentials | Response configuration |
| 26 | Pattern | webhook-processing pattern | Architecture reference |
| 27 | API Doc | Gemini generateContent API | JSON responseMimeType |
| 28 | API Doc | ElevenLabs get_conversation | Transcript endpoint |
| 29 | API Doc | ElevenLabs get_agent | Agent config endpoint |
| 30 | Manifest | ElevenLabs integration manifest | MCP tools, credentials |
| 31 | Registry | workflows/registry.yaml | Existing patterns |

---

## Category Distribution

| Category | Count | Requirement |
|----------|-------|-------------|
| Templates | 8 | ✅ |
| YouTube | 8 | ✅ |
| Discord Q&A | 6 | ✅ |
| Node Documentation | 3 | ✅ |
| API Documentation | 3 | ✅ |
| Patterns/Registry | 3 | ✅ |
| **Total** | **31** | **≥25** |
| **Categories** | **6** | **≥4** |

---

## Key Findings

### 1. Pattern Match: Webhook Processing
The workflow matches the **webhook-processing** pattern:
```
Webhook → Validate → Fetch Data → Transform → LLM Process → Respond
```

### 2. Template Alignment Score (TAS): 8/10
Template #2679 (YouTube Summarization) provides excellent structure:
- Webhook trigger with responseNode mode
- External data fetch
- LLM processing with structured output
- Respond to Webhook return

### 3. Missing Integration Flags (MIF)
| Integration | Native Node | Solution |
|-------------|-------------|----------|
| ElevenLabs | ❌ No | HTTP Request + httpHeaderAuth |
| Gemini | ⚠️ Partial | HTTP Request (MCP bug workaround) |

### 4. Structured Output Pattern
From Discord research, the recommended approach for JSON extraction:
- Use `responseMimeType: "application/json"` in Gemini config
- Low temperature (0.1) for deterministic output
- Single-prompt bulk extraction (vs multi-step)

### 5. Error Handling Insights
From template analysis:
- Use `retryOnFail: true` with `maxTries: 3`
- Add `waitBetweenTries: 2000` for rate limits
- Implement JSON parse try/catch in Code node

---

## Architecture Recommendation

Based on research, the optimal architecture:

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Webhook   │────▶│ Fetch Conversation│────▶│ Fetch Agent      │
│  (trigger)  │     │   (ElevenLabs)    │     │   Config         │
└─────────────┘     └───────────────────┘     └──────────────────┘
                                                      │
                           ┌──────────────────────────┘
                           ▼
                    ┌──────────────────┐
                    │ Assemble Bulk    │
                    │ Prompt (Code)    │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  Call Gemini     │
                    │ (HTTP Request)   │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Parse Response   │
                    │ (Code + JSON)    │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Respond to       │
                    │ Webhook          │
                    └──────────────────┘
```

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Gemini API rate limits | LOW | Retry logic with backoff |
| ElevenLabs auth failure | LOW | Pre-validated credential |
| JSON parse failure | MEDIUM | Try/catch + raw fallback |
| Large transcript size | LOW | Token limit in prompt |

---

## Recommendation: PROCEED WITH BUILD

- **Decision**: Use existing deployed workflow as base
- **Workflow ID**: 5hvmE72qa4VYyPOK (already deployed)
- **Validation Required**: Expression syntax, JSON parsing
- **Testing**: Use conv_6201kdkh8nhaeah9sqteafydbjdc

---

*Research conducted following n8n-workflow-dev protocol v2.0*
