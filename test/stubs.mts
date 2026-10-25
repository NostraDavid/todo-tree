import type * as attributes from '../out/src/attributes.js';
import type * as utils from '../out/src/utils.js';
type UtilityConfiguration = Parameters<typeof utils.init>[0];
type AttributeConfiguration = Parameters<typeof attributes.init>[0];
interface TestConfig extends UtilityConfiguration, AttributeConfiguration {
  shouldGroupByTagFlag: boolean;
  shouldBeCaseSensitive: boolean;
  regexSource: string;
  tagList: string[];
  subTagRegexString: string;
  globsList: string[];
  useColourScheme: boolean;
  foregroundColours: string[];
  backgroundColours: string[];
  shouldGroupByTag(): boolean;
  globs(): string[];
}
const prototype: TestConfig = {
  shouldGroupByTagFlag: false,
  shouldBeCaseSensitive: false,
  regexSource: '($TAGS)',
  tagList: ['TODO'],
  subTagRegexString: '(^:\\s*)',
  globsList: [],
  useColourScheme: false,
  foregroundColours: [],
  backgroundColours: [],
  regex() {
    return { tags: this.tagList, regex: this.regexSource, caseSensitive: this.shouldBeCaseSensitive };
  },
  shouldGroupByTag() {
    return this.shouldGroupByTagFlag;
  },
  globs() {
    return this.globsList;
  },
  tags() {
    return this.tagList;
  },
  isRegexCaseSensitive() {
    return this.shouldBeCaseSensitive;
  },
  subTagRegex() {
    return this.subTagRegexString;
  },
  shouldUseColourScheme() {
    return this.useColourScheme;
  },
  defaultHighlight() {
    return {};
  },
  customHighlight() {
    return {};
  },
  foregroundColourScheme() {
    return this.foregroundColours;
  },
  backgroundColourScheme() {
    return this.backgroundColours;
  },
};
export function getTestConfig(): TestConfig {
  return Object.create(prototype) as TestConfig;
}
