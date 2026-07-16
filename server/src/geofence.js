// Server-side geofencing: turns raw track points into zone enter/leave events
// and parent-facing alerts, per the product flow (Section 5 & 6).

export function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function zoneContaining(store, childId, position) {
  for (const zone of store.zonesOf(childId)) {
    if (!zone.on) continue;
    if (haversineMeters(zone.center, position) <= store.zoneRadius(zone)) return zone;
  }
  return null;
}

// Called by the gateway on every valid GPS point. Emits events + alerts on
// zone transitions. `notify(childId, kind, message)` sends the push.
export function processPosition(store, child, position, timeMs, notify) {
  const state = store.deviceState(child.imei);
  const previousZoneId = state.zoneId;
  const zone = zoneContaining(store, child.id, position);
  const zoneId = zone?.id ?? null;

  if (zoneId !== previousZoneId) {
    const prevZone = previousZoneId
      ? store.zonesOf(child.id).find((z) => z.id === previousZoneId)
      : null;
    if (prevZone) {
      store.addEvent(child.id, 'left', `left:${prevZone.name}`, position, timeMs);
      if (prevZone.alertLeave) {
        notify(child.id, 'leave', `${child.name} has left ${prevZone.name}.`);
      }
    }
    if (zone) {
      store.addEvent(child.id, 'arrived', `arrived:${zone.name}`, position, timeMs);
      if (zone.alertArrive) {
        notify(child.id, 'arrive', `${child.name} has arrived at ${zone.name}.`);
      }
    }
    state.zoneId = zoneId;
    state.sinceAt = timeMs;
  }
  return zone;
}
