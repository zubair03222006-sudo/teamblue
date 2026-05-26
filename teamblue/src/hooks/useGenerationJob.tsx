import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  output_text: string | null;
  output_image_url: string | null;
  error: string | null;
}

interface GenerationJobContextType {
  job: GenerationJob | null;
  isGenerating: boolean;
  setJob: (job: GenerationJob | null) => void;
  startJob: (jobId: string) => void;
  clearJob: () => void;
}

const GenerationJobContext = createContext<GenerationJobContextType>({
  job: null,
  isGenerating: false,
  setJob: () => {},
  startJob: () => {},
  clearJob: () => {},
});

export const GenerationJobProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [job, setJob] = useState<GenerationJob | null>(null);

  const isGenerating = !!job && (job.status === "pending" || job.status === "processing");

  // Restore active job on mount (survives refresh / navigation)
  useEffect(() => {
    if (!user) return;
    const activeId = localStorage.getItem("active-generation-job");
    if (activeId) {
      supabase
        .from("generation_jobs")
        .select("*")
        .eq("id", activeId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setJob(data as GenerationJob);
        });
    }
  }, [user]);

  // Subscribe to realtime updates + poll fallback
  useEffect(() => {
    if (!job?.id || job.status === "completed" || job.status === "failed") return;

    const channel = supabase
      .channel(`global-job-${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generation_jobs",
          filter: `id=eq.${job.id}`,
        },
        (payload) => setJob(payload.new as GenerationJob)
      )
      .subscribe();

    const pollId = setInterval(async () => {
      const { data } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("id", job.id)
        .maybeSingle();
      if (data) setJob(data as GenerationJob);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [job?.id, job?.status]);

  // Clean up localStorage when job finishes
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") {
      localStorage.removeItem("active-generation-job");
    }
  }, [job?.status]);

  const startJob = useCallback((jobId: string) => {
    localStorage.setItem("active-generation-job", jobId);
    setJob({
      id: jobId,
      status: "pending",
      output_text: null,
      output_image_url: null,
      error: null,
    });
  }, []);

  const clearJob = useCallback(() => {
    localStorage.removeItem("active-generation-job");
    setJob(null);
  }, []);

  return (
    <GenerationJobContext.Provider value={{ job, isGenerating, setJob, startJob, clearJob }}>
      {children}
    </GenerationJobContext.Provider>
  );
};

export const useGenerationJob = () => useContext(GenerationJobContext);
