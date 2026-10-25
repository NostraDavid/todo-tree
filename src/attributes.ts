import type { Highlight } from './types';
type Configuration = Pick<
  typeof import('./config'),
  | 'isRegexCaseSensitive'
  | 'customHighlight'
  | 'defaultHighlight'
  | 'tags'
  | 'shouldUseColourScheme'
  | 'foregroundColourScheme'
  | 'backgroundColourScheme'
>;
var config: Configuration;

export function init(configuration: Configuration) {
  config = configuration;
}

export function getAttribute<K extends keyof Highlight>(
  tag: string,
  attribute: K,
  defaultValue: NonNullable<Highlight[K]>,
  ignoreDefaultHighlight?: boolean,
): NonNullable<Highlight[K]>;
export function getAttribute<K extends keyof Highlight>(
  tag: string,
  attribute: K,
  defaultValue: undefined,
  ignoreDefaultHighlight?: boolean,
): Highlight[K];
export function getAttribute<K extends keyof Highlight>(
  tag: string,
  attribute: K,
  defaultValue: Highlight[K],
  ignoreDefaultHighlight?: boolean,
): Highlight[K] {
  function getCustomHighlightSettings(customHighlight: Record<string, Highlight>, tag: string): Highlight | undefined {
    var result: Highlight | undefined;
    Object.keys(customHighlight).map(function(t) {
      var flags = '';
      if (config.isRegexCaseSensitive() === false) {
        flags += 'i';
      }
      t = t.replace(/\\/g, '\\\\');
      t = t.replace(/[|{}()[\]^$+*?.-]/g, '\\$&');

      var regex = new RegExp(t, flags);

      if (tag.match(regex)) {
        result = customHighlight[tag];
      }
    });
    return result;
  }

  var tagSettings = getCustomHighlightSettings(config.customHighlight(), tag);
  if (tagSettings && tagSettings[attribute] !== undefined) {
    return tagSettings[attribute];
  } else if (ignoreDefaultHighlight !== true) {
    var defaultHighlight = config.defaultHighlight();
    if (defaultHighlight[attribute] !== undefined) {
      return defaultHighlight[attribute];
    }
  }
  return defaultValue;
}

export function getIcon(tag: string) {
  return getAttribute(tag, 'icon', undefined);
}

export function getIconColour(tag: string) {
  var useColourScheme = config.shouldUseColourScheme();

  var colour = getAttribute(tag, 'iconColor', undefined);
  if (colour === undefined) {
    colour = getAttribute(tag, 'iconColour', undefined, useColourScheme);
  }
  if (colour === undefined && useColourScheme) {
    colour = getSchemeColour(tag, config.backgroundColourScheme());
  }

  if (colour === undefined) {
    var foreground = getAttribute(tag, 'foreground', undefined, useColourScheme);
    var background = getAttribute(tag, 'background', undefined, useColourScheme);

    colour = foreground ? foreground : (background ? background : 'green');
  }

  return colour;
}

function getSchemeColour(tag: string, colours: string[]): string | undefined {
  var index = config.tags().indexOf(tag);
  if (colours && colours.length > 0) {
    return colours[index % colours.length];
  }
}

export function getForeground(tag: string) {
  var useColourScheme = config.shouldUseColourScheme();
  var colour = getAttribute(tag, 'foreground', undefined, useColourScheme);
  if (colour === undefined && useColourScheme) {
    colour = getSchemeColour(tag, config.foregroundColourScheme());
  }
  return colour;
}

export function getBackground(tag: string) {
  var useColourScheme = config.shouldUseColourScheme();
  var colour = getAttribute(tag, 'background', undefined, useColourScheme);
  if (colour === undefined && useColourScheme) {
    colour = getSchemeColour(tag, config.backgroundColourScheme());
  }
  return colour;
}
