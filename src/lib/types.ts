import type { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Need = Database["public"]["Tables"]["needs"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type Handoff = Database["public"]["Tables"]["handoffs"]["Row"];
export type DemoDemand = Database["public"]["Tables"]["demo_demand"]["Row"];

export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type NeedStatus = Database["public"]["Enums"]["need_status"];
export type ItemCondition = Database["public"]["Enums"]["item_condition"];
export type ReservationStatus = Database["public"]["Enums"]["reservation_status"];
export type HandoffStatus = Database["public"]["Enums"]["handoff_status"];

/**
 * Categories are a fixed list rather than free text — two students typing
 * "kitchen" and "Kitchen stuff" should still match on category.
 */
export const CATEGORIES = [
  "Dorm",
  "Electronics",
  "Furniture",
  "Kitchen",
  "Books & Study",
  "Lab & Course Kit",
  "Sports",
  "Clothing",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};
