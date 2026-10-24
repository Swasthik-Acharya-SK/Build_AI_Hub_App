# 🚀 All-in-One AI Hub

A production-grade, unified multi-model AI dashboard and comparison arena built with Next.js 15 App Router, TypeScript, Tailwind CSS, and official provider SDKs.

Seamlessly switch between, stream from, and compare **OpenAI** (ChatGPT 4o, 4o-mini, o3-mini), **Anthropic** (Claude 3.5 Sonnet, 3.5 Haiku, Opus), and **Google Gemini** (Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash) from a single intuitive interface.

---

## 🌟 Key Features

- **Multi-Provider & Multi-Model Integration**:
  - Official SDKs: `openai` (`^4.68.0`), `@anthropic-ai/sdk` (`^0.30.0`), `@google/genai` (`^2.31.0`).
  - Supports 9 leading models with fine-tuned role adaptations (including OpenAI developer role for reasoning models, Gemini model turns, Claude top-level system prompts).
- **Compare Arena (Side-by-Side Evaluation)**:
  - Select 2 to 4 models and dispatch the exact same prompt simultaneously.
  - Independent real-time streaming for each slot — if one provider fails or hits quota limits, the remaining responses stream uninterrupted.
  - Per-slot retry without re-querying successful models.
  - Dual export: download benchmark comparisons as clean GitHub Markdown or structured JSON with full metrics.
- **Enterprise-Grade Security Architecture**:
  - **Zero Known Vulnerabilities**: 100% clean `npm audit` (`0 vulnerabilities`) powered by Next.js 15.5.28 and hardened PostCSS overrides.
  - **Zero Client-Side Key Exposure**: API keys are strictly read server-side via environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
  - **Token Redaction**: Automatic regex scrubbing of key signatures (`sk-proj`, `sk-ant`, `AIza`) from error responses to prevent credential leaks.
  - **Sliding-Window Rate Limiter**: Built-in in-memory rate limiting with standard `X-RateLimit-*` and `Retry-After` headers.
  - **DoS & Payload Boundary Protection**: Maximum 50,000 character prompt limit and 100 conversation turn cap.
  - **Security Headers**: HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, and strict Referrer-Policy configured in `next.config.mjs`.
- **Local-First Persistence & Search**:
  - Client-side storage with instant recovery across page refreshes.
  - Multi-vector search: finds conversations by title, tags, or deep message content.
  - Pin/unpin conversations, tag categorization, and permanent deletion with safety confirmations.
  - Safe import/export with strict schema validation and 10MB upload guardrails.
- **Supabase Cloud Sync Ready**:
  - Includes full PostgreSQL migration script (`src/lib/storage/supabase.ts`) with Row Level Security (RLS) policies for multi-device sync and user authentication.
- **Offline / Mock Mode**:
  - Built-in realistic streaming mock engine for demonstration, automated testing, and development without active API keys.
- **Universal Cross-Platform Build Pipeline**:
  - High-performance compilation on Linux/macOS cloud targets via native SWC.
  - Native WebAssembly SWC compiler fallback (`@next/swc-wasm-nodejs`) for restricted Windows workstations enforcing Windows Defender Application Control (WDAC).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                      │
│  - App Router UI (Dark/Light mode, Tailwind CSS)            │
│  - ModelSelector, ChatContainer, CompareArena               │
│  - Local-first persistence (localStorage + search/tags)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/chat (SSE / Stream)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server-Side Route                │
│  - In-Memory Sliding Window Rate Limiter (src/lib/security) │
│  - Request Boundary Validator (Max 50k chars, 100 turns)    │
│  - Environment Credentials Loader (Never sent to client)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   OpenAI SDK     │ │  Anthropic SDK   │ │ Google GenAI SDK │
│ (gpt-4o, o3-mini)│ │(claude-3-5-sonnet│ │(gemini-1.5-pro,  │
│                  │ │  3-5-haiku)      │ │ 2.0-flash)       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.17.0 or newer (v20+ recommended)
- **npm** or **pnpm**

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/all-in-one-ai-hub.git
cd all-in-one-ai-hub
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

Add your provider API keys as needed:
```env
# Server-side API Keys (Never exposed to client)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Enable Mock Mode if you do not have active API keys
# NEXT_PUBLIC_FORCE_MOCK=true

# Optional: Supabase Integration for Cloud Sync
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> 💡 **Tip**: If you leave API keys blank, you can enable **Mock Mode** in the app settings modal to test streaming responses, comparison arena, and export features without paid API credentials.

### 4. Development Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The test suite covers unit formatting, provider payloads, boundary validators, security sanitization, storage schema checks, and end-to-end browser user flows:

```bash
# 1. Run unit & integration test suites (31 tests across 4 suites)
npm test

# 2. Run Playwright browser E2E test suite (9 tests covering Chrome, mobile viewports & visual capture)
npm run test:e2e
 
# 3. Run ESLint code quality checks
npm run lint

# 4. Run TypeScript strict type verification
npx tsc --noEmit

# 5. Run dependency vulnerability audit
npm audit
```

### Test Coverage Highlights:
- **Unit & Integration Tests (31 Passing)**:
  - **OpenAI Integration** (`tests/openai.test.mjs`): Standard payloads, reasoning model adaptations (`developer` role, omitted temperature), 401/429/400/500 error mapping, key isolation.
  - **Provider Adapters** (`tests/providers.test.mjs`): Claude payload formatting (top-level system, turn merging), Gemini format (`model` role conversion), multi-model Compare Arena failure isolation.
  - **Persistence & Search** (`tests/phase4-storage.test.mjs`): Message deep search, tag queries, 10MB import cap, corrupted JSON rejection, schema auto-repair.
  - **Security Audit** (`tests/phase5-security.test.mjs`): Sliding-window rate limiter enforcement, prompt overflow protection (>50,000 chars), conversation turn limits (>100 turns), and API key string redaction across error handlers.
- **Browser E2E Tests (9 Passing in Playwright)** (`e2e/hub.spec.ts`):
  - Page load, header controls, dark theme rendering.
  - Streaming mock chat workflow.
  - Generation cancellation (`Stop`) and retry triggers.
  - Conversation management (rename, pin, tag, search, delete confirmation).
  - Compare Arena simultaneous prompt broadcast and Export dropdown (Markdown and JSON).
  - Settings modal with 3 configuration tabs.
  - Mobile responsiveness across 320px, 375px (mobile drawer with backdrop blur), and 768px tablet viewports.
  - Keyboard navigation and focus accessibility.
  - Visual evidence capture (`public/screenshots/`: desktop, compare arena, tablet, mobile, drawer).

---

## 🔒 Security Audit & Best Practices

1. **Strict Credential Isolation**:
   - Keys are loaded via server-side `process.env` inside API route handlers.
   - Client bundles never package secrets or private environment variables.
2. **Key Token Scrubbing**:
   - `parseOpenAIError`, `parseAnthropicError`, and `parseGeminiError` actively strip OpenAI (`sk-`), Anthropic (`sk-ant-`), and Google (`AIza`) key patterns from error strings before returning them to the user.
3. **Sliding-Window Rate Limiting**:
   - 45 requests per 60-second window per IP.
   - Emits standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` HTTP headers.
4. **Hardened HTTP Headers**:
   - Configured in `next.config.mjs` with `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and disabled `X-Powered-By`.

---

## 🚢 Production Deployment (Vercel)

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Production release: All-in-One AI Hub"
   git branch -M main
   git remote add origin https://github.com/your-username/all-in-one-ai-hub.git
   git push -u origin main
   ```
2. Import the project into **[Vercel](https://vercel.com)**.
3. Set your Production Environment Variables in the Vercel Project Settings:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
4. Deploy!

> **Note on Distributed Rate Limiting**:
> The default in-memory rate limiter protects single server instances and local development. For multi-region serverless deployment on Vercel Edge / Serverless Functions, pair the route with [@upstash/ratelimit](https://github.com/upstash/ratelimit) backed by Redis for distributed counter persistence.

---

## 📄 License
MIT License. Open-source and free for commercial and educational use.
