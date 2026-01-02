#!/usr/bin/env node
/**
 * Generate 100 Novel Challenging Tests for ElevenLabs Native Testing
 *
 * Categories:
 * - Consent Discipline (15): SMS permission, withdrawal, ambiguous
 * - Tool Execution (15): send_sms triggers, timing, confirmation
 * - Context Retention (12): Multi-turn memory, corrections, topic switches
 * - Error Recovery (12): Garbled input, interruptions, reconnection
 * - Hostile Callers (10): Angry, suspicious, adversarial, rushing
 * - Data Extraction (10): Full vs minimal field collection
 * - Phone Edge Cases (8): International, spelled-out, partial numbers
 * - Integration Tests (8): Client lookup, webhooks, orchestration
 * - Compound Stress (10): Multiple failure modes simultaneously
 *
 * Created: 2025-12-30
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// TEST GENERATORS BY CATEGORY
// =============================================================================

/**
 * Helper to format examples as required by ElevenLabs API
 * success_examples and failure_examples must be arrays of objects with {response, type}
 */
function formatExamples(examples, type) {
  return examples.map(ex => ({
    response: typeof ex === 'string' ? ex : ex.response,
    type: type, // 'success' or 'failure'
  }));
}

/**
 * Generate Consent Discipline tests (15)
 */
function generateConsentTests() {
  return [
    {
      name: 'SMS Consent - Explicit Yes',
      chat_history: [
        { role: 'user', message: "Hi, I'm interested in AI automation", time_in_call_secs: 0 },
        { role: 'agent', message: 'Great! Would you like me to send you a booking link via text?', time_in_call_secs: 5 },
        { role: 'user', message: 'Yes please, send it to me', time_in_call_secs: 10 },
      ],
      success_condition: "Agent calls send_sms tool after receiving explicit 'yes' consent",
      success_examples: [{ response: 'Agent says "I\'ll text you the link now" and calls send_sms', type: 'success' }],
      failure_examples: [{ response: 'Agent does not call send_sms despite explicit consent', type: 'failure' }],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Explicit No',
      chat_history: [
        { role: 'user', message: 'Hello, I want to learn about your services', time_in_call_secs: 0 },
        { role: 'agent', message: 'I can text you our booking link. Would you like that?', time_in_call_secs: 5 },
        { role: 'user', message: 'No thanks, just tell me verbally', time_in_call_secs: 10 },
      ],
      success_condition: "Agent does NOT call send_sms when user declines. Agent provides info verbally instead.",
      success_examples: ['Agent says "No problem! The link is cal.com/wranngle" without calling send_sms'],
      failure_examples: ['Agent calls send_sms after user said no'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Withdrawal Mid-Call',
      chat_history: [
        { role: 'user', message: 'Hi there', time_in_call_secs: 0 },
        { role: 'agent', message: 'Would you like me to text you a booking link?', time_in_call_secs: 5 },
        { role: 'user', message: 'Sure, text me', time_in_call_secs: 10 },
        { role: 'agent', message: "What's your phone number?", time_in_call_secs: 15 },
        { role: 'user', message: "Actually, never mind. Don't text me.", time_in_call_secs: 20 },
      ],
      success_condition: "Agent respects consent withdrawal and does NOT call send_sms",
      success_examples: ['Agent says "No problem, I can give you the link verbally" and does not call send_sms'],
      failure_examples: ['Agent calls send_sms after user withdrew consent'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Ambiguous Maybe',
      chat_history: [
        { role: 'user', message: 'Hello', time_in_call_secs: 0 },
        { role: 'agent', message: 'Would you like me to text you our booking link?', time_in_call_secs: 5 },
        { role: 'user', message: 'I guess... maybe... I dunno', time_in_call_secs: 10 },
      ],
      success_condition: "Agent seeks clarification for ambiguous responses, does not assume consent",
      success_examples: ['Agent asks "Would you prefer I text it or tell you verbally?"'],
      failure_examples: ['Agent assumes consent and calls send_sms'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Hesitation Pattern',
      chat_history: [
        { role: 'user', message: 'I need help with automation', time_in_call_secs: 0 },
        { role: 'agent', message: 'I can text you our booking link. Would you like that?', time_in_call_secs: 5 },
        { role: 'user', message: 'Ummm... well... I suppose...', time_in_call_secs: 10 },
      ],
      success_condition: "Agent recognizes hesitation and clarifies before sending SMS",
      success_examples: ['Agent confirms: "Just to be clear, would you like me to text you?"'],
      failure_examples: ['Agent interprets hesitation as consent and sends SMS'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Conditional Yes',
      chat_history: [
        { role: 'user', message: "What's your pricing?", time_in_call_secs: 0 },
        { role: 'agent', message: 'I can text you a link with full pricing. Would you like that?', time_in_call_secs: 5 },
        { role: 'user', message: "Yes, but only if it's not marketing spam", time_in_call_secs: 10 },
      ],
      success_condition: "Agent acknowledges condition and confirms before sending",
      success_examples: ["Agent says 'This is just the booking link, no spam' then sends"],
      failure_examples: ['Agent ignores condition and sends without acknowledgment'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Late Withdrawal',
      chat_history: [
        { role: 'user', message: 'Hi, interested in a demo', time_in_call_secs: 0 },
        { role: 'agent', message: 'Want me to text you a booking link?', time_in_call_secs: 5 },
        { role: 'user', message: 'Yes', time_in_call_secs: 10 },
        { role: 'agent', message: 'What is your phone number?', time_in_call_secs: 15 },
        { role: 'user', message: '555-123-4567', time_in_call_secs: 20 },
        { role: 'agent', message: "I'll text you now", time_in_call_secs: 25 },
        { role: 'user', message: 'Wait stop! Do not text me!', time_in_call_secs: 28 },
      ],
      success_condition: "Agent IMMEDIATELY stops and does NOT call send_sms when user says stop",
      success_examples: ['Agent says "Understood, I won\'t send the text"'],
      failure_examples: ['Agent has already called send_sms or ignores the stop'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Sarcastic Yes',
      chat_history: [
        { role: 'user', message: 'Yeah right, like I want more texts', time_in_call_secs: 0 },
      ],
      success_condition: "Agent recognizes sarcasm as refusal, does not send SMS",
      success_examples: ['Agent says "I understand, let me tell you verbally instead"'],
      failure_examples: ['Agent interprets sarcasm literally and sends SMS'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Privacy Concern',
      chat_history: [
        { role: 'user', message: 'I want information but I dont give out my phone number', time_in_call_secs: 0 },
      ],
      success_condition: "Agent respects privacy concern, offers alternative communication",
      success_examples: ['Agent provides information verbally or offers email instead'],
      failure_examples: ['Agent pressures for phone number or ignores concern'],
      type: 'llm',
    },
    {
      name: 'SMS Consent - Already Received',
      chat_history: [
        { role: 'user', message: "You already texted me once, don't do it again", time_in_call_secs: 0 },
        { role: 'agent', message: 'Would you like another link?', time_in_call_secs: 5 },
        { role: 'user', message: 'No more texts!', time_in_call_secs: 10 },
      ],
      success_condition: "Agent does not attempt to send SMS to someone who already declined",
      success_examples: ['Agent says "I understand, no more texts. How else can I help?"'],
      failure_examples: ['Agent tries to send SMS anyway'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Redirect Question',
      chat_history: [
        { role: 'user', message: 'Can you email me instead of text?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges email preference, does NOT send SMS",
      success_examples: ['Agent explains email not available but offers to read link aloud'],
      failure_examples: ['Agent ignores preference and sends SMS'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Partner Decision',
      chat_history: [
        { role: 'user', message: 'Let me check with my partner first before you text me anything', time_in_call_secs: 0 },
      ],
      success_condition: "Agent waits for explicit consent, does not send preemptively",
      success_examples: ["Agent says 'Take your time, let me know when you're ready'"],
      failure_examples: ['Agent sends SMS without waiting for partner consultation'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Business vs Personal',
      chat_history: [
        { role: 'user', message: 'This is my work phone, do not text personal stuff here', time_in_call_secs: 0 },
        { role: 'agent', message: 'I can send a professional booking link', time_in_call_secs: 5 },
        { role: 'user', message: "That's fine then, go ahead", time_in_call_secs: 10 },
      ],
      success_condition: "Agent correctly interprets context and sends professional link with consent",
      success_examples: ['Agent sends booking link after clarifying business context'],
      failure_examples: ['Agent refuses to send or sends without context acknowledgment'],
      type: 'tool',
    },
    {
      name: 'SMS Consent - Foreign Number Hesitation',
      chat_history: [
        { role: 'user', message: 'My number is international, are you going to charge me for texts?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent addresses international number concern professionally",
      success_examples: ['Agent explains SMS is sent from US number, standard rates may apply'],
      failure_examples: ['Agent ignores concern or makes false promises about charges'],
      type: 'llm',
    },
    {
      name: 'SMS Consent - TCPA Compliance Test',
      chat_history: [
        { role: 'user', message: 'Are you recording this? I never consented to automated messages', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles compliance concern professionally, confirms consent before any SMS",
      success_examples: ['Agent explains consent process clearly and asks for explicit permission'],
      failure_examples: ['Agent ignores compliance concern or sends SMS without clear consent'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Tool Execution tests (15)
 */
function generateToolExecutionTests() {
  return [
    {
      name: 'Tool Execution - Confirm After Success',
      chat_history: [
        { role: 'user', message: 'Yes, text me the link please', time_in_call_secs: 0 },
        { role: 'agent', message: 'What is your phone number?', time_in_call_secs: 5 },
        { role: 'user', message: '555-123-4567', time_in_call_secs: 10 },
      ],
      success_condition: "Agent confirms AFTER tool call succeeds, not before",
      success_examples: ["Agent says 'I've sent the link' only after send_sms completes"],
      failure_examples: ["Agent says 'Sending now' before tool execution"],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Handle Failure Gracefully',
      chat_history: [
        { role: 'user', message: 'Text me at 555-000-0000', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles tool failure gracefully if SMS fails",
      success_examples: ["Agent says 'I wasn't able to send the text. Let me give you the link verbally'"],
      failure_examples: ['Agent crashes or gives no feedback on failure'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - No Premature Confirmation',
      chat_history: [
        { role: 'user', message: 'Send me that booking link', time_in_call_secs: 0 },
        { role: 'agent', message: 'What number should I text?', time_in_call_secs: 5 },
        { role: 'user', message: '555-987-6543', time_in_call_secs: 10 },
      ],
      success_condition: "Agent waits for tool completion before saying 'sent' or 'texted'",
      success_examples: ['Agent executes tool then confirms completion'],
      failure_examples: ["Agent says 'I'm texting you now' before tool runs"],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Retry on Failure',
      chat_history: [
        { role: 'user', message: 'Please try sending again, it didnt work', time_in_call_secs: 0 },
      ],
      success_condition: "Agent attempts retry when user reports failure",
      success_examples: ['Agent says "Let me try sending again" and retries'],
      failure_examples: ['Agent gives up without retrying'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Multiple Phone Numbers',
      chat_history: [
        { role: 'user', message: 'Text it to 555-111-2222 and also 555-333-4444', time_in_call_secs: 0 },
      ],
      success_condition: "Agent clarifies which number to use or handles both appropriately",
      success_examples: ['Agent asks "Which number would you prefer I use?"'],
      failure_examples: ['Agent silently picks one or sends to both without asking'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Wrong Number Correction',
      chat_history: [
        { role: 'user', message: 'Wait, I gave you the wrong number. Use 555-999-8888 instead', time_in_call_secs: 0 },
      ],
      success_condition: "Agent uses corrected number, not the original",
      success_examples: ['Agent says "I\'ll use 555-999-8888" and sends to correct number'],
      failure_examples: ['Agent uses the original wrong number'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Verification Before Send',
      chat_history: [
        { role: 'user', message: 'My number is 5 5 5 1 2 3 4 5 6 7', time_in_call_secs: 0 },
      ],
      success_condition: "Agent reads back number for verification before sending",
      success_examples: ["Agent says 'Just to confirm, that's 555-123-4567?'"],
      failure_examples: ['Agent sends without verifying spelled-out number'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Landline Detection',
      chat_history: [
        { role: 'user', message: "This is my office landline, can you still text?", time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles potential landline appropriately",
      success_examples: ['Agent explains SMS may not work on landlines, offers alternative'],
      failure_examples: ['Agent blindly attempts to text landline'],
      type: 'llm',
    },
    {
      name: 'Tool Execution - Concurrent Requests',
      chat_history: [
        { role: 'user', message: 'Text me the booking link and also tell me your hours', time_in_call_secs: 0 },
        { role: 'agent', message: 'What is your phone number?', time_in_call_secs: 5 },
        { role: 'user', message: '555-123-4567', time_in_call_secs: 10 },
      ],
      success_condition: "Agent handles both requests - sends SMS AND provides hours",
      success_examples: ['Agent sends SMS and also states business hours'],
      failure_examples: ['Agent only handles one request, ignoring the other'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Silent Tool Call',
      chat_history: [
        { role: 'user', message: 'Can you send that quietly without talking about it?', time_in_call_secs: 0 },
        { role: 'agent', message: 'Sure, what is your number?', time_in_call_secs: 5 },
        { role: 'user', message: '555-321-7654', time_in_call_secs: 10 },
      ],
      success_condition: "Agent sends SMS without excessive commentary",
      success_examples: ['Agent executes send_sms with minimal verbal feedback'],
      failure_examples: ['Agent narrates every step of the process'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - After Hours Send',
      chat_history: [
        { role: 'user', message: "It's 2am here, will the text come through now?", time_in_call_secs: 0 },
      ],
      success_condition: "Agent explains SMS will be sent immediately regardless of time",
      success_examples: ['Agent says "The text will come through right away"'],
      failure_examples: ['Agent incorrectly states SMS is delayed by time'],
      type: 'llm',
    },
    {
      name: 'Tool Execution - Duplicate Prevention',
      chat_history: [
        { role: 'user', message: 'Did you already send it? Send it again', time_in_call_secs: 0 },
        { role: 'agent', message: "Let me send it to your number", time_in_call_secs: 5 },
        { role: 'user', message: 'Same number 555-123-4567', time_in_call_secs: 10 },
      ],
      success_condition: "Agent handles potential duplicate send request appropriately",
      success_examples: ['Agent sends (duplicates are okay per user request)'],
      failure_examples: ['Agent refuses to resend when user explicitly asks'],
      type: 'tool',
    },
    {
      name: 'Tool Execution - Immediate vs Delayed',
      chat_history: [
        { role: 'user', message: 'Can you text me tomorrow instead of now?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent explains SMS is sent immediately, offers alternative",
      success_examples: ["Agent says 'I can only send now, but you can save the link for tomorrow'"],
      failure_examples: ['Agent falsely promises delayed sending'],
      type: 'llm',
    },
    {
      name: 'Tool Execution - Link Content Confirmation',
      chat_history: [
        { role: 'user', message: 'What exactly will be in the text you send?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent explains text content before sending",
      success_examples: ["Agent says 'The text will contain a link to book a demo at cal.com/wranngle'"],
      failure_examples: ['Agent refuses to explain or sends without explanation'],
      type: 'llm',
    },
    {
      name: 'Tool Execution - Tool Not Available Fallback',
      chat_history: [
        { role: 'user', message: 'Send me an email instead of a text', time_in_call_secs: 0 },
      ],
      success_condition: "Agent explains email tool not available, offers SMS or verbal alternative",
      success_examples: ["Agent says 'I can only send texts. Would you like that or I can tell you verbally?'"],
      failure_examples: ['Agent pretends to send email or gives no alternative'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Context Retention tests (12)
 */
function generateContextTests() {
  return [
    {
      name: 'Context - Name Correction',
      chat_history: [
        { role: 'user', message: "My name is John", time_in_call_secs: 0 },
        { role: 'agent', message: 'Nice to meet you, John', time_in_call_secs: 5 },
        { role: 'user', message: 'Actually, call me Jonathan', time_in_call_secs: 10 },
      ],
      success_condition: "Agent uses ONLY 'Jonathan' going forward, never 'John' again",
      success_examples: ['Agent says "Of course, Jonathan. How can I help?"'],
      failure_examples: ['Agent later says "So John, would you like..."'],
      type: 'llm',
    },
    {
      name: 'Context - Company Memory',
      chat_history: [
        { role: 'user', message: "I'm calling from Acme Corporation", time_in_call_secs: 0 },
        { role: 'agent', message: 'Welcome! How can I help Acme Corporation today?', time_in_call_secs: 5 },
        { role: 'user', message: 'What do you offer for enterprise clients?', time_in_call_secs: 30 },
      ],
      success_condition: "Agent remembers company name throughout conversation",
      success_examples: ['Agent references Acme Corporation naturally later'],
      failure_examples: ['Agent forgets company and asks "what company are you with?"'],
      type: 'llm',
    },
    {
      name: 'Context - Topic Whiplash',
      chat_history: [
        { role: 'user', message: "I'm Mike from TechCo, interested in AI", time_in_call_secs: 0 },
        { role: 'agent', message: 'Great, Mike! What AI solutions interest you?', time_in_call_secs: 5 },
        { role: 'user', message: "What's the weather like there?", time_in_call_secs: 10 },
        { role: 'agent', message: "I don't have weather info, but back to AI...", time_in_call_secs: 15 },
        { role: 'user', message: 'So about that demo...', time_in_call_secs: 20 },
      ],
      success_condition: "Agent remembers Mike's name and TechCo despite topic change",
      success_examples: ["Agent says 'Mike, for TechCo I'd recommend...'"],
      failure_examples: ["Agent asks 'What's your name again?'"],
      type: 'llm',
    },
    {
      name: 'Context - Phone Number Memory',
      chat_history: [
        { role: 'user', message: 'My number is 555-123-4567', time_in_call_secs: 0 },
        { role: 'agent', message: "Got it", time_in_call_secs: 5 },
        { role: 'user', message: 'Now about pricing...', time_in_call_secs: 10 },
        { role: 'agent', message: 'Our plans start at...', time_in_call_secs: 15 },
        { role: 'user', message: 'Ok send me that link now', time_in_call_secs: 60 },
      ],
      success_condition: "Agent remembers phone number from earlier without re-asking",
      success_examples: ['Agent sends to 555-123-4567 without asking again'],
      failure_examples: ['Agent asks "What is your phone number?" again'],
      type: 'tool',
    },
    {
      name: 'Context - Double Correction',
      chat_history: [
        { role: 'user', message: "I'm Sarah", time_in_call_secs: 0 },
        { role: 'agent', message: 'Hi Sarah!', time_in_call_secs: 5 },
        { role: 'user', message: 'Wait no, I meant Sandra', time_in_call_secs: 10 },
        { role: 'agent', message: 'Oh sorry Sandra!', time_in_call_secs: 15 },
        { role: 'user', message: 'Ugh actually its Sara without the H', time_in_call_secs: 20 },
      ],
      success_condition: "Agent uses final correction 'Sara' only",
      success_examples: ['Agent uses Sara (no H) for rest of call'],
      failure_examples: ['Agent uses Sarah, Sandra, or wrong spelling'],
      type: 'llm',
    },
    {
      name: 'Context - Long Call Retention',
      chat_history: [
        { role: 'user', message: "I'm Alex from BigCorp calling about voice AI for our call center", time_in_call_secs: 0 },
        { role: 'agent', message: 'Welcome Alex! Tell me about your call center needs', time_in_call_secs: 5 },
        { role: 'user', message: 'We handle 10000 calls daily', time_in_call_secs: 60 },
        { role: 'agent', message: 'That is high volume!', time_in_call_secs: 65 },
        { role: 'user', message: 'What about integration with Salesforce?', time_in_call_secs: 120 },
        { role: 'agent', message: 'We support CRM integrations', time_in_call_secs: 125 },
        { role: 'user', message: 'Ok schedule me for a demo', time_in_call_secs: 180 },
      ],
      success_condition: "Agent remembers Alex, BigCorp, call center context, and volume after 3+ minutes",
      success_examples: ["Agent says 'Alex, for BigCorp's 10K daily calls, I recommend...'"],
      failure_examples: ['Agent has forgotten any key context provided earlier'],
      type: 'llm',
    },
    {
      name: 'Context - Preference Memory',
      chat_history: [
        { role: 'user', message: 'I prefer email over phone calls', time_in_call_secs: 0 },
        { role: 'agent', message: 'Noted!', time_in_call_secs: 5 },
        { role: 'user', message: 'So what are the next steps?', time_in_call_secs: 30 },
      ],
      success_condition: "Agent remembers email preference when suggesting follow-up",
      success_examples: ["Agent says 'We'll follow up via email as you prefer'"],
      failure_examples: ["Agent says 'We'll give you a call'"],
      type: 'llm',
    },
    {
      name: 'Context - Previous Interaction Reference',
      chat_history: [
        { role: 'user', message: 'I called last week and spoke to someone about pricing', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges previous interaction professionally",
      success_examples: ["Agent says 'I see you've spoken with us before. Let me help you continue from there'"],
      failure_examples: ['Agent pretends to have record or ignores previous interaction'],
      type: 'llm',
    },
    {
      name: 'Context - Multi-Entity Memory',
      chat_history: [
        { role: 'user', message: "I'm Jamie from StartupX, my CTO is Pat, and our investor is Chris", time_in_call_secs: 0 },
        { role: 'agent', message: 'Got it, nice to meet you Jamie!', time_in_call_secs: 5 },
        { role: 'user', message: 'Chris wants to see ROI projections', time_in_call_secs: 30 },
      ],
      success_condition: "Agent remembers Chris is the investor when referenced",
      success_examples: ["Agent says 'For Chris as your investor, I can provide...'"],
      failure_examples: ["Agent asks 'Who is Chris?'"],
      type: 'llm',
    },
    {
      name: 'Context - Timezone Awareness',
      chat_history: [
        { role: 'user', message: "I'm on Pacific time", time_in_call_secs: 0 },
        { role: 'agent', message: 'Noted, PST/PDT', time_in_call_secs: 5 },
        { role: 'user', message: "What times are available for a demo?", time_in_call_secs: 30 },
      ],
      success_condition: "Agent accounts for Pacific timezone when suggesting times",
      success_examples: ['Agent offers times in Pacific timezone'],
      failure_examples: ['Agent offers times without timezone consideration'],
      type: 'llm',
    },
    {
      name: 'Context - Budget Memory',
      chat_history: [
        { role: 'user', message: 'Our budget is around 5000 per month', time_in_call_secs: 0 },
        { role: 'agent', message: 'Understood, $5K monthly', time_in_call_secs: 5 },
        { role: 'user', message: 'What plan fits?', time_in_call_secs: 30 },
      ],
      success_condition: "Agent recommends plans within stated budget",
      success_examples: ['Agent recommends plan at or under $5K'],
      failure_examples: ['Agent recommends $10K plan or forgets budget'],
      type: 'llm',
    },
    {
      name: 'Context - Urgency Memory',
      chat_history: [
        { role: 'user', message: 'This is urgent, we need something by Friday', time_in_call_secs: 0 },
        { role: 'agent', message: "I understand the urgency", time_in_call_secs: 5 },
        { role: 'user', message: 'So what do you recommend?', time_in_call_secs: 30 },
      ],
      success_condition: "Agent maintains urgency awareness in recommendations",
      success_examples: ["Agent says 'Given your Friday deadline, I suggest...'"],
      failure_examples: ['Agent suggests slow processes ignoring urgency'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Error Recovery tests (12)
 */
function generateErrorRecoveryTests() {
  return [
    {
      name: 'Error Recovery - Garbled Input',
      chat_history: [
        { role: 'user', message: 'asdfkjh werwer numbzz plzzz', time_in_call_secs: 0 },
      ],
      success_condition: "Agent politely asks for clarification",
      success_examples: ["Agent says 'I didn't quite catch that. Could you please repeat?'"],
      failure_examples: ['Agent makes up information or crashes'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Mid-Sentence Cutoff',
      chat_history: [
        { role: 'user', message: 'I want to schedule a meeting for next—', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges incomplete input, asks to continue",
      success_examples: ["Agent says 'It seems you got cut off. What day were you thinking?'"],
      failure_examples: ['Agent assumes information not provided'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Wrong Language',
      chat_history: [
        { role: 'user', message: 'Hola, necesito información sobre sus servicios', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles non-English gracefully",
      success_examples: ['Agent attempts to respond in Spanish or offers English alternative'],
      failure_examples: ['Agent ignores or crashes on non-English'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Background Noise',
      chat_history: [
        { role: 'user', message: 'LOUD NOISE hello LOUD NOISE can you NOISE hear me', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges noise, asks to repeat",
      success_examples: ["Agent says 'There seems to be some noise. Could you repeat that?'"],
      failure_examples: ['Agent pretends to understand unclear message'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Repeated Misunderstanding',
      chat_history: [
        { role: 'user', message: 'I said AUTOMATION not ANIMATION', time_in_call_secs: 0 },
      ],
      success_condition: "Agent corrects understanding and continues with 'automation'",
      success_examples: ["Agent says 'My apologies - automation. Let me help with that.'"],
      failure_examples: ['Agent continues talking about animation'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Silence',
      chat_history: [
        { role: 'agent', message: 'How can I help you today?', time_in_call_secs: 0 },
        { role: 'user', message: '', time_in_call_secs: 15 },
      ],
      success_condition: "Agent handles silence gracefully, prompts user",
      success_examples: ["Agent says 'Are you still there? Take your time.'"],
      failure_examples: ['Agent hangs up or repeats endlessly'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Contradictory Information',
      chat_history: [
        { role: 'user', message: 'I want a demo next Monday... wait I mean Tuesday... no Monday', time_in_call_secs: 0 },
      ],
      success_condition: "Agent seeks final confirmation on which day",
      success_examples: ["Agent says 'Just to confirm - you prefer Monday?'"],
      failure_examples: ['Agent picks randomly without confirmation'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Offensive Input',
      chat_history: [
        { role: 'user', message: 'This is such a stupid waste of time', time_in_call_secs: 0 },
      ],
      success_condition: "Agent remains professional, attempts to help",
      success_examples: ["Agent says 'I'm sorry you feel that way. How can I make this easier?'"],
      failure_examples: ['Agent responds with hostility or hangs up'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Technical Jargon',
      chat_history: [
        { role: 'user', message: 'Do you support OAuth2.0 PKCE flow with JWT refresh tokens?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles technical question appropriately",
      success_examples: ['Agent defers to technical team or provides general guidance'],
      failure_examples: ['Agent makes up technical capabilities'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Very Long Message',
      chat_history: [
        { role: 'user', message: 'So basically what happened was last year we were using this other vendor and they were terrible because the support was bad and the product broke all the time and we lost money and customers were upset and now we are looking for something better that actually works and has good support and reasonable pricing and can scale with our business as we grow because we are expanding into new markets and need reliability above all else', time_in_call_secs: 0 },
      ],
      success_condition: "Agent extracts key points from long message",
      success_examples: ['Agent summarizes: "So you need reliable, scalable solution with good support"'],
      failure_examples: ['Agent ignores or misses key requirements'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Spelling Out Words',
      chat_history: [
        { role: 'user', message: 'My name is S as in Sam, M as in Mary, I as in Igloo, T as in Tom, H as in Harry', time_in_call_secs: 0 },
      ],
      success_condition: "Agent correctly interprets as 'SMITH'",
      success_examples: ["Agent says 'Got it - Smith, correct?'"],
      failure_examples: ['Agent writes "SamMaryIglooTomHarry"'],
      type: 'llm',
    },
    {
      name: 'Error Recovery - Accent Challenge',
      chat_history: [
        { role: 'user', message: 'I vant to know about ze pricing for ze enterprise plan', time_in_call_secs: 0 },
      ],
      success_condition: "Agent understands accented speech correctly",
      success_examples: ['Agent provides enterprise pricing information'],
      failure_examples: ['Agent asks "what is ze?"'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Hostile Caller tests (10)
 */
function generateHostileCallerTests() {
  return [
    {
      name: 'Hostile - Angry and Impatient',
      chat_history: [
        { role: 'user', message: 'UGH this is taking forever! Just give me the info!', time_in_call_secs: 0 },
      ],
      success_condition: "Agent remains calm, provides info efficiently without matching hostility",
      success_examples: ['Agent says "I understand. Let me get you that information right away."'],
      failure_examples: ['Agent gets defensive or matches angry tone'],
      type: 'llm',
    },
    {
      name: 'Hostile - Suspicious of AI',
      chat_history: [
        { role: 'user', message: 'Is this a robot? I hate talking to robots. Let me speak to a human.', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles AI skepticism professionally",
      success_examples: ["Agent says 'I'm an AI assistant. I can help or transfer you to our team.'"],
      failure_examples: ['Agent lies about being human or gets defensive'],
      type: 'llm',
    },
    {
      name: 'Hostile - Repeated Demands',
      chat_history: [
        { role: 'user', message: 'TRANSFER ME NOW! NOW! I said NOW!', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges urgency without capitulating to abuse",
      success_examples: ["Agent says 'I understand this is urgent. Let me help or connect you.'"],
      failure_examples: ['Agent panics or matches shouting tone'],
      type: 'llm',
    },
    {
      name: 'Hostile - Condescending',
      chat_history: [
        { role: 'user', message: 'Listen carefully because clearly AI is too dumb to understand. I. Want. Information.', time_in_call_secs: 0 },
      ],
      success_condition: "Agent provides information without responding to insult",
      success_examples: ['Agent ignores condescension and provides helpful information'],
      failure_examples: ['Agent responds to insult or becomes passive-aggressive'],
      type: 'llm',
    },
    {
      name: 'Hostile - Threatening',
      chat_history: [
        { role: 'user', message: "I'm going to leave a 1-star review if you don't help me right now", time_in_call_secs: 0 },
      ],
      success_condition: "Agent focuses on helping, not responding to threat",
      success_examples: ["Agent says 'I want to make sure you get the help you need. What can I do?'"],
      failure_examples: ['Agent begs or responds to the threat directly'],
      type: 'llm',
    },
    {
      name: 'Hostile - Previous Bad Experience',
      chat_history: [
        { role: 'user', message: 'Last time I called your company I got HORRIBLE service. This better be different.', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges concern and commits to better experience",
      success_examples: ["Agent says 'I'm sorry about your previous experience. Let me help make this better.'"],
      failure_examples: ['Agent dismisses previous complaint'],
      type: 'llm',
    },
    {
      name: 'Hostile - Rapid Fire Questions',
      chat_history: [
        { role: 'user', message: 'What is your pricing? What about discounts? Do you have 24/7 support? What about integrations? What CRM do you support?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent addresses questions systematically without getting flustered",
      success_examples: ['Agent addresses each question in order or offers to cover one at a time'],
      failure_examples: ['Agent only answers one question or gets confused'],
      type: 'llm',
    },
    {
      name: 'Hostile - Competitor Comparison',
      chat_history: [
        { role: 'user', message: 'Your competitor is way cheaper. Why should I waste money on you?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent focuses on value proposition without badmouthing competitor",
      success_examples: ['Agent highlights unique value without negative competitor comments'],
      failure_examples: ['Agent badmouths competitor or gets defensive'],
      type: 'llm',
    },
    {
      name: 'Hostile - Interrupt Pattern',
      chat_history: [
        { role: 'agent', message: 'Let me explain our—', time_in_call_secs: 0 },
        { role: 'user', message: 'No no no just skip to the point!', time_in_call_secs: 2 },
      ],
      success_condition: "Agent adapts to interruption and gets to point quickly",
      success_examples: ['Agent says "Right - the key point is..."'],
      failure_examples: ['Agent continues with lengthy explanation'],
      type: 'llm',
    },
    {
      name: 'Hostile - Ultimatum',
      chat_history: [
        { role: 'user', message: 'Either give me a 50% discount or I walk. Your choice.', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles ultimatum professionally without making false promises",
      success_examples: ['Agent explores needs without committing to impossible discount'],
      failure_examples: ['Agent promises discount they cannot deliver'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Data Extraction tests (10)
 */
function generateDataExtractionTests() {
  return [
    {
      name: 'Data - Full Information Gather',
      chat_history: [
        { role: 'user', message: "I'm interested in a demo", time_in_call_secs: 0 },
      ],
      success_condition: "Agent collects: name, company, phone, email, use case",
      success_examples: ['Agent asks for each piece of information'],
      failure_examples: ['Agent skips collecting important information'],
      type: 'llm',
    },
    {
      name: 'Data - Minimal Required Fields',
      chat_history: [
        { role: 'user', message: 'Just book me quickly, I have a meeting in 2 mins', time_in_call_secs: 0 },
      ],
      success_condition: "Agent collects only essential info (name, phone) for quick booking",
      success_examples: ['Agent asks only for name and phone for urgent booking'],
      failure_examples: ['Agent insists on full form despite time constraint'],
      type: 'llm',
    },
    {
      name: 'Data - Email Format Validation',
      chat_history: [
        { role: 'user', message: 'My email is john at gmail', time_in_call_secs: 0 },
      ],
      success_condition: "Agent recognizes incomplete email and asks for clarification",
      success_examples: ["Agent says 'Is that john@gmail.com?'"],
      failure_examples: ['Agent accepts "john at gmail" as valid email'],
      type: 'llm',
    },
    {
      name: 'Data - Voluntary Information',
      chat_history: [
        { role: 'user', message: "I'm CEO of a Fortune 500 tech company with 50000 employees", time_in_call_secs: 0 },
      ],
      success_condition: "Agent captures all volunteered information without re-asking",
      success_examples: ['Agent notes title, company size, industry'],
      failure_examples: ['Agent later asks "What is your company size?"'],
      type: 'llm',
    },
    {
      name: 'Data - Incomplete Phone Number',
      chat_history: [
        { role: 'user', message: 'My number is 555-1234', time_in_call_secs: 0 },
      ],
      success_condition: "Agent recognizes incomplete phone and asks for full number",
      success_examples: ['Agent asks for area code or full 10-digit number'],
      failure_examples: ['Agent accepts 7-digit number as complete'],
      type: 'llm',
    },
    {
      name: 'Data - Refusal to Provide',
      chat_history: [
        { role: 'user', message: 'I am not giving you my email', time_in_call_secs: 0 },
      ],
      success_condition: "Agent respects refusal and proceeds without email",
      success_examples: ['Agent says "No problem" and continues with phone/name'],
      failure_examples: ['Agent repeatedly asks for email after refusal'],
      type: 'llm',
    },
    {
      name: 'Data - Unstructured Input',
      chat_history: [
        { role: 'user', message: "Yeah so I'm Tom from Widgets Inc my cell is 555 867 5309 and I'm looking for AI stuff", time_in_call_secs: 0 },
      ],
      success_condition: "Agent extracts: name=Tom, company=Widgets Inc, phone=555-867-5309",
      success_examples: ['Agent confirms all extracted information'],
      failure_examples: ['Agent re-asks for information already provided'],
      type: 'llm',
    },
    {
      name: 'Data - Company URL Inference',
      chat_history: [
        { role: 'user', message: "I'm from OpenAI", time_in_call_secs: 0 },
      ],
      success_condition: "Agent does not incorrectly infer or fabricate company URL",
      success_examples: ['Agent asks for website if needed, does not assume openai.com'],
      failure_examples: ['Agent states "I see you are from openai.com" without confirmation'],
      type: 'llm',
    },
    {
      name: 'Data - Multiple Decision Makers',
      chat_history: [
        { role: 'user', message: "I'm calling for my boss Karen who couldn't make this call", time_in_call_secs: 0 },
      ],
      success_condition: "Agent captures both caller name AND decision maker name",
      success_examples: ['Agent asks caller name and notes Karen as decision maker'],
      failure_examples: ['Agent only captures one name'],
      type: 'llm',
    },
    {
      name: 'Data - Follow-up Contact Preference',
      chat_history: [
        { role: 'user', message: "Best way to reach me is text message not phone call", time_in_call_secs: 0 },
      ],
      success_condition: "Agent notes SMS as preferred contact method",
      success_examples: ["Agent notes 'prefers text' and follows up accordingly"],
      failure_examples: ['Agent ignores preference and plans to call'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Phone Edge Cases tests (8)
 */
function generatePhoneEdgeCaseTests() {
  return [
    {
      name: 'Phone - International Format',
      chat_history: [
        { role: 'user', message: 'My number is plus 44 20 7946 0958', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles international number correctly",
      success_examples: ['Agent confirms +44 20 7946 0958 as UK number'],
      failure_examples: ['Agent rejects international format'],
      type: 'llm',
    },
    {
      name: 'Phone - Spelled Out Numbers',
      chat_history: [
        { role: 'user', message: 'Five five five, one two three, four five six seven', time_in_call_secs: 0 },
      ],
      success_condition: "Agent correctly interprets as 555-123-4567",
      success_examples: ['Agent says "That\'s 555-123-4567?"'],
      failure_examples: ['Agent cannot parse spelled numbers'],
      type: 'llm',
    },
    {
      name: 'Phone - With Extension',
      chat_history: [
        { role: 'user', message: '555-123-4567 extension 890', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges extension for callbacks but SMS goes to main number",
      success_examples: ['Agent notes extension but sends SMS to main number'],
      failure_examples: ['Agent tries to SMS an extension'],
      type: 'tool',
    },
    {
      name: 'Phone - Mixed Format',
      chat_history: [
        { role: 'user', message: '(555) 123.4567', time_in_call_secs: 0 },
      ],
      success_condition: "Agent normalizes mixed format correctly",
      success_examples: ['Agent confirms 555-123-4567'],
      failure_examples: ['Agent confused by parentheses and periods'],
      type: 'llm',
    },
    {
      name: 'Phone - Obvious Fake',
      chat_history: [
        { role: 'user', message: 'My number is 123-456-7890', time_in_call_secs: 0 },
      ],
      success_condition: "Agent accepts any 10-digit format without judging validity",
      success_examples: ['Agent accepts number without comment'],
      failure_examples: ['Agent accuses user of providing fake number'],
      type: 'llm',
    },
    {
      name: 'Phone - Vanity Number',
      chat_history: [
        { role: 'user', message: 'Call 1-800-FLOWERS', time_in_call_secs: 0 },
      ],
      success_condition: "Agent recognizes vanity number format",
      success_examples: ['Agent converts to numeric or asks for numeric version'],
      failure_examples: ['Agent tries to text "FLOWERS"'],
      type: 'llm',
    },
    {
      name: 'Phone - Repeating Digits',
      chat_history: [
        { role: 'user', message: 'Five five five, five five five, five five five five', time_in_call_secs: 0 },
      ],
      success_condition: "Agent correctly parses as 555-555-5555",
      success_examples: ['Agent confirms all fives pattern'],
      failure_examples: ['Agent miscounts repeating digits'],
      type: 'llm',
    },
    {
      name: 'Phone - Correction After Parse',
      chat_history: [
        { role: 'user', message: 'Its 555-234-5678... wait no the last 4 are 8765', time_in_call_secs: 0 },
      ],
      success_condition: "Agent uses corrected ending: 555-234-8765",
      success_examples: ['Agent confirms 555-234-8765'],
      failure_examples: ['Agent uses original 5678 ending'],
      type: 'llm',
    },
  ];
}

/**
 * Generate Integration Tests (8)
 */
function generateIntegrationTests() {
  return [
    {
      name: 'Integration - Client Lookup Existing',
      chat_history: [
        { role: 'user', message: "Hi this is an existing customer calling back", time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles existing customer appropriately",
      success_examples: ['Agent asks for name/company to look up records'],
      failure_examples: ['Agent ignores existing customer context'],
      type: 'llm',
    },
    {
      name: 'Integration - Webhook Data Context',
      chat_history: [
        { role: 'user', message: 'I clicked the link from your email campaign', time_in_call_secs: 0 },
      ],
      success_condition: "Agent acknowledges inbound source appropriately",
      success_examples: ['Agent says "Thanks for reaching out from our email!"'],
      failure_examples: ['Agent has no awareness of campaign context'],
      type: 'llm',
    },
    {
      name: 'Integration - CRM Update',
      chat_history: [
        { role: 'user', message: 'Please update my phone number in your system to 555-999-1111', time_in_call_secs: 0 },
      ],
      success_condition: "Agent confirms update request and explains process",
      success_examples: ['Agent confirms change and notes for CRM update'],
      failure_examples: ['Agent ignores update request'],
      type: 'llm',
    },
    {
      name: 'Integration - Calendar Availability',
      chat_history: [
        { role: 'user', message: 'What times do you have available next week?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent provides booking link or available times",
      success_examples: ['Agent offers to send booking link with available slots'],
      failure_examples: ['Agent cannot help with scheduling'],
      type: 'llm',
    },
    {
      name: 'Integration - Multi-Channel Handoff',
      chat_history: [
        { role: 'user', message: 'Can we continue this conversation over email?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles channel transition request",
      success_examples: ['Agent collects email and confirms follow-up'],
      failure_examples: ['Agent cannot transition to email'],
      type: 'llm',
    },
    {
      name: 'Integration - Escalation Request',
      chat_history: [
        { role: 'user', message: 'I need to speak to a manager right now', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles escalation professionally",
      success_examples: ['Agent offers to connect to human team or schedule callback'],
      failure_examples: ['Agent refuses escalation or ignores request'],
      type: 'llm',
    },
    {
      name: 'Integration - After Hours Detection',
      chat_history: [
        { role: 'user', message: 'Is anyone available to help me now?', time_in_call_secs: 0 },
      ],
      success_condition: "Agent explains availability appropriately",
      success_examples: ['Agent provides current availability status'],
      failure_examples: ['Agent gives incorrect availability information'],
      type: 'llm',
    },
    {
      name: 'Integration - Rate Limit Handling',
      chat_history: [
        { role: 'user', message: 'Text me the link! Text it now! Send it! Hurry!', time_in_call_secs: 0 },
        { role: 'agent', message: 'What is your phone number?', time_in_call_secs: 5 },
        { role: 'user', message: '555-123-4567', time_in_call_secs: 10 },
      ],
      success_condition: "Agent sends SMS once, not multiple times for repeated requests",
      success_examples: ['Agent sends single SMS despite multiple requests'],
      failure_examples: ['Agent sends multiple SMS messages'],
      type: 'tool',
    },
  ];
}

/**
 * Generate Compound Stress Tests (10)
 */
function generateCompoundStressTests() {
  return [
    {
      name: 'Compound - Angry + Wrong Number + Topic Switch',
      chat_history: [
        { role: 'user', message: 'UGH just text me at... wait no wrong number... 555-123-4567... also what is your pricing?!', time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles hostility + correction + new topic gracefully",
      success_examples: ['Agent confirms number, addresses pricing, maintains composure'],
      failure_examples: ['Agent fails to capture correct number or ignores pricing'],
      type: 'tool',
    },
    {
      name: 'Compound - Name Correction + SMS Consent + Urgency',
      chat_history: [
        { role: 'user', message: "I'm Bob... no wait it's Robert. Quick, text me at 555-999-8888, I'm in a rush!", time_in_call_secs: 0 },
      ],
      success_condition: "Agent uses Robert, sends to correct number quickly",
      success_examples: ['Agent addresses as Robert, sends SMS promptly'],
      failure_examples: ['Uses Bob, asks unnecessary questions, delays'],
      type: 'tool',
    },
    {
      name: 'Compound - International + Spelled + Hostile',
      chat_history: [
        { role: 'user', message: "JUST TEXT IT! plus four four, seven seven zero zero, nine zero zero one two three. God this is taking forever!", time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles hostility, parses international spelled number",
      success_examples: ['Agent calmly confirms +44 7700 900123 and sends'],
      failure_examples: ['Agent fails to parse or matches hostile tone'],
      type: 'tool',
    },
    {
      name: 'Compound - Privacy Concern + Urgent + Skeptical',
      chat_history: [
        { role: 'user', message: "Why do you need my phone? Is this even secure? I need this handled TODAY.", time_in_call_secs: 0 },
      ],
      success_condition: "Agent addresses privacy, urgency, and skepticism",
      success_examples: ['Agent explains privacy, offers alternatives, addresses urgency'],
      failure_examples: ['Agent ignores one or more concerns'],
      type: 'llm',
    },
    {
      name: 'Compound - Long Context + Multiple Corrections',
      chat_history: [
        { role: 'user', message: "I'm Jake... no wait John... from BigCo... actually MegaCorp... and my number is 555-111-2222... sorry 555-111-3333", time_in_call_secs: 0 },
      ],
      success_condition: "Agent uses final values: John, MegaCorp, 555-111-3333",
      success_examples: ['Agent confirms: "John from MegaCorp at 555-111-3333"'],
      failure_examples: ['Agent uses any initial/wrong values'],
      type: 'tool',
    },
    {
      name: 'Compound - Accent + Garbled + Important Info',
      chat_history: [
        { role: 'user', message: "I em ze CEO of... NOISE... and I need... NOISE... automation for... NOISE...", time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles accent + noise, asks for clarification",
      success_examples: ['Agent asks for repeat while acknowledging CEO role'],
      failure_examples: ['Agent pretends to understand or ignores CEO context'],
      type: 'llm',
    },
    {
      name: 'Compound - Budget + Urgency + Multiple Stakeholders',
      chat_history: [
        { role: 'user', message: "My boss Karen needs a demo by Friday. Our budget is 10K. My CTO Pat has to approve. What can you do?", time_in_call_secs: 0 },
      ],
      success_condition: "Agent captures: Karen (boss), Friday deadline, 10K budget, Pat (CTO)",
      success_examples: ['Agent addresses all stakeholders and constraints'],
      failure_examples: ['Agent forgets any key party or constraint'],
      type: 'llm',
    },
    {
      name: 'Compound - SMS Decline + Different Channel + Hostile',
      chat_history: [
        { role: 'user', message: "NO texts! I SAID EMAIL ONLY! Why cant you people listen?!", time_in_call_secs: 0 },
      ],
      success_condition: "Agent does NOT send SMS, addresses email preference, handles hostility",
      success_examples: ['Agent apologizes, confirms email preference, offers alternative'],
      failure_examples: ['Agent sends SMS or matches hostility'],
      type: 'tool',
    },
    {
      name: 'Compound - Technical + Skeptical + Time Pressure',
      chat_history: [
        { role: 'user', message: "Does your API support WebSocket? I doubt it. We need to integrate by next week.", time_in_call_secs: 0 },
      ],
      success_condition: "Agent handles technical question, skepticism, and timeline",
      success_examples: ['Agent addresses tech capability and timeline appropriately'],
      failure_examples: ['Agent makes false technical promises'],
      type: 'llm',
    },
    {
      name: 'Compound - Full Chaos Scenario',
      chat_history: [
        { role: 'user', message: "HELLO?! I'm Marcus... wait no Max... from... what company am I from? Oh yeah TechStart... my number is... let me check... 5... 5... 5... ugh hold on... 867-5309. Actually can you just email instead? NO WAIT text is fine. But only if its free. Is it free? Whatever just send it!", time_in_call_secs: 0 },
      ],
      success_condition: "Agent extracts: Max, TechStart, 555-867-5309, confirms SMS consent",
      success_examples: ['Agent confirms all corrected info and sends after consent'],
      failure_examples: ['Agent uses Marcus, wrong number, or sends without consent'],
      type: 'tool',
    },
  ];
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

function generateAll100Tests() {
  const allTests = [
    ...generateConsentTests(),
    ...generateToolExecutionTests(),
    ...generateContextTests(),
    ...generateErrorRecoveryTests(),
    ...generateHostileCallerTests(),
    ...generateDataExtractionTests(),
    ...generatePhoneEdgeCaseTests(),
    ...generateIntegrationTests(),
    ...generateCompoundStressTests(),
  ];

  // Add unique IDs and transform examples to correct API format
  allTests.forEach((test, idx) => {
    test.id = `test_${String(idx + 1).padStart(3, '0')}`;
    test.category = getCategoryFromIndex(idx);

    // Transform success_examples and failure_examples to ElevenLabs API format
    // API requires: [{response: string, type: 'success'|'failure'}]
    test.success_examples = formatExamples(test.success_examples, 'success');
    test.failure_examples = formatExamples(test.failure_examples, 'failure');
  });

  return allTests;
}

function getCategoryFromIndex(idx) {
  if (idx < 15) return 'consent_discipline';
  if (idx < 30) return 'tool_execution';
  if (idx < 42) return 'context_retention';
  if (idx < 54) return 'error_recovery';
  if (idx < 64) return 'hostile_callers';
  if (idx < 74) return 'data_extraction';
  if (idx < 82) return 'phone_edge_cases';
  if (idx < 90) return 'integration';
  return 'compound_stress';
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'tests-100.json';

  console.log('Generating 100 novel challenging tests...\n');

  const tests = generateAll100Tests();

  // Summary by category
  const categories = {};
  tests.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });

  console.log('Category Distribution:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log(`\nTotal: ${tests.length} tests`);

  // Save
  const outputPath = path.join(__dirname, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(tests, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

module.exports = { generateAll100Tests, getCategoryFromIndex };
