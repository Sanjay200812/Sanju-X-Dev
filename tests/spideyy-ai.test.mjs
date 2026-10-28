import test from "node:test";
import assert from "node:assert/strict";
import handler, { configureEnvironment } from "../server/handler.mjs";

function createMockFetch(responses) {
  let callIndex = 0;
  const calls = [];

  const mockFetch = async (url, opts) => {
    calls.push({
      url,
      method: opts.method,
      headers: opts.headers,
      body: JSON.parse(opts.body || "{}"),
    });

    const responseDef = Array.isArray(responses)
      ? responses[callIndex++] || responses[responses.length - 1]
      : responses;

    if (responseDef.status && responseDef.status !== 200) {
      return {
        ok: false,
        status: responseDef.status,
        json: async () => responseDef.data || { error: { message: "Mock error" } },
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: responseDef.content || "Hello! I am spideyy AI.",
            },
          },
        ],
        usage: { total_tokens: 42 },
      }),
    };
  };

  mockFetch.calls = calls;
  return mockFetch;
}

test("spideyy AI handles 'Hi spideyy' and returns mode 'AI assistant'", async () => {
  const mockFetch = createMockFetch({
    content: "Hi there! I am spideyy, your AI assistant for SANJU X DEV. How can I help you with your web project today?",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let status = 0;
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Hi spideyy" },
    },
    {
      setHeader() {},
      set statusCode(c) { status = c; },
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(status, 200);
  assert.equal(body.mode, "AI assistant");
  assert.ok(body.answer.includes("spideyy"));
  assert.equal(mockFetch.calls.length, 1);
  assert.equal(mockFetch.calls[0].body.model, "gpt-4o-mini");
  assert.equal(mockFetch.calls[0].body.messages[mockFetch.calls[0].body.messages.length - 1].content, "Hi spideyy");
});

test("spideyy AI recommends E-Commerce Website for clothing shop and provides 'Start Your Project' preselect link", async () => {
  const mockFetch = createMockFetch({
    content: "For a clothing shop, an E-Commerce Website is the perfect fit. It allows you to showcase your apparel catalogues, manage sizes and stock, accept online orders, and receive direct payments via UPI and cards.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "I want a website for my clothing shop." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.answer.includes("E-Commerce Website"));
  assert.ok(
    body.links.some(
      (l) => l.label === "Start Your Project" && l.url.includes("E-Commerce%20Website")
    ),
    "Must include Start Your Project link preselecting E-Commerce Website"
  );
});

test("spideyy AI answers 'Can customers pay online?' with UPI and gateway integrations", async () => {
  const mockFetch = createMockFetch({
    content: "Yes, customers can pay online! We integrate secure payment gateways that support UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking with instant payment confirmations.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Can customers pay online?" },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.answer.includes("pay online"));
  assert.ok(body.answer.includes("UPI"));
});

test("spideyy AI answers 'How much will it cost?' by explaining custom scoping without inventing quotes", async () => {
  const mockFetch = createMockFetch({
    content: "At SANJU X DEV, we scope every project individually based on your specific requirements rather than using rigid generic packages. You can share your project brief on our Contact page to receive an accurate, tailored estimate.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "How much will it cost?" },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.links.some((l) => l.url.includes("/project") || l.url.includes("/contact")));
});

test("spideyy AI understands Telugu-English mixed enquiry 'Naku business website kavali.'", async () => {
  const mockFetch = createMockFetch({
    content: "Namaste! We can definitely build a modern Business Website for you. A Business Website is designed to establish trust, showcase your services, and generate customer leads with direct WhatsApp enquiry buttons.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Naku business website kavali." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.answer.includes("Business Website"));
  assert.ok(body.links.some((l) => l.url.includes("Business%20Website")));
});

test("spideyy AI directs 'How do I track SXD-001?' to secure /track without exposing private data", async () => {
  const mockFetch = createMockFetch({
    content: "To track your project with code SXD-001, visit our secure Track Project page at /track. For your privacy and security, enter SXD-001 along with your registered email to view real-time milestone progress and updates.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "How do I track SXD-001?" },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.links.some((l) => l.url === "/track"));
});

test("spideyy AI shows verified portfolio case studies for 'Can you show your previous projects?'", async () => {
  const mockFetch = createMockFetch({
    content: "We have five verified portfolio case studies: StarX Live (entertainment streaming), TicketX (event/cinema booking), StarX Connect (digital virtual card), AudioX (audio utility app), and Yuva Shakti (community portal). Explore them in Our Work!",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Can you show your previous projects?" },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.ok(body.answer.includes("StarX Live"));
  assert.ok(body.answer.includes("TicketX"));
  assert.ok(body.links.some((l) => l.url === "/work"));
});

test("spideyy AI preserves conversation context across turns for 'What did I just ask you?'", async () => {
  const mockFetch = createMockFetch({
    content: "You just asked me whether customers can pay online for your clothing shop.",
  });

  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-mock-test-key-12345",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: mockFetch,
  });

  const conversationHistory = [
    { role: "user", text: "I want a website for my clothing shop." },
    { role: "assistant", text: "An E-Commerce Website is ideal for a clothing shop." },
    { role: "user", text: "Can customers pay online?" },
    { role: "assistant", text: "Yes, online payments with UPI and cards are fully supported." },
  ];

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "What did I just ask you?",
        history: conversationHistory,
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "AI assistant");
  assert.equal(mockFetch.calls.length, 1);
  const sentMessages = mockFetch.calls[0].body.messages;
  assert.ok(sentMessages.some((m) => m.content === "Can customers pay online?"));
  assert.ok(sentMessages.some((m) => m.content === "I want a website for my clothing shop."));
  assert.equal(sentMessages[sentMessages.length - 1].content, "What did I just ask you?");
});

test("spideyy falls back gracefully to 'FAQ guide' when OpenAI fails or is unconfigured", async () => {
  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "gpt-4o-mini",
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "What kind of website does my business need?" },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.equal(body.mode, "FAQ guide");
  assert.ok(body.answer.includes("Business Website"));
});


// ============================================================================
// PHASE 10: 10 REQUIRED CONVERSATIONAL INTELLIGENCE TESTS
// ============================================================================

test("Phase 10 - Test 1: User 'I own a clothing shop.' recognizes business appropriately", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "I own a clothing shop." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /clothing shop|E-Commerce|product catalogue/i);
  assert.ok(body.links.some((l) => l.url.includes("E-Commerce")));
});

test("Phase 10 - Test 2: User 'I don't want online payments. Only WhatsApp ordering.' respects negative requirement", async () => {
  const history = [
    { role: "user", text: "I own a clothing shop." },
    { role: "assistant", text: "For a clothing shop, an E-Commerce Website or product catalogue is the ideal choice." },
  ];

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "I don't want online payments. Only WhatsApp ordering.",
        history,
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  // Must recommend WhatsApp catalogue/ordering
  assert.match(body.answer, /WhatsApp/i);
  // Must NOT recommend online payments as a requested feature
  assert.doesNotMatch(body.answer, /We integrate secure online payment gateways supporting UPI/i);
  assert.match(body.answer, /without requiring an online payment gateway/i);
});

test("Phase 10 - Test 3: User 'What business did I mention earlier?' remembers the clothing shop", async () => {
  const history = [
    { role: "user", text: "I own a clothing shop." },
    { role: "assistant", text: "For a clothing shop, a product catalogue is great." },
    { role: "user", text: "I don't want online payments. Only WhatsApp ordering." },
    { role: "assistant", text: "Understood! A product catalogue with WhatsApp ordering is ideal." },
  ];

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "What business did I mention earlier?",
        history,
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /clothing shop/i);
});

test("Phase 10 - Test 4: Telugu-English 'Naku clothing shop undhi, budget ₹5000. Em features best untayi?' handles budget & business", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "Naku clothing shop undhi, budget ₹5000. Em features best untayi?",
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /clothing shop/i);
  assert.match(body.answer, /5000/);
  assert.match(body.answer, /WhatsApp/i);
  // Must NOT give false fixed price promise
  assert.doesNotMatch(body.answer, /guaranteed fixed price/i);
});

test("Phase 10 - Test 5: User 'What if I want online payments later?' explains phased scalability", async () => {
  const history = [
    { role: "user", text: "I own a clothing shop." },
    { role: "user", text: "Only WhatsApp ordering." },
  ];

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "What if I want online payments later?",
        history,
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /later|phase|scalable|add/i);
  assert.match(body.answer, /payment gateway|UPI/i);
});

test("Phase 10 - Test 6: User 'I want to submit my project.' provides working action linking to /project", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "I want to submit my project." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.ok(body.links.some((l) => l.label === "Start Your Project" && l.url === "/project"));
});

test("Phase 10 - Test 7: User 'Track SXD-001.' directs to secure /track without exposing private data", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Track SXD-001." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /\/track/i);
  assert.ok(body.links.some((l) => l.url === "/track"));
  // Never expose private customer data
  assert.doesNotMatch(body.answer, /@/);
});

test("Phase 10 - Test 8: User 'What did I ask you earlier?' accurately references earlier conversation", async () => {
  const history = [
    { role: "user", text: "Can you build a photography portfolio?" },
    { role: "assistant", text: "Yes, a Personal Portfolio is perfect for photography." },
  ];

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: {
        question: "What did I ask you earlier?",
        history,
      },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /photography portfolio/i);
});

test("Phase 10 - Test 9: User 'Hello.' responds naturally without unnecessary advertisements or action buttons", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Hello." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  assert.match(body.answer, /Welcome to SANJU X DEV/i);
  // Pure greeting should have zero or at most no pushy marketing buttons
  assert.equal(body.links.length, 0);
});

test("Phase 10 - Test 10: Provider unavailability simulation returns clearly identified fallback mode", async () => {
  configureEnvironment({
    SITE_URL: "http://127.0.0.1:3100",
    OPENAI_API_KEY: "sk-failing-key",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_FETCH: async () => ({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: "quota exceeded", code: "credit_balance_exhausted" }
      }),
    }),
  });

  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "Tell me about business websites." },
    },
    {
      setHeader() {},
      set statusCode(_) {},
      end(str) { body = JSON.parse(str); },
    }
  );

  // Must NOT claim to be live "AI assistant"
  assert.notEqual(body.mode, "AI assistant");
  assert.equal(body.mode, "FAQ guide");
});
