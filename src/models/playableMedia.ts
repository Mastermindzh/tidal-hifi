export const playableMediaTypes = ["track", "album", "playlist"] as const;
export type PlayableMediaType = (typeof playableMediaTypes)[number];

export interface PlayMediaRequest {
  type: PlayableMediaType;
  id: string;
}

export function isPlayableMediaType(type: string): type is PlayableMediaType {
  return (playableMediaTypes as readonly string[]).includes(type);
}

/**
 * Build the in-app path for a request, e.g. `/album/77646168`.
 * The id is encoded so it always stays a single path segment.
 */
export function getPlayMediaPath({ type, id }: PlayMediaRequest): string {
  return `/${type}/${encodeURIComponent(id)}`;
}
