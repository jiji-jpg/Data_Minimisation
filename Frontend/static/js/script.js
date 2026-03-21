document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("/static/exampleAnswer.json");
    const data = await response.json();

    // purpose violation MHR Act
    const mhrViolationPercent = calculateMHRViolation(data);
    document.getElementById("mhr-result").textContent =
        `${mhrViolationPercent}% of your data violates the purpose of My Health Record Act.`;

    // purpose = unsure
    const purposeUnsurePercent = calculatePurposeUnsure(data);
    document.getElementById("purpose-unsure-result").textContent =
        `${purposeUnsurePercent}% of your data collection purpose is unknown.`;

    // consent = no
    const consentPercent = calculateConsentNo(data);
    document.getElementById("consent-result").textContent =
        `${consentPercent}% of data collected from patient had no consent.`;

    // less details = yes
    const lessDetailedPercent = calculateLessDetailedYes(data);
    document.getElementById("less-detailed-result").textContent =
        `${lessDetailedPercent}% of attributes can have less detailed version collected.`;

    // essential = no
    const nonEssentialPercent = calculateEssentialNo(data);
    document.getElementById("non-essential-result").textContent =
        `${nonEssentialPercent}% of attributes are not essential for operation.`;
});

// Function of purpose violation MHR Act:
function calculateMHRViolation(data) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let violationCount = 0;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        const purposeObj = details.find(item => item.collectionPurpose !== undefined);

        if (purposeObj) {
            total++;

            const purpose = purposeObj.collectionPurpose.toLowerCase();

            // define violation rule
            if (
                purpose === "marketing" ||
                purpose === "operational or business operation" ||
                purpose === "Human Resource" ||
                purpose === "General Insurance" 
            ) {
                violationCount++;
            }
        }
    });

    if (total === 0) return 0;

    return Math.round((violationCount / total) * 100);
}

// Fuction of purpose = unsure
function calculatePurposeUnsure(data) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let unsureCount = 0;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        const purposeObj = details.find(item => item.collectionPurpose !== undefined);

        if (purposeObj) {
            total++;

            if (purposeObj.collectionPurpose.toLowerCase() === "unsure") {
                unsureCount++;
            }
        }
    });

    if (total === 0) return 0;

    return Math.round((unsureCount / total) * 100);
}

// Function of consent = no
function calculateConsentNo(data) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let consentNoCount = 0;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        const consentObj = details.find(item => item.consent !== undefined);

        if (consentObj) {
            total++;

            const value = consentObj.consent.toLowerCase();

            if (value === "no") {
                consentNoCount++;
            }
        }
    });

    if (total === 0) return 0;

    return Math.round((consentNoCount / total) * 100);
}

// Function of less detailed = yes
function calculateLessDetailedYes(data) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let lessDetailedCount = 0;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        const lessDetailedObj = details.find(item => item.lessDetailed !== undefined);

        if (lessDetailedObj) {
            total++;

            if (lessDetailedObj.lessDetailed.toLowerCase() === "yes") {
                lessDetailedCount++;
            }
        }
    });

    return total === 0 ? 0 : Math.round((lessDetailedCount / total) * 100);
}

// Function of essential = no
function calculateEssentialNo(data) {
    const categories = data[1][0].personalDataAsset;

    let total = 0;
    let essentialNoCount = 0;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        const essentialObj = details.find(item => item.essential !== undefined);

        if (essentialObj) {
            total++;

            if (essentialObj.essential.toLowerCase() === "no") {
                essentialNoCount++;
            }
        }
    });

    return total === 0 ? 0 : Math.round((essentialNoCount / total) * 100);
}
