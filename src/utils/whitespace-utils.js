import escapeStringRegexp from "escape-string-regexp"

class WhitespaceUtils {
  #characters;

  constructor(characters) {
    this.#characters = new Set(characters);
  }

  getLeadingWhitespaceCount(string) {
    const characters = this.#characters;
    let count = 0;

    for (let index = 0; index < string.length; index ++) {
      if (characters.has(string.charAt(index))) {
        count ++
      } else {
        break
      }
    }

    return count;
  }

  getTrailingWhitespaceCount(string) {
    const characters = this.#characters;
    let count = 0;

    for (let index = string.length - 1; index >= 0; index --) {
      if (characters.has(string.charAt(index))) {
        count ++
      } else {
        break
      }
    }

    return count;
  }

  getLeadingWhitespace(string) {
    const count = this.getLeadingWhitespaceCount(string)
    return count === 0 ? "" : string.slice(0, count);
  }

  getTrailingWhitespace(string) {
    const count = this.getTrailingWhitespaceCount(string)
    return count === 0 ? "" : string.slice(-count);
  }

  hasLeadingWhitespace(string) {
    const characters = this.#characters;
    return characters.has(string.charAt(0))
  }

  hasTrailingWhitespace(string) {
    const characters = this.#characters;
    return characters.has(string.at(- 1))
  }

  trimStart(string) {
    const count = this.getLeadingWhitespaceCount(string)
    return count === 0 ? string : string.slice(count);
  }

  trimEnd(string) {
    const count = this.getTrailingWhitespaceCount(string)
    return count === 0 ? string : string.slice(0, -count);
  }

  trim(string) {
    return this.trimEnd(this.trimStart(string))
  }

  split(string, captureWhitespace = false) {
    const pattern = `[${escapeStringRegexp([...this.#characters].join(""))}]+`
    const regexp = new RegExp(captureWhitespace ? `(${pattern})` : pattern)
    return string.split(regexp)
  }

  hasWhitespaceCharacter(string) {
    const characters = this.#characters;

    for (let index = 0; index < string.length; index ++) {
      if (characters.has(string.charAt(index))) {
        return true
      }
    }

    return false;
  }

  hasNonWhitespaceCharacter(string) {
    const characters = this.#characters;

    for (let index = 0; index < string.length; index ++) {
      if (!characters.has(string.charAt(index))) {
        return true
      }
    }

    return false;
  }

  isWhitespaceOnly(string) {
    return this.getLeadingWhitespaceCount(string) === string.length
  }
}

export default WhitespaceUtils;
