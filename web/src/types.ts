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
  product_type: string;
  tags: string[];
  updated_at: string;
  matched_interests: string[];
  is_relevant: boolean;
  is_new: boolean;
};

export type DashboardPayload = {
  generated_at: string;
  source: string;
  total_items: number;
  relevant_items: number;
  new_items: number;
  items: DashboardItem[];
};
