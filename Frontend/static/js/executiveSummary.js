function getAllCategories(rawData) {
    const reportGroups = rawData.data?.[1]?.[0];
    if (!reportGroups) return [];

    const allCategories = [];

    Object.values(reportGroups).forEach(group => {
        if (Array.isArray(group)) {
            group.forEach(categoryObj => allCategories.push(categoryObj));
        }
    });

    return allCategories;
}

// Helper: check if a category has all N/A attributes
function isAllNotApplicable(categoryObj) {
    const categoryDetails = Object.entries(categoryObj)[0][1];
    const attributes = categoryDetails[0]?.attributeCollected || [];
    return attributes.length > 0 && attributes.every(attr => attr.toLowerCase().trim() === "not applicable");
}

// Helper: check how many valid categories are there 
function countValidCategories(data){
    var categoryCount = 0;
    const dataAssetDict = data.data[1][0];
    for (const dataAssetName in dataAssetDict){
        
        const categoryArrays = dataAssetDict[dataAssetName]
        for (const category of categoryArrays){
            for (const [categoryName, categoryDetails] of Object.entries(category)){
                if (categoryDetails.some(item => item.skipped)){
                    continue;
                }
                categoryCount ++;
            }   
        }
    }
    
    return categoryCount

}

function renderExecutiveSummary(data, categories, badCategoryCount) {

    const minimisationScore = calculateMinimisationScore(data);
    const retentionScore = calculateRetentionScore(data);

    // If both scores are N/A, all counts should be 0
    const allNA = minimisationScore === null && retentionScore === null;

    // Total categories assessed
    const totalCategoriesEl = document.getElementById("total-categories");
    if (totalCategoriesEl) {
        if (allNA) {
            totalCategoriesEl.textContent = 0;
        }
         else {
            const categoryCount = countValidCategories(data)
            totalCategoriesEl.textContent = categoryCount
        }
    }

    // Recommendations count 
    const recommendationsEl = document.getElementById("recommendations-count");
    if (recommendationsEl) {
        recommendationsEl.textContent = window._recommendedActionsCount ?? 0;
    }

    // Score labels (Medium / High)
    function getScoreLabel(score) {
        if (score > 20/3) return "High";
        if (score > 10/3) return "Medium";
        return "Low";
    }

    function getScoreColor(score) {
        if (score > 20/3) return "#1bb273"; // green
        if (score > 10/3) return "#f39c12"; // orange
        return "#ff002f"; // red
    }

    const minimisationScoreEl = document.getElementById("minimisation-score");
    if (minimisationScoreEl) {
        if (minimisationScore === null) {
            minimisationScoreEl.textContent = "N/A";
            minimisationScoreEl.style.color = "#6b7280";
        } else {
            minimisationScoreEl.textContent = getScoreLabel(minimisationScore);
            minimisationScoreEl.style.color = getScoreColor(minimisationScore);
        }
    }

    const retentionScoreEl = document.getElementById("retention-score");
    if (retentionScoreEl) {
        if (retentionScore === null) {
            retentionScoreEl.textContent = "N/A";
            retentionScoreEl.style.color = "#6b7280";
        } else {
            retentionScoreEl.textContent = getScoreLabel(retentionScore);
            retentionScoreEl.style.color = getScoreColor(retentionScore);
        }
    }

    const areasActionEl = document.getElementById("areas-action");
    if (areasActionEl) {
        areasActionEl.textContent = allNA ? 0 : badCategoryCount;
    }
}


// == Scoring Helper Functions ==
function getCategoryFieldValue(categoryDetails, key) {
    const item = categoryDetails.find(obj => Object.prototype.hasOwnProperty.call(obj, key));
    return item ? String(item[key]).toLowerCase().trim() : "";
}

function normalizeScore(score, minScore, maxScore) {
    if (maxScore === minScore) return 0;
    return (score - minScore) / (maxScore - minScore);
}

function calculateWeightedThreeLevelScore(values, weights) {
    let score = 0;
    let total = 0;

    values.forEach(value => {
        if (weights.hasOwnProperty(value)) {
            score += weights[value];
            total++;
        }
    });

    if (total === 0) return 0;

    const weightValues = Object.values(weights);
    const minWeight = Math.min(...weightValues);
    const maxWeight = Math.max(...weightValues);

    const minScore = minWeight * total;
    const maxScore = maxWeight * total;

    return normalizeScore(score, minScore, maxScore);
}

// == Scoring Functions ==
// Minimisation Score Function

function calculateMinimisationScore(data) {
    const categories = getAllCategories(data);

    const applicableCategories = categories.filter(categoryObj => !isAllNotApplicable(categoryObj));

    if (applicableCategories.length === 0) return null;

    const lessDetailedValues = [];
    const consentValues = [];
    const essentialValues = [];
    const purposeValues = [];

    applicableCategories.forEach(categoryObj => {
        const categoryDetails = Object.entries(categoryObj)[0][1];

        const lessDetailed = getCategoryFieldValue(categoryDetails, "lessDetailed");
        const consent = getCategoryFieldValue(categoryDetails, "consent");
        const essential = getCategoryFieldValue(categoryDetails, "essential");
        const purpose = getCategoryFieldValue(categoryDetails, "collectionPurpose");

        lessDetailedValues.push(lessDetailed);
        consentValues.push(consent);
        essentialValues.push(essential);
        purposeValues.push(purpose);
    });

    // a = lessDetailed
    // yes = bad, no = good, unsure = middle
    const a = calculateWeightedThreeLevelScore(lessDetailedValues, {
        "yes": -1,
        "no": 2,
        "unsure": 1
    });

    // b = consent
    const b = calculateWeightedThreeLevelScore(consentValues, {
        "yes": 2,
        "no": -1,
        "unsure": 1
    });

    // c = essential
    const c = calculateWeightedThreeLevelScore(essentialValues, {
        "yes": 2,
        "no": -1,
        "unsure": 1
    });

    // d = purpose
    // any purpose other than unsure/unknown = good
    let knownPurposeCount = 0;
    let unknownPurposeCount = 0;

    purposeValues.forEach(value => {
        if (value === "unsure" || value === "unknown" || value === "") {
            unknownPurposeCount++;
        } else {
            knownPurposeCount++;
        }
    });

    const totalPurpose = knownPurposeCount + unknownPurposeCount;
    let d = 0;

    if (totalPurpose > 0) {
        const purposeScore = (1 * knownPurposeCount) + (-1 * unknownPurposeCount);
        const purposeMin = -1 * totalPurpose;
        const purposeMax = 1 * totalPurpose;
        d = normalizeScore(purposeScore, purposeMin, purposeMax);
    }

    const finalScore = ((a + b + c + d) / 4) * 10;
    return Number(finalScore.toFixed(1));
}

// Retention Score Function

function calculateRetentionScore(data) {
    const categories = getAllCategories(data);

    let totalCategoryCount = 0;
    let categoryPoint = 0;

    const deletionValues = [];
    const retentionValues = [];

    categories.forEach(categoryObj => {
        const categoryDetails = Object.entries(categoryObj)[0][1];

        const retentionPeriodMHR = getCategoryFieldValue(categoryDetails, "retentionPeriodMHR");
        const specialCircumstance = getCategoryFieldValue(categoryDetails, "specialCircumstance") || "";
        const enforcementMeasure = getCategoryFieldValue(categoryDetails, "enforcementMeasure");
        const retentionPeriod = getCategoryFieldValue(categoryDetails, "retentionPeriod");

        // a: category point logic
        const isOptionB =
            retentionPeriodMHR !== "up to 30 years after death" &&
            retentionPeriodMHR !== "100 years" &&
            retentionPeriodMHR !== "unsure" &&
            retentionPeriodMHR !== "there is no consistent policy" &&
            retentionPeriodMHR !== "";

        if (
            retentionPeriodMHR === "up to 30 years after death" ||
            retentionPeriodMHR === "100 years"
        ) {
            categoryPoint += 1;
            totalCategoryCount++;
        } else if (
            isOptionB &&
            specialCircumstance.includes("yes")
        ) {
            categoryPoint += 1;
            totalCategoryCount++;
        } else if (
            isOptionB &&
            specialCircumstance === "no"
        ) {
            categoryPoint += 0;
            totalCategoryCount++;
        } else if (
            retentionPeriodMHR === "unsure" ||
            retentionPeriodMHR === "there is no consistent policy"
        ) {
            categoryPoint += 0.5;
            totalCategoryCount++;
        } else if (
            isOptionB &&
            specialCircumstance === "unsure"
        ) {
            categoryPoint += 0.5;
            totalCategoryCount++;
        } else {
            categoryPoint += 1;
            totalCategoryCount++;
        }

        // b: deletion / enforcement
        // clarified rules:
        // manually deleted = manual bad
        // unsure = manual bad
        // upon patient request = good

        if (
            enforcementMeasure === "manually deleted" ||
            enforcementMeasure === "unsure"
        ) {
            deletionValues.push("manual");
        } else if (enforcementMeasure === "upon patient request") {
            deletionValues.push("good");
        } else {
            deletionValues.push("good");
        }

        // c: retention period
        retentionValues.push(retentionPeriod);
    });

    const a = totalCategoryCount === 0 ? 0 : categoryPoint / totalCategoryCount;

    // b
    let deletionScore = 0;
    let deletionCount = 0;

    deletionValues.forEach(value => {
        if (value === "good") {
            deletionScore += 2;
            deletionCount++;
        } else if (value === "manual") {
            deletionScore += 1;
            deletionCount++;
        }
    });

    const b = deletionCount === 0
        ? 0
        : normalizeScore(deletionScore, 1 * deletionCount, 2 * deletionCount);

    // c
    let retentionScoreRaw = 0;
    let retentionCount = 0;

    retentionValues.forEach(value => {
        if (value === "information is kept indefinitely.") {
            retentionScoreRaw += -1;
            retentionCount++;
        } else if (value === "unsure" || value === "unknown" || value === "") {
            retentionScoreRaw += 1;
            retentionCount++;
        } else {
            retentionScoreRaw += 2;
            retentionCount++;
        }
    });

    const c = retentionCount === 0
        ? 0
        : normalizeScore(retentionScoreRaw, -1 * retentionCount, 2 * retentionCount);

    const finalScore = ((a + b + c) / 3) * 10;
    return Number(finalScore.toFixed(1));
}

// -------------------------------------------------
