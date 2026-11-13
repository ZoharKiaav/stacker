export interface DeployProvisioningComposeInput {
	composeId: string;
	titleLog: string;
	descriptionLog: string;
}

export interface CompleteProvisioningComposeOutcomeInput {
	composeId: string;
	outcome: "succeeded" | "failed";
	supportReference: string;
}

export interface ProvisioningComposeOutcomeResult {
	linked: boolean;
	duplicate: boolean;
	operationId?: string;
	operationState?: string;
	serviceState?: string;
}

export interface DeployAndFinalizeProvisioningComposeInput {
	composeId: string;
	operationId: string;
}

export interface DeployAndFinalizeProvisioningComposeDependencies {
	deploy: (input: DeployProvisioningComposeInput) => Promise<unknown>;
	completeOutcome: (
		input: CompleteProvisioningComposeOutcomeInput,
	) => Promise<ProvisioningComposeOutcomeResult>;
	reportFinalizationFailure: (
		message: string,
		context: {
			composeId: string;
			operationId: string;
			error: unknown;
		},
	) => void;
}

const supportReferenceFor = (operationId: string): string =>
	`vkloud-compose-${operationId}`;

export const deployAndFinalizeProvisioningCompose = async (
	{ composeId, operationId }: DeployAndFinalizeProvisioningComposeInput,
	dependencies: DeployAndFinalizeProvisioningComposeDependencies,
) => {
	try {
		await dependencies.deploy({
			composeId,
			titleLog: "Automated vKloud VPStack deployment",
			descriptionLog: `Provisioning operation ${operationId}`,
		});
	} catch (deploymentError) {
		try {
			await dependencies.completeOutcome({
				composeId,
				outcome: "failed",
				supportReference: supportReferenceFor(operationId),
			});
		} catch (finalizationError) {
			dependencies.reportFinalizationFailure(
				"Unable to persist failed vKloud Compose deployment outcome",
				{
					composeId,
					operationId,
					error: finalizationError,
				},
			);
		}

		throw deploymentError;
	}

	return dependencies.completeOutcome({
		composeId,
		outcome: "succeeded",
		supportReference: supportReferenceFor(operationId),
	});
};
