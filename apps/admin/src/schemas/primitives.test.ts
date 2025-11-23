import { describe, test, expect } from "vitest";
import { isoDatetimeToDate } from "@/schemas/primitives";

describe("isoDatetimeToDate codec", () => {
    describe("decoding (parsing from API)", () => {
        test.for([
            ["UTC offset format (+00:00)", "2025-10-22T15:30:59.000+00:00"],
            ["Z format", "2025-10-22T15:30:59.000Z"],
            ["non-UTC timezone offset (-05:00)", "2025-10-22T10:30:59.000-05:00"],
            ["format without milliseconds", "2025-10-22T15:30:59+00:00"]
        ])("accepts %s", ([, input]) => {
            const result = isoDatetimeToDate.parse(input);
            expect(result.toISOString()).toBe("2025-10-22T15:30:59.000Z");
        });
    });

    describe("encoding (sending to API)", () => {
        test.for([
            ["UTC offset format (+00:00)", "2025-10-22T15:30:59.000+00:00"],
            ["Z format", "2025-10-22T15:30:59.000Z"],
            ["non-UTC timezone offset (-05:00)", "2025-10-22T10:30:59.000-05:00"],
            ["format without milliseconds", "2025-10-22T15:30:59+00:00"]
        ])("encodes %s to ISO string", ([, input]) => {
            const date = new Date(input);
            const encoded = isoDatetimeToDate.encode(date);
            expect(encoded).toBe("2025-10-22T15:30:59.000Z");
        });
    });

    describe("round-trip", () => {
        test("can round-trip through parse and encode", () => {
            const original = "2025-10-22T15:30:59.000+00:00";
            const decoded = isoDatetimeToDate.decode(original);
            const encoded = isoDatetimeToDate.encode(decoded);

            // Times should be equivalent even if format differs
            expect(new Date(encoded).getTime()).toBe(new Date(original).getTime());
        });
    });
});
