import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5047/api";
const TOKEN_KEY = "iglootrack_token";
const QUEUE_KEY = "iglootrack_sync_queue";

type CompanyLoginResponse = {
  username: string;
  message: string;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || body.title || "Request failed");
  return body;
}

export async function loginWithCompanyAuth(username: string, password: string) {
  return api<CompanyLoginResponse>("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
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
