import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { deriveTrustedTemplateReleaseUrl } from "./trusted-template-release-url";

describe("trusted template release URL", () => {
	it("derives another immutable release from the configured registry family", () => {
		assert.equal(
			deriveTrustedTemplateReleaseUrl(
				"http://vkloud-template-registry/releases/1.0.1",
				"1.0.2",
			),
			"http://vkloud-template-registry/releases/1.0.2",
		);
	});

	it("preserves the configured origin and releases path", () => {
		assert.equal(
			deriveTrustedTemplateReleaseUrl(
				"https://templates.vkloud.example/catalogue/releases/1.0.1",
				"2.4.0",
			),
			"https://templates.vkloud.example/catalogue/releases/2.4.0",
		);
	});

	it("rejects a configured URL outside an immutable releases path", () => {
		assert.throws(
			() =>
				deriveTrustedTemplateReleaseUrl(
					"https://templates.vkloud.example/latest",
					"1.0.2",
				),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects path traversal in the requested version", () => {
		assert.throws(
			() =>
				deriveTrustedTemplateReleaseUrl(
					"https://templates.vkloud.example/releases/1.0.1",
					"../other",
				),
			(error) => error instanceof TRPCError && error.code === "BAD_REQUEST",
		);
	});

	it("rejects credentials in the configured registry URL", () => {
		assert.throws(
			() =>
				deriveTrustedTemplateReleaseUrl(
					"https://user:secret@templates.vkloud.example/releases/1.0.1",
					"1.0.2",
				),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
