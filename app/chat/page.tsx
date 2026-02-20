import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import BodyClass from "@/components/body-class";
import ChatWorkspace from "@/components/chat/chat-workspace";
import { authOptions } from "@/lib/auth";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  return (
    <>
      <BodyClass classes="matrix chat-page" />

      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-rain" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      <ChatWorkspace
        userName={session.user.name?.trim() || "User"}
        userEmail={session.user.email}
      />
    </>
  );
}
