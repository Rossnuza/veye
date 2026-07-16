// Push notifications via Expo's push service. Tokens are collected by the app
// (works in development/production builds; Expo Go on Android does not support
// remote push — alerts still appear in-app there).
export function makeNotifier(store, log = console.log) {
  return async function notify(childId, kind, message) {
    store.addAlert(childId, kind, message);
    const child = store.childById(childId);
    if (!child) return;
    const tokens = child.guardianUserIds
      .map((uid) => store.data.users.find((u) => u.id === uid))
      .flatMap((u) => u?.pushTokens ?? []);
    log(`[notify] ${kind}: ${message}${tokens.length ? '' : ' (no push tokens registered)'}`);
    if (tokens.length === 0) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tokens.map((to) => ({ to, title: 'Veye', body: message, priority: kind === 'sos' ? 'high' : 'default' })),
        ),
      });
    } catch (err) {
      log(`[notify] push failed: ${err.message}`);
    }
  };
}
