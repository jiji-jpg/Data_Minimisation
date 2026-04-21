function renderKeyFindings(data, mhrAct, privacyAct, useMHR) {

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

        // -- Retention
        const retentionResult = calculateRetentionIssues(data, mhrAct, privacyAct, useMHR);

        if (useMHR) {
            document.getElementById("retention-result").textContent =
                `${retentionResult.illegalMHR}% of data retention practices violate My Health Act by exceeding the permitted retention period without valid special circumstances.`;
        } else {
            document.getElementById("retention-result").textContent = "";
        }

        document.getElementById("retention-unknown-result").textContent =
            `${retentionResult.unsure}% of general data retention periods are undefined or uncertain.`;

        document.getElementById("manual-delete-result").textContent =
            `${retentionResult.manualDeleted}% of enforcement measures rely on manual deletion.`;
    }
}


// == Functions for Key Findings ==

function calculateFromRules(data, rules, field) {

    const assets = data["data"][1][0];
    const categories = Object.values(assets).flat();

    let total = 0;
    let violationCount = 0;
    let unsureCount = 0;

    const ruleObj = rules.find(r => r[field] !== undefined);
    if (!ruleObj) return { violation: 0, unsure: 0 };

    const violationValues = ruleObj[field].violation?.map(v => v.toLowerCase()) || [];
    const unsureValues = ruleObj[field].unsure?.map(v => v.toLowerCase()) || [];

    categories.forEach(categoryObj => {
        const details = categoryObj[Object.keys(categoryObj)[0]];

        // -- Skip "not applicable" categories
        const attributeObj = details.find(item => item.attributeCollected !== undefined);
        const isNotApplicable = attributeObj &&
            Array.isArray(attributeObj.attributeCollected) &&
            attributeObj.attributeCollected.some(attr =>
                attr.toLowerCase().trim() === "not applicable"
            );
        if (isNotApplicable) return;

        let obj;

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

function calculateRetentionIssues(data, mhrAct, privacyAct, useMHR) {

    const assets = data["data"][1][0];
    const categories = Object.values(assets).flat();

    let total = 0;
    let totalMHR = 0;
    let illegalMHRCount = 0;
    let unsureCount = 0;
    let manualDeletedCount = 0;
    let totalEnforcement = 0;

    const mhrRules = mhrAct;
    const privacyRules = privacyAct;

    // -- Retention rules
    const unsureRetentionValues =
        privacyRules[3]?.retentionPeriod?.unsure?.map(v => v.toLowerCase().trim()) || [];

    const illegalRetentionValues =
        mhrRules[2]?.retentionPeriodMHR?.violation?.map(v => v.toLowerCase().trim()) || [];

    const badSpecialValues =
        mhrRules[2]?.retentionSpecialCircumstances?.violation?.map(v => v.toLowerCase().trim()) || [];

    const unsureSpecialValues =
        mhrRules[2]?.retentionSpecialCircumstances?.unsure?.map(v => v.toLowerCase().trim()) || [];

    categories.forEach(categoryObj => {
        const details = categoryObj[Object.keys(categoryObj)[0]];

        // -- Skip "not applicable" categories
        const attributeObj = details.find(item => item.attributeCollected !== undefined);
        const isNotApplicable = attributeObj &&
            Array.isArray(attributeObj.attributeCollected) &&
            attributeObj.attributeCollected.some(attr =>
                attr.toLowerCase().trim() === "not applicable"
            );
        if (isNotApplicable) return;

        const retentionObj = details.find(item => item.retentionPeriod !== undefined);
        const retentionMHRObj = details.find(item => item.retentionPeriodMHR !== undefined);

        // -- New: uses retentionException (was specialCircumtance in old version)
        const specialObj = details.find(item => item.retentionException !== undefined);
        const enforcementObj = details.find(item => item.enforcementMeasure !== undefined);

        const specialValue = specialObj
            ? specialObj.retentionException.toLowerCase().trim()
            : "";

        const noSpecialCircumstances =
            specialValue === "" ||
            badSpecialValues.includes(specialValue) ||
            unsureSpecialValues.includes(specialValue);

        // -- General retention period (Q2)
        if (retentionObj) {
            total++;

            const retentionValue = retentionObj.retentionPeriod
                .toLowerCase()
                .trim()
                .replace(/\.$/, "");

            if (unsureRetentionValues.includes(retentionValue) || retentionValue === "") {
                unsureCount++;
            }
        }

        // -- MHR retention period (Q1)
        if (retentionMHRObj) {
            totalMHR++;

            const retentionMHRValue = retentionMHRObj.retentionPeriodMHR
                ? retentionMHRObj.retentionPeriodMHR.toLowerCase().trim()
                : "";

            if (illegalRetentionValues.includes(retentionMHRValue) && noSpecialCircumstances) {
                illegalMHRCount++;
            }
        }

        // -- Enforcement measure
        if (enforcementObj) {
            const enforcementValue = enforcementObj.enforcementMeasure.toLowerCase().trim();
            totalEnforcement++;

            if (enforcementValue.includes("manually deleted")) {
                manualDeletedCount++;
            }
        }
    });

    return {
        illegalMHR: totalMHR === 0 ? 0 : Math.round((illegalMHRCount / totalMHR) * 100),
        unsure: total === 0 ? 0 : Math.round((unsureCount / total) * 100),
        manualDeleted: totalEnforcement === 0 ? 0 : Math.round((manualDeletedCount / totalEnforcement) * 100)
    };
}