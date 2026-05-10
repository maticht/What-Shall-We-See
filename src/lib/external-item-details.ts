import type { CategoryGlobalType } from "@/types/app";

export type DetailLanguage = "ru" | "en";

export interface ExternalItemDetails {
  provider: "tmdb" | "igdb" | "shikimori" | "openlibrary" | "none";
  title: string | null;
  description: string | null;
  globalRating: number | null;
  year: string | null;
  author: string | null;
  genres: string[];
  imageUrl: string;
  sourceUrl: string | null;
  extras: Array<{ label: string; value: string }>;
}

interface ResolveDetailsInput {
  globalType: CategoryGlobalType;
  title: string;
  sourceUrl: string | null;
  language: DetailLanguage;
}

interface CachedIgdbToken {
  value: string;
  expiresAt: number;
}

declare global {
  var __igdbTokenCache: CachedIgdbToken | undefined;
}

function trimToNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next || null;
}

function clampRating(value: unknown, divider = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = value / divider;

  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.max(0, Math.min(10, Number(normalized.toFixed(1))));
}

function parseYear(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : String(parsed.getUTCFullYear());
  }

  if (typeof value === "number") {
    const parsed = new Date(value * 1000);
    return Number.isNaN(parsed.getTime()) ? null : String(parsed.getUTCFullYear());
  }

  return null;
}

function stripHtmlAndBbCode(value: string | null) {
  if (!value) {
    return null;
  }

  const withoutHtml = value.replace(/<[^>]*>/g, " ");
  const withoutBbCode = withoutHtml.replace(/\[[^\]]+\]/g, " ");
  const compact = withoutBbCode.replace(/\s+/g, " ").trim();
  return compact || null;
}

async function fetchJson<T>(url: string | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`External request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

function tmdbLanguage(language: DetailLanguage) {
  return language === "ru" ? "ru-RU" : "en-US";
}

function inferGlobalTypeFromSourceUrl(sourceUrl: string | null): CategoryGlobalType | null {
  const source = trimToNull(sourceUrl);

  if (!source) {
    return null;
  }

  if (source.includes("themoviedb.org")) {
    return "movie";
  }

  if (source.includes("igdb.com")) {
    return "game";
  }

  if (source.includes("shikimori.one")) {
    return "anime";
  }

  if (source.includes("openlibrary.org")) {
    return "book";
  }

  return null;
}

function parseTmdbSource(sourceUrl: string | null) {
  const source = trimToNull(sourceUrl);

  if (!source) {
    return null;
  }

  const match = source.match(/themoviedb\.org\/(movie|tv|collection)\/(\d+)/i);

  if (!match) {
    return null;
  }

  return {
    mediaType: (match[1] === "tv"
      ? "tv"
      : match[1] === "collection"
        ? "collection"
        : "movie") as "movie" | "tv" | "collection",
    id: Number.parseInt(match[2], 10),
  };
}

async function tmdbRequest<T>(
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const token = trimToNull(process.env.TMDB_ACCESS_TOKEN);
  const apiKey = trimToNull(process.env.TMDB_API_KEY);

  if (!token && !apiKey) {
    throw new Error("TMDB credentials are not configured.");
  }

  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (!token && apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  return fetchJson<T>(url, {
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
}

async function getTmdbDetails(input: ResolveDetailsInput): Promise<ExternalItemDetails> {
  const source = parseTmdbSource(input.sourceUrl);
  let mediaType: "movie" | "tv" | "collection" = source?.mediaType ?? "movie";
  let mediaId = source?.id ?? null;

  if (!mediaId) {
    const searchPayload = await tmdbRequest<{
      results?: Array<{
        id?: number;
        media_type?: string;
      }>;
    }>("search/multi", new URLSearchParams({
      query: input.title,
      language: tmdbLanguage(input.language),
      page: "1",
      include_adult: "false",
    }));

    const first = (searchPayload.results ?? []).find(
      (result) => result.media_type === "movie" || result.media_type === "tv",
    );

    if (!first?.id) {
      return {
        provider: "tmdb",
        title: input.title,
        description: null,
        globalRating: null,
        year: null,
        author: null,
        genres: [],
        imageUrl: "",
        sourceUrl: input.sourceUrl,
        extras: [],
      };
    }

    mediaType = first.media_type === "tv" ? "tv" : "movie";
    mediaId = first.id;
  }

  if (mediaType === "collection") {
    const details = await tmdbRequest<{
      name?: string;
      overview?: string;
      poster_path?: string | null;
      parts?: Array<{
        release_date?: string;
      }>;
    }>(`collection/${mediaId}`, new URLSearchParams({
      language: tmdbLanguage(input.language),
    }));

    const years = (details.parts ?? [])
      .map((part) => parseYear(part.release_date))
      .filter((value): value is string => Boolean(value));
    const minYear = years.length ? years.sort()[0] : null;

    return {
      provider: "tmdb",
      title: trimToNull(details.name) ?? input.title,
      description: stripHtmlAndBbCode(trimToNull(details.overview)),
      globalRating: null,
      year: minYear,
      author: null,
      genres: [],
      imageUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : "",
      sourceUrl: `https://www.themoviedb.org/collection/${mediaId}`,
      extras: [],
    };
  }

  const details = await tmdbRequest<{
    title?: string;
    name?: string;
    overview?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    genres?: Array<{ name?: string }>;
    poster_path?: string | null;
    runtime?: number;
    number_of_episodes?: number;
  }>(`${mediaType}/${mediaId}`, new URLSearchParams({
    language: tmdbLanguage(input.language),
  }));

  const year = parseYear(details.release_date ?? details.first_air_date);
  const genres = (details.genres ?? [])
    .map((genre) => trimToNull(genre.name))
    .filter((value): value is string => Boolean(value));

  const extras: Array<{ label: string; value: string }> = [];

  if (typeof details.runtime === "number" && details.runtime > 0) {
    extras.push({ label: "Runtime", value: `${details.runtime} min` });
  }

  if (
    typeof details.number_of_episodes === "number" &&
    details.number_of_episodes > 0
  ) {
    extras.push({
      label: "Episodes",
      value: String(details.number_of_episodes),
    });
  }

  return {
    provider: "tmdb",
    title: trimToNull(details.title) ?? trimToNull(details.name) ?? input.title,
    description: stripHtmlAndBbCode(trimToNull(details.overview)),
    globalRating: clampRating(details.vote_average),
    year,
    author: null,
    genres,
    imageUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : "",
    sourceUrl: `https://www.themoviedb.org/${mediaType}/${mediaId}`,
    extras,
  };
}

async function getIgdbToken() {
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
    { method: "POST", next: { revalidate: 0 } },
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

function normalizeIgdbCover(value: unknown) {
  const raw = trimToNull(value);

  if (!raw) {
    return "";
  }

  const withProtocol = raw.startsWith("//") ? `https:${raw}` : raw;
  return withProtocol.replace("/t_thumb/", "/t_cover_big/");
}

function parseIgdbSlug(sourceUrl: string | null) {
  const source = trimToNull(sourceUrl);

  if (!source) {
    return null;
  }

  const match = source.match(/igdb\.com\/games\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

async function getIgdbDetails(input: ResolveDetailsInput): Promise<ExternalItemDetails> {
  const clientId = trimToNull(process.env.IGDB_CLIENT_ID);

  if (!clientId) {
    throw new Error("IGDB credentials are not configured.");
  }

  const token = await getIgdbToken();

  type Game = {
    id?: number;
    name?: string;
    summary?: string;
    rating?: number;
    first_release_date?: number;
    genres?: Array<{ name?: string }>;
    url?: string;
    cover?: { url?: string };
    involved_companies?: Array<{
      company?: { name?: string };
      developer?: boolean;
      publisher?: boolean;
    }>;
  };

  const fields =
    "fields name,summary,rating,first_release_date,genres.name,url,cover.url,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,slug;";
  const slug = parseIgdbSlug(input.sourceUrl);
  const escaped = input.title.replaceAll('"', "\\\"");
  const body = slug
    ? `${fields} where slug = "${slug}"; limit 1;`
    : `${fields} search "${escaped}"; where version_parent = null; limit 1;`;

  const results = await fetchJson<Game[]>("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
      Accept: "application/json",
    },
    body,
    next: { revalidate: 0 },
  });

  const game = results[0];

  if (!game) {
    return {
      provider: "igdb",
      title: input.title,
      description: null,
      globalRating: null,
      year: null,
      author: null,
      genres: [],
      imageUrl: "",
      sourceUrl: input.sourceUrl,
      extras: [],
    };
  }

  const company = (game.involved_companies ?? []).find(
    (entry) => entry.developer || entry.publisher,
  );

  return {
    provider: "igdb",
    title: trimToNull(game.name) ?? input.title,
    description: stripHtmlAndBbCode(trimToNull(game.summary)),
    globalRating: clampRating(game.rating, 10),
    year: parseYear(game.first_release_date),
    author: trimToNull(company?.company?.name),
    genres: (game.genres ?? [])
      .map((genre) => trimToNull(genre.name))
      .filter((value): value is string => Boolean(value)),
    imageUrl: normalizeIgdbCover(game.cover?.url),
    sourceUrl: trimToNull(game.url) ?? input.sourceUrl,
    extras: [],
  };
}

function parseShikimoriId(sourceUrl: string | null) {
  const source = trimToNull(sourceUrl);

  if (!source) {
    return null;
  }

  const match = source.match(/shikimori\.one\/animes\/(\d+)/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
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

async function getShikimoriDetails(input: ResolveDetailsInput): Promise<ExternalItemDetails> {
  let id = parseShikimoriId(input.sourceUrl);

  if (!id) {
    const searchUrl = new URL("https://shikimori.one/api/animes");
    searchUrl.searchParams.set("search", input.title);
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("order", "ranked");

    const searchPayload = await fetchJson<Array<{ id?: number }>>(searchUrl, {
      headers: {
        "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    id = searchPayload[0]?.id ?? null;
  }

  if (!id) {
    return {
      provider: "shikimori",
      title: input.title,
      description: null,
      globalRating: null,
      year: null,
      author: null,
      genres: [],
      imageUrl: "",
      sourceUrl: input.sourceUrl,
      extras: [],
    };
  }

  const details = await fetchJson<{
    id?: number;
    name?: string;
    russian?: string;
    score?: string | number;
    description?: string;
    aired_on?: string;
    released_on?: string;
    url?: string;
    genres?: Array<{ name?: string; russian?: string }>;
    studios?: Array<{ name?: string }>;
    image?: { original?: string; preview?: string; x96?: string; x48?: string };
    episodes?: number;
    duration?: number;
  }>(`https://shikimori.one/api/animes/${id}`, {
    headers: {
      "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  const scoreNumber =
    typeof details.score === "string" ? Number(details.score) : details.score;
  const studio = (details.studios ?? []).find((entry) => trimToNull(entry.name));
  const extras: Array<{ label: string; value: string }> = [];

  if (typeof details.episodes === "number" && details.episodes > 0) {
    extras.push({ label: "Episodes", value: String(details.episodes) });
  }

  if (typeof details.duration === "number" && details.duration > 0) {
    extras.push({ label: "Duration", value: `${details.duration} min` });
  }

  return {
    provider: "shikimori",
    title: trimToNull(details.russian) ?? trimToNull(details.name) ?? input.title,
    description: stripHtmlAndBbCode(trimToNull(details.description)),
    globalRating: clampRating(scoreNumber),
    year: parseYear(details.aired_on ?? details.released_on),
    author: trimToNull(studio?.name),
    genres: (details.genres ?? [])
      .map((genre) => trimToNull(genre.russian) ?? trimToNull(genre.name))
      .filter((value): value is string => Boolean(value)),
    imageUrl: normalizeShikimoriImage(details.image),
    sourceUrl: trimToNull(details.url)
      ? `https://shikimori.one${details.url}`
      : input.sourceUrl,
    extras,
  };
}

function parseOpenLibraryWorkKey(sourceUrl: string | null) {
  const source = trimToNull(sourceUrl);

  if (!source) {
    return null;
  }

  const match = source.match(/openlibrary\.org\/(works\/OL[^/]+)/i);
  return match ? `/${match[1]}` : null;
}

async function getOpenLibraryDetails(input: ResolveDetailsInput): Promise<ExternalItemDetails> {
  let workKey = parseOpenLibraryWorkKey(input.sourceUrl);

  if (!workKey) {
    const searchUrl = new URL("https://openlibrary.org/search.json");
    searchUrl.searchParams.set("q", input.title);
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("lang", input.language);

    const searchPayload = await fetchJson<{
      docs?: Array<{
        key?: string;
      }>;
    }>(searchUrl, {
      headers: {
        "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    workKey = trimToNull(searchPayload.docs?.[0]?.key) ?? null;
  }

  if (!workKey) {
    return {
      provider: "openlibrary",
      title: input.title,
      description: null,
      globalRating: null,
      year: null,
      author: null,
      genres: [],
      imageUrl: "",
      sourceUrl: input.sourceUrl,
      extras: [],
    };
  }

  const work = await fetchJson<{
    title?: string;
    description?: string | { value?: string };
    subjects?: string[];
    first_publish_date?: string;
    authors?: Array<{ author?: { key?: string } }>;
    covers?: number[];
  }>(`https://openlibrary.org${workKey}.json`, {
    headers: {
      "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  let author: string | null = null;
  const authorKey = trimToNull(work.authors?.[0]?.author?.key);

  if (authorKey) {
    try {
      const authorPayload = await fetchJson<{ name?: string }>(
        `https://openlibrary.org${authorKey}.json`,
        {
          headers: {
            "User-Agent": "what-shall-we-see/1.0 (contact: local-app)",
            Accept: "application/json",
          },
          next: { revalidate: 0 },
        },
      );
      author = trimToNull(authorPayload.name);
    } catch {
      author = null;
    }
  }

  const descriptionValue =
    typeof work.description === "string"
      ? work.description
      : trimToNull(work.description?.value);

  return {
    provider: "openlibrary",
    title: trimToNull(work.title) ?? input.title,
    description: stripHtmlAndBbCode(trimToNull(descriptionValue)),
    globalRating: null,
    year: parseYear(work.first_publish_date),
    author,
    genres: (work.subjects ?? [])
      .slice(0, 6)
      .map((subject) => trimToNull(subject))
      .filter((value): value is string => Boolean(value)),
    imageUrl:
      typeof work.covers?.[0] === "number"
        ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`
        : "",
    sourceUrl: `https://openlibrary.org${workKey}`,
    extras: [],
  };
}

export async function resolveExternalItemDetails(
  input: ResolveDetailsInput,
): Promise<ExternalItemDetails> {
  const inferredGlobalType = inferGlobalTypeFromSourceUrl(input.sourceUrl);
  const effectiveGlobalType =
    input.globalType === "other"
      ? (inferredGlobalType ?? "other")
      : input.globalType;

  if (effectiveGlobalType === "other") {
    return {
      provider: "none",
      title: input.title,
      description: null,
      globalRating: null,
      year: null,
      author: null,
      genres: [],
      imageUrl: "",
      sourceUrl: input.sourceUrl,
      extras: [],
    };
  }

  try {
    switch (effectiveGlobalType) {
      case "movie":
        return await getTmdbDetails(input);
      case "game":
        return await getIgdbDetails(input);
      case "anime":
        return await getShikimoriDetails(input);
      case "book":
        return await getOpenLibraryDetails(input);
      default:
        return {
          provider: "none",
          title: input.title,
          description: null,
          globalRating: null,
          year: null,
          author: null,
          genres: [],
          imageUrl: "",
          sourceUrl: input.sourceUrl,
          extras: [],
        };
    }
  } catch {
    return {
      provider: "none",
      title: input.title,
      description: null,
      globalRating: null,
      year: null,
      author: null,
      genres: [],
      imageUrl: "",
      sourceUrl: input.sourceUrl,
      extras: [],
    };
  }
}
