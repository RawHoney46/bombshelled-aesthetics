interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

function getScoreTone(score: number) {
  if (score >= 85) {
    return {
      bg: "bg-[#EAF3DE]",
      text: "text-[#3B6D11]",
    };
  }
  if (score >= 65) {
    return {
      bg: "bg-[#FAEEDA]",
      text: "text-[#854F0B]",
    };
  }
  return {
    bg: "bg-[#FCEBEB]",
    text: "text-[#A32D2D]",
  };
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const tone = getScoreTone(score);
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold ${tone.bg} ${tone.text} ${sizeClasses}`}
    >
      {Math.round(score)}
    </span>
  );
}
