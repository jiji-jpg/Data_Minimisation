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
            createElement("p", "These attributes have unknown collection purpose.",container)
            violationNumber ++;
        }
        
        // check if consent is no or unsure 
        if ("consent" in item && (item.consent == "no" || item.consent == "unsure")){
            createElement("p", "These attributes may be collected with no consent. Collecting data after acquiring consent is advised by My Health Act 2012.", container)
            createElement("a", "My Health Records Act 2012 - Part 3 - Registratgit puion", container)
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
// -------------------------------------------------

// == Functions for Cost Reduction == 

function calculateCost(numberOfAttributes, percentageOfBadCategories){
    var storageCost = 0;
    var administrationCost = 0;
    var regulatoryCost = 0;

    const TOTAL_PATIENTS = 10000;
    const ATTRIBUTE_SIZE_IN_MB = 3;
    // attributes size in MB * number of attributes * total patients * (1 original + log size) / 1000 (to convert to GB) 
    const STORAGE_IN_GB = ATTRIBUTE_SIZE_IN_MB * numberOfAttributes * TOTAL_PATIENTS * (1 + 0.3) / 1000

    // storage cost variables 
    const MONTHLY_STORAGE_COST_PER_GB = 0.194;
    const MONTHLY_BACKUP_PER_GB = 0.338
    const LONG_TERM__RETENTION_PER_GB = 0.084
    const MONTHLY_COMPUTE_COST = 372.01

    const COST_A = STORAGE_IN_GB * MONTHLY_STORAGE_COST_PER_GB
    const COST_B = STORAGE_IN_GB * MONTHLY_BACKUP_PER_GB
    const COST_C = STORAGE_IN_GB * 52 * LONG_TERM__RETENTION_PER_GB 

    storageCost = (COST_A + COST_B + COST_C + MONTHLY_COMPUTE_COST) * 12

    const FORMATTED_STORAGE_COST = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
    }).format(Math.floor(storageCost));

    // admin cost variable
    const YEARLY_ADMIN_COST_PER_GB = 0.5;

    administrationCost = YEARLY_ADMIN_COST_PER_GB * STORAGE_IN_GB 

    const FORMATTED_AMIN_COST = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
    }).format(Math.floor(administrationCost));

    // regulatory cost variable 
    // USD 185 per record breach 
    // % to be saved = unnecessary categories / all categories collected 
    // 185 USD = 270 AUD 
    // total amount saved = 270 * patient number * % to be saved 
    const YEARLY_BREACH_COST_PER_RECORD = 270;

    regulatoryCost = 270 * TOTAL_PATIENTS * percentageOfBadCategories 

    const FORMATTED_REG_COST = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
    }).format(Math.floor(regulatoryCost));

    return [FORMATTED_STORAGE_COST, FORMATTED_AMIN_COST, FORMATTED_REG_COST]}
