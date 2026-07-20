export class Localization {
  constructor(strings, language = "bg") {
    this.strings = strings;
    this.language = language;
  }

  setLanguage(language) {
    this.language = language;
  }

  t(key, replacements = {}) {
    const table = this.strings[this.language] || {};
    let value = table[key] || this.strings.en?.[key] || key;
    const replace = (part) => {
      let result = String(part);
      for (const [name, replacement] of Object.entries(replacements)) {
        result = result.replaceAll(`{${name}}`, replacement);
      }
      return result;
    };
    if (Array.isArray(value)) return value.map(replace);
    return replace(value);
  }
}
