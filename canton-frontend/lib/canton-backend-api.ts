const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  return res.json();
}

export async function fetchCampaigns() {
  const res = await fetch(`${API_BASE}/campaigns`, { cache: "no-store" });
  return res.json();
}

export async function fetchLeaderboardStats() {
  const res = await fetch(`${API_BASE}/leaderboard/stats`, { cache: "no-store" });
  return res.json();
}

export async function fetchStreams(partyId: string) {
  const res = await fetch(
    `${API_BASE}/streams?party=${encodeURIComponent(partyId)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchParticipantStats(wallet: string) {
  const res = await fetch(`${API_BASE}/participants/${encodeURIComponent(wallet)}/stats`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchRewardsSummary() {
  const res = await fetch(`${API_BASE}/rewards/summary`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchRewardsActivity(limit = 50) {
  const res = await fetch(`${API_BASE}/rewards/activity?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) return { records: [] };
  return res.json();
}

export { API_BASE };
