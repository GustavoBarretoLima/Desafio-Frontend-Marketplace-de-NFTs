import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { build, preview } from "vite";

const targets = { home: "/", detalhe: "/nfts/emerald-ape-042" };
const profiles = ["mobile", "desktop"];
const repetitions = 3;
const directory = resolve("lighthouse-reports", new Date().toISOString().replaceAll(":", "-"));
const goals = { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 };
const metrics = {
  lcpMs: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbtMs: "total-blocking-time",
};

function runAudit(url, profile, filename) {
  const args = [
    resolve("node_modules/lighthouse/cli/index.js"), url,
    "--output=json", "--output=html", `--output-path=${filename}`,
    "--chrome-flags=--headless --disable-background-networking",
    "--only-categories=" + Object.keys(goals).join(","),
  ];
  if (profile === "desktop") args.push("--preset=desktop");
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`Lighthouse encerrou com código ${code}.`));
    });
  });
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

process.env.VITE_ENABLE_MOCKS = "true";
for (const scenario of ["VITE_MOCK_ORDER_TIMEOUT", "VITE_MOCK_NFT_UPDATE", "VITE_MOCK_FAVORITES_FAILURE"]) {
  process.env[scenario] = "false";
}
await build();
await mkdir(directory, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4173, strictPort: true } });
const results = [];
let failure;
try {
  for (const [page, path] of Object.entries(targets)) {
    for (const profile of profiles) {
      const samples = [];
      for (let run = 1; run <= repetitions; run++) {
        const filename = resolve(directory, `${page}-${profile}-${run}`);
        await runAudit(`http://127.0.0.1:4173${path}`, profile, filename);
        const report = JSON.parse(await readFile(`${filename}.report.json`, "utf8"));
        if (report.runtimeError || report.audits["http-status-code"]?.score === 0) {
          throw new Error(`Auditoria inválida em ${page}/${profile}. Consulte o relatório.`);
        }
        const values = Object.fromEntries([
          ...Object.keys(goals).map((key) => [key, report.categories[key]?.score == null ? null : Math.round(report.categories[key].score * 100)]),
          ...Object.entries(metrics).map(([key, audit]) => [key, report.audits[audit]?.numericValue]),
        ]);
        if (Object.values(values).some((value) => !Number.isFinite(value))) {
          throw new Error(`Medições incompletas em ${page}/${profile}.`);
        }
        samples.push({ run, values, lighthouse: report.lighthouseVersion, browser: report.environment?.hostUserAgent, settings: report.configSettings });
      }
      const medians = Object.fromEntries(Object.keys(samples[0].values).map((key) =>
        [key, median(samples.map(({ values }) => values[key]))]));
      results.push({ page, profile, medians, belowGoal: Object.keys(goals).filter((key) => medians[key] < goals[key]), samples });
    }
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  server.httpServer.close();
  await writeFile(resolve(directory, "summary.json"), JSON.stringify({
    node: process.version, os: `${platform()} ${release()} ${arch()}`,
    environment: "Vite preview, build otimizado, cenário padrão do MSW",
    goals, results, failure,
  }, null, 2));
}
console.table(results.map(({ page, profile, medians }) => ({ page, profile, ...medians })));
console.log(directory);
