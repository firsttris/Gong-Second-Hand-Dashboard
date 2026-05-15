export type InterestRule = {
  id: string;
  label: string;
  include_keywords: string[];
  exclude_keywords?: string[];
  max_price_eur?: number;
};

export type DashboardItem = {
  id: string;
  title: string;
  variant_title: string;
  price_eur: number | null;
  compare_at_price_eur: number | null;
  discount_percent: number | null;
  available: boolean;
  url: string;
  image_url: string | null;
  collection: string;
  item_type: "wing" | "rigid_board" | "front_wing" | "stab" | "mast" | "fuselage" | "lowkite" | "other";
  product_type: string;
  tags: string[];
  updated_at: string;
  is_new: boolean;
};

export type DashboardPayload = {
  generated_at: string;
  source: string;
  total_items: number;
  interests?: InterestRule[];
  new_items: number;
  items: DashboardItem[];
};
