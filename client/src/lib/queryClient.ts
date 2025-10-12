import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Create IndexedDB persister for query cache
function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set('rs-freight-manager-query-cache', client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>('rs-freight-manager-query-cache');
    },
    removeClient: async () => {
      await del('rs-freight-manager-query-cache');
    },
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      gcTime: 1000 * 60 * 60, // 1 hour - keeps data in memory
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize IndexedDB persistence
persistQueryClient({
  queryClient,
  persister: createIDBPersister(),
  maxAge: 1000 * 60 * 60, // 1 hour - keeps data in IndexedDB
});
