function renderFindingsByCategory(data, mhrAct, privacyAct, useMHR) {

    const container = document.getElementById("findingsByCategories");

    let badCategoryCount = 0;
    let NUMBER_OF_CATEGORIES = 0;
    let NUMBER_OF_ATTRIBUTES = 0;

    if (container) {

        // - Get Data Asset Name
        const DATA_ASSET = Object.keys(data[1][0])[0];
        createElement("h1", DATA_ASSET, container);

        // - Loop through categories
        const categories = data[1][0].personalDataAsset;

        // - Get total number of unnecessary attributes collected for cost reduction


        for (const category of categories) {
            NUMBER_OF_CATEGORIES++;
            const [categoryName, categoryDetails] = Object.entries(category)[0];

            // - List category name 
            createElement("h2", categoryName, container);

            // - List attributes collected for the category 
            listAttributes(categoryDetails, container);

            // - Check violation
            let violation = 0;
            violation = checkGenericRules(categoryDetails, violation, container);
            violation = checkPrivacyAct(categoryName, privacyAct, categoryDetails, violation, container);
            violation = checkMHRAct(useMHR, violation, categoryDetails, mhrAct, container);

            // - Attach label to the category 
            getCategoryLabel(violation, container);

            // - Add to counter for category with violation
            // - Get number of attributes and add to total of attributes
            if (violation > 0) {
                badCategoryCount++;
                NUMBER_OF_ATTRIBUTES += categoryDetails[0]["attributeCollected"].length;
            }
        }
    }

    return {
        badCategoryCount,
        NUMBER_OF_CATEGORIES,
        NUMBER_OF_ATTRIBUTES
    };
}