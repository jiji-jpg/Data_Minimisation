function renderFindingsByCategory(data, mhrAct, privacyAct, useMHR) {

    const container = document.getElementById("findingsByCategories");

    let badCategoryCount = 0;
    let NUMBER_OF_CATEGORIES = 0;
    let NUMBER_OF_ATTRIBUTES = 0;

    if (container) {

        const dataAssets = Object.entries(data["data"][1][0]);
        
        for (const [DATA_ASSET, categories] of dataAssets){
            
            // create data asset article 
            const DATA_ASSET_ARTICLE = document.createElement("article")
            DATA_ASSET_ARTICLE.className = "category"
            container.append(DATA_ASSET_ARTICLE)

            // create data asset header 
            const DATA_ASSET_HEADER = document.createElement("div")
            DATA_ASSET_HEADER.className = "category-header"
            DATA_ASSET_ARTICLE.append(DATA_ASSET_HEADER)
        
            // - Get Data Asset Name
            createElement("h2", DATA_ASSET, DATA_ASSET_HEADER);
        

        for (const category of categories) {

            // create category header
            const DATA_ASSET_HEADER = document.createElement("div")
            DATA_ASSET_HEADER.className = "category-header"
            DATA_ASSET_ARTICLE.append(DATA_ASSET_HEADER) 
            
            const [categoryName, categoryDetails] = Object.entries(category)[0];

            NUMBER_OF_CATEGORIES++;

            const CATEGORY_CONTENT = document.createElement("div")

            // - Check violation
            let violation = 0;
            violation = checkGenericRules(categoryDetails, violation, CATEGORY_CONTENT);
            violation = checkPrivacyAct(categoryName, privacyAct, categoryDetails, violation, CATEGORY_CONTENT);
            violation = checkMHRAct(useMHR, violation, categoryDetails, mhrAct, CATEGORY_CONTENT);
            // - Attach label to the category 
            [CATEGORY_CONTAINER, label] = getCategoryLabel(violation, container);
    
            DATA_ASSET_HEADER.append(CATEGORY_CONTAINER)
            
            // - List category name 
            const CATEGORY_TITLE = document.createElement("div")
            CATEGORY_TITLE.className = "category-title"
            CATEGORY_CONTAINER.append(CATEGORY_TITLE)

            createElement("h3", categoryName, CATEGORY_TITLE);

            // append label 
            CATEGORY_TITLE.append(label)

            // check if attributes collected are not applicable
            if (categoryDetails[0]["attributeCollected"].map(item => item.toLowerCase()).includes("not applicable")){
                createElement("p", "You are not collecting attributes of this category.", container)
                NUMBER_OF_CATEGORIES--;
                continue
            }
            
            // - List attributes collected for the category 
            listAttributes(categoryDetails, CATEGORY_CONTAINER);

            CATEGORY_CONTAINER.append(CATEGORY_CONTENT)

            // - Add to counter for category with violation
            // - Get number of attributes and add to total of attributes
            if (violation > 0) {
                badCategoryCount++;
                
                NUMBER_OF_ATTRIBUTES += categoryDetails[0]["attributeCollected"].length;
                
            }

            
        }
        
    }
    }

    return {
        badCategoryCount,
        NUMBER_OF_CATEGORIES,
        NUMBER_OF_ATTRIBUTES
    };
}

// == Functions for Detailed Assessment by Category ==


function getCategoryLabel (violationNumber, container){

    const label = document.createElement("span")
    
    const CATEGORY_CONTAINER = document.createElement("div")
    
    
    if (violationNumber <= 10/3){
        
        label.className = "badge compliant";
        label.textContent = "Compliant"
        label.style.backgroundColor = "#1bb273"
        CATEGORY_CONTAINER.className = "assessment-item success"
        
    }
    else if (violationNumber <= 20/3){
        
        label.className = "badge review";
        label.textContent = "Mostly Compliant"
        label.style.backgroundColor = "#f39c12"
        CATEGORY_CONTAINER.className = "assessment-item warning"
    }
    else {
        
        label.className = "badge action";
        label.textContent = "Needs Review"
        label.style.backgroundColor = "#ff002f"
        CATEGORY_CONTAINER.className = "assessment-item danger"
    }
    
    return [CATEGORY_CONTAINER, label]

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
    createElement("p", `Attributes collected: ${ATTRIBUTES_COLLECTED.join(", ")}`, container)

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
            createElement("a", "My Health Records Act 2012 - Part 3 - Registration", container)
            violationNumber ++;

        }


        // check if less detailed version can be collected 
        if ("lessDetailed" in item && (item.lessDetailed == "yes" || item.lessDetailed == "unsure")){
            createElement("p", "These attributes could have a less detailed version collected. They may violate the following section of Privacy Act", container);
            createElement("a", "Privacy Act 3.1 - 3.2", container)
            violationNumber ++;
        }

        // check if essential 
        if ("essential" in item && (item.essential == "no" || item.essential == "unsure")){
            createElement("p", "These attributes may not be essential to operation.", container)
            violationNumber ++;
        }

        // check if retention period is unsure 

        if ("retentionPeriod" in item && (item.retentionPeriod == "unsure" || item.retentionPeriod.includes("information is kept indefinitely")))
            {
            
            createElement("p", "These attributes have unknown retention period or are kept indefinitely. This may violate sections of Privacy Act 1988", container)
            createElement("a", "Privacy Act 11.2", container)
            violationNumber ++;
        }

        // check enforcement measure 
        if ("enforcementMeasure" in item && 
            (item.enforcementMeasure.includes("manually deleted") || item.enforcementMeasure == "unsure")) {
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
    if (categoryName.toLowerCase().includes(BAD_CATEGORY) && (
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
        const BAD_RETENTION_PERIOD = MHRAct[2]["retentionPeriodMHR"]["violation"].map(v => v.toLowerCase().trim().replace(/\.$/, ""));
        const RETENTION_SECTION = MHRAct[2]["MyHealthRecordSection"]
        const SPECIAL_CIRCUMSTANCE = categoryDetails[7]["retentionException"].toLowerCase()
        

        const RETENTION_PERIOD = categoryDetails[5]["retentionPeriodMHR"].toLowerCase().trim().replace(/\.$/, "")
        
        if (BAD_RETENTION_PERIOD.includes(RETENTION_PERIOD) && (SPECIAL_CIRCUMSTANCE == "no" || SPECIAL_CIRCUMSTANCE == "unsure")){
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
