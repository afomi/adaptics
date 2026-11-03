// Coordinates stay fixed across scrubs; only the temporal lens changes.
export function timeExtent(points) {
  const times = points.map(p => p.at).filter(Number.isFinite);
  return times.length ? [Math.min(...times), Math.max(...times)] : [0, 0];
}

export function position(point, mode, extent) {
  const [x, y, z] = point.position;
  if (mode !== "time") return [x, y, z];
  const [from, to] = extent;
  const time = Number.isFinite(point.at) && to > from ? 2 * (point.at - from) / (to - from) - 1 : 0;
  return [x, time, z];
}

export function revealed(point, until) {
  return !Number.isFinite(point.at) || point.at <= until;
}

export function timeBins(points, count = 64) {
  const [from, to] = timeExtent(points);
  const bins = Array.from({ length: count }, () => 0);
  for (const point of points) {
    if (!Number.isFinite(point.at)) continue;
    const index = to > from ? Math.min(count - 1, Math.floor((point.at - from) / (to - from) * count)) : 0;
    bins[index]++;
  }
  return bins;
}
