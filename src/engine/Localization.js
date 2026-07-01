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
    for (const [name, replacement] of Object.entries(replacements)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
    return value;
  }
}
