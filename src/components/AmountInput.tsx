"use client";

/**
 * Numeric amount input that displays Indonesian thousand separators
 * (e.g. 10.000.000) while reporting a plain number to the parent.
 */
export default function AmountInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const display = value > 0 ? new Intl.NumberFormat("id-ID").format(value) : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        onChange(digits ? Number(digits) : 0);
      }}
      className={className}
    />
  );
}
