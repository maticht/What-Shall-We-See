export type CategoryScope = "personal" | "shared";

export type MediaStatus = "planned" | "in_progress" | "done";

export interface MediaItemData {
  id: string;
  title: string;
  status: MediaStatus;
  imageUrl: string;
  rating: number | null;
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  name: string;
  scope: CategoryScope;
  connectionKey: string | null;
  ownerId: string | null;
  createdBy: string;
  items: MediaItemData[];
  createdAt: string;
  updatedAt: string;
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
