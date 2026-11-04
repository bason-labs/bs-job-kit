import { test } from "node:test";
import assert from "node:assert/strict";
import { clock } from "../bin/clock.mjs";

test("clock gives a compact marker and an ISO start without milliseconds", () => {
  assert.deepEqual(clock(new Date("2026-11-03T10:15:00.123Z")), { marker: "20261103T101500Z", start: "2026-11-03T10:15:00Z" });
});
