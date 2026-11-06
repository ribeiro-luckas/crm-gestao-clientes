"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {

  const router = useRouter();

  return <>
          <button className="logout-button" type="button" onClick={async () => {

            await authClient.signOut();

            router.replace("/login");
            router.refresh();

          }} aria-label="Sair">
            <LogOut size={16} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </>
}
