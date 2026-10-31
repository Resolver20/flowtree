export default function InactiveMarker({ inactive }) {
  return inactive ? <span className="inactive-marker" title="Inactive — excluded from monthly allocation">Paused</span> : null
}
