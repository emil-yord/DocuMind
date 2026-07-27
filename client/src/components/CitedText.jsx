/**
 * Renders message text, turning inline [1] [2] markers into clickable
 * footnote-style tabs. Clicking a tab calls onCite with the matching
 * citation so the caller can highlight it in the margin rail.
 */
export default function CitedText({ text, citations, onCite }) {
  const parts = text.split(/(\[\d+\])/g);

  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;

        const index = Number(match[1]);
        const citation = citations.find((c) => c.index === index);
        if (!citation) return <span key={i}>{part}</span>;

        return (
          <sup
            key={i}
            className="citation-tab mx-0.5"
            onClick={() => onCite(citation)}
            title={citation.documentName}
          >
            {index}
          </sup>
        );
      })}
    </span>
  );
}
