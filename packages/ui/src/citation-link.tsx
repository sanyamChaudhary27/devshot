import type { AnchorHTMLAttributes, ReactNode } from "react";

type CitationLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  index: number;
};

export function CitationLink({ children, index, ...props }: CitationLinkProps) {
  const content = (
    <>
      <span aria-hidden="true">{String(index).padStart(2, "0")}</span>
      <span>{children}</span>
    </>
  );

  if (props.href === undefined) {
    return <span className="ui-citation">{content}</span>;
  }

  return (
    <a className="ui-citation" {...props}>
      {content}
    </a>
  );
}
