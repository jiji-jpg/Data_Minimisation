document.addEventListener("DOMContentLoaded", async () => {

    const [answerRes, mhrRes, privacyRes] = await Promise.all([
        fetch("/static/exampleAnswer.json"),
        fetch("/static/myHealthRecord.json"),
        fetch("/static/privacyAct.json")
    ]);

    const data = await answerRes.json();
    const mhrAct = await mhrRes.json();
    const privacyAct = await privacyRes.json();


    // purpose violation MHR Act
    const purposeResult = calculateFromRules(data, mhrAct, "purpose");
    document.getElementById("mhr-result").textContent =
        `${purposeResult.violation}% of your data violates the purpose of My Health Record Act.`;

    // purpose = unsure
    document.getElementById("purpose-unsure-result").textContent =
        `${purposeResult.unsure}% of your data collection purpose is unknown.`;

    // consent = no
    const consentResult = calculateFromRules(data, mhrAct, "consent");
    document.getElementById("consent-result").textContent =
        `${consentResult.violation}% of data was collected without patient consent, while ${consentResult.unsure}% are unsure.`;

    // less details = yes
    const lessDetailedResult = calculateFromRules(data, privacyAct, "lessDetailed");
    document.getElementById("less-detailed-result").textContent =
        `${lessDetailedResult.violation}% of attributes can have less detailed version collected, while ${lessDetailedResult.unsure}% are unsure.`;

    // essential = no
    const essentialResult = calculateFromRules(data, privacyAct, "essential");
    document.getElementById("non-essential-result").textContent =
        `${essentialResult.violation}% of attributes are not essential, while ${essentialResult.unsure}% are unsure.`;
});

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