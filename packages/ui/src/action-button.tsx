import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  intent?: "primary" | "secondary" | "quiet";
};

export function ActionButton({
  children,
  className = "",
  intent = "primary",
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`ui-action ui-action--${intent} ${className}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
