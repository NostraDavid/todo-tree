import * as path from 'path';
import type { FileUri, SearchMatch } from './types';

var searchResults: SearchMatch[] = [];

export function clear() {
  searchResults = [];
}

export function add(result: SearchMatch) {
  searchResults.push(result);
}

export function remove(uri: FileUri) {
  searchResults = searchResults.filter(function(match) {
    return match.uri !== uri;
  });
}

export function addToTree(tree: { add(result: SearchMatch): unknown }) {
  searchResults.map(function(match) {
    if (match.added !== true) {
      tree.add(match);
      match.added = true;
    }
  });
}

export function containsMarkdown() {
  return searchResults.filter(function(match) {
    return path.extname(match.uri.fsPath) === '.md';
  }).length > 0;
}

export function count() {
  return searchResults.length;
}

export function markAsNotAdded() {
  searchResults.forEach(function(match) {
    match.added = false;
  });
}

export function filter(filterFunction: (match: SearchMatch) => unknown) {
  searchResults = searchResults.filter(filterFunction);
}
