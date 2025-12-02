import { defineConfig } from 'i18next-cli';

const pathsConfig: Record<string, string | string[]> = {
  'portal': [
    '../../apps/portal/src/**/*.{js,jsx,ts,tsx}'
  ],
  'signup-form': [
    '../../apps/signup-form/src/**/*.{ts,tsx}'
  ],
  'comments': [
    '../../apps/comments-ui/src/**/*.{ts,tsx}'
  ],
  'search': [
    '../../apps/sodo-search/src/**/*.{js,jsx,ts,tsx}'
  ],
  'ghost': [
    '../core/core/{frontend,server,shared}/**/*.{js,jsx}',
    '../core/core/server/services/email-service/email-templates/**/*.hbs',
    '../core/core/server/services/comments/email-templates/**/*.hbs'
  ]
};

const namespace = process.env.NAMESPACE || 'portal';

export default defineConfig({
  "locales": [
    "af",
    "ar",
    "bg",
    "bn",
    "bs",
    "ca",
    "cs",
    "da",
    "de",
    "de-CH",
    "el",
    "en",
    "eo",
    "es",
    "et",
    "eu",
    "fa",
    "fi",
    "fr",
    "gd",
    "he",
    "hi",
    "hr",
    "hu",
    "id",
    "is",
    "it",
    "ja",
    "ko",
    "kz",
    "lt",
    "lv",
    "mk",
    "mn",
    "ms",
    "nb",
    "ne",
    "nl",
    "nn",
    "pa",
    "pl",
    "pt",
    "pt-BR",
    "ro",
    "ru",
    "si",
    "sk",
    "sl",
    "sq",
    "sr",
    "sr-Cyrl",
    "sv",
    "th",
    "tr",
    "uk",
    "ur",
    "uz",
    "vi",
    "zh",
    "zh-Hant",
    "sw",
    "ta"
  ],
  "extract": {
    "input": pathsConfig[namespace],
    "output": `locales/{{language}}/${namespace}.json`,
    "defaultNS": false,
    "keySeparator": false,
    "nsSeparator": false,
    "functions": [
      "t",
      "*.t"
    ],
    "transComponents": [
      "Trans"
    ],
    "primaryLanguage": "en",
    "ignore": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}"
    ]
  },
  "types": {
    "input": [
      "locales/{{language}}/{{namespace}}.json"
    ],
    "output": "src/types/i18next.d.ts"
  }
});