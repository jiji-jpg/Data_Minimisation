document.addEventListener("DOMContentLoaded", async () => {

    const [answerRes, mhrRes, privacyRes] = await Promise.all([
        fetch("/static/exampleAnswer.json"),
        fetch("/static/myHealthRecord.json"),
        fetch("/static/privacyAct.json")
    ]);

    const data = await answerRes.json();
    const mhrAct = await mhrRes.json();
    const privacyAct = await privacyRes.json();

    // - Loop through categories
    const categories = data[1][0].personalDataAsset;

    let badCategoryCount = 0;

    // == Key Findings == 
    // purpose violation MHR Act
    const purposeResult = calculateFromRules(data, mhrAct, "purpose");
    const consentResult = calculateFromRules(data, mhrAct, "consent");
    const lessDetailedResult = calculateFromRules(data, privacyAct, "lessDetailed");
    const essentialResult = calculateFromRules(data, privacyAct, "essential");
    const retentionResult = calculateRetentionIssues(data, mhrAct);
    
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

    document.getElementById("retention-result").textContent =
        `${retentionResult.violation}% of retention periods violate My Health Record Act and have no special circumstances.`;

    document.getElementById("retention-unknown-result").textContent =
        `${retentionResult.unsure}% of retention periods are undefined or uncertain.`;

    document.getElementById("manual-delete-result").textContent =
        `${retentionResult.manualDeleted}% of enforcement measures rely on manual deletion.`;
    }
    
    // == End of Key Findings == 

    // ------------------------------------- 
    
    // == Executive Summary == 
    // Total categories assessed
    const totalCategoriesEl = document.getElementById("total-categories");
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = categories.length;
        }

    // Recommendations count (static for now)
    const recommendationsEl = document.getElementById("recommendations-count");
        if (recommendationsEl) {
            const recommendationCards = document.querySelectorAll(".recommended-actions article");
            recommendationsEl.textContent = recommendationCards.length;
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

    // Calculation for Minimisation & Retention Scores
    const minimisationScore = calculateMinimisationScore(data);
    const retentionScore = calculateRetentionScore(data);

    const minimisationScoreEl = document.getElementById("minimisation-score");
        if (minimisationScoreEl) {
            minimisationScoreEl.textContent = getScoreLabel(minimisationScore);
            minimisationScoreEl.style.color = getScoreColor(minimisationScore);
        }

    const retentionScoreEl = document.getElementById("retention-score");
        if (retentionScoreEl) {
            retentionScoreEl.textContent = getScoreLabel(retentionScore);
            retentionScoreEl.style.color = getScoreColor(retentionScore);
        }

    // == End of Executive Summary 
    
    // ------------------------------------- 
    
    // == Detailed Findings by Categories == 
    const container = document.getElementById("findingsByCategories")

    if (container)
    {
    // - Get if collect MHR
    const MHR_COLLECTED = checkMHR(data[0]["collectMyHealthRecord"])

    // - Get Data Asset Name 
    const DATA_ASSET = Object.keys(data[1][0])[0]
    createElement("h1", DATA_ASSET, container)    

    for (const category of categories){
        const [categoryName, categoryDetails] = Object.entries(category)[0];

        // - List category name 
        createElement("h2", categoryName, container)
        
        // - List attributes collected for the category 
        listAttributes(categoryDetails, container)
        
        // - Check violation
        let violation = 0;
        violation = checkGenericRules(categoryDetails, violation, container)
        violation = checkPrivacyAct(categoryName, privacyAct, categoryDetails, violation, container)
        violation = checkMHRAct(MHR_COLLECTED, violation, categoryDetails, mhrAct, container)
    

        // - Attach label to the category 
        getCategoryLabel(violation, container)

        // - Add to counter for category with violation
        if (violation > 0){
            badCategoryCount ++;
        }
    }
}
    // Areas requiring action
    // Reflecting number of categories listed in Detailed Assessments
    const areasActionEl = document.getElementById("areas-action");
        if (areasActionEl) {
            areasActionEl.textContent = badCategoryCount;
        }

    // == End of Detailed Findings by Categories == 
    // ------------------------------------- 
    

});

// == Functions for Detailed Assessment by Category ==

function getCategoryLabel (violationNumber, container){

    const label = document.createElement("span")
    label.classList.add("badge", "me-2");
    
    
    if (violationNumber <= 10/3){
        
        label.textContent = "Compliant"
        label.style.backgroundColor = "#1bb273"
        
    }
    else if (violationNumber <= 20/3){
        
        label.textContent = "Mostly Compliant"
        label.style.backgroundColor = "#f39c12"
    }
    else {
        
        label.textContent = "Needs Review"
        label.style.backgroundColor = "#ff002f"
    }
    
    container.appendChild(label)

}

function checkMHR(answer){
    // check if the user collect My Health Record
    if (answer.toLowerCase() == "yes" || answer.toLowerCase() == "unsure"){
        return true
    }
    else {
        return false
    }

}

function createElement(elementType, text, container){
    // create an element, change the text, then append to container
    // Arg: 
    //     elementType: String; the kind of DOM element needs to be created
    //     text: String; text for the element 
    //     container: DOM element that the newly created element will be append to 

    const element = document.createElement(elementType)
    element.textContent = text
    container.appendChild(element)
}

function listAttributes(categoryDetails, container){
    const ATTRIBUTES_COLLECTED = categoryDetails[0]["attributeCollected"]
    createElement("p", `attributes collected: ${ATTRIBUTES_COLLECTED.join(", ")}`, container)

}



function checkGenericRules (categoryDetails, violationNumber, container){
    // check items that do not need to be compared against MHR Act or Privacy Act
    // Arg: 
    //     categories: Array; an array of all the categories in a data asset
    //     violationsArray: Array: an array to append to if there is a violation
    //     container: DOM element; container for detailed assessment
    // return: 
    //     violationNumber

    for (item of categoryDetails){

        // covert all values to lower case
        for (const key in item) {
            const value = item[key];

            if (typeof value === "string") {
                item[key] = value.toLowerCase().trim();
            } 
            else if (Array.isArray(value)) {
                item[key] = value.map(p => p.toLowerCase().trim());
            }
        }
        
        
        // check if purpose is unsure 
        if ("collectionPurpose" in item && item.collectionPurpose === "unsure"){
            createElement("p", "These attributes have unknown collection purpose.")
            violationNumber ++;
        }
        
        // check if consent is no or unsure 
        if ("consent" in item && (item.consent == "no" || item.consent == "unsure")){
            createElement("p", "These attributes may be collected with no consent. Collecting data after acquiring consent is advised by My Health Act 2012.", container)
            createElement("a", "My Health Records Act 2012 - Part 3 - Registration", container)
            violationNumber ++;
        }

        // check if less detailed version can be collected 
        if ("lessDetailed" in item && (item.lessDetailed == "yes" || item.lessDetailed == "unsure")){
            createElement("p", "These attributes could have a less detailed version collected. They may violate the following section of Privacy Act", container);
            createElement("p", "Privacy Act 3.1 - 3.2", container)
            violationNumber ++;
        }

        // check if essential 
        if ("essential" in item && (item.essential == "no" || item.essential == "unsure")){
            createElement("p", "These attributes may not be essential to operation.", container)
            violationNumber ++;
        }

        // check if retention period is unsure 

        if ("retentionPeriod" in item && (item.retentionPeriod == "unsure" || item.retentionPeriod == "information is kept indefinitely")){
            createElement("p", "These attributes have unknown retention period or are kept indefinitely. This may violate sections of Privacy Act 1988", container)
            createElement("p", "Privacy Act 11.2", container)
            violationNumber ++;
        }

        // check enforcement measure 
        if ("enforcementMeasure" in item && 
            (item.enforcementMeasure == "manually deleted" || item.enforcementMeasure == "unsure")) {
            createElement("p", "These attributes are manually deleted after retention period or have unknown enforcement measure.", container)
            violationNumber ++;
        }
    
    }
    
    return violationNumber
    

}

function checkPrivacyAct(categoryName, privacyAct, categoryDetails, violationNumber, container){
    
    // check collection purpose and consent against Privacy Act
    const BAD_PURPOSE = privacyAct[0]["purpose"]["violation"][0].toLowerCase()
    const BAD_PURPOSE_CONSENT1 = privacyAct[0]["consent"]["violation"][0].toLowerCase()
    const BAD_PURPOSE_CONSENT2 = privacyAct[0]["consent"]["unsure"][0].toLowerCase()

    const COLLECTION_PURPOSE = categoryDetails[1]["collectionPurpose"].toLowerCase()
    const CONSENT = categoryDetails[2]["consent"].toLowerCase()

    
    if (COLLECTION_PURPOSE == BAD_PURPOSE && 
        (CONSENT == BAD_PURPOSE_CONSENT1 || 
        CONSENT == BAD_PURPOSE_CONSENT2)
    ){
        createElement("p", "Obtain consent before collecting these attributes for marketing purpose is advised by Privacy Act 1988", container)
        createElement("a", "Privacy Act 7.1 - 7.4", container)
        violationNumber ++;
    }

    // lessDetailed is checked in check generaic rules

    // check sensitive information
    const BAD_CATEGORY = privacyAct[2]["category"].toLowerCase()
    const BAD_SENSITIVE_CONSENT1 = privacyAct[2]["consent"]["violation"][0].toLowerCase()
    const BAD_SENSITIVE_CONSENT2 = privacyAct[2]["consent"]["unsure"][0].toLowerCase()
    if (categoryName.toLowerCase() == BAD_CATEGORY && (
        CONSENT == BAD_SENSITIVE_CONSENT1 || 
        CONSENT == BAD_SENSITIVE_CONSENT2
    )){
        createElement("p", "Obtain consent before collecting sensitive information is advised by Pivacy Act 1988", container)
        createElement("a", "Privacy Act 3.3 - 3.4", container)
        violationNumber ++;
    }

    // retention period is checked in check generic rules
    

    return violationNumber
    

}

function checkMHRAct(MHRCollected, violationNumber, categoryDetails, MHRAct, container){
    if (MHRCollected){

        // Get MHR Act purpose 
        const BAD_PURPOSE = MHRAct[1]["purpose"]["violation"]
        BAD_PURPOSE.push(MHRAct[1]["purpose"]["unsure"])
        const PURPOSE_SECTION = MHRAct[1]["MyHealthRecordSection"]

        // Get collection purpose from answer
        const COLLECTION_PURPOSE = categoryDetails[1]["collectionPurpose"].toLowerCase()
        
        // Check if collection purpose violates MHR Act 
        if (BAD_PURPOSE.includes(COLLECTION_PURPOSE)){
            createElement("p", `My Health Record Act 2012 advises against collecting data with the purpose of ${BAD_PURPOSE.join(", ")}`, container)
            createElement("a", PURPOSE_SECTION, container)
            violationNumber ++; 
        }

        // Get MHR Act retention purpose 
        const BAD_RETENTION_PERIOD = MHRAct[2]["retentionPeriod"]["violation"].map(v => v.toLowerCase().trim().replace(/\.$/, ""));
        const RETENTION_SECTION = MHRAct[2]["MyHealthRecordSection"]

        const RETENTION_PERIOD = categoryDetails[5]["retentionPeriodForMHR"].toLowerCase().trim().replace(/\.$/, "")
        
        if (BAD_RETENTION_PERIOD.includes(RETENTION_PERIOD)){
            createElement("p", `My Health Record Act 2012 advises against ${BAD_RETENTION_PERIOD.join(", ")}`, container);
            createElement("a", RETENTION_SECTION, container)
            violationNumber ++;

        }

        return violationNumber;


    }

    
    else{
        
        return violationNumber;

    }


}



// == End of Functions for Detailed Assessment == 

// -------------------------------------------------

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
    const categories = data[1][0].personalDataAsset;

    const lessDetailedValues = [];
    const consentValues = [];
    const essentialValues = [];
    const purposeValues = [];

    categories.forEach(categoryObj => {
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
    const categories = data[1][0].personalDataAsset;

    let totalCategoryCount = 0;
    let categoryPoint = 0;

    const deletionValues = [];
    const retentionValues = [];

    categories.forEach(categoryObj => {
        const categoryDetails = Object.entries(categoryObj)[0][1];

        const retentionPeriodForMHR = getCategoryFieldValue(categoryDetails, "retentionPeriodForMHR");
        const specialCircumstance = getCategoryFieldValue(categoryDetails, "specialCircumtance");
        const enforcementMeasure = getCategoryFieldValue(categoryDetails, "enforcementMeasure");
        const retentionPeriod = getCategoryFieldValue(categoryDetails, "retentionPeriod");

        // a: category point logic
        if (
            retentionPeriodForMHR === "up to 30 years after death" ||
            retentionPeriodForMHR === "100 years"
        ) {
            categoryPoint += 1;
            totalCategoryCount++;
        } else if (
            retentionPeriodForMHR === "unsure" &&
            specialCircumstance === "no"
        ) {
            categoryPoint += 0;
            totalCategoryCount++;
        } else if (
            retentionPeriodForMHR === "unsure" &&
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
        if (value === "information is kept indefinitely") {
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

