// Test script to verify the robust JSON extraction logic

export function sanitizeAndExtractJson(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    throw new Error("Respon teks dari AI kosong.");
  }

  let text = rawText.trim();

  // 1. Bersihkan reasoning/thinking tags (DeepSeek R1, Qwen, dll.)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();

  // 2. Coba parse langsung jika sudah valid JSON murni
  try {
    return JSON.parse(text);
  } catch {}

  // 3. Ekstrak dari blok markdown ```json ... ``` (baik yang tertutup maupun terpotong)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch && codeBlockMatch[1]?.trim()) {
    const codeBlockContent = codeBlockMatch[1].trim();
    try {
      return JSON.parse(codeBlockContent);
    } catch {
      // Lanjutkan dengan perbaikan jika dalam code block ada error sintaks
      const repaired = tryRepairAndParseJson(codeBlockContent);
      if (repaired) return repaired;
    }
  }

  // 4. Cari batas kurung objek {} atau array []
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");

  // Tentukan apakah bentuk luar adalah array [...] atau objek {...}
  let candidate = "";
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace) && lastBracket > firstBracket) {
    candidate = text.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = text.substring(firstBrace, lastBrace + 1);
  } else {
    // Jika tidak ada pasangan kurung lengkap (mungkin terpotong di tengah)
    if (firstBrace !== -1) {
      candidate = text.substring(firstBrace);
    } else if (firstBracket !== -1) {
      candidate = text.substring(firstBracket);
    }
  }

  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {}

    const repaired = tryRepairAndParseJson(candidate);
    if (repaired) return repaired;
  }

  // 5. Ekstraksi per butir soal individu (Fallback paling tangguh)
  const individualQuestions = extractIndividualQuestionObjects(text);
  if (individualQuestions.length > 0) {
    console.log(`[JSON Parser] Berhasil memulihkan ${individualQuestions.length} butir soal via ekstraksi objek parsial.`);
    return { questions: individualQuestions };
  }

  throw new Error("Gagal mengurai respon AI menjadi format JSON.");
}

/**
 * Mencoba memperbaiki kesalahan umum JSON yang dihasilkan LLM
 */
function tryRepairAndParseJson(jsonStr: string): any {
  if (!jsonStr || !jsonStr.trim()) return null;

  let cleaned = jsonStr.trim();

  // A. Hapus komentar // dan /* */
  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // B. Perbaiki trailing commas sebelum } atau ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // C. Perbaiki unescaped backslashes (misal rumus LaTeX: \alpha, \frac, dll.)
  // Ganti backslash yang bukan escape sequence standar JSON (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX)
  cleaned = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");

  // D. Perbaiki unescaped newlines/tabs di dalam string literal
  cleaned = fixUnescapedControlCharsInStrings(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch {}

  // E. Coba perbaiki jika JSON terpotong (truncated JSON repair)
  const repairedTruncated = repairTruncatedJson(cleaned);
  if (repairedTruncated) {
    try {
      return JSON.parse(repairedTruncated);
    } catch {}
  }

  return null;
}

/**
 * Menormalkan karakter newline dan tab mentah di dalam string JSON
 */
function fixUnescapedControlCharsInStrings(str: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === "\\") {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * Memperbaiki string JSON yang terpotong di tengah jalan (misal karena token limit)
 */
function repairTruncatedJson(str: string): string | null {
  // Cari posisi penutup elemen terakhir '}' atau ']'
  const lastCloseBrace = str.lastIndexOf("}");
  const lastCloseBracket = str.lastIndexOf("]");
  const lastValidCut = Math.max(lastCloseBrace, lastCloseBracket);

  if (lastValidCut === -1) return null;

  // Potong sampai penutup terakhir yang utuh
  let truncated = str.substring(0, lastValidCut + 1).trim();

  // Hapus trailing comma jika ada setelah pemotongan
  truncated = truncated.replace(/,\s*$/, "");

  // Hitung jumlah kurung kurawal & siku yang belum tertutup
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < truncated.length; i++) {
    const char = truncated[i];
    if (inString) {
      if (isEscaped) isEscaped = false;
      else if (char === "\\") isEscaped = true;
      else if (char === '"') inString = false;
    } else {
      if (char === '"') inString = true;
      else if (char === "{") openBraces++;
      else if (char === "}") openBraces = Math.max(0, openBraces - 1);
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  // Tutup kurung yang belum tertutup
  let closing = "";
  while (openBrackets > 0) {
    closing += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    closing += "}";
    openBraces--;
  }

  return truncated + closing;
}

/**
 * Ekstraktor objek per butir soal independen jika struktur induk rusak
 */
function extractIndividualQuestionObjects(text: string): any[] {
  const questions: any[] = [];
  let pos = 0;

  while (pos < text.length) {
    const openBrace = text.indexOf("{", pos);
    if (openBrace === -1) break;

    // Hitung kurung kurawal sampai objek tertutup
    let depth = 0;
    let endBrace = -1;
    let inString = false;
    let isEscaped = false;

    for (let i = openBrace; i < text.length; i++) {
      const char = text[i];
      if (inString) {
        if (isEscaped) isEscaped = false;
        else if (char === "\\") isEscaped = true;
        else if (char === '"') inString = false;
      } else {
        if (char === '"') inString = true;
        else if (char === "{") depth++;
        else if (char === "}") {
          depth--;
          if (depth === 0) {
            endBrace = i;
            break;
          }
        }
      }
    }

    if (endBrace !== -1) {
      const block = text.substring(openBrace, endBrace + 1);
      // Periksa apakah ini objek butir soal (memiliki content/question dan options)
      if (
        (block.includes('"content"') || block.includes('"question"')) &&
        block.includes('"options"')
      ) {
        const parsedItem = tryRepairAndParseJson(block);
        if (parsedItem && typeof parsedItem === "object") {
          questions.push(parsedItem);
        }
      }
      pos = endBrace + 1;
    } else {
      pos = openBrace + 1;
    }
  }

  return questions;
}

// ==========================================
// Test Cases
// ==========================================
function runTests() {
  console.log("Running AI JSON parser tests...");

  // Test 1: DeepSeek R1 <think> tag
  const t1 = `<think>
I should generate 2 questions in JSON.
Let's see: { "some": "thought" }
</think>
\`\`\`json
{
  "questions": [
    { "number": 1, "content": "Soal 1", "options": [{ "label": "A", "content": "Opt 1", "isCorrect": true }] }
  ]
}
\`\`\``;
  const res1 = sanitizeAndExtractJson(t1);
  if (!res1.questions || res1.questions.length !== 1) throw new Error("Test 1 failed");
  console.log("✓ Test 1 Passed: <think> tags removed cleanly.");

  // Test 2: Trailing comma & LaTeX backslashes
  const t2 = `{
    "title": "Ujian Matematika",
    "questions": [
      {
        "number": 1,
        "content": "Berapakah nilai dari \\alpha + \\frac{1}{2}?",
        "options": [
          { "label": "A", "content": "\\sqrt{4}", "isCorrect": true, },
          { "label": "B", "content": "3", "isCorrect": false, },
        ],
        "explanation": "Penjelasan dengan simbol \\pm 2.",
      },
    ],
  }`;
  const res2 = sanitizeAndExtractJson(t2);
  if (!res2.questions || res2.questions.length !== 1) throw new Error("Test 2 failed");
  console.log("✓ Test 2 Passed: Trailing commas and LaTeX backslashes fixed.");

  // Test 3: Raw newlines inside string
  const t3 = `{
    "questions": [
      {
        "number": 1,
        "content": "Perhatikan teks berikut:
1. Poin satu
2. Poin dua",
        "options": [
          { "label": "A", "content": "Jawaban", "isCorrect": true }
        ],
        "explanation": "Penjelasan"
      }
    ]
  }`;
  const res3 = sanitizeAndExtractJson(t3);
  if (!res3.questions || res3.questions.length !== 1) throw new Error("Test 3 failed");
  console.log("✓ Test 3 Passed: Raw unescaped newlines in strings fixed.");

  // Test 4: Top-level Array [...] instead of object
  const t4 = `Berikut adalah soal yang dibuat:
  [
    {
      "number": 1,
      "content": "Soal array",
      "options": [{ "label": "A", "content": "Opsi", "isCorrect": true }]
    }
  ]
  Semoga bermanfaat!`;
  const res4 = sanitizeAndExtractJson(t4);
  const arr = Array.isArray(res4) ? res4 : res4.questions;
  if (!arr || arr.length !== 1) throw new Error("Test 4 failed");
  console.log("✓ Test 4 Passed: Top-level array handled.");

  // Test 5: Truncated JSON (Token limit cut-off)
  const t5 = `\`\`\`json
  {
    "title": "Soal Terpotong",
    "questions": [
      {
        "number": 1,
        "content": "Soal 1 utuh",
        "options": [{ "label": "A", "content": "Opsi 1", "isCorrect": true }],
        "explanation": "Pembahasan 1"
      },
      {
        "number": 2,
        "content": "Soal 2 utuh",
        "options": [{ "label": "A", "content": "Opsi 2", "isCorrect": true }],
        "explanation": "Pembahasan 2"
      },
      {
        "number": 3,
        "content": "Soal 3 terpotong di ten`;
  const res5 = sanitizeAndExtractJson(t5);
  const qList5 = Array.isArray(res5) ? res5 : res5.questions;
  if (!qList5 || qList5.length !== 2) throw new Error(`Test 5 failed: expected 2 questions, got ${qList5?.length}`);
  console.log("✓ Test 5 Passed: Truncated JSON successfully recovered 2 intact questions.");

  console.log("ALL 5 TESTS PASSED SUCCESSFULLY!");
}

runTests();
