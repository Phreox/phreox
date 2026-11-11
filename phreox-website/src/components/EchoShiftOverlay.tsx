/** A transparent, non-interactive hero layer. Only its transition snapshot carries the ambient glow. */
export function EchoShiftOverlay() {
  return <div className="echo-ambient" aria-hidden="true" />;
}
