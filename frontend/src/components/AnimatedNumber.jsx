import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber
 *
 * Counts from 0 to `value` over `duration` ms using easeOutExpo easing.
 *
 * Props:
 *   value    {number}   - Target numeric value to animate to.
 *   duration {number}   - Animation duration in ms. Default: 1400.
 *   suffix   {string}   - Optional suffix appended after the number (e.g. "%").
 *   prefix   {string}   - Optional prefix prepended before the number (e.g. "$").
 *   decimals {number}   - Number of decimal places to display. Default: 0.
 */
export default function AnimatedNumber({
  value,
  duration = 1400,
  suffix = "",
  prefix = "",
  decimals = 0,
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);
  const targetRef = useRef(value);

  useEffect(() => {
    // When value changes, animate FROM current display value TO new value.
    startValueRef.current = display;
    targetRef.current = value;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const current = startValueRef.current + (targetRef.current - startValueRef.current) * eased;

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
