import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import RestoreRoute from "./restore";

function getRestorePostTitle(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-test-id="restore-post-title"]') as HTMLElement;
}

function getRestorePostButton(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-test-id="restore-post-button"]') as HTMLElement;
}

describe("RestoreRoute", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 20, 11, 5));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders an empty state when there are no local revisions", () => {
        const {container} = render(<RestoreRoute />);

        expect(screen.getByRole("heading", {name: "Restore Posts"})).toBeInTheDocument();
        expect(screen.getByText("No local revisions found.")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(container.querySelector('[data-test-id="restore-post-title"]')).not.toBeInTheDocument();
    });

    it("renders local revision rows from localStorage", () => {
        const revisionTimestamp = new Date(2026, 5, 20, 9, 5).getTime();
        const excerpt = "This excerpt is deliberately longer than one hundred characters so the restore list keeps the preview compact and table friendly.";

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify({
            excerpt,
            id: "draft",
            revisionTimestamp,
            title: "Recovered draft",
            type: "post"
        }));

        const {container} = render(<RestoreRoute />);

        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByRole("columnheader", {name: "Title"})).toBeInTheDocument();
        expect(screen.getByRole("columnheader", {name: "Created"})).toBeInTheDocument();
        expect(getRestorePostTitle(container)).toHaveTextContent("Recovered draft");
        expect(screen.getByText(excerpt.slice(0, 100))).toBeInTheDocument();
        expect(screen.getAllByText("20 Jun 2026")).toHaveLength(2);
        expect(screen.getAllByText("2 hours ago")).toHaveLength(2);
        expect(getRestorePostButton(container)).toHaveTextContent("Restore");
    });

    it("uses the no-title fallback for untitled revisions", () => {
        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify({
            excerpt: "",
            id: "draft",
            revisionTimestamp: 1000,
            title: "",
            type: "post"
        }));

        const {container} = render(<RestoreRoute />);

        expect(getRestorePostTitle(container)).toHaveTextContent("(no title)");
    });

    it("passes the selected revision to the restore handler", () => {
        const revision = {
            excerpt: "Selected revision excerpt",
            id: "draft",
            revisionTimestamp: 1000,
            title: "Selected revision",
            type: "post"
        };
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify(revision));

        const {container} = render(<RestoreRoute />);

        fireEvent.click(getRestorePostButton(container));

        expect(consoleLog).toHaveBeenCalledWith("Restore revision", {
            key: "post-revision-draft-1000",
            ...revision
        });

        consoleLog.mockRestore();
    });
});
