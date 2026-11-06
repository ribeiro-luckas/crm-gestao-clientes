"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setTaskStatus } from "@/modules/tasks/actions";

export function TaskStatusControl({ taskId, status }: { taskId: string; status: string }) {
  
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  
  if (status === "done" || status === "canceled") {
    
    return <>
            <span
            className="task-complete-mark" 
            aria-label={status === "done" 
              ? "Tarefa concluída" 
              : "Tarefa cancelada"}
            >
              <Check size={14} />
            </span>
          </>
  }

  return <>
          <button
           className="task-check-button" 
           type="button" 
           aria-label="Marcar tarefa como concluída" 
           disabled={busy} 
           onClick={async () => { 

            setBusy(true); 

            await setTaskStatus({ taskId, status: "done" }); 

            router.refresh(); 
            
            setBusy(false); 
           }}
          >
            <Check size={14} />
          </button>
        </>
}
