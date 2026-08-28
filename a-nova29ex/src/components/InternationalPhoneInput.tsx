import React, { useState, useEffect, useRef, useMemo } from "react";
import { CountryCode } from "libphonenumber-js";
import { ChevronDown, Search, X, Check, Globe } from "lucide-react";
import {
  ALL_COUNTRIES,
  COUNTRY_MAP,
  CountryInfo,
  detectUserCountry,
  formatAndValidatePhone,
  ValidationResult
} from "../utils/phoneUtils";

export interface PhoneInputChangePayload extends ValidationResult {
  countryCode: CountryCode;
  callingCode: string;
  rawInput: string;
}

interface InternationalPhoneInputProps {
  value?: string; // Can be national number or E.164
  onChange: (payload: PhoneInputChangePayload) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  showErrorText?: boolean;
  customError?: string | null;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value = "",
  onChange,
  disabled = false,
  placeholder,
  className = "",
  id = "phone-input",
  autoFocus = false,
  showErrorText = true,
  customError = null
}) => {
  // Country state with auto-detection
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(() => detectUserCountry());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawInputValue, setRawInputValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  const [dropdownPosition, setDropdownPosition] = useState<{
    placement: "top" | "bottom";
    maxHeight: number;
  }>({ placement: "bottom", maxHeight: 280 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const updatePosition = () => {
    if (!dropdownRef.current) return;

    const triggerRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Find parent modal card or container
    const modalCard =
      dropdownRef.current.closest('.max-w-md') ||
      dropdownRef.current.closest('[role="dialog"]') ||
      dropdownRef.current.closest('.fixed');

    let modalTop = 12;
    let modalBottom = viewportHeight - 12;

    if (modalCard) {
      const mRect = modalCard.getBoundingClientRect();
      modalTop = Math.max(12, mRect.top + 12);
      modalBottom = Math.min(viewportHeight - 12, mRect.bottom - 12);
    }

    const spaceAbove = Math.max(0, triggerRect.top - modalTop - 6);
    const spaceBelow = Math.max(0, modalBottom - triggerRect.bottom - 6);

    const preferredMaxHeight = 280;

    let placement: "top" | "bottom" = "bottom";

    // Auto-flip above if space below is limited or space above offers better clearance
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      placement = "top";
    } else if (spaceBelow < 140 && spaceAbove >= 120) {
      placement = "top";
    }

    const availableSpace = placement === "top" ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(preferredMaxHeight, Math.max(140, availableSpace));

    setDropdownPosition({
      placement,
      maxHeight
    });
  };

  const selectedCountry = useMemo<CountryInfo>(() => {
    return COUNTRY_MAP.get(selectedCountryCode) || COUNTRY_MAP.get("US")!;
  }, [selectedCountryCode]);

  // Sync initial or updated value prop
  useEffect(() => {
    if (value && value !== rawInputValue) {
      if (value.startsWith("+")) {
        // Try parsing global number to extract country code and national digits
        const res = formatAndValidatePhone(value, selectedCountryCode);
        setRawInputValue(res.formattedNational || value);
      } else {
        setRawInputValue(value);
      }
    } else if (!value && rawInputValue) {
      setRawInputValue("");
    }
  }, [value]);

  // Handle outside click & escape key to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Focus search input & handle dynamic position recalculations
  useEffect(() => {
    if (!isDropdownOpen) {
      setSearchQuery("");
      return;
    }

    updatePosition();

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("orientationchange", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("orientationchange", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
      clearTimeout(timer);
    };
  }, [isDropdownOpen]);

  // Compute validation result
  const validationResult = useMemo<ValidationResult>(() => {
    return formatAndValidatePhone(rawInputValue, selectedCountryCode);
  }, [rawInputValue, selectedCountryCode]);

  // Trigger parent onChange callback
  useEffect(() => {
    onChange({
      ...validationResult,
      countryCode: selectedCountryCode,
      callingCode: selectedCountry.callingCode,
      rawInput: rawInputValue
    });
  }, [rawInputValue, selectedCountryCode, validationResult]);

  // Filter countries for search
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const codeMatch = c.code.toLowerCase().includes(q);
      const callingMatch = c.callingCode.replace("+", "").includes(q);
      return nameMatch || codeMatch || callingMatch;
    });
  }, [searchQuery]);

  // Handle phone input typing
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsTouched(true);

    // If user pastes/types international + number, handle it
    if (val.startsWith("+")) {
      setRawInputValue(val);
      return;
    }

    // Format as-you-type
    const res = formatAndValidatePhone(val, selectedCountryCode);
    setRawInputValue(res.formattedNational || val);
  };

  // Handle country selection
  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountryCode(country.code);
    setIsDropdownOpen(false);
    
    // Re-format existing digits under new country
    if (rawInputValue) {
      const res = formatAndValidatePhone(rawInputValue, country.code);
      setRawInputValue(res.formattedNational || rawInputValue);
    }

    // Re-focus phone input
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);
  };

  const activeError = customError || (isTouched && rawInputValue ? validationResult.error : null);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`flex items-center w-full bg-zinc-50 dark:bg-zinc-800/80 border rounded-2xl transition-all duration-200 ${
          activeError
            ? "border-red-500/80 ring-2 ring-red-500/20"
            : isDropdownOpen
            ? "border-sky-500 ring-2 ring-sky-500/20"
            : "border-zinc-300 dark:border-zinc-700 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {/* Country Selector Button */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            aria-label="Select country"
            className="flex items-center gap-1.5 px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded-l-2xl border-r border-zinc-200 dark:border-zinc-700/70 transition cursor-pointer text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 select-none"
          >
            <span className="text-base sm:text-lg leading-none">{selectedCountry.flag}</span>
            <span className="font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-semibold">
              {selectedCountry.callingCode}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-sky-500" : ""
              }`}
            />
          </button>

          {/* Country Search & Selection Dropdown */}
          {isDropdownOpen && (
            <div
              style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
              className={`absolute left-0 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col transition-all duration-150 animate-in fade-in ${
                dropdownPosition.placement === "top"
                  ? "bottom-full mb-2 slide-in-from-bottom-2"
                  : "top-full mt-2 slide-in-from-top-2"
              }`}
            >
              {/* Search Header (Sticky at top) */}
              <div className="sticky top-0 z-10 p-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-zinc-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, code, dialing (+1, IN)..."
                    className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country List (Internal scroll container) */}
              <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-zinc-100 dark:divide-zinc-800/40 custom-scrollbar">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((c) => {
                    const isSelected = c.code === selectedCountryCode;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/30 ${
                          isSelected ? "bg-sky-50/80 dark:bg-sky-950/40 font-semibold" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="text-base sm:text-lg leading-none shrink-0">{c.flag}</span>
                          <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 truncate">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase shrink-0">
                            {c.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
                            {c.callingCode}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500 flex flex-col items-center gap-1">
                    <Globe className="w-5 h-5 opacity-40 mb-1" />
                    <span>No country found matching "{searchQuery}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Input Field */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={phoneInputRef}
            id={id}
            type="tel"
            value={rawInputValue}
            onChange={handlePhoneInputChange}
            onBlur={() => setIsTouched(true)}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder || `Mobile number (${selectedCountry.callingCode})`}
            className="w-full px-3.5 py-3 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none disabled:opacity-50 font-mono tracking-wide"
          />

          {rawInputValue && !disabled && (
            <button
              type="button"
              onClick={() => {
                setRawInputValue("");
                phoneInputRef.current?.focus();
              }}
              className="mr-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition cursor-pointer"
              aria-label="Clear phone input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Validation Error Message */}
      {showErrorText && activeError && (
        <p className="mt-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 flex items-center gap-1 animate-in fade-in duration-150">
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
};
