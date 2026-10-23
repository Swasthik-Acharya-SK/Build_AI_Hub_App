import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, resetRateLimitStore } from '../src/lib/security/rate-limiter.ts';
import { validateChatPayload } from '../src/lib/security/request-validator.ts';
import { parseOpenAIError } from '../src/lib/ai/openai.ts';
import { parseAnthropicError } from '../src/lib/ai/anthropic.ts';
import { parseGeminiError } from '../src/lib/ai/gemini.ts';

// -------------------------------------------------------------------
// 1. In-Memory Sliding Window Rate Limiter Tests
// -------------------------------------------------------------------
test('Rate Limiter: allows requests up to threshold and throttles excess', () => {
  resetRateLimitStore();
  const testIp = '192.168.1.100';

  // Make 5 requests with limit = 5
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testIp, 5, 10_000);
    assert.equal(res.allowed, true);
    assert.equal(res.remaining, 4 - i);
  }

  // 6th request must be throttled
  const throttled = checkRateLimit(testIp, 5, 10_000);
  assert.equal(throttled.allowed, false);
  assert.equal(throttled.remaining, 0);

  // Different IP should still be allowed
  const otherIpRes = checkRateLimit('192.168.1.101', 5, 10_000);
  assert.equal(otherIpRes.allowed, true);
});

// -------------------------------------------------------------------
// 2. Request Boundary and DoS Protection Tests
// -------------------------------------------------------------------
test('Chat Service Boundaries: rejects oversized prompt (>50k chars)', () => {
  const oversizedText = 'A'.repeat(50_001);
  const result = validateChatPayload({
    provider: 'openai',
    model: 'gpt-4o',
    messages: [{ role: 'user', content: oversizedText }],
  });

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
  assert.match(result.message, /exceeds safe maximum length/i);
});

test('Chat Service Boundaries: rejects excessive message turns (>100 messages)', () => {
  const massiveMessages = Array.from({ length: 101 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Turn ${i}`,
  }));

  const result = validateChatPayload({
    provider: 'openai',
    model: 'gpt-4o',
    messages: massiveMessages,
  });

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
  assert.match(result.message, /Conversation message limit exceeded/i);
});

test('Chat Service Boundaries: rejects empty prompt or invalid payload structure', () => {
  const emptyRes = validateChatPayload({
    provider: 'openai',
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '   ' }],
  });
  assert.equal(emptyRes.valid, false);
  assert.match(emptyRes.message, /content cannot be empty/i);

  const missingProvider = validateChatPayload({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'hello' }],
  });
  assert.equal(missingProvider.valid, false);
});

// -------------------------------------------------------------------
// 3. Secrets Redaction & Isolation Verification
// -------------------------------------------------------------------
test('Security Audit: OpenAI error parser redacts simulated API key', () => {
  const fakeError = {
    status: 401,
    message: 'Incorrect API key: sk-proj-1234567890abcdefghijklmn',
  };
  const parsed = parseOpenAIError(fakeError);

  assert.equal(parsed.status, 401);
  assert.doesNotMatch(parsed.message, /sk-proj-1234567890abcdefghijklmn/);
  assert.match(parsed.message, /Invalid OpenAI API key/);
});

test('Security Audit: Anthropic error parser redacts simulated secret key', () => {
  const fakeError = {
    status: 401,
    message: 'Unauthorized for key sk-ant-api03-abcdef123456',
  };
  const parsed = parseAnthropicError(fakeError);

  assert.equal(parsed.status, 401);
  assert.doesNotMatch(parsed.message, /sk-ant-api03-abcdef123456/);
  assert.match(parsed.message, /Invalid Anthropic API key/);
});

test('Security Audit: Gemini error parser redacts simulated secret key', () => {
  const fakeError = {
    status: 400,
    message: 'API key not valid: AIzaSySecretKey987654321',
  };
  const parsed = parseGeminiError(fakeError);

  assert.equal(parsed.status, 401);
  assert.doesNotMatch(parsed.message, /AIzaSySecretKey987654321/);
  assert.match(parsed.message, /Invalid Google Gemini API key/);
});
