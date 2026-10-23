import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareOpenAIPayload,
  parseOpenAIError,
  isOpenAIConfigured,
} from '../src/lib/ai/openai.ts';
import OpenAI from 'openai';

test('OpenAI Integration: payload formatting for standard models (GPT-4o)', () => {
  const payload = prepareOpenAIPayload(
    'gpt-4o',
    [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'How are you?' },
    ],
    'You are a helpful coding assistant',
    0.5
  );

  assert.equal(payload.model, 'gpt-4o');
  assert.equal(payload.stream, true);
  assert.equal(payload.temperature, 0.5);
  assert.equal(payload.messages.length, 4);
  assert.equal(payload.messages[0].role, 'system');
  assert.equal(payload.messages[0].content, 'You are a helpful coding assistant');
  assert.equal(payload.messages[1].role, 'user');
  assert.equal(payload.messages[1].content, 'Hello');
});

test('OpenAI Integration: payload formatting for reasoning models (o3-mini)', () => {
  const payload = prepareOpenAIPayload(
    'o3-mini',
    [{ role: 'user', content: 'Solve this math equation' }],
    'Think step by step',
    0.8
  );

  assert.equal(payload.model, 'o3-mini');
  assert.equal(payload.stream, true);
  // Reasoning models do not accept custom temperature
  assert.equal(payload.temperature, undefined);
  assert.equal(payload.messages.length, 2);
  // Should use developer role instead of system
  assert.equal(payload.messages[0].role, 'developer');
  assert.equal(payload.messages[0].content, 'Think step by step');
});

test('OpenAI Integration: error parser maps 401 invalid key safely', () => {
  const fakeError = new OpenAI.APIError(401, { message: 'Incorrect API key provided: sk-invalid' }, 'Invalid key', {});
  const parsed = parseOpenAIError(fakeError);

  assert.equal(parsed.status, 401);
  assert.match(parsed.message, /Invalid OpenAI API key/i);
  assert.doesNotMatch(parsed.message, /sk-invalid/i, 'Must never leak the key in message');
});

test('OpenAI Integration: error parser maps 429 quota and rate limits', () => {
  const quotaError = new OpenAI.APIError(429, { message: 'You exceeded your current quota' }, 'Quota', {});
  const parsedQuota = parseOpenAIError(quotaError);

  assert.equal(parsedQuota.status, 429);
  assert.match(parsedQuota.message, /quota exceeded/i);

  const rateLimitError = new OpenAI.APIError(429, { message: 'Rate limit reached' }, 'Rate limit', {});
  const parsedRate = parseOpenAIError(rateLimitError);

  assert.equal(parsedRate.status, 429);
  assert.match(parsedRate.message, /rate limit exceeded/i);
});

test('OpenAI Integration: error parser maps 400 context length exceeded', () => {
  const ctxError = new OpenAI.APIError(400, { message: 'context_length_exceeded' }, 'Context length', {});
  const parsed = parseOpenAIError(ctxError);

  assert.equal(parsed.status, 400);
  assert.match(parsed.message, /context window/i);
});

test('OpenAI Integration: error parser maps 500/502/503 outage safely', () => {
  const outageError = new OpenAI.APIError(503, { message: 'Service unavailable' }, 'Unavailable', {});
  const parsed = parseOpenAIError(outageError);

  assert.equal(parsed.status, 502);
  assert.match(parsed.message, /temporarily unavailable/i);
});

test('OpenAI Integration: error parser maps abort cancellation', () => {
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  const parsed = parseOpenAIError(abortError);

  assert.equal(parsed.status, 499);
  assert.match(parsed.message, /cancelled by user/i);
});

test('OpenAI Integration: isOpenAIConfigured returns true only when env var is set', () => {
  const original = process.env.OPENAI_API_KEY;

  delete process.env.OPENAI_API_KEY;
  assert.equal(isOpenAIConfigured(), false);

  process.env.OPENAI_API_KEY = '   ';
  assert.equal(isOpenAIConfigured(), false);

  process.env.OPENAI_API_KEY = 'sk-test-valid-key';
  assert.equal(isOpenAIConfigured(), true);

  if (original) {
    process.env.OPENAI_API_KEY = original;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});
