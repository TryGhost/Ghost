export default {
  project: "ghost",
  server: "http://localhost:5100",
  sourceLanguage: "en",
  languages: ["en", "af", "ar", "az", "bg", "bn", "bs", "ca", "cs", "da", "de", "de-CH", "el", "eo", "es", "et", "eu", "fa", "fi", "fr", "gd", "he", "hi", "hr", "hu", "id", "is", "it", "ja", "ko", "kz", "lt", "lv", "mk", "mn", "ms", "nb", "ne", "nl", "nn", "pa", "pl", "pt", "pt-BR", "ro", "ru", "si", "sk", "sl", "sq", "sr", "sr-Cyrl", "sv", "sw", "ta", "th", "tr", "uk", "ur", "uz", "vi", "zh", "zh-Hant"],
  sources: [
    { adapter: "messages", type: "chrome", path: "packages/i18n/locales/{lang}/{ns}.json" },
  ],
};
