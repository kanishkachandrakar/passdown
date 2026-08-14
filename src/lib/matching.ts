/**
 * Passdown matching.
 *
 * Plain scoring, no ML. Runs server-side when an item is released:
 * fetch open needs, score each, insert rows into `matches` above threshold.
 */

export type Condition = "new" | "like_new" | "good" | "fair";

const CONDITION_RANK: Record<Condition, number> = {
  fair: 0,
  good: 1,
  like_new: 2,
  new: 3,
};

export interface Item {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  condition: Condition;
  is_free: boolean;
  price: number;
  pickup_location: string;
  available_until: string; // ISO date
}

export interface Need {
  id: string;
  user_id: string;
  item_name: string;
  category: string;
  free_only: boolean;
  max_price: number | null;
  needed_by: string | null; // ISO date
  preferred_condition: Condition | null;
  campus_area?: string | null;
}

export interface MatchResult {
  need_id: string;
  item_id: string;
  match_score: number;
  reasons: string[];
}

export const MATCH_THRESHOLD = 40;

const normalise = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

/** Hard filters. If any fail, there is no match at all. */
function passesFilters(item: Item, need: Need): boolean {
  if (item.owner_id === need.user_id) return false;

  if (!item.is_free) {
    if (need.free_only) return false;
    if (need.max_price !== null && item.price > need.max_price) return false;
  }

  if (need.needed_by) {
    // the item must still be collectable by the time it's needed
    if (new Date(item.available_until) < new Date(need.needed_by)) return false;
  }

  return true;
}

export function scoreMatch(
  item: Item,
  need: Need,
  itemCampusArea?: string | null
): MatchResult | null {
  if (!passesFilters(item, need)) return null;

  let score = 0;
  const reasons: string[] = [];

  const itemName = normalise(item.name);
  const needName = normalise(need.item_name);

  if (itemName === needName) {
    score += 50;
    reasons.push("Exactly what you asked for");
  } else if (itemName.includes(needName) || needName.includes(itemName)) {
    score += 35;
    reasons.push("Close match to your need");
  }

  if (item.category === need.category) {
    score += 20;
    reasons.push(`Same category — ${item.category}`);
  }

  if (item.is_free) {
    score += 15;
    reasons.push("Free");
  } else if (need.max_price !== null) {
    score += 10;
    reasons.push(`Within your limit`);
  }

  if (need.preferred_condition) {
    if (CONDITION_RANK[item.condition] >= CONDITION_RANK[need.preferred_condition]) {
      score += 10;
      reasons.push(`Condition: ${item.condition.replace("_", " ")}`);
    }
  }

  // proximity — the whole point of being campus-scoped
  if (itemCampusArea && need.campus_area && itemCampusArea === need.campus_area) {
    score += 10;
    reasons.push(`Same block — ${itemCampusArea}`);
  }

  if (need.needed_by) {
    const daysOfSlack =
      (new Date(item.available_until).getTime() - new Date(need.needed_by).getTime()) /
      86_400_000;
    if (daysOfSlack >= 3) {
      score += 5;
      reasons.push("Available well before you need it");
    }
  }

  if (score < MATCH_THRESHOLD) return null;

  return { need_id: need.id, item_id: item.id, match_score: score, reasons };
}

/** Score one new item against every open need. Returns best-first. */
export function matchItemToNeeds(
  item: Item,
  needs: Need[],
  itemCampusArea?: string | null
): MatchResult[] {
  return needs
    .map((need) => scoreMatch(item, need, itemCampusArea))
    .filter((m): m is MatchResult => m !== null)
    .sort((a, b) => b.match_score - a.match_score);
}

/** For the "N students already need this" line shown right after release. */
export function countWaitingStudents(item: Item, needs: Need[]): number {
  return matchItemToNeeds(item, needs).length;
}
