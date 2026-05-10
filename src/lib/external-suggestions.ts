import type { CategoryGlobalType } from "@/types/app";

export type SuggestionLanguage = "ru" | "en";
export type SuggestionProvider = "tmdb" | "igdb" | "shikimori" | "openlibrary";

export interface ItemSuggestion {
  id: string;
  provider: SuggestionProvider;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  sourceUrl: string;
  rating: number | null;
}

interface SuggestionSearchInput {
  globalType: CategoryGlobalType;
  query: string;
  language: SuggestionLanguage;
  limit: number;
}

interface SuggestionSearchResult {
  suggestions: ItemSuggestion[];
  warning: string | null;
}

interface CachedIgdbToken {
  value: string;
  expiresAt: number;
}

declare global {
  var __igdbTokenCache: CachedIgdbToken | undefined;
}

async function fetchJson<T>(url: string | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`External request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit) || Number.isNaN(limit)) {
    return 8;
  }

  return Math.max(1, Math.min(Math.trunc(limit), 12));
}

function formatYear(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
  }

  if (typeof value === "number") {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
  }

  return null;
}

function trimToNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next || null;
}

function normalizeRating(value: unknown, divider = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = value / divider;

  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.max(0, Math.min(10, Number(normalized.toFixed(1))));
}

function tmdbLanguageFor(input: SuggestionLanguage) {
  return input === "ru" ? "ru-RU" : "en-US";
}

async function searchTmdb(
  query: string,
  language: SuggestionLanguage,
  limit: number,
): Promise<ItemSuggestion[]> {
  const token = trimToNull(process.env.TMDB_ACCESS_TOKEN);
  const apiKey = trimToNull(process.env.TMDB_API_KEY);

  if (!token && !apiKey) {
    throw new Error("TMDB credentials are not configured.");
  }

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("query", query);
  url.searchParams.set("language", tmdbLanguageFor(language));
  url.searchParams.set("page", "1");
  url.searchParams.set("include_adult", "false");

  if (!token && apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  type TmdbResult = {
    id?: number;
    media_type?: string;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    poster_path?: string | null;
    vote_average?: number | null;
    release_date?: string;
    first_air_date?: string;
  };

  const payload = await fetchJson<{ results?: TmdbResult[] }>(url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        }
      : {
          Accept: "application/json",
        },
    next: { revalidate: 0 },
  });

  return (payload.results ?? [])
    .filter((result) => result.media_type === "movie" || result.media_type === "tv")
    .slice(0, limit)
    .map((result) => {
      const title =
        trimToNull(result.title) ??
        trimToNull(result.name) ??
        trimToNull(result.original_title) ??
        trimToNull(result.original_name) ??
        "Untitled";
      const releaseYear = formatYear(result.release_date ?? result.first_air_date);
      const mediaType = result.media_type === "tv" ? "tv" : "movie";
      const posterPath = trimToNull(result.poster_path);
      const sourceId = typeof result.id === "number" ? String(result.id) : title;

      return {
        id: `tmdb:${sourceId}`,
        provider: "tmdb" as const,
        title,
        subtitle: releaseYear ? `${releaseYear} • TMDB` : "TMDB",
        imageUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "",
        sourceUrl:
          typeof result.id === "number"
            ? `https://www.themoviedb.org/${mediaType}/${result.id}`
            : "https://www.themoviedb.org",
        rating: normalizeRating(result.vote_average),
      };
    });
}

async function getIgdbAccessToken() {
  const cached = global.__igdbTokenCache;

  if (cached && cached.expiresAt > Date.now() + 15_000) {
    return cached.value;
  }

  const clientId = trimToNull(process.env.IGDB_CLIENT_ID);
  const clientSecret = trimToNull(process.env.IGDB_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("IGDB credentials are not configured.");
  }

  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const tokenPayload = await fetchJson<{ access_token?: string; expires_in?: number }>(
    tokenUrl,
    {
      method: "POST",
      next: { revalidate: 0 },
    },
  );

  const token = trimToNull(tokenPayload.access_token);

  if (!token) {
    throw new Error("IGDB token request failed.");
  }

  const expiresIn =
    typeof tokenPayload.expires_in === "number" && tokenPayload.expires_in > 0
      ? tokenPayload.expires_in
      : 3600;

  global.__igdbTokenCache = {
    value: token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}

function normalizeIgdbCoverUrl(value: unknown) {
  const raw = trimToNull(value);

  if (!raw) {
    return "";
  }

  const withProtocol = raw.startsWith("//") ? `https:${raw}` : raw;
  return withProtocol.replace("/t_thumb/", "/t_cover_big/");
}

async function searchIgdb(query: string, limit: number): Promise<ItemSuggestion[]> {
  const clientId = trimToNull(process.env.IGDB_CLIENT_ID);

  if (!clientId) {
    throw new Error("IGDB credentials are not configured.");
  }

  const token = await getIgdbAccessToken();

  type IgdbResult = {
    id?: number;
    name?: string;
    rating?: number | null;
    url?: string | null;
    first_release_date?: number | null;
    cover?: {
      url?: string | null;
    } | null;
  };

  const payload = await fetchJson<IgdbResult[]>("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: `search "${query.replaceAll('"', '\\"')}"; fields name,rating,url,first_release_date,cover.url; limit ${limit};`,
    next: { revalidate: 0 },
  });

  return payload.slice(0, limit).map((result) => {
    const title = trimToNull(result.name) ?? "Untitled";
    const year = formatYear(result.first_release_date);
    const sourceUrl = trimToNull(result.url) ?? "https://www.igdb.com";
    const sourceId = typeof result.id === "number" ? String(result.id) : title;

    return {
      id: `igdb:${sourceId}`,
      provider: "igdb" as const,
      title,
      subtitle: year ? `${year} • IGDB` : "IGDB",
      imageUrl: normalizeIgdbCoverUrl(result.cover?.url),
      sourceUrl,
      rating: normalizeRating(result.rating, 10),
    };
  });
}

function normalizeShikimoriImage(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const source = value as {
    original?: string;
    preview?: string;
    x96?: string;
    x48?: string;
  };

  const path =
    trimToNull(source.original) ??
    trimToNull(source.preview) ??
    trimToNull(source.x96) ??
    trimToNull(source.x48);

  if (!path) {
    return "";
  }

  return path.startsWith("http") ? path : `https://shikimori.one${path}`;
}

async function searchShikimori(query: string, limit: number): Promise<ItemSuggestion[]> {
  const url = new URL("https://shikimori.one/api/animes");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", String(Math.min(50, limit)));
  url.searchParams.set("order", "ranked");

  type ShikimoriResult = {
    id?: number;
    name?: string;
    russian?: string;
    score?: string | number | null;
    aired_on?: string | null;
    url?: string | null;
    image?: {
      original?: string;
      preview?: string;
      x96?: string;
      x48?: string;
    } | null;
  };

  const payload = await fetchJson<ShikimoriResult[]>(url, {
    headers: {
      "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  return payload.slice(0, limit).map((result) => {
    const preferredTitle = trimToNull(result.russian) ?? trimToNull(result.name) ?? "Untitled";
    const year = formatYear(result.aired_on);
    const rawUrl = trimToNull(result.url) ?? "/animes";
    const scoreNumber =
      typeof result.score === "string" ? Number(result.score) : result.score ?? null;
    const sourceId = typeof result.id === "number" ? String(result.id) : preferredTitle;

    return {
      id: `shikimori:${sourceId}`,
      provider: "shikimori" as const,
      title: preferredTitle,
      subtitle: year ? `${year} • Shikimori` : "Shikimori",
      imageUrl: normalizeShikimoriImage(result.image),
      sourceUrl: rawUrl.startsWith("http") ? rawUrl : `https://shikimori.one${rawUrl}`,
      rating: normalizeRating(scoreNumber),
    };
  });
}

async function searchOpenLibrary(
  query: string,
  language: SuggestionLanguage,
  limit: number,
): Promise<ItemSuggestion[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", language);
  url.searchParams.set("limit", String(limit));

  type OpenLibraryResult = {
    key?: string;
    title?: string;
    author_name?: string[];
    first_publish_year?: number;
    cover_i?: number;
  };

  const payload = await fetchJson<{ docs?: OpenLibraryResult[] }>(url, {
    headers: {
      "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  return (payload.docs ?? []).slice(0, limit).map((result) => {
    const title = trimToNull(result.title) ?? "Untitled";
    const year =
      typeof result.first_publish_year === "number"
        ? String(result.first_publish_year)
        : null;
    const author = Array.isArray(result.author_name)
      ? trimToNull(result.author_name[0])
      : null;
    const subtitleParts = [year, author, "Open Library"].filter(Boolean);

    return {
      id: `openlibrary:${result.key ?? title}`,
      provider: "openlibrary" as const,
      title,
      subtitle: subtitleParts.length ? subtitleParts.join(" • ") : "Open Library",
      imageUrl:
        typeof result.cover_i === "number"
          ? `https://covers.openlibrary.org/b/id/${result.cover_i}-M.jpg`
          : "",
      sourceUrl: result.key
        ? `https://openlibrary.org${result.key}`
        : "https://openlibrary.org",
      rating: null,
    };
  });
}

export async function searchExternalCatalogSuggestions(
  input: SuggestionSearchInput,
): Promise<SuggestionSearchResult> {
  const query = input.query.trim();

  if (query.length < 2) {
    return { suggestions: [], warning: null };
  }

  const limit = clampLimit(input.limit);

  try {
    switch (input.globalType) {
      case "movie":
        return {
          suggestions: await searchTmdb(query, input.language, limit),
          warning: null,
        };
      case "game":
        return {
          suggestions: await searchIgdb(query, limit),
          warning: null,
        };
      case "anime":
        return {
          suggestions: await searchShikimori(query, limit),
          warning: null,
        };
      case "book":
        return {
          suggestions: await searchOpenLibrary(query, input.language, limit),
          warning: null,
        };
      case "other":
      default:
        return {
          suggestions: [],
          warning: null,
        };
    }
  } catch (error) {
    const fallbackMessage =
      error instanceof Error ? error.message : "External provider is unavailable.";

    return {
      suggestions: [],
      warning: fallbackMessage,
    };
  }
}
