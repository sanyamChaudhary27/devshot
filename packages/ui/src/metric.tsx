type MetricProps = {
  label: string;
  value: number;
  displayValue?: string;
  direction?: "higher-is-better" | "lower-is-better";
};

export function Metric({
  label,
  value,
  displayValue,
  direction = "higher-is-better",
}: MetricProps) {
  const bounded = Math.max(0, Math.min(100, value));
  const concern = direction === "higher-is-better" ? bounded < 40 : bounded > 60;

  return (
    <div className="ui-metric">
      <div className="ui-metric__label">
        <span>{label}</span>
        <strong>{displayValue ?? bounded}</strong>
      </div>
      <div
        aria-label={`${label}: ${displayValue ?? bounded}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={bounded}
        className="ui-metric__track"
        role="meter"
      >
        <span
          className={concern ? "ui-metric__fill ui-metric__fill--concern" : "ui-metric__fill"}
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
  );
}
