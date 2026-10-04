/**
 * =============================================================================
 * MASTER TEST RUNNER & HARDENING VERIFIER (FASE 10)
 * =============================================================================
 */

import { runUnitTests } from "./tests/test-unit";
import { runIntegrationRbacTests } from "./tests/test-integration-rbac";
import { runLoadSimulation } from "./tests/test-load-simulation";

async function main() {
  console.log("=================================================================");
  console.log("   TRYOUTKU — TEST SUITE & HARDENING VERIFICATION (FASE 10)");
  console.log("=================================================================");

  const startTime = Date.now();
  const suiteResults: { name: string; passed: boolean }[] = [];

  try {
    // 1. Jalankan Unit Tests
    const unitPass = await runUnitTests();
    suiteResults.push({ name: "Unit Tests (Scoring, Timer, Sanitization)", passed: unitPass });

    // 2. Jalankan Integration & RBAC Tests
    const intPass = await runIntegrationRbacTests();
    suiteResults.push({ name: "Integration & RBAC Tests (Exam Lifecycle, Guards, Edge Cases)", passed: intPass });

    // 3. Jalankan Load & Concurrency Simulation
    const loadPass = await runLoadSimulation();
    suiteResults.push({ name: "Load & Concurrency (100 Concurrent Autosaves)", passed: loadPass });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const allPassed = suiteResults.every((s) => s.passed);

    console.log("\n=================================================================");
    console.log("                     RINGKASAN EKSEKUSI PENGUJIAN                ");
    console.log("=================================================================");
    for (const r of suiteResults) {
      console.log(` ${r.passed ? "✅ PASS" : "❌ FAIL"} - ${r.name}`);
    }
    console.log("-----------------------------------------------------------------");
    console.log(` Status Akhir : ${allPassed ? "SEMUA PENGUJIAN LULUS (100%)" : "TERDAPAT PENGUJIAN GAGAL"}`);
    console.log(` Total Waktu  : ${totalDuration} detik`);
    console.log("=================================================================\n");

    if (!allPassed) {
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error("\n[CRITICAL ERROR] Test Suite terhenti:", error);
    process.exit(1);
  }
}

main();
