import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import type { UseQueryResult } from "@tanstack/react-query";

export async function waitForQuerySettled<T>(result: { current: UseQueryResult<T, unknown> }) {
    await waitFor(
        () => {
            // Query is settled when it has reached a terminal state (success or error)
            const isSettled = (result.current.isSuccess || result.current.isError) && !result.current.isFetching;
            expect(isSettled).toBe(true);
        }
    );
}
