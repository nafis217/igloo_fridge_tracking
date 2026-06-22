import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "iglootrack_token";
const QUEUE_KEY = "iglootrack_sync_queue";

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
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export async function saveSession(token: string, user: unknown) {
  await AsyncStorage.multiSet([[TOKEN_KEY, token], ["iglootrack_user", JSON.stringify(user)]]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, "iglootrack_user"]);
}

export async function getSession() {
  const [[, token], [, user]] = await AsyncStorage.multiGet([TOKEN_KEY, "iglootrack_user"]);
  return token && user ? { token, user: JSON.parse(user) } : null;
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
