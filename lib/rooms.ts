// Pure room logic: generated names, client room-state reducers, and route
// date resolution. No I/O here — storage lives in lib/room-storage.ts.

// Word lists for generated names (adjective-animal-object, e.g.
// "purple-elephant-kite"). 48^3 ≈ 110k combos keeps collisions rare without
// importing a dictionary.
const ADJECTIVES = [
  "purple",
  "amber",
  "silver",
  "golden",
  "quiet",
  "brave",
  "gentle",
  "cosmic",
  "ruby",
  "cobalt",
  "ivory",
  "crimson",
  "azure",
  "olive",
  "maple",
  "coral",
  "indigo",
  "violet",
  "copper",
  "jade",
  "frosty",
  "misty",
  "sunny",
  "lunar",
  "solar",
  "velvety",
  "zesty",
  "mellow",
  "humble",
  "eager",
  "jolly",
  "keen",
  "noble",
  "proud",
  "rapid",
  "smooth",
  "swift",
  "tender",
  "vivid",
  "wise",
  "young",
  "bold",
  "calm",
  "dusty",
  "happy",
  "lucky",
  "snug",
  "warm",
] as const;

const ANIMALS = [
  "elephant",
  "otter",
  "falcon",
  "badger",
  "sparrow",
  "dolphin",
  "ferret",
  "gopher",
  "heron",
  "jaguar",
  "kitten",
  "lynx",
  "marten",
  "narwhal",
  "owl",
  "penguin",
  "quail",
  "rabbit",
  "squirrel",
  "turtle",
  "vole",
  "walrus",
  "yak",
  "zebra",
  "alpaca",
  "beaver",
  "coyote",
  "donkey",
  "emu",
  "fox",
  "gecko",
  "hedgehog",
  "iguana",
  "koala",
  "lizard",
  "mole",
  "newt",
  "opossum",
  "panda",
  "raccoon",
  "seal",
  "tiger",
  "urchin",
  "viper",
  "wombat",
  "antelope",
  "buffalo",
  "moose",
] as const;

const OBJECTS = [
  "kite",
  "anchor",
  "balloon",
  "cactus",
  "compass",
  "drum",
  "engine",
  "feather",
  "garden",
  "hammock",
  "island",
  "jacket",
  "kettle",
  "lantern",
  "meadow",
  "needle",
  "orchard",
  "pebble",
  "quarry",
  "river",
  "saddle",
  "tunnel",
  "umbrella",
  "violin",
  "window",
  "xylophone",
  "yarn",
  "zipline",
  "basket",
  "candle",
  "domino",
  "easel",
  "fountain",
  "goblet",
  "hourglass",
  "igloo",
  "jewel",
  "kayak",
  "locket",
  "marble",
  "nutmeg",
  "ocarina",
  "pouch",
  "quilt",
  "rocket",
  "shovel",
  "topaz",
  "whisk",
] as const;

function pick<T>(words: readonly T[], random: () => number): T {
  return words[Math.floor(random() * words.length)];
}

// Three hyphen-joined lowercase words. `random` is injectable so tests can
// pin an outcome; production uses Math.random.
export function generateRoomName(random: () => number = Math.random): string {
  return [
    pick(ADJECTIVES, random),
    pick(ANIMALS, random),
    pick(OBJECTS, random),
  ].join("-");
}

const ROOM_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The name is user-controlled key material in Redis keys and URL segments, so
// confine it to [a-z0-9-]. A date-shaped string passes — that's fine; the /r/
// prefix disambiguates routes and server-side it's just a key segment.
export function isValidRoomName(name: string): boolean {
  return name.length >= 3 && name.length <= 48 && ROOM_NAME_RE.test(name);
}

// Client-persisted browser state ("sbs:rooms:v1"). Array-shaped `joined` from
// day one: multi-room (#28) must not need a storage migration.
export interface RoomState {
  current: string | null;
  joined: string[]; // insertion-ordered, no duplicates
  lastDate: Record<string, string>; // roomName -> YYYY-MM-DD
}

export const EMPTY_ROOM_STATE: RoomState = {
  current: null,
  joined: [],
  lastDate: {},
};

// Joins a room (dedup) and makes it the browser's current one.
export function joinRoom(state: RoomState, name: string): RoomState {
  return {
    ...state,
    current: name,
    joined: state.joined.includes(name)
      ? state.joined
      : [...state.joined, name],
  };
}

// Records the room/date this browser visited. Per-browser only: rooms have no
// coordinated current-date pointer.
export function setLastDate(
  state: RoomState,
  name: string,
  date: string
): RoomState {
  return { ...state, lastDate: { ...state.lastDate, [name]: date } };
}

function parseLastDate(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof key !== "string" || typeof entry !== "string") {
      return null;
    }
    out[key] = entry;
  }
  return out;
}

// Tolerant reader: localStorage may be missing, hand-edited, or from an older
// shape — anything unexpected resolves to the empty state rather than throwing.
export function parseRoomState(raw: string | null): RoomState {
  if (raw === null) {
    return EMPTY_ROOM_STATE;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_ROOM_STATE;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return EMPTY_ROOM_STATE;
  }
  const record = parsed as Record<string, unknown>;
  const { current, joined, lastDate } = record;
  if (
    !(
      (current === null || typeof current === "string") &&
      Array.isArray(joined) &&
      joined.every((name): name is string => typeof name === "string")
    )
  ) {
    return EMPTY_ROOM_STATE;
  }
  const dates = parseLastDate(lastDate);
  if (dates === null) {
    return EMPTY_ROOM_STATE;
  }
  return { current, joined, lastDate: dates };
}

// Today in US Eastern, where puzzle dates are anchored. Unlike lib/keys.ts's
// local-time helper, `/r/<room>` landings must resolve to the same calendar
// date regardless of the visitor's timezone.
export function todayEasternISO(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD directly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
}
