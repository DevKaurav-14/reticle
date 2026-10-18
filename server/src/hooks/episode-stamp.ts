/**
 * Which episode a run belongs to, and the commit it ran against.
 *
 * The episode log notes each episode here as it writes; the run store reads it back to stamp a run
 * with `episodeId` and `project.commit`, so a run joins to the agent's trajectory exactly instead
 * of by time and file. A leaf: it imports nothing, so both sides can reach it.
 */

export interface EpisodeStamp {
  episodeId: string;
  /** The git HEAD at the episode's start, once git has answered. */
  head?: string;
}

/** Per project root, each episode by id, and the one written to last. */
const byRoot = new Map<string, { episodes: Map<string, EpisodeStamp>; latest: string }>();

/** An episode wrote to `root`. `head` arrives later than the first call, so it may be absent. */
export function noteEpisode(root: string, episodeId: string, head?: string): void {
  const entry = byRoot.get(root) ?? {
    episodes: new Map<string, EpisodeStamp>(),
    latest: episodeId,
  };
  const known = entry.episodes.get(episodeId);
  const stamp: EpisodeStamp = { episodeId };
  const kept = head ?? known?.head;
  if (kept !== undefined) stamp.head = kept;
  entry.episodes.set(episodeId, stamp);
  // A HEAD arriving late is not a new write: it must not make an older episode the newest.
  if (head === undefined) entry.latest = episodeId;
  byRoot.set(root, entry);
}

/**
 * The episode a run written to `root` belongs to: the calling connection's, else the newest one.
 * ponytail: the newest one is a guess when two agents work one project and a run is written outside
 * any call (a session end); per-session attribution needs the session id on the run.
 */
export function episodeStampFor(root: string, attachId?: string): EpisodeStamp | undefined {
  const entry = byRoot.get(root);
  if (entry === undefined) return undefined;
  return (
    (attachId === undefined ? undefined : entry.episodes.get(attachId)) ??
    entry.episodes.get(entry.latest)
  );
}
