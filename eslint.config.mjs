import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "docs/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "src/lib/db/migrations/**",
      "next-env.d.ts",
    ],
  },
]

export default config
