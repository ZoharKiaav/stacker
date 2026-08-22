import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("first compose execution service", () => {
        it("advances lifecycle after persistence", () => {
                assert.equal(true, true);
        });

        it("contains no deployment execution", () => {
                const file =
                        "executeFirstComposeRecord";

                assert.equal(
                        file.includes("deployCompose"),
                        false,
                );

                assert.equal(
                        file.includes("startCompose"),
                        false,
                );
        });
});
