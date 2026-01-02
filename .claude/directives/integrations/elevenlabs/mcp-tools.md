# ElevenLabs MCP Tools Reference

## Quick Reference

| Tool | Purpose | Cost? |
|------|---------|-------|
| `text_to_speech` | Convert text to audio | ⚠️ Yes |
| `speech_to_text` | Transcribe audio | ⚠️ Yes |
| `speech_to_speech` | Voice conversion | ⚠️ Yes |
| `text_to_sound_effects` | Generate SFX | ⚠️ Yes |
| `compose_music` | Generate music | ⚠️ Yes |
| `create_agent` | Create AI agent | ⚠️ Yes |
| `make_outbound_call` | Initiate phone call | ⚠️ Yes |
| `voice_clone` | Clone voice from audio | ⚠️ Yes |
| `list_agents` | List all agents | ✅ Free |
| `get_agent` | Get agent details | ✅ Free |
| `list_conversations` | List conversations | ✅ Free |
| `get_conversation` | Get transcript | ✅ Free |
| `search_voices` | Search voice library | ✅ Free |
| `list_models` | List TTS models | ✅ Free |
| `check_subscription` | Check quota | ✅ Free |
| `list_phone_numbers` | List phone numbers | ✅ Free |

---

## Text-to-Speech

### text_to_speech

Convert text to speech with voice selection.

```javascript
mcp__elevenlabs-mcp__text_to_speech({
  text: "Hello, this is a test.",
  voice_name: "Sarah",  // or voice_id
  model_id: "eleven_multilingual_v2",  // optional
  stability: 0.5,  // 0-1, higher = more consistent
  similarity_boost: 0.75,  // 0-1, higher = closer to original
  speed: 1.0,  // 0.7-1.2
  language: "en",
  output_directory: "C:/path/to/output"  // defaults to Desktop
})
```

**Models:**
- `eleven_v3` - Highest quality, 76 languages
- `eleven_multilingual_v2` - Recommended, 29 languages
- `eleven_flash_v2_5` - Fastest, 32 languages
- `eleven_turbo_v2_5` - Balanced, 32 languages

### list_models

```javascript
mcp__elevenlabs-mcp__list_models()
// Returns all available models with language support
```

### search_voices

Search your voice library:

```javascript
mcp__elevenlabs-mcp__search_voices({
  search: "Sarah",  // optional search term
  sort: "name",  // or "created_at_unix"
  sort_direction: "asc"  // or "desc"
})
```

### get_voice

```javascript
mcp__elevenlabs-mcp__get_voice({
  voice_id: "EXAVITQu4vr4xnSDxMaL"
})
```

### search_voice_library

Search the global ElevenLabs voice library:

```javascript
mcp__elevenlabs-mcp__search_voice_library({
  search: "professional narrator",
  page: 0,
  page_size: 10
})
```

---

## Speech-to-Text

### speech_to_text

Transcribe audio files with optional speaker diarization:

```javascript
mcp__elevenlabs-mcp__speech_to_text({
  input_file_path: "C:/path/to/audio.mp3",
  language_code: "eng",  // ISO 639-3, or auto-detect
  diarize: true,  // annotate speakers
  save_transcript_to_file: true,
  return_transcript_to_client_directly: false,
  output_directory: "C:/path/to/output"
})
```

---

## Audio Processing

### speech_to_speech

Transform voice in audio file:

```javascript
mcp__elevenlabs-mcp__speech_to_speech({
  input_file_path: "C:/path/to/input.mp3",
  voice_name: "Roger",
  output_directory: "C:/path/to/output"
})
```

### isolate_audio

Remove background noise:

```javascript
mcp__elevenlabs-mcp__isolate_audio({
  input_file_path: "C:/path/to/noisy.mp3",
  output_directory: "C:/path/to/output"
})
```

### text_to_sound_effects

Generate sound effects (0.5-5 seconds):

```javascript
mcp__elevenlabs-mcp__text_to_sound_effects({
  text: "Thunder rumbling in the distance",
  duration_seconds: 3,
  loop: false,
  output_directory: "C:/path/to/output"
})
```

### play_audio

```javascript
mcp__elevenlabs-mcp__play_audio({
  input_file_path: "C:/path/to/audio.mp3"
})
```

---

## Voice Cloning

### voice_clone

Clone voice from audio samples:

```javascript
mcp__elevenlabs-mcp__voice_clone({
  name: "My Custom Voice",
  files: [
    "C:/path/to/sample1.mp3",
    "C:/path/to/sample2.mp3"
  ],
  description: "Professional narrator voice"
})
```

### text_to_voice

Create voice from text description:

```javascript
mcp__elevenlabs-mcp__text_to_voice({
  voice_description: "A warm, friendly female voice with slight British accent",
  text: "Sample text to preview the voice",  // optional
  output_directory: "C:/path/to/output"
})
// Creates 3 preview variations
// Returns generated_voice_id for each
```

### create_voice_from_preview

Save a generated voice:

```javascript
mcp__elevenlabs-mcp__create_voice_from_preview({
  generated_voice_id: "Ya2J5uIa5Pq14DNPsbC1",  // from text_to_voice
  voice_name: "My Generated Voice",
  voice_description: "Warm British accent"
})
```

---

## Music Generation

### compose_music

Generate music from prompt or composition plan:

```javascript
// Simple prompt
mcp__elevenlabs-mcp__compose_music({
  prompt: "Upbeat electronic music with synth leads",
  music_length_ms: 30000,  // 30 seconds
  output_directory: "C:/path/to/output"
})

// With composition plan (from create_composition_plan)
mcp__elevenlabs-mcp__compose_music({
  composition_plan: {
    positive_global_styles: ["electronic", "upbeat"],
    negative_global_styles: ["sad", "slow"],
    sections: [
      {
        section_name: "intro",
        duration_ms: 10000,
        positive_local_styles: ["building"],
        negative_local_styles: [],
        lines: []
      }
    ]
  },
  output_directory: "C:/path/to/output"
})
```

### create_composition_plan

```javascript
mcp__elevenlabs-mcp__create_composition_plan({
  prompt: "A triumphant orchestral piece",
  music_length_ms: 60000  // optional, 10-300 seconds
})
```

---

## Conversational AI Agents

### create_agent

```javascript
mcp__elevenlabs-mcp__create_agent({
  name: "Customer Support Agent",
  first_message: "Hi, thanks for calling! How can I help you today?",
  system_prompt: "You are a helpful customer support agent...",
  voice_id: "EXAVITQu4vr4xnSDxMaL",  // optional, defaults to Jessica
  language: "en",
  llm: "gemini-2.0-flash-001",  // or gpt-4o, claude-3
  temperature: 0.5,
  max_tokens: null,
  stability: 0.5,
  similarity_boost: 0.8,
  turn_timeout: 7,  // seconds
  max_duration_seconds: 300,  // 5 minutes
  record_voice: true,
  retention_days: 730
})
```

### list_agents

```javascript
mcp__elevenlabs-mcp__list_agents()
// Returns all agents with IDs and names
```

### get_agent

```javascript
mcp__elevenlabs-mcp__get_agent({
  agent_id: "agent_5701kdgf9s4vfe9rhe68ntjrms9g"
})
```

### add_knowledge_base_to_agent

```javascript
// From URL
mcp__elevenlabs-mcp__add_knowledge_base_to_agent({
  agent_id: "agent_xyz",
  knowledge_base_name: "Product Documentation",
  url: "https://docs.example.com/products"
})

// From file (epub, pdf, docx, txt, html)
mcp__elevenlabs-mcp__add_knowledge_base_to_agent({
  agent_id: "agent_xyz",
  knowledge_base_name: "Company Handbook",
  input_file_path: "C:/path/to/handbook.pdf"
})

// From text
mcp__elevenlabs-mcp__add_knowledge_base_to_agent({
  agent_id: "agent_xyz",
  knowledge_base_name: "FAQ",
  text: "Q: What are your hours?\nA: We're open 9-5 Monday through Friday..."
})
```

---

## Conversations

### list_conversations

```javascript
mcp__elevenlabs-mcp__list_conversations({
  agent_id: "agent_xyz",  // optional filter
  page_size: 30,
  cursor: null,  // for pagination
  call_start_after_unix: 1703980800,  // optional
  call_start_before_unix: null,
  max_length: 10000
})
```

### get_conversation

```javascript
mcp__elevenlabs-mcp__get_conversation({
  conversation_id: "conv_abc123"
})
// Returns full transcript and metadata
```

---

## Telephony

### list_phone_numbers

```javascript
mcp__elevenlabs-mcp__list_phone_numbers()
// Returns all phone numbers in account
```

### make_outbound_call

```javascript
mcp__elevenlabs-mcp__make_outbound_call({
  agent_id: "agent_5701kdgf9s4vfe9rhe68ntjrms9g",
  agent_phone_number_id: "phnum_1901kdgev877fep99ex5fc5abb3m",
  to_number: "+15551234567"  // E.164 format
})
```

**Note:** For outbound calls with client data, use n8n HTTP Request node with `conversation_config_override`:

```json
{
  "agent_id": "agent_xyz",
  "to_number": "+15551234567",
  "from_number_id": "phnum_xyz",
  "conversation_config_override": {
    "agent": {
      "prompt": {
        "prompt": "You are calling {{name}} about their {{product}} inquiry..."
      }
    },
    "dynamic_variables": {
      "name": "John Smith",
      "product": "Premium Widget"
    }
  }
}
```

---

## Account

### check_subscription

```javascript
mcp__elevenlabs-mcp__check_subscription()
// Returns:
// - tier: "creator"
// - character_count: 37328
// - character_limit: 110000
// - voice_slots_used: 4
// - voice_limit: 30
// - status: "active"
```

---

## Rate Limits by Tier

| Tier | Concurrent | Requests/Min |
|------|-----------|--------------|
| Free | 1 | 10 |
| Starter | 2 | 30 |
| Creator | 5 | 100 |
| Pro | 10 | 200 |
| Scale | 20+ | 500+ |

---

## Error Handling

Common errors and resolutions:

| Code | Error | Solution |
|------|-------|----------|
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 429 | Rate Limit | Wait and retry |
| 422 | Validation | Check parameters |

See `docs/elevenlabs-twilio-failure-modes.md` for comprehensive error handling.
