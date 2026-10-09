import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/20"
          } focus:ring-2 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-2xs disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
