export type CategoryScope = "personal" | "shared";
export type CategoryGlobalType = "movie" | "game" | "anime" | "book" | "other";

export type MediaStatus = "planned" | "in_progress" | "done";

export interface MediaItemData {
  id: string;
  categoryId: string;
  title: string;
  status: MediaStatus;
  imageUrl: string;
  sourceUrl: string | null;
  rating: number | null;
  myRating: number | null;
  partnerRating: number | null;
  partnerLabel: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  name: string;
  emoji: string;
  scope: CategoryScope;
  globalType: CategoryGlobalType;
  connectionKey: string | null;
  ownerId: string | null;
  createdBy: string;
  lastEditedByName: string | null;
  lastEditedByEmail: string | null;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedItemsData {
  items: MediaItemData[];
  total: number;
  offset: number;
  limit: number;
  range: {
    from: number;
    to: number;
  };
  hasMore: boolean;
}

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  image: string;
  connections: string[];
}

export interface DashboardData {
  user: DashboardUser;
  personalCategories: CategoryData[];
  sharedCategories: CategoryData[];
}
