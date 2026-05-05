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
        const retentionResult = calculateRetentionIssues(data, mhrAct, privacyAct, useMHR);

        if (useMHR) {
            document.getElementById("retention-result").textContent =
            `    ${retentionResult.illegalMHR}% of data retention practices violate My Health Act by exceeding the permitted retention period without valid special circumstances.`;
                // `${retentionResult.violation}% of retention periods violate My Health Record Act and have no special circumstances.`;

        } else {
            document.getElementById("retention-result").textContent = "";
        }

        // retention period = unsure
        document.getElementById("retention-unknown-result").textContent =
            `${retentionResult.unsure}% of general data retention periods are undefined or uncertain.`;

        document.getElementById("manual-delete-result").textContent =
            `${retentionResult.manualDeleted}% of enforcement measures rely on manual deletion.`;

        
        // Check if Attribute = Not Applicable
        const assets = data["data"][1][0];
        const categories = Object.values(assets).flat();
        let hasValidData = false;


        categories.forEach(categoryObj => {
            const details = categoryObj[Object.keys(categoryObj)[0]];


            const attributeObj = details.find(item => item.attributeCollected !== undefined);


            if (attributeObj && Array.isArray(attributeObj.attributeCollected)) {
                const valid = attributeObj.attributeCollected.some(attr =>
                    attr.toLowerCase().trim() !== "not applicable"
                );


                if (valid) {
                    hasValidData = true;
                }
            }
        });


        if (!hasValidData) {
            return;
        }


        // Data Collection Score (for labels)
        const dataCollectionScore =
            (
                purposeResult.violation +
                purposeResult.unsure +
                consentResult.violation +
                lessDetailedResult.violation +
                essentialResult.violation
            ) / 5;


        // Retention Score (for labels)
        const retentionScore =
            (
                retentionResult.illegalMHR +
                retentionResult.unsure +
                retentionResult.manualDeleted
            ) / 3;


        // Collection Label
        const dataLabel = document.createElement("span");
        dataLabel.classList.add("badge");


        if (dataCollectionScore < 33) {
            dataLabel.textContent = "Minimal Data Collection";
            dataLabel.style.backgroundColor = "#1bb273";
        }
        else if (dataCollectionScore < 66) {
            dataLabel.textContent = "Sufficient Data Collection";
            dataLabel.style.backgroundColor = "#f39c12";
        }
        else {
            dataLabel.textContent = "Excessive Data Collection";
            dataLabel.style.backgroundColor = "#ff002f";
        }
        dataLabel.classList.add("issue-collection-label");
        document.querySelector(".granularity-issues").appendChild(dataLabel);


        // Retention Label
        const retentionLabel = document.createElement("span");
        retentionLabel.classList.add("badge");


        if (retentionScore < 33) {
            retentionLabel.textContent = "Minimal Retention";
            retentionLabel.style.backgroundColor = "#1bb273";
        }
        else if (retentionScore < 66) {
            retentionLabel.textContent = "Appropriate Retention";
            retentionLabel.style.backgroundColor = "#f39c12";
        }
        else {
            retentionLabel.textContent = "Extended Retention";
            retentionLabel.style.backgroundColor = "#ff002f";
        }
        retentionLabel.classList.add("issue-retention-label");
        document.querySelector(".retention-issues").appendChild(retentionLabel);
    }
}

// == Functions for Labels (Data Collection & Retention) ==
function getDataCollectionLabel(score) {
    if (score < 33) return "Minimal Data Collection";
    if (score < 66) return "Sufficient Data Collection";
    return "Excessive Data Collection";
}


function getRetentionLabel(score) {
    if (score < 33) return "Minimal Retention";
    if (score < 66) return "Appropriate Retention";
    return "Extended Retention";
}

// == Functions for Key Findings == 
function calculateFromRules(data, rules, field) {

    const assets = data["data"][1][0];
    const categories = Object.values(assets).flat();

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

        // Skip not applicable category
        const attributeObj = details.find(item => item.attributeCollected !== undefined);

        const isNotApplicable = attributeObj &&
            Array.isArray(attributeObj.attributeCollected) &&
            attributeObj.attributeCollected.some(attr =>
                attr.toLowerCase().trim() === "not applicable"
            );

    if (isNotApplicable) return;

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

function calculateRetentionIssues(data, mhrAct, privacyAct, useMHR) {

    const assets = data["data"][1][0];
    const categories = Object.values(assets).flat();

    let total = 0;

    let totalMHR = 0;
    // violate MHR
    let illegalMHRCount = 0;

    // retentionPeriod unsure
    let unsureCount = 0;

    // enforcement
    let manualDeletedCount = 0;
    let totalEnforcement = 0;

    // Choose rules
    const mhrRules = mhrAct;
    const privacyRules = privacyAct;

    // Retention rules
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

        // Skip not applicable category
        const attributeObj = details.find(item => item.attributeCollected !== undefined);

        const isNotApplicable = attributeObj &&
            Array.isArray(attributeObj.attributeCollected) &&
            attributeObj.attributeCollected.some(attr =>
                attr.toLowerCase().trim() === "not applicable"
            );

        if (isNotApplicable) return;

        const retentionObj = details.find(item => item.retentionPeriod !== undefined);
        const retentionMHRObj = details.find(item => item.retentionPeriodMHR !== undefined);

        const specialObj = details.find(item => item.retentionException !== undefined);
        const enforcementObj = details.find(item => item.enforcementMeasure !== undefined);

        const specialValue = specialObj
            ? specialObj.retentionException.toLowerCase().trim()
            : "";

        const noSpecialCircumstances =
            specialValue === "" ||
            badSpecialValues.includes(specialValue) ||
            unsureSpecialValues.includes(specialValue);

        // Q2    
        if (retentionObj) {
            total++;

        const retentionValue = retentionObj.retentionPeriod
            .toLowerCase()
            .trim()
            .replace(/\.$/, "");
        
            // Unsure logic
        if (unsureRetentionValues.includes(retentionValue) || retentionValue === "") {
            unsureCount++;
        }
    }

        // Q1 
        if (retentionMHRObj) {
            totalMHR++;

            const retentionMHRValue = retentionMHRObj.retentionPeriodMHR
                ? retentionMHRObj.retentionPeriodMHR.toLowerCase().trim()
                : "";

            // MHR violation
            if (illegalRetentionValues.includes(retentionMHRValue) && noSpecialCircumstances) {
                illegalMHRCount++;
            }

        }

        // Enforcement logic
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
