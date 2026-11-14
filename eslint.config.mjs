import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "playwright-report/**", "test-results*/**", "lighthouse-reports/**", "public/mockServiceWorker.js"] },
  ...tseslint.configs.recommended,
);
