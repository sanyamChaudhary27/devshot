import { CreateTrial } from "./create-trial";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const metadata = { title: "Create a trial | SkillTrials" };
export const dynamic = "force-dynamic";

export default async function CreatePage() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/create");
  }
  return <CreateTrial />;
}
