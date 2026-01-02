/**
 * Discord Q&A Processor
 * Processes n8n Discord bot help conversations into searchable knowledge base
 *
 * Input: n8n Discord bot help.csv (18,520+ community questions)
 * Output: Searchable JSON index with topics, keywords, and patterns
 */

const fs = require('fs');
const path = require('path');

// Topic detection patterns
const TOPIC_PATTERNS = {
  'ai-agents': /ai agent|langchain|llm|chat|memory|rag|embedding|vector/i,
  'mcp-integration': /mcp|model context protocol|execute tool/i,
  'http-requests': /http|api|request|webhook|rest|endpoint/i,
  'database': /postgres|mysql|database|sql|query/i,
  'error-handling': /error|fail|problem|issue|troubleshoot|debug/i,
  'authentication': /auth|oauth|credential|token|api key/i,
  'workflows': /workflow|node|trigger|execution|activate/i,
  'data-transformation': /transform|map|filter|split|merge|json/i,
  'scheduling': /schedule|cron|interval|time|trigger/i,
  'integration': /slack|discord|notion|google|midjourney|zapier/i,
  'pagination': /pagination|loop|batch|iterate/i,
  'expressions': /expression|{{\s*\$|variable|\$json|\$node/i,
  'deployment': /self-host|docker|install|version|upgrade/i,
  'code-node': /code node|javascript|python|function/i,
  'conditional': /if|switch|condition|route|branch/i
};

// Common error patterns
const ERROR_PATTERNS = {
  'json-parse': /not valid json|unexpected token|json\.parse/i,
  'connection': /connection|timeout|unreachable|network/i,
  'authentication': /unauthorized|401|403|invalid credentials/i,
  'rate-limit': /rate limit|429|too many requests/i,
  'validation': /validation|required field|missing parameter/i,
  'execution': /execution failed|workflow error|node error/i
};

class DiscordQAProcessor {
  constructor(csvPath, outputDir) {
    this.csvPath = csvPath;
    this.outputDir = outputDir;
    this.questions = [];
    this.topicIndex = {};
    this.errorIndex = {};
    this.keywordIndex = {};
  }

  /**
   * Parse CSV file
   */
  parseCSV() {
    console.log('📖 Reading CSV file...');
    const content = fs.readFileSync(this.csvPath, 'utf-8');
    const lines = content.split('\n');

    console.log(`Found ${lines.length} total lines`);

    // Skip header and MEE6 bot messages
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes('MEE6') || line.includes('🔧 **Looking for Support?**')) {
        continue;
      }

      try {
        const parsed = this.parseCSVLine(line);
        if (parsed && parsed.content && parsed.content.includes('<@1072591948499664996>')) {
          // Extract actual question (remove bot mention)
          const question = parsed.content.replace(/<@\d+>/g, '').trim();

          if (question.length > 10) { // Filter out very short messages
            this.questions.push({
              date: parsed.date,
              username: parsed.username,
              question: question,
              link: parsed.link || null,
              lineNumber: i
            });
          }
        }
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }

    console.log(`✅ Extracted ${this.questions.length} valid questions`);
  }

  /**
   * Simple CSV line parser (handles quoted fields)
   */
  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);

    if (fields.length >= 4) {
      return {
        date: fields[0],
        username: fields[1],
        userTag: fields[2],
        content: fields[3],
        mentions: fields[4] || '',
        link: fields[5] || ''
      };
    }

    return null;
  }

  /**
   * Classify questions by topic
   */
  classifyTopics() {
    console.log('🏷️  Classifying topics...');

    this.questions.forEach((qa, index) => {
      qa.topics = [];
      qa.errors = [];

      // Detect topics
      for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
        if (pattern.test(qa.question)) {
          qa.topics.push(topic);

          if (!this.topicIndex[topic]) {
            this.topicIndex[topic] = [];
          }
          this.topicIndex[topic].push(index);
        }
      }

      // Detect error patterns
      for (const [errorType, pattern] of Object.entries(ERROR_PATTERNS)) {
        if (pattern.test(qa.question)) {
          qa.errors.push(errorType);

          if (!this.errorIndex[errorType]) {
            this.errorIndex[errorType] = [];
          }
          this.errorIndex[errorType].push(index);
        }
      }
    });

    console.log('✅ Topic classification complete');
    console.log('   Topics found:', Object.keys(this.topicIndex).length);
    console.log('   Error patterns found:', Object.keys(this.errorIndex).length);
  }

  /**
   * Build keyword index for fast searching
   */
  buildKeywordIndex() {
    console.log('🔍 Building keyword index...');

    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and',
                                'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as',
                                'by', 'from', 'how', 'can', 'i', 'do', 'does', 'what']);

    this.questions.forEach((qa, index) => {
      // Extract significant words
      const words = qa.question
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

      words.forEach(word => {
        if (!this.keywordIndex[word]) {
          this.keywordIndex[word] = [];
        }
        if (!this.keywordIndex[word].includes(index)) {
          this.keywordIndex[word].push(index);
        }
      });
    });

    console.log(`✅ Indexed ${Object.keys(this.keywordIndex).length} unique keywords`);
  }

  /**
   * Generate statistics
   */
  generateStats() {
    const stats = {
      totalQuestions: this.questions.length,
      dateRange: {
        earliest: this.questions[0]?.date,
        latest: this.questions[this.questions.length - 1]?.date
      },
      topTopics: Object.entries(this.topicIndex)
        .map(([topic, questions]) => ({ topic, count: questions.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topErrors: Object.entries(this.errorIndex)
        .map(([error, questions]) => ({ error, count: questions.length }))
        .sort((a, b) => b.count - a.count),
      topKeywords: Object.entries(this.keywordIndex)
        .map(([keyword, questions]) => ({ keyword, count: questions.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50)
    };

    return stats;
  }

  /**
   * Save processed data
   */
  saveOutput() {
    console.log('💾 Saving processed data...');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Save full questions database
    const questionsPath = path.join(this.outputDir, 'discord-questions.json');
    fs.writeFileSync(questionsPath, JSON.stringify({
      metadata: {
        sourceFile: path.basename(this.csvPath),
        processedDate: new Date().toISOString(),
        totalQuestions: this.questions.length
      },
      questions: this.questions
    }, null, 2));

    console.log(`   ✅ Saved ${this.questions.length} questions to discord-questions.json`);

    // Save topic index
    const topicIndexPath = path.join(this.outputDir, 'topic-index.json');
    fs.writeFileSync(topicIndexPath, JSON.stringify({
      topics: this.topicIndex,
      topicPatterns: TOPIC_PATTERNS
    }, null, 2));

    console.log(`   ✅ Saved topic index (${Object.keys(this.topicIndex).length} topics)`);

    // Save error index
    const errorIndexPath = path.join(this.outputDir, 'error-index.json');
    fs.writeFileSync(errorIndexPath, JSON.stringify({
      errors: this.errorIndex,
      errorPatterns: ERROR_PATTERNS
    }, null, 2));

    console.log(`   ✅ Saved error index (${Object.keys(this.errorIndex).length} error types)`);

    // Save keyword index
    const keywordIndexPath = path.join(this.outputDir, 'keyword-index.json');
    fs.writeFileSync(keywordIndexPath, JSON.stringify(this.keywordIndex, null, 2));

    console.log(`   ✅ Saved keyword index (${Object.keys(this.keywordIndex).length} keywords)`);

    // Save statistics
    const stats = this.generateStats();
    const statsPath = path.join(this.outputDir, 'statistics.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    console.log(`   ✅ Saved statistics`);

    // Create README
    this.createREADME(stats);
  }

  /**
   * Create README for the knowledge base
   */
  createREADME(stats) {
    const readme = `# n8n Discord Community Q&A Knowledge Base

> Processed from ${stats.totalQuestions.toLocaleString()} real community questions

## 📊 Statistics

- **Total Questions**: ${stats.totalQuestions.toLocaleString()}
- **Date Range**: ${stats.dateRange.earliest} to ${stats.dateRange.latest}
- **Topics Covered**: ${stats.topTopics.length}
- **Unique Keywords**: ${Object.keys(this.keywordIndex).length.toLocaleString()}

## 🏷️ Top Topics

${stats.topTopics.map((t, i) => `${i + 1}. **${t.topic}**: ${t.count.toLocaleString()} questions`).join('\n')}

## 🐛 Common Error Patterns

${stats.topErrors.map((e, i) => `${i + 1}. **${e.error}**: ${e.count.toLocaleString()} occurrences`).join('\n')}

## 🔍 Most Searched Keywords

${stats.topKeywords.slice(0, 20).map((k, i) => `${i + 1}. ${k.keyword} (${k.count})`).join('\n')}

## 📁 Files

- \`discord-questions.json\` - Full questions database with metadata
- \`topic-index.json\` - Questions indexed by topic
- \`error-index.json\` - Questions indexed by error pattern
- \`keyword-index.json\` - Questions indexed by keyword
- \`statistics.json\` - Detailed statistics

## 🔍 How to Search

### By Topic
\`\`\`javascript
const topicIndex = require('./topic-index.json');
const questions = require('./discord-questions.json');

// Get all AI agent questions
const aiAgentQuestionIndexes = topicIndex.topics['ai-agents'];
const aiAgentQuestions = aiAgentQuestionIndexes.map(i => questions.questions[i]);
\`\`\`

### By Keyword
\`\`\`javascript
const keywordIndex = require('./keyword-index.json');
const questions = require('./discord-questions.json');

// Search for "webhook" questions
const webhookIndexes = keywordIndex['webhook'] || [];
const webhookQuestions = webhookIndexes.map(i => questions.questions[i]);
\`\`\`

### By Error Pattern
\`\`\`javascript
const errorIndex = require('./error-index.json');
const questions = require('./discord-questions.json');

// Get JSON parsing error questions
const jsonErrorIndexes = errorIndex.errors['json-parse'];
const jsonErrorQuestions = jsonErrorIndexes.map(i => questions.questions[i]);
\`\`\`

## 🤖 Integration with Claude Code

This knowledge base is automatically available to Claude Code when developing n8n workflows.
Use the pre-flight checklist to search this data before building new workflows.

---

*Generated by discord-qa-processor.js on ${new Date().toISOString()}*
`;

    const readmePath = path.join(this.outputDir, 'README.md');
    fs.writeFileSync(readmePath, readme);

    console.log(`   ✅ Created README.md`);
  }

  /**
   * Run full processing pipeline
   */
  process() {
    console.log('\n🚀 Starting Discord Q&A Processing Pipeline\n');

    this.parseCSV();
    this.classifyTopics();
    this.buildKeywordIndex();
    this.saveOutput();

    console.log('\n✨ Processing complete!\n');
  }
}

// Main execution
if (require.main === module) {
  const csvPath = path.join(__dirname, '..', 'old', 'raw-data-ingested', 'n8n-discord-bot-help.csv');
  const outputDir = path.join(__dirname, '..', 'context', 'discord-knowledge');

  const processor = new DiscordQAProcessor(csvPath, outputDir);
  processor.process();
}

module.exports = DiscordQAProcessor;
