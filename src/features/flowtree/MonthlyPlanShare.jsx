export default function MonthlyPlanShare({ label }) {
  return <span className="monthly-plan-share" title={`${label} of monthly income`} aria-label={`${label} of monthly income`}>{label}</span>
}
