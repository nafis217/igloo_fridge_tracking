import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_URLS = [
  "http://localhost:5047/api",
  "http://127.0.0.1:5047/api",
  process.env.EXPO_PUBLIC_API_URL,
  typeof window !== "undefined" ? `http://${window.location.hostname}:5047/api` : undefined,
  "http://localhost:5050/api",
  "http://127.0.0.1:5050/api",
].filter((value): value is string => Boolean(value && value.trim()));

const TOKEN_KEY = "iglootrack_token";
const QUEUE_KEY = "iglootrack_sync_queue";

type CompanyLoginResponse = {
  isValid: boolean;
  message: string;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  let lastError: unknown;

  for (const baseUrl of DEFAULT_API_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body?.error || body?.message || body?.title || body?.detail || "Request failed";
        throw new Error(`${message} (${response.status})`);
      }
      return body as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isNetworkError = /failed to fetch|network request failed|fetch failed|err_connection_refused|econnrefused|timed out/i.test(message);
      if (isNetworkError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "Could not reach the API. Check that the backend is running and that the API URL is correct."
  );
}

export async function loginWithCompanyAuth(username: string, password: string) {
  const result = await api<CompanyLoginResponse>("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!result.isValid) throw new Error(result.message || "Invalid username or password.");
  return result;
}

export async function saveSession(token: string | null | undefined, user: unknown) {
  await AsyncStorage.setItem("iglootrack_user", JSON.stringify(user));
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, "iglootrack_user"]);
}

export async function getSession() {
  const [[, token], [, user]] = await AsyncStorage.multiGet([TOKEN_KEY, "iglootrack_user"]);
  return user ? { token, user: JSON.parse(user) } : null;
}

type QueuedAction = { id: string; path: string; options: RequestInit; queuedAt: string };

export async function queueAction(path: string, options: RequestInit) {
  const queue: QueuedAction[] = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]");
  queue.push({ id: `${Date.now()}-${Math.random()}`, path, options, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncQueue() {
  const queue: QueuedAction[] = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]");
  const failed: QueuedAction[] = [];
  for (const item of queue) {
    try { await api(item.path, item.options); } catch { failed.push(item); }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return { synced: queue.length - failed.length, pending: failed.length };
}

export async function pendingCount() {
  return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]").length as number;
}
