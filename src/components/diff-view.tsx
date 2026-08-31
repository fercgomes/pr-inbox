type DiffViewProps = {
  diff: string;
};

function lineClass(line: string) {
  if (line.startsWith("+++ ") || line.startsWith("--- ")) {
    return "bg-zinc-800 text-zinc-100";
  }

  if (line.startsWith("+")) {
    return "bg-emerald-950/70 text-emerald-100";
  }

  if (line.startsWith("-")) {
    return "bg-rose-950/70 text-rose-100";
  }

  if (line.startsWith("@@")) {
    return "bg-sky-950/70 text-sky-100";
  }

  if (line.startsWith("diff --git") || line.startsWith("index ")) {
    return "bg-zinc-900 text-zinc-300";
  }

  return "text-zinc-200";
}

function marker(line: string) {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "+";
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return "-";
  }

  return " ";
}

export function DiffView({ diff }: DiffViewProps) {
  return (
    <pre className="min-w-max py-3 font-mono text-xs leading-5">
      {diff.split("\n").map((line, index) => (
        <span key={`${index}-${line}`} className={`grid grid-cols-[2.5rem_1fr] px-4 ${lineClass(line)}`}>
          <span className="select-none text-center text-zinc-500">{marker(line)}</span>
          <code className="whitespace-pre">{line}</code>
        </span>
      ))}
    </pre>
  );
}
