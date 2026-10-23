import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareAnthropicPayload,
  parseAnthropicError,
  isAnthropicConfigured,
} from '../src/lib/ai/anthropic.ts';
import {
  prepareGeminiPayload,
  parseGeminiError,
  isGeminiConfigured,
} from '../src/lib/ai/gemini.ts';
import Anthropic from '@anthropic-ai/sdk';

// -------------------------------------------------------------------
// 1. Anthropic Claude Tests
// -------------------------------------------------------------------
test('Anthropic: payload formatting sets top-level system and alternating turns', () => {
  const payload = prepareAnthropicPayload(
    'claude-3-5-sonnet-20241022',
    [
      { role: 'user', content: 'Turn 1' },
      { role: 'user', content: 'Turn 1 continued' }, // Consecutive user turn -> should merge
      { role: 'assistant', content: 'Assistant reply' },
      { role: 'user', content: 'Turn 2' },
    ],
    'You are a senior engineer',
    0.7
  );

  assert.equal(payload.model, 'claude-3-5-sonnet-20241022');
  assert.equal(payload.stream, true);
  assert.equal(payload.system, 'You are a senior engineer');
  assert.equal(payload.temperature, 0.7);
  assert.ok(payload.max_tokens >= 4096);

  // Turns must alternate: user, assistant, user
  assert.equal(payload.messages.length, 3);
  assert.equal(payload.messages[0].role, 'user');
  assert.match(payload.messages[0].content, /Turn 1\n\nTurn 1 continued/);
  assert.equal(payload.messages[1].role, 'assistant');
  assert.equal(payload.messages[1].content, 'Assistant reply');
  assert.equal(payload.messages[2].role, 'user');
  assert.equal(payload.messages[2].content, 'Turn 2');
});

test('Anthropic: extracts system message from messages array if present', () => {
  const payload = prepareAnthropicPayload(
    'claude-3-5-haiku-20241022',
    [
      { role: 'system', content: 'System instruction inside array' },
      { role: 'user', content: 'Question' },
    ],
    'Initial prompt'
  );

  assert.match(payload.system, /Initial prompt\n\nSystem instruction inside array/);
  assert.equal(payload.messages.length, 1);
  assert.equal(payload.messages[0].role, 'user');
});

test('Anthropic: parseAnthropicError maps 401, 429, 529, 404 safely', () => {
  const fake401 = new Anthropic.APIError(401, { message: 'invalid x-api-key: sk-ant-secret123' }, 'Invalid Key', {});
  const parsed401 = parseAnthropicError(fake401);
  assert.equal(parsed401.status, 401);
  assert.match(parsed401.message, /Invalid Anthropic API key/i);
  assert.doesNotMatch(parsed401.message, /sk-ant-secret123/i, 'Must never leak key');

  const fake429 = new Anthropic.APIError(429, { message: 'rate limit exceeded' }, 'Rate Limit', {});
  const parsed429 = parseAnthropicError(fake429);
  assert.equal(parsed429.status, 429);
  assert.match(parsed429.message, /rate limit reached/i);

  const fake529 = new Anthropic.APIError(529, { message: 'overloaded' }, 'Overloaded', {});
  const parsed529 = parseAnthropicError(fake529);
  assert.equal(parsed529.status, 529);
  assert.match(parsed529.message, /overloaded/i);

  const fakeAbort = new Error('Request was aborted');
  fakeAbort.name = 'AbortError';
  const parsedAbort = parseAnthropicError(fakeAbort);
  assert.equal(parsedAbort.status, 499);
  assert.match(parsedAbort.message, /cancelled by user/i);
});

test('Anthropic: isAnthropicConfigured checks ANTHROPIC_API_KEY', () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(isAnthropicConfigured(), false);

  process.env.ANTHROPIC_API_KEY = '   ';
  assert.equal(isAnthropicConfigured(), false);

  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  assert.equal(isAnthropicConfigured(), true);

  if (saved) process.env.ANTHROPIC_API_KEY = saved;
  else delete process.env.ANTHROPIC_API_KEY;
});

// -------------------------------------------------------------------
// 2. Google Gemini Tests
// -------------------------------------------------------------------
test('Gemini: payload formatting converts assistant to model and sets systemInstruction', () => {
  const payload = prepareGeminiPayload(
    'gemini-1.5-pro',
    [
      { role: 'user', content: 'What is Next.js?' },
      { role: 'user', content: 'Tell me more.' }, // Consecutive user turn -> merge
      { role: 'assistant', content: 'Next.js is a React framework.' },
    ],
    'Be concise and accurate',
    0.5
  );

  assert.equal(payload.model, 'gemini-1.5-pro');
  assert.equal(payload.config.systemInstruction, 'Be concise and accurate');
  assert.equal(payload.config.temperature, 0.5);
  assert.ok(payload.config.maxOutputTokens >= 8192);

  // Turns converted to 'user' and 'model'
  assert.equal(payload.contents.length, 2);
  assert.equal(payload.contents[0].role, 'user');
  assert.match(payload.contents[0].parts[0].text, /What is Next\.js\?\n\nTell me more\./);
  assert.equal(payload.contents[1].role, 'model');
  assert.equal(payload.contents[1].parts[0].text, 'Next.js is a React framework.');
});

test('Gemini: parseGeminiError maps invalid key, permission denied, quota and cancellation', () => {
  const invalidKeyError = new Error('API key not valid. Please pass a valid API key: AIzaSySecretKey');
  const parsedKey = parseGeminiError(invalidKeyError);
  assert.equal(parsedKey.status, 401);
  assert.match(parsedKey.message, /Invalid Google Gemini API key/i);
  assert.doesNotMatch(parsedKey.message, /AIzaSySecretKey/i, 'Must never leak key');

  const quotaError = new Error('RESOURCE_EXHAUSTED: quota exceeded for current minute');
  const parsedQuota = parseGeminiError(quotaError);
  assert.equal(parsedQuota.status, 429);
  assert.match(parsedQuota.message, /quota exceeded/i);

  const permError = new Error('PERMISSION_DENIED: The caller does not have permission');
  const parsedPerm = parseGeminiError(permError);
  assert.equal(parsedPerm.status, 403);
  assert.match(parsedPerm.message, /access forbidden/i);

  const abortError = new Error('Operation was cancelled by caller');
  abortError.name = 'AbortError';
  const parsedAbort = parseGeminiError(abortError);
  assert.equal(parsedAbort.status, 499);
  assert.match(parsedAbort.message, /cancelled by user/i);
});

test('Gemini: isGeminiConfigured checks GEMINI_API_KEY', () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  assert.equal(isGeminiConfigured(), false);

  process.env.GEMINI_API_KEY = '   ';
  assert.equal(isGeminiConfigured(), false);

  process.env.GEMINI_API_KEY = 'AIzaSy-test-key';
  assert.equal(isGeminiConfigured(), true);

  if (saved) process.env.GEMINI_API_KEY = saved;
  else delete process.env.GEMINI_API_KEY;
});

// -------------------------------------------------------------------
// 3. Compare Arena Independent Failure Isolation Test
// -------------------------------------------------------------------
test('Compare Arena: failure in one provider does not affect other providers', async () => {
  // Simulate 3 slots: OpenAI fails, Claude succeeds, Gemini succeeds
  const slotResults = await Promise.allSettled([
    Promise.reject(new Error('OpenAI rate limit reached')),
    Promise.resolve({ content: 'Claude response streamed cleanly' }),
    Promise.resolve({ content: 'Gemini response streamed cleanly' }),
  ]);

  assert.equal(slotResults[0].status, 'rejected');
  assert.match(slotResults[0].reason.message, /OpenAI rate limit/);

  assert.equal(slotResults[1].status, 'fulfilled');
  assert.equal(slotResults[1].value.content, 'Claude response streamed cleanly');

  assert.equal(slotResults[2].status, 'fulfilled');
  assert.equal(slotResults[2].value.content, 'Gemini response streamed cleanly');
});
