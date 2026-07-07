import { supabase } from "@/integrations/supabase/client";

export type NotifRow = {
  id: string;
  user_id: string;
  type: "new_order" | "cancelled" | "system" | "review" | "delivered";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<NotifRow[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data as any) ?? []) as NotifRow[];
}

export async function unreadCount(): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);
  return count ?? 0;
}

export async function markRead(id: string) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllRead() {
  await supabase.from("notifications").update({ read: true }).eq("read", false);
}

export async function deleteNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}
