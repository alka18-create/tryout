import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer";

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs gap-1.5 font-medium",
      md: "px-4 py-2 text-sm gap-2 font-semibold",
      lg: "px-5 py-2.5 text-base gap-2.5 font-semibold",
    };

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 hover:shadow-sm",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-xs",
      outline:
        "border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20",
      success:
        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20",
      warning:
        "bg-amber-500 hover:bg-amber-600 text-white shadow-xs shadow-amber-500/20",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
