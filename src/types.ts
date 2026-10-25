import type { OutputChannel, Uri } from 'vscode';

export type FileUri = Pick<Uri, 'fsPath' | 'scheme' | 'authority' | 'toString'>;
export interface MatchContent {
  line: number;
  column: number;
  match: string;
  extraLines?: MatchContent[];
}
export interface SearchMatch extends MatchContent {
  uri: FileUri;
  fsPath?: string;
  added?: boolean;
  expanded?: boolean;
}
export interface RegexConfiguration {
  tags: string[];
  regex: string;
  caseSensitive: boolean;
  multiLine?: boolean;
}
export interface Highlight {
  foreground?: string;
  background?: string;
  icon?: string;
  iconColor?: string;
  iconColour?: string;
  rulerColour?: string;
  rulerLane?: string | number;
  opacity?: number;
  rulerOpacity?: number;
  borderRadius?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  gutterIcon?: boolean;
  type?: string;
  hideFromTree?: boolean;
  hideFromStatusBar?: boolean;
  hideFromActivityBar?: boolean;
}
export type ScanMode = 'workspace' | 'open files' | 'current file' | 'workspace only';
export interface TagParts {
  tag: string;
  withoutTag: string;
  before: string;
  after: string;
  tagOffset?: number;
  subTag?: string;
  text?: string;
}
export interface LabelData {
  line?: number;
  column?: number;
  actualTag?: string;
  subTag?: string;
  fsPath?: string;
  before?: string;
  after?: string;
}
export interface RipgrepOptions {
  rgPath?: string;
  regex?: string;
  additional?: unknown;
  maxBuffer?: number;
  multiline?: boolean;
  patternFileDirectory?: string;
  globs?: string[];
  filename?: string;
  outputChannel?: Pick<OutputChannel, 'appendLine'>;
}
