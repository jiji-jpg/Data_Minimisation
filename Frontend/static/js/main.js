document.addEventListener("DOMContentLoaded", async () => {

    const [answerRes, mhrRes, privacyRes] = await Promise.all([
        // fetch("/api/latest-submission"),
        fetch("/static/js/randomCaseThree.json"), 
        fetch("/static/myHealthRecord.json"),
        fetch("/static/privacyAct.json")
    ]);

    if (!answerRes.ok) {
        document.body.innerHTML = "<p style='padding:2rem'>No submission found. Please complete the questionnaire first.</p>";
        return;
    }

    const data = await answerRes.json();
    const mhrAct = await mhrRes.json();
    const privacyAct = await privacyRes.json();

    const useMHR = checkMHR(data["data"][0]["collectMyHealthRecord"]);

    // - Loop through categories
    // const categories = data["data"][1][0].personalDataAsset;

    let badCategoryCount = 0;
    let NUMBER_OF_CATEGORIES = 0;
    let NUMBER_OF_ATTRIBUTES = 0;
    
    renderKeyFindings(data, mhrAct, privacyAct, useMHR);

    const result = renderFindingsByCategory(data, mhrAct, privacyAct, useMHR);
    
    badCategoryCount = result.badCategoryCount;
    NUMBER_OF_CATEGORIES = result.NUMBER_OF_CATEGORIES;
    NUMBER_OF_ATTRIBUTES = result.NUMBER_OF_ATTRIBUTES;

    renderRecommendedActions(data, mhrAct, privacyAct, useMHR);
    renderCostReduction(NUMBER_OF_ATTRIBUTES, badCategoryCount, NUMBER_OF_CATEGORIES);
    renderExecutiveSummary(data, getAllCategories(data), badCategoryCount);
    
    
    
});