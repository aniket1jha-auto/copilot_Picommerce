/**
 * Format a number as UAE Dirham with compact notation.
 * Examples: 4200 → "AED 4.2K", 420000 → "AED 420K", 12000000 → "AED 12M"
 * (Arabic-branch variant — function name kept as `formatINR` for diff
 * compactness with the India branch; output is AED.)
 */
export function formatINR(value: number): string {
  if (value < 0) return `-${formatINR(-value)}`;
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `AED ${stripTrailingZero(m.toFixed(1))}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `AED ${stripTrailingZero(k.toFixed(1))}K`;
  }
  return `AED ${Math.round(value)}`;
}

/**
 * Format a count with compact notation (no currency).
 * Examples: 1240000 → "1.2M", 45000 → "45K"
 */
export function formatCount(value: number): string {
  if (value < 0) return `-${formatCount(-value)}`;
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${stripTrailingZero(m.toFixed(1))}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${stripTrailingZero(k.toFixed(1))}K`;
  }
  return `${Math.round(value)}`;
}

/**
 * Format a decimal as a percentage string.
 * Example: 0.042 → "4.2%", 4.2 → "4.2%"
 */
export function formatPercent(value: number): string {
  // If value is already in percentage form (> 1), use as-is
  // If value is a ratio (0–1), multiply by 100
  const pct = value <= 1 && value >= -1 ? value * 100 : value;
  return `${stripTrailingZero(pct.toFixed(1))}%`;
}

/**
 * Format a number as ROI multiplier.
 * Example: 3.4 → "3.4x"
 */
export function formatROI(value: number): string {
  return `${stripTrailingZero(value.toFixed(1))}x`;
}

function stripTrailingZero(str: string): string {
  if (str.includes('.') && str.endsWith('0')) {
    return str.slice(0, -1).replace(/\.$/, '');
  }
  return str;
}

/**
 * Per-channel cost label for cost estimation rows.
 * Voice → "AED X.XX/call", field exec → "AED X/task", else → "AED X.XX/msg".
 */
export function formatChannelCost(channelId: string, unitCost: number): string {
  if (channelId === 'ai_voice') return `AED ${unitCost.toFixed(2)}/call`;
  if (channelId === 'field_executive') return `AED ${unitCost.toFixed(0)}/task`;
  return `AED ${unitCost.toFixed(2)}/msg`;
}
