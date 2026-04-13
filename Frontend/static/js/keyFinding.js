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

// == Functions for Key Findings == 
function calculateFromRules(data, rules, field) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let violationCount = 0;
    let unsureCount = 0;

    // find violation in json files
    const ruleObj = rules.find(r => r[field] !== undefined);
    if (!ruleObj) return { violation: 0, unsure: 0 };

    const violationValues = ruleObj[field].violation?.map(v => v.toLowerCase()) || [];
    const unsureValues = ruleObj[field].unsure?.map(v => v.toLowerCase()) || [];

    categories.forEach(categoryObj => {
        const details = categoryObj[Object.keys(categoryObj)[0]];

        let obj;

        // the percentage of unsure is calculated individually in purpose section
        if (field === "purpose") {
            obj = details.find(item => item.collectionPurpose !== undefined);
        } else {
            obj = details.find(item => item[field] !== undefined);
        }

        if (obj) {
            total++;

            const value = field === "purpose"
                ? obj.collectionPurpose.toLowerCase()
                : obj[field].toLowerCase();

            if (violationValues.includes(value)) {
                violationCount++;
            } else if (unsureValues.includes(value)) {
                unsureCount++;
            }
        }
    });

    return {
        violation: total === 0 ? 0 : Math.round((violationCount / total) * 100),
        unsure: total === 0 ? 0 : Math.round((unsureCount / total) * 100)
    };
}

function calculateRetentionIssues(data, mhrAct) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let violationCount = 0;
    let unsureCount = 0;
    let manualDeletedCount = 0;

    // rule values from myHealthRecord.json
    const badRetentionValues =
        mhrAct[2]?.retentionPeriod?.violation?.map(v => v.toLowerCase().trim().replace(/\.$/, "")) || [];

    const unsureRetentionValues =
        mhrAct[2]?.retentionPeriod?.unsure?.map(v => v.toLowerCase().trim()) || [];

    categories.forEach(categoryObj => {
        const details = categoryObj[Object.keys(categoryObj)[0]];

        const retentionObj = details.find(item => item.retentionPeriodForMHR !== undefined);
        const specialObj = details.find(item => item.specialCircumtance !== undefined);
        const enforcementObj = details.find(item => item.enforcementMeasure !== undefined);

        if (retentionObj) {
            total++;

            const retentionValue = retentionObj.retentionPeriodForMHR
                .toLowerCase()
                .trim()
                .replace(/\.$/, "");

            const specialValue = specialObj
                ? specialObj.specialCircumtance.toLowerCase().trim()
                : "";

            const noSpecialCircumstances =
                specialValue === "" ||
                specialValue === "no" ||
                specialValue === "unsure" ||
                specialValue === "unknown";

            if (badRetentionValues.includes(retentionValue) && noSpecialCircumstances) {
                violationCount++;
            }

            if (unsureRetentionValues.includes(retentionValue) || retentionValue === "") {
                unsureCount++;
            }
        }

        if (enforcementObj) {
            const enforcementValue = enforcementObj.enforcementMeasure.toLowerCase().trim();

            if (enforcementValue === "manually deleted") {
                manualDeletedCount++;
            }
        }
    });

    return {
        violation: total === 0 ? 0 : Math.round((violationCount / total) * 100),
        unsure: total === 0 ? 0 : Math.round((unsureCount / total) * 100),
        manualDeleted: total === 0 ? 0 : Math.round((manualDeletedCount / total) * 100)
    };
}
