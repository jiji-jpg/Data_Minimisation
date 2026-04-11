function renderCostReduction(NUMBER_OF_ATTRIBUTES, badCategoryCount, NUMBER_OF_CATEGORIES) {

    const container = document.getElementById("findingsByCategories");

    let storageCost = 0;
    let administrationCost = 0;
    let regulatoryCost = 0;

    const PERCENTAGE_OF_BAD_CATEGORIES = badCategoryCount / NUMBER_OF_CATEGORIES;

    [storageCost, administrationCost, regulatoryCost] =
        calculateCost(NUMBER_OF_ATTRIBUTES, PERCENTAGE_OF_BAD_CATEGORIES);

    createElement("p", `storage cost: ${storageCost}`, container);
    createElement("p", `regulartory cost: ${regulatoryCost}`, container);
    createElement("p", `administration cost: ${administrationCost}`, container);
}