document.addEventListener("DOMContentLoaded", async () => {

    const [answerRes, mhrRes, privacyRes] = await Promise.all([
        fetch("/static/exampleAnswer.json"),
        fetch("/static/myHealthRecord.json"),
        fetch("/static/privacyAct.json")
    ]);

    const data = await answerRes.json();
    const mhrAct = await mhrRes.json();
    const privacyAct = await privacyRes.json();

    // == Key Findings == 
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
    
    // == End of Key Findings == 

    // ------------------------------------- 
    
    // == Executive Summary == 

    // - Create counter for category with violations
    let badCategoryCount = 0;
    // == End of Executive Summary 
    
    // ------------------------------------- 
    
    // == Detailed Findings by Categories == 
    const container = document.getElementById("findingsByCategories")

    
    // - Get if collect MHR
    const MHR_COLLECTED = checkMHR(data[0]["collectMyHealthRecord"])

    // - Get Data Asset Name 
    const DATA_ASSET = Object.keys(data[1][0])[0]
    createElement("h1", DATA_ASSET, container)

    // - Loop through categories
    const categories = data[1][0].personalDataAsset;

    // - Get total number of unnecessary attributes collected for cost reduction 
    let NUMBER_OF_ATTRIBUTES = 0;
    let NUMBER_OF_CATEGORIES = 0;
    
    
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
        // - Get number of attributes and add to total of attributes
        if (violation > 0){
            badCategoryCount ++;
            NUMBER_OF_ATTRIBUTES = NUMBER_OF_ATTRIBUTES + categoryDetails[0]["attributeCollected"].length
        } 

        
        
    }

    // == End of Detailed Findings by Categories == 
    // ------------------------------------- 
    // == Cost Reduction Section == 
    let storageCost = 0;
    let administrationCost = 0;
    let regulatoryCost = 0;

    const PERCENTAGE_OF_BAD_CATEGORIES = badCategoryCount / NUMBER_OF_CATEGORIES;
    
    [storageCost, administrationCost, regulatoryCost] = calculateCost(NUMBER_OF_ATTRIBUTES, PERCENTAGE_OF_BAD_CATEGORIES)
    createElement("p", `storage cost: ${storageCost}`, container)
    createElement("p", `regulartory cost: ${regulatoryCost}`, container)
    createElement("p", `administration cost: ${administrationCost}`, container)

    

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
        if ("enforcementMeasure" in item && item.enforcementMeasure == "manually deleted" || item.enforcementMeasure == "unsure"){
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
        const BAD_RETENTION_PERIOD = MHRAct[2]["retentionPeriod"]["violation"]
        const RETENTION_SECTION = MHRAct[2]["MyHealthRecordSection"]

        const RETENTION_PERIOD = categoryDetails[1]["collectionPurpose"].toLowerCase()
        
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
    
    return [FORMATTED_STORAGE_COST, FORMATTED_AMIN_COST, FORMATTED_REG_COST]


}