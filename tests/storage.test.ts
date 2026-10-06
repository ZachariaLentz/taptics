import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addCompletion,
  emptyData,
  readPlayer,
  writePlayer,
} from "../lib/storage";
import { Completion } from "../lib/engine";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
const daily: Completion = {
  id: "daily",
  kind: "daily",
  date: "2026-10-06",
  level: 4,
  correct: 1,
  createdAt: "2026-10-06T12:00:00Z",
};
beforeEach(async () => {
  await AsyncStorage.clear();
});
test("Daily stays locked across reloads and repeated selections enqueue once", async () => {
  const data = addCompletion(emptyData(), daily);
  await writePlayer("guest", data);
  const restored = await readPlayer("guest");
  expect(
    addCompletion(restored, { ...daily, id: "another", correct: 0 }),
  ).toEqual(restored);
  expect(restored.pending).toEqual(["daily"]);
  expect(
    addCompletion(restored, { ...daily, id: "tomorrow", date: "2026-10-07" })
      .events,
  ).toHaveLength(2);
});
test("training session idempotency and isolated guest/account storage", async () => {
  const training = { ...daily, kind: "training" as const, correct: 10 };
  const data = addCompletion(emptyData(), training);
  expect(addCompletion(data, training)).toBe(data);
  await writePlayer("guest", data);
  expect(await readPlayer("account")).toEqual(emptyData());
  expect((await readPlayer("guest")).events).toHaveLength(1);
});
test("storage failures are surfaced rather than reporting an unsaved reward", async () => {
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("Disk full"));
  await expect(
    writePlayer("guest", addCompletion(emptyData(), daily)),
  ).rejects.toThrow("Disk full");
});
