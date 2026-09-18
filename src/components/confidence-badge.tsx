import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Confiance = "haute" | "moyenne" | "basse" | "inconnue";

const confianceStyles: Record<Confiance, string> = {
  haute: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  moyenne: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  basse: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inconnue: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

interface ConfidenceBadgeProps {
  confiance?: Confiance;
  compact?: boolean;
}

export function ConfidenceBadge({ confiance, compact }: ConfidenceBadgeProps) {
  const t = useTranslations("confidenceBadge");
  if (!confiance) return null;

  return (
    <Badge
      variant="outline"
      className={cn("border-0", confianceStyles[confiance], compact && "text-xs px-1.5 py-0")}
    >
      {t(confiance)}
    </Badge>
  );
}
