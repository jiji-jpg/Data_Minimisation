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

function renderExecutiveSummary(data, categories, badCategoryCount) {

    const minimisationScore = calculateMinimisationScore(data);
    const retentionScore = calculateRetentionScore(data);

    // If both scores are N/A, all counts should be 0
    const allNA = minimisationScore === null && retentionScore === null;

    // Total categories assessed — count data asset groups, not individual categories
    const totalCategoriesEl = document.getElementById("total-categories");
    if (totalCategoriesEl) {
        if (allNA) {
            totalCategoriesEl.textContent = 0;
        } else {
            const reportGroups = data.data?.[1]?.[0] || {};
            totalCategoriesEl.textContent = Object.keys(reportGroups).length;
        }
    }

    // Recommendations count — from buildRecommendedActions via window
    const recommendationsEl = document.getElementById("recommendations-count");
    if (recommendationsEl) {
        recommendationsEl.textContent = window._recommendedActionsCount ?? 0;
    }

    // Score labels
    function getScoreLabel(score) {
        if (score > 20 / 3) return "High";
        if (score > 10 / 3) return "Medium";
        return "Low";
    }

    function getScoreColor(score) {
        if (score > 20 / 3) return "#1bb273";
        if (score > 10 / 3) return "#f39c12";
        return "#ff002f";
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

    // FIX: d = purpose
    // Diagram: weight of any other purpose than unknown = 1, weight of no = 2, weight of unsure = -1
    let dScore = 0;
    let dTotal = 0;

    purposeValues.forEach(value => {
        if (value === "no") {
            dScore += 2;
            dTotal++;
        } else if (value === "unsure" || value === "unknown" || value === "") {
            dScore += -1;
            dTotal++;
        } else {
            // Any other known purpose
            dScore += 1;
            dTotal++;
        }
    });

    const d = dTotal === 0
        ? 0
        : normalizeScore(dScore, -1 * dTotal, 2 * dTotal);

    const finalScore = ((a + b + c + d) / 4) * 10;
    return Number(finalScore.toFixed(1));
}

// Retention Score Function
function calculateRetentionScore(data) {
    const categories = getAllCategories(data);

    const applicableCategories = categories.filter(categoryObj => !isAllNotApplicable(categoryObj));

    if (applicableCategories.length === 0) return null;

    let totalCategoryCount = 0;
    let categoryPoint = 0;

    const deletionValues = [];
    const retentionValues = [];

    applicableCategories.forEach(categoryObj => {
        const categoryDetails = Object.entries(categoryObj)[0][1];

        const retentionPeriodMHR = getCategoryFieldValue(categoryDetails, "retentionPeriodMHR");
        const enforcementMeasure = getCategoryFieldValue(categoryDetails, "enforcementMeasure");
        const retentionPeriod = getCategoryFieldValue(categoryDetails, "retentionPeriod");

        // FIX: a — categoryPoint with all 5 branches from the diagram
        const specialCircumstances = getCategoryFieldValue(categoryDetails, "specialCircumstances");

        if (
            retentionPeriodMHR === "up to 30 years after death" ||
            retentionPeriodMHR === "100 years"
        ) {
            // Option A: standard compliant retention periods → full point
            categoryPoint += 1;
            totalCategoryCount++;
        } else if (
            retentionPeriodMHR === "option b" &&
            specialCircumstances.includes("yes")
        ) {
            // Option B + special circumstances = yes → full point
            categoryPoint += 1;
            totalCategoryCount++;
        } else if (
            retentionPeriodMHR === "option b" &&
            specialCircumstances === "no"
        ) {
            // Option B + special circumstances = no → 0 points
            categoryPoint += 0;
            totalCategoryCount++;
        } else if (
            retentionPeriodMHR === "unsure" &&
            retentionPeriod === "there is no consistent policy"
        ) {
            // Unsure MHR + no consistent policy → partial point
            categoryPoint += 0.5;
            totalCategoryCount++;
        } else if (
            retentionPeriodMHR === "option b" &&
            specialCircumstances === "unsure"
        ) {
            // Option B + special circumstances = unsure → partial point
            categoryPoint += 0.5;
            totalCategoryCount++;
        } else {
            // All other cases → full point
            categoryPoint += 1;
            totalCategoryCount++;
        }

        // FIX: b — enforcementMeasure
        // Diagram: automatically deleted = 2, manually reviewed = 1, unsure = 1
        if (enforcementMeasure === "automatically deleted") {
            deletionValues.push("auto");
        } else if (
            enforcementMeasure === "manually reviewed" ||
            enforcementMeasure === "unsure"
        ) {
            deletionValues.push("manual");
        } else {
            deletionValues.push("manual");
        }

        // c = retention period (unchanged)
        retentionValues.push(retentionPeriod);
    });

    const a = totalCategoryCount === 0 ? 0 : categoryPoint / totalCategoryCount;

    // b — automatically deleted = weight 2, manually reviewed/unsure = weight 1
    let deletionScore = 0;
    let deletionCount = 0;

    deletionValues.forEach(value => {
        if (value === "auto") {
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

    // c — retention period
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