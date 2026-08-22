import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyImmutableTemplateArtifact } from "./immutable-template-artifact";

const identity = {
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	baseUrl: "https://templates.vkloud.example/releases/1.0.0",
};

const fetched = {
	metadata: {
		id: "clientops-starter",
		version: "1.0.0",
		name: "Client Operations",
	},
	dockerCompose: "services:\n  app:\n    image: example/app:1.0.0\n",
};

describe("immutable template artifact", () => {
	it("accepts an exact approved template identity", () => {
		const artifact = verifyImmutableTemplateArtifact(identity, fetched);

		assert.equal(artifact.templateId, "clientops-starter");
		assert.equal(artifact.templateVersion, "1.0.0");
		assert.equal(artifact.contentDigest.length, 64);
	});

	it("creates a deterministic content digest", () => {
		assert.equal(
			verifyImmutableTemplateArtifact(identity, fetched).contentDigest,
			verifyImmutableTemplateArtifact(identity, fetched).contentDigest,
		);
	});

	it("rejects another template ID", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...fetched,
					metadata: {
						...fetched.metadata,
						id: "another-template",
					},
				}),
			/does not match the approved target/,
		);
	});

	it("rejects another template version", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...fetched,
					metadata: {
						...fetched.metadata,
						version: "2.0.0",
					},
				}),
			/version does not match/,
		);
	});

	it("rejects an empty Compose definition", () => {
		assert.throws(() =>
			verifyImmutableTemplateArtifact(identity, {
				...fetched,
				dockerCompose: "",
			}),
		);
	});

	it("requires a trusted registry URL", () => {
		assert.throws(() =>
			verifyImmutableTemplateArtifact(
				{
					...identity,
					baseUrl: "",
				},
				fetched,
			),
		);
	});
});
