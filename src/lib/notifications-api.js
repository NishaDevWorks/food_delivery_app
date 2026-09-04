import { supabase } from "@/integrations/supabase/client";
export async function fetchNotifications() {
    const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
    return (data ?? []);
}
export async function unreadCount() {
    const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
    return count ?? 0;
}
export async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
}
export async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
}
export async function deleteNotification(id) {
    await supabase.from("notifications").delete().eq("id", id);
}
