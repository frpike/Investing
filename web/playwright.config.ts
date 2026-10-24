import { defineConfig, devices } from "@playwright/test";

// Runs against a production build in guest mode (no Supabase or Anthropic keys), on port 3100.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: [
    // Fake Trading 212 API with fictional data, so personal mode can be tested end to end.
    { command: "node e2e/mock-t212.mjs", url: "http://localhost:3199", reuseExistingServer: false, timeout: 10_000 },
    {
      // Fresh progress file for each run (personal mode saves progress to this computer).
      command: "rm -rf e2e/.tmp && npx next start -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", ANTHROPIC_API_KEY: "",
        T212_API_KEY: "e2e-key", T212_ACCESS_CODE: "e2e-access-code", T212_ENV: "demo", T212_BASE_URL: "http://localhost:3199",
        PERSONAL_DATA_FILE: "e2e/.tmp/groundwork.json",
      },
    },
  ],
});
