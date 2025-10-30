import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import type { UseQueryResult } from "@tanstack/react-query";

export async function waitForQueryLoaded<T>(result: {
    current: UseQueryResult<T, unknown>;
}) {
    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });
}
