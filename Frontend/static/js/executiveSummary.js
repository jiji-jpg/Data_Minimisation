function renderExecutiveSummary(data, categories, badCategoryCount) {

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
    const areasActionEl = document.getElementById("areas-action");

    if (areasActionEl) {
        areasActionEl.textContent = badCategoryCount;
    }
}