export function formatRelativeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = Date.now();
  const diffMs = now - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Just now";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  return date.toLocaleDateString();
}
