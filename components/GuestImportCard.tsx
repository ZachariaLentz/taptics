import { useRef, useState } from "react";
import { Text } from "react-native";
import { usePlayer } from "../lib/PlayerProvider";
import { GuestImportPlan, unreviewedGuestEvents } from "../lib/guestImport";
import { Button, Card, Feedback, styles } from "./ui";
export function GuestImportCard() {
  const {
    user,
    id,
    data,
    guestEvents,
    deviceGuestId,
    prepareGuestImport,
    importGuestProgress,
    syncing,
    sync,
    stats,
  } = usePlayer();
  const [plan, setPlan] = useState<GuestImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const locked = useRef(false);
  if (!user || !guestEvents?.length) return null;
  const receipt = data.guestImport;
  const available = unreviewedGuestEvents(
    guestEvents,
    receipt,
    deviceGuestId,
  ).length;
  const run = async (confirm: boolean) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (confirm && plan) {
        await importGuestProgress(plan);
        setPlan(null);
      } else {
        setPlan(await prepareGuestImport());
        setDismissed(false);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Import failed. Your guest progress is safe; reconnect and retry.",
      );
      setPlan(null);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Card key={id}>
      <Text style={styles.heading}>Carry your guest progress</Text>
      {receipt?.status === "pending" ? (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            Guest import is queued on this device. It is not confirmed in your
            cloud account yet.
          </Text>
          <Text style={styles.muted}>
            Your guest copy is unchanged. Reconnect and sync to finish,
            including after restarting the app.
          </Text>
          <Button
            title={
              syncing ? "Syncing guest import…" : "Retry guest import sync"
            }
            disabled={syncing || busy}
            onPress={() => {
              void sync();
            }}
          />
        </>
      ) : (
        <>
          {receipt?.status === "complete" && (
            <>
              <Feedback correct>
                Guest import confirmed in your account.
              </Feedback>
              <Text style={styles.text}>
                {receipt.confirmed ?? receipt.imported.length} completions
                carried over. Your account now has {stats.sessions} workouts and{" "}
                {data.events.filter((event) => event.kind === "daily").length}{" "}
                Daily results.
              </Text>
              <Text style={styles.muted}>
                Existing account results were kept for conflicts. Skipped or
                duplicate records remain in your guest copy.
              </Text>
            </>
          )}
          {available > 0 && (
            <>
              <Text style={styles.text}>
                {available} guest completion(s) on this device are available to
                review. Nothing is imported automatically.
              </Text>
              <Text style={styles.muted}>
                Your account’s existing results take precedence. Daily stays one
                per date. Your guest copy is kept even after import; signing out
                restores it.
              </Text>
              {plan ? (
                <>
                  <Text style={styles.text}>
                    {plan.existingCount} account completions will be kept.{" "}
                    {plan.additions.length} guest completions will be added.
                  </Text>
                  <Text style={styles.muted}>
                    {plan.duplicateIds} duplicate IDs skipped.{" "}
                    {plan.dailyDates.length} Daily date conflicts keep the
                    account result
                    {plan.dailyDates.length
                      ? ` (${[...new Set(plan.dailyDates)].join(", ")})`
                      : ""}
                    . {plan.unsupported} records cannot be uploaded because of
                    date limits or missing level prerequisites.
                  </Text>
                  <Text style={styles.muted}>
                    Other-device results synced during import also take
                    precedence. All skipped records stay in your guest profile.
                  </Text>
                  <Button
                    title="Merge reviewed guest completions"
                    disabled={busy || syncing}
                    onPress={() => {
                      void run(true);
                    }}
                  />
                  <Button
                    title="Keep account progress without importing"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setPlan(null);
                      setDismissed(true);
                    }}
                  />
                </>
              ) : (
                <>
                  <Button
                    title={
                      busy
                        ? "Reviewing cloud progress…"
                        : dismissed
                          ? "Review guest progress later"
                          : "Review guest progress to import"
                    }
                    disabled={busy || syncing}
                    onPress={() => {
                      void run(false);
                    }}
                  />
                  {!dismissed && (
                    <Button
                      title="Keep account progress without importing"
                      secondary
                      disabled={busy}
                      onPress={() => setDismissed(true)}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {error && <Feedback>{error}</Feedback>}
    </Card>
  );
}
