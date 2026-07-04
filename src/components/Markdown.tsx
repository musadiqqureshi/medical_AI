import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant messages as styled markdown (bold, lists, headings,
 *  tables, links). `invert` styles it for dark/gradient bubbles. */
export function Markdown({ children, invert = false }: { children: string; invert?: boolean }) {
  const link = invert ? "text-white underline" : "text-violet-600 underline";
  return (
    <div className="space-y-2 text-[14px] leading-relaxed [&_*:first-child]:mt-0 [&_*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-violet-400">{children}</li>,
          h1: ({ children }) => <h1 className="mb-1 mt-3 text-base font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-1 mt-3 text-[15px] font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold">{children}</h3>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className={link}>
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code
              className={`rounded px-1 py-0.5 text-[13px] ${
                invert ? "bg-white/20" : "bg-violet-100 text-violet-700"
              }`}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-violet-300 pl-3 italic opacity-90">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
