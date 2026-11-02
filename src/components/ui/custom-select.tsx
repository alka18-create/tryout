"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  id?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "-- Pilih Opsi --",
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cari label dari value yang sedang aktif
  const selectedOption = options.find((opt) => opt.value === value);

  // Tutup menu jika pengguna klik di luar komponen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`w-full space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button (In-DOM, tidak memicu popup native OS yang melenceng) */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-left flex items-center justify-between gap-2 transition-all outline-none shadow-2xs cursor-pointer ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : error
            ? "border-rose-400 focus:border-rose-500 ring-2 ring-rose-500/20"
            : isOpen
            ? "border-blue-600 ring-2 ring-blue-600/20 text-slate-900"
            : "border-slate-200 hover:border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        } ${triggerClassName}`}
      >
        <span
          className={`truncate text-xs sm:text-sm font-medium ${
            !selectedOption || selectedOption.value === "" ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* In-DOM Popover Menu (Terkunci tepat di bawah tombol, 100% aman di smartphone) */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100 ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-400 text-center font-medium">
              Tidak ada pilihan tersedia
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value || "__empty__"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/80 text-blue-600 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
