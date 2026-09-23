import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyImmutableTemplateArtifact } from "./immutable-template-artifact";

const identity = {
	templateId: "clientops-starter",
	templateVersion: "1.0.3",
	baseUrl: "https://templates.vkloud.example/releases/1.0.3",
};

const legacyFetched = {
	metadata: {
		id: "clientops-starter",
		version: "1.0.3",
		name: "Client Operations",
	},
	access: {
		serviceName: "web",
		port: 80,
		path: "/",
		internalPath: "/",
	},
	dockerCompose: "services:\n  web:\n    image: example/web:1.0.3\n",
};

const multiEndpointFetched = {
	...legacyFetched,
	access: [
		{
			key: "support",
			serviceName: "support",
			port: 80,
			path: "/",
			internalPath: "/",
			suggestedSubdomain: "support",
			primary: false,
		},
		{
			key: "website",
			serviceName: "website",
			port: 80,
			path: "/",
			internalPath: "/",
			suggestedSubdomain: "www",
			primary: true,
		},
	],
};

describe("immutable template artifact", () => {
	it("normalises a legacy access object into one primary endpoint", () => {
		const artifact = verifyImmutableTemplateArtifact(identity, legacyFetched);

		assert.deepEqual(artifact.access, [
			{
				key: "primary",
				serviceName: "web",
				port: 80,
				path: "/",
				internalPath: "/",
				primary: true,
			},
		]);
	});

	it("accepts and sorts a multi-endpoint access declaration", () => {
		const artifact = verifyImmutableTemplateArtifact(
			identity,
			multiEndpointFetched,
		);

		assert.equal(artifact.access.length, 2);
		assert.equal(artifact.access[0]?.key, "support");
		assert.equal(artifact.access[1]?.key, "website");
		assert.equal(artifact.access[1]?.primary, true);
	});

	it("creates a deterministic content digest", () => {
		assert.equal(
			verifyImmutableTemplateArtifact(identity, multiEndpointFetched)
				.contentDigest,
			verifyImmutableTemplateArtifact(identity, multiEndpointFetched)
				.contentDigest,
		);
	});

	it("creates the same digest regardless of endpoint input order", () => {
		const first = verifyImmutableTemplateArtifact(
			identity,
			multiEndpointFetched,
		);

		const second = verifyImmutableTemplateArtifact(identity, {
			...multiEndpointFetched,
			access: [...multiEndpointFetched.access].reverse(),
		});

		assert.equal(first.contentDigest, second.contentDigest);
	});

	it("rejects another template ID", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...legacyFetched,
					metadata: {
						...legacyFetched.metadata,
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
					...legacyFetched,
					metadata: {
						...legacyFetched.metadata,
						version: "2.0.0",
					},
				}),
			/version does not match/,
		);
	});

	it("rejects an empty Compose definition", () => {
		assert.throws(() =>
			verifyImmutableTemplateArtifact(identity, {
				...legacyFetched,
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
				legacyFetched,
			),
		);
	});

	it("rejects an endpoint with an invalid port", () => {
		assert.throws(() =>
			verifyImmutableTemplateArtifact(identity, {
				...multiEndpointFetched,
				access: [
					{
						...multiEndpointFetched.access[0],
						port: 0,
					},
					multiEndpointFetched.access[1],
				],
			}),
		);
	});

	it("rejects duplicate endpoint keys", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...multiEndpointFetched,
					access: [
						multiEndpointFetched.access[0],
						{
							...multiEndpointFetched.access[1],
							key: "support",
						},
					],
				}),
			/endpoint key support is duplicated/,
		);
	});

	it("rejects duplicate endpoint routes", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...multiEndpointFetched,
					access: [
						multiEndpointFetched.access[0],
						{
							...multiEndpointFetched.access[0],
							key: "support-two",
							primary: true,
						},
					],
				}),
			/duplicates another route/,
		);
	});

	it("rejects a collection without a primary endpoint", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...multiEndpointFetched,
					access: multiEndpointFetched.access.map((endpoint) => ({
						...endpoint,
						primary: false,
					})),
				}),
			/exactly one primary endpoint/,
		);
	});

	it("rejects a collection with multiple primary endpoints", () => {
		assert.throws(
			() =>
				verifyImmutableTemplateArtifact(identity, {
					...multiEndpointFetched,
					access: multiEndpointFetched.access.map((endpoint) => ({
						...endpoint,
						primary: true,
					})),
				}),
			/exactly one primary endpoint/,
		);
	});

	it("changes the digest when endpoint metadata changes", () => {
		const original = verifyImmutableTemplateArtifact(
			identity,
			multiEndpointFetched,
		);

		const changed = verifyImmutableTemplateArtifact(identity, {
			...multiEndpointFetched,
			access: multiEndpointFetched.access.map((endpoint) =>
				endpoint.key === "support"
					? {
							...endpoint,
							port: 8080,
						}
					: endpoint,
			),
		});

		assert.notEqual(original.contentDigest, changed.contentDigest);
	});
});
