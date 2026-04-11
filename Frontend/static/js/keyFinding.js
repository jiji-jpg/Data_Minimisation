function renderKeyFindings(data, mhrAct, privacyAct, useMHR) {

    // purpose violation MHR Act
    const purposeResult = calculateFromRules(data, mhrAct, "purpose");
    const consentResult = calculateFromRules(data, mhrAct, "consent");
    const lessDetailedResult = calculateFromRules(data, privacyAct, "lessDetailed");
    const essentialResult = calculateFromRules(data, privacyAct, "essential");

    if (document.getElementById("mhr-result")) {

        document.getElementById("mhr-result").textContent =
            `${purposeResult.violation}% of your data violates the purpose of My Health Record Act.`;

        document.getElementById("purpose-unsure-result").textContent =
            `${purposeResult.unsure}% of your data collection purpose is unknown.`;

        document.getElementById("consent-result").textContent =
            `${consentResult.violation}% of data was collected without patient consent, while ${consentResult.unsure}% are unsure.`;

        document.getElementById("less-detailed-result").textContent =
            `${lessDetailedResult.violation}% of attributes can have less detailed version collected, while ${lessDetailedResult.unsure}% are unsure.`;

        document.getElementById("non-essential-result").textContent =
            `${essentialResult.violation}% of attributes are not essential, while ${essentialResult.unsure}% are unsure.`;


        ///RETENTION
        // retention period voilates MyHealthAct/no special circumstances
        const retentionResult = calculateRetentionIssues(data, mhrAct, privacyAct);

        if (useMHR) {
            document.getElementById("retention-result").textContent =
                `${retentionResult.violation}% of retention periods violate My Health Record Act and have no special circumstances.`;
        } else {
            document.getElementById("retention-result").textContent =
                `${retentionResult.unsure}% of your data retention period is unsure.`;
        }

        // retention period = unsure
        document.getElementById("retention-unknown-result").textContent =
            `${retentionResult.unsure}% of retention periods are undefined or uncertain.`;

        document.getElementById("manual-delete-result").textContent =
            `${retentionResult.manualDeleted}% of enforcement measures rely on manual deletion.`;
    }
}