import test from 'node:test';
import assert from 'node:assert/strict';
import {
  searchConversations,
  validateAndParseImport,
  createNewConversation,
} from '../src/lib/storage/chat-store.ts';

// -------------------------------------------------------------------
// 1. Search across Titles, Tags, and Message Content
// -------------------------------------------------------------------
test('Search: matches conversation title', () => {
  const convos = [
    {
      id: '1',
      title: 'React Architecture Discussion',
      provider: 'openai',
      model: 'gpt-4o',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: 1000 }],
    },
    {
      id: '2',
      title: 'Python Scripting',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      createdAt: 2000,
      updatedAt: 2000,
      messages: [],
    },
  ];

  const results = searchConversations(convos, 'React');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, '1');
});

test('Search: matches deep inside message content', () => {
  const convos = [
    {
      id: '1',
      title: 'General Chat',
      provider: 'openai',
      model: 'gpt-4o',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [
        { id: 'm1', role: 'user', content: 'Can you explain the quantum Hall effect?', timestamp: 1000 },
      ],
    },
    {
      id: '2',
      title: 'Next.js Routing',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      createdAt: 2000,
      updatedAt: 2000,
      messages: [{ id: 'm2', role: 'user', content: 'What is app router?', timestamp: 2000 }],
    },
  ];

  const results = searchConversations(convos, 'quantum hall');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, '1');
});

test('Search: matches conversation tags', () => {
  const convos = [
    {
      id: '1',
      title: 'System Design',
      tags: ['architecture', 'backend', 'distributed'],
      provider: 'openai',
      model: 'gpt-4o',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [],
    },
    {
      id: '2',
      title: 'CSS Tricks',
      tags: ['frontend', 'styling'],
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      createdAt: 2000,
      updatedAt: 2000,
      messages: [],
    },
  ];

  const results = searchConversations(convos, 'backend');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, '1');
});

// -------------------------------------------------------------------
// 2. Import Validation and Sanitization
// -------------------------------------------------------------------
test('Import Validation: successfully parses and sanitizes valid JSON backup', () => {
  const validJson = JSON.stringify([
    {
      id: 'test-1',
      title: 'Valid Imported Chat',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      createdAt: 1700000000,
      updatedAt: 1700000000,
      tags: ['imported', 'docs'],
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hi', timestamp: 1700000000 },
        { id: 'msg-2', role: 'assistant', content: 'Hello there!', timestamp: 1700000001 },
      ],
    },
  ]);

  const result = validateAndParseImport(validJson);
  assert.equal(result.valid, true);
  assert.equal(result.conversations.length, 1);
  assert.equal(result.conversations[0].title, 'Valid Imported Chat');
  assert.equal(result.conversations[0].messages.length, 2);
  assert.deepEqual(result.conversations[0].tags, ['imported', 'docs']);
});

test('Import Validation: rejects malformed JSON safely', () => {
  const malformedJson = '{ "conversations": [ invalid json ...';
  const result = validateAndParseImport(malformedJson);
  assert.equal(result.valid, false);
  assert.match(result.error, /Invalid JSON format/i);
});

test('Import Validation: rejects oversized file payloads (>10MB)', () => {
  // Create simulated 11MB string
  const oversized = 'a'.repeat(11 * 1024 * 1024);
  const result = validateAndParseImport(oversized);
  assert.equal(result.valid, false);
  assert.match(result.error, /exceeds safe maximum limit/i);
});

test('Import Validation: safely repairs missing fields in imported items', () => {
  const imperfectJson = JSON.stringify([
    {
      // Missing title, provider, timestamps
      messages: [{ role: 'user', content: 'Hello without metadata' }],
    },
  ]);

  const result = validateAndParseImport(imperfectJson);
  assert.equal(result.valid, true);
  assert.equal(result.conversations.length, 1);
  assert.ok(result.conversations[0].id.startsWith('conv_imp_'));
  assert.equal(result.conversations[0].title, 'Imported Chat 1');
  assert.equal(result.conversations[0].provider, 'openai');
  assert.equal(result.conversations[0].messages.length, 1);
});

// -------------------------------------------------------------------
// 3. Conversation Creation and Defaults
// -------------------------------------------------------------------
test('Conversation: createNewConversation sets unique IDs and default parameters', () => {
  const convo1 = createNewConversation('openai', 'gpt-4o', 'First Chat');
  const convo2 = createNewConversation('gemini', 'gemini-1.5-pro', 'Second Chat', ['tag1']);

  assert.notEqual(convo1.id, convo2.id);
  assert.equal(convo1.provider, 'openai');
  assert.equal(convo2.provider, 'gemini');
  assert.equal(convo2.tags.length, 1);
  assert.equal(convo1.isPinned, false);
});
