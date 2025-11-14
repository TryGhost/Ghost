import "@testing-library/jest-dom";
import { expect } from "vitest";
import matchers from "jest-extended";
import { setupShadeMocks } from "@tryghost/admin-x-framework/test/setup";

expect.extend(matchers);

setupShadeMocks();
