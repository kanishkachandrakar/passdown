/**
 * The campus map.
 *
 * Passdown's whole claim is that the thing you need is a short walk away, so
 * "4 min walk — Block B" has to appear on every item and match card. That
 * number is computed from the coordinates below at a normal walking pace —
 * it is not decoration and it is not invented per card.
 *
 * Coordinates are metres on a flat local grid. Swapping this file for a real
 * campus's building coordinates is the only change a new institution needs.
 */

export interface CampusArea {
  id: string;
  label: string;
  /** metres east of the main gate */
  x: number;
  /** metres north of the main gate */
  y: number;
}

export const CAMPUS_AREAS: CampusArea[] = [
  { id: "block-a", label: "Block A", x: 120, y: 340 },
  { id: "block-b", label: "Block B", x: 260, y: 400 },
  { id: "block-c", label: "Block C", x: 410, y: 360 },
  { id: "block-d", label: "Block D", x: 520, y: 180 },
  { id: "library", label: "Library", x: 300, y: 200 },
  { id: "student-center", label: "Student Center", x: 220, y: 120 },
  { id: "science", label: "Science Building", x: 480, y: 60 },
  { id: "sports", label: "Sports Complex", x: 60, y: 100 },
  { id: "main-gate", label: "Main Gate", x: 0, y: 0 },
];

/** A pickup point, which always sits inside one campus area. */
export interface PickupLocation {
  id: string;
  label: string;
  areaId: string;
}

export const PICKUP_LOCATIONS: PickupLocation[] = [
  { id: "block-a-lobby", label: "Block A Lobby", areaId: "block-a" },
  { id: "block-b-lobby", label: "Block B Lobby", areaId: "block-b" },
  { id: "block-c-lobby", label: "Block C Lobby", areaId: "block-c" },
  { id: "block-d-lobby", label: "Block D Lobby", areaId: "block-d" },
  { id: "library-entrance", label: "Library Entrance", areaId: "library" },
  { id: "student-center", label: "Student Center", areaId: "student-center" },
  { id: "science-foyer", label: "Science Building Foyer", areaId: "science" },
  { id: "sports-desk", label: "Sports Complex Desk", areaId: "sports" },
  { id: "main-gate", label: "Main Gate", areaId: "main-gate" },
];

const AREA_BY_ID = new Map(CAMPUS_AREAS.map((a) => [a.id, a]));
const PICKUP_BY_ID = new Map(PICKUP_LOCATIONS.map((p) => [p.id, p]));

/** Comfortable campus walking pace, metres per minute. */
const WALK_PACE = 78;

export function areaById(id: string | null | undefined): CampusArea | null {
  if (!id) return null;
  return AREA_BY_ID.get(id) ?? null;
}

export function areaLabel(id: string | null | undefined): string | null {
  return areaById(id)?.label ?? null;
}

export function pickupById(id: string | null | undefined): PickupLocation | null {
  if (!id) return null;
  return PICKUP_BY_ID.get(id) ?? null;
}

/** Human label for a pickup point. Falls back to the raw value for free text. */
export function pickupLabel(id: string | null | undefined): string {
  if (!id) return "Pickup point to be confirmed";
  return PICKUP_BY_ID.get(id)?.label ?? id;
}

/** The campus area a pickup point sits in. */
export function areaOfPickup(pickupId: string | null | undefined): string | null {
  return pickupById(pickupId)?.areaId ?? null;
}

export function metresBetween(fromAreaId: string, toAreaId: string): number | null {
  const a = AREA_BY_ID.get(fromAreaId);
  const b = AREA_BY_ID.get(toAreaId);
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Walking minutes between two campus areas, rounded up. Null if unknown. */
export function walkMinutes(
  fromAreaId: string | null | undefined,
  toAreaId: string | null | undefined
): number | null {
  if (!fromAreaId || !toAreaId) return null;
  if (fromAreaId === toAreaId) return 0;
  const metres = metresBetween(fromAreaId, toAreaId);
  if (metres === null) return null;
  return Math.max(1, Math.round(metres / WALK_PACE));
}

/**
 * The proximity line that appears on every item and match card.
 * Without a viewer area we still name the block — never nothing.
 */
export function proximityLabel(
  viewerAreaId: string | null | undefined,
  itemAreaId: string | null | undefined
): string {
  const item = areaById(itemAreaId);
  if (!item) return "On campus";
  if (!viewerAreaId) return item.label;
  const mins = walkMinutes(viewerAreaId, itemAreaId);
  if (mins === null) return item.label;
  if (mins === 0) return `Your block — ${item.label}`;
  return `${mins} min walk — ${item.label}`;
}

/**
 * Sort key for match and item lists. Proximity first — that is the entire
 * argument against a city-wide marketplace. Unknown areas sort last.
 */
export function proximityRank(
  viewerAreaId: string | null | undefined,
  itemAreaId: string | null | undefined
): number {
  const mins = walkMinutes(viewerAreaId, itemAreaId);
  return mins === null ? Number.MAX_SAFE_INTEGER : mins;
}
