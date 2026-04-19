function renderCostReduction(NUMBER_OF_ATTRIBUTES, badCategoryCount, NUMBER_OF_CATEGORIES) {

    let storageCost = 0;
    let administrationCost = 0;
    let regulatoryCost = 0;

    const PERCENTAGE_OF_BAD_CATEGORIES = NUMBER_OF_CATEGORIES > 0
        ? badCategoryCount / NUMBER_OF_CATEGORIES
        : 0;

    [storageCost, administrationCost, regulatoryCost] =
        calculateCost(NUMBER_OF_ATTRIBUTES, PERCENTAGE_OF_BAD_CATEGORIES);

    document.getElementById("storage-cost").textContent = storageCost === "$0" ? "N/A" : storageCost;
    document.getElementById("administration-cost").textContent = administrationCost === "$0" ? "N/A" : administrationCost;
    document.getElementById("regulatory-cost").textContent = regulatoryCost === "$0" ? "N/A" : regulatoryCost;
}

// == Functions for Cost Reduction == 

function calculateCost(numberOfAttributes, percentageOfBadCategories){
    var storageCost = 0;
    var administrationCost = 0;
    var regulatoryCost = 0;

    const TOTAL_PATIENTS = 10000;
    const ATTRIBUTE_SIZE_IN_MB = 3;
    const STORAGE_IN_GB = ATTRIBUTE_SIZE_IN_MB * numberOfAttributes * TOTAL_PATIENTS * (1 + 0.3) / 1000

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

    const YEARLY_ADMIN_COST_PER_GB = 0.5;

    administrationCost = YEARLY_ADMIN_COST_PER_GB * STORAGE_IN_GB

    const FORMATTED_AMIN_COST = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.floor(administrationCost));

    regulatoryCost = 270 * TOTAL_PATIENTS * percentageOfBadCategories

    const FORMATTED_REG_COST = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.floor(regulatoryCost));

    return [FORMATTED_STORAGE_COST, FORMATTED_AMIN_COST, FORMATTED_REG_COST];
}