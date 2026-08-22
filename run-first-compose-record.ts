import {
        persistFirstComposeRecordPostgres,
} from "./packages/server/src/services/vkloud/provisioning/first-compose-record-postgres";

async function main() {
        const result = await persistFirstComposeRecordPostgres({
                organizationId: "TGjxG21mBbRRCX4MtHiSx",
                intent: {
                        mode: "authorized_intent",
                        operationId: "-3M6dFwnmgyM5-pIN_63l",
                        billingServiceMappingId: "y7Hd5welUMIp1TULx8kWL",
                        contentDigest:
                                "58f44c4f77525ce2c481e00556a5d292d823ebef18a7eee7c02a5d3dd21fc5e6",
                        compose: {
                                name: "clientops-starter",
                                description:
                                        "Disposable local VPStack provisioning test",
                                environmentId: "wyUymmRoaRR4fM35YQLNC",
                                composeType: "docker-compose",
                                sourceType: "raw",
                                composeFile: `services:
  e4-placeholder:
    image: busybox:1.36
    command:
      - sh
      - -c
      - echo "E4 disposable fixture"; sleep infinity
    profiles:
      - never
`,
                                appName: "vpstack-e4-first-record",
                        },
                },
        });

        console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
});
