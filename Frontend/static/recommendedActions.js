(function () {
    let myHealthRecordRules = [];
    let privacyActRules = [];

    function normalize(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[.]/g, "")
            .replace(/\s+/g, " ");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function loadJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    function extractCategories(answerJson) {
        const assetGroups = answerJson?.data?.[1]?.[0] || {};
        const categories = [];

        for (const [assetGroupName, subcategories] of Object.entries(assetGroups)) {
            if (!Array.isArray(subcategories)) continue;

            for (const subcategoryObj of subcategories) {
                for (const [categoryName, entries] of Object.entries(subcategoryObj)) {
                    if (!Array.isArray(entries)) continue;

                    const merged = entries.reduce((acc, obj) => ({ ...acc, ...obj }), {});

                    categories.push({
                        assetGroup: assetGroupName,
                        categoryName,
                        attributeCollected: merged.attributeCollected || [],
                        collectionPurpose: merged.collectionPurpose || "",
                        consent: merged.consent || "",
                        essential: merged.essential || "",
                        lessDetailed: merged.lessDetailed || "",
                        retentionPeriodForMHR: merged.retentionPeriodMHR || "",
                        retentionPeriod: merged.retentionPeriod || "",
                        specialCircumtance: merged.specialCircumtance || "",
                        enforcementMeasure: merged.enforcementMeasure || ""
                    });
                }
            }
        }

        return { categories };
    }

    function getMyHealthRuleByKey(key) {
        return myHealthRecordRules.find(rule => Object.prototype.hasOwnProperty.call(rule, key)) || {};
    }

    function getPrivacyRuleByKey(key) {
        return privacyActRules.find(rule => Object.prototype.hasOwnProperty.call(rule, key)) || {};
    }

    function getPrivacySensitiveConsentRule() {
        return privacyActRules.find(rule => normalize(rule.category) === "sensitive information") || {};
    }

    function buildRecommendedActions(answerJson) {
        const { categories } = extractCategories(answerJson);
        const mhrAnswered = normalize(answerJson?.data?.[0]?.collectMyHealthRecord) !== "no";

        const mhrConsentRule = getMyHealthRuleByKey("consent");
        const mhrPurposeRule = getMyHealthRuleByKey("purpose");
        const mhrRetentionRule = getMyHealthRuleByKey("retentionPeriod");
        const mhrSpecialRule = myHealthRecordRules.find(rule =>
            Object.prototype.hasOwnProperty.call(rule, "retentionPeriod")
        ) || {};

        const privacyPurposeRule = getPrivacyRuleByKey("purpose");
        const privacyLessDetailedRule = getPrivacyRuleByKey("lessDetailed");
        const privacyRetentionRule = getPrivacyRuleByKey("retentionPeriod");
        const privacySensitiveConsentRule = getPrivacySensitiveConsentRule();

        const purposeUnsure = categories.filter(
            c => normalize(c.collectionPurpose) === "unsure"
        );

        const purposeViolatesMHR = categories.filter(c =>
            (mhrPurposeRule.purpose?.violation || []).includes(normalize(c.collectionPurpose))
        );

        const consentIssues = categories.filter(c => {
            const consent = normalize(c.consent);
            return consent === "no" || consent === "unsure";
        });

        const nonEssentialCategories = categories.filter(c =>
            ["no", "unsure"].includes(normalize(c.essential))
        );

        const retentionIssues = categories.filter(c => {
            const retentionPeriod = normalize(c.retentionPeriod);
            const retentionPeriodForMHR = normalize(c.retentionPeriodForMHR);
            const specialCircumtance = normalize(c.specialCircumtance);

            const indefiniteRetention = retentionPeriod === "information is kept indefinitely";
            const unsureRetention = retentionPeriod === "unsure" || retentionPeriodForMHR === "unsure";
            const unsureSpecial = specialCircumtance === "unsure";

            return mhrAnswered && (indefiniteRetention || unsureRetention || unsureSpecial);
        });

        const enforcementIssues = categories.filter(c => {
            const enforcement = normalize(c.enforcementMeasure);
            return enforcement === "unsure" || enforcement === "manually deleted";
        });

        const articles = [];

        if (purposeUnsure.length > 0) {
            articles.push({
                priority: "priority-high",
                title: "Display Records of Why Each Data Category was Collected",
                intro: "The following categories have an unclear collection purpose recorded.",
                items: purposeUnsure.map(c => ({
                    group: c.categoryName,
                    attributes: [`Collection purpose: ${c.collectionPurpose || "not recorded"}`]
                })),
                label: "Priority Attention Suggested"
            });
        }

        if (purposeViolatesMHR.length > 0) {
            articles.push({
                priority: "priority-high",
                title: "Data Collection for the Following Must Cease",
                intro: "These categories use collection purposes that conflict with the My Health Records rules.",
                items: purposeViolatesMHR.map(c => ({
                    group: c.categoryName,
                    attributes: [`Purpose: ${c.collectionPurpose}`]
                })),
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: mhrPurposeRule.MyHealthRecordSection || "My Health Records Act",
                        href: "#"
                    }
                ]
            });
        }

        if (consentIssues.length > 0) {
            articles.push({
                priority: "priority-medium",
                title: "Staff Training on Data Collection Consent Necessary",
                intro: "The following categories have consent marked as no or unsure.",
                items: consentIssues.map(c => {
                    const notes = [];

                    if (
                        normalize(c.categoryName) === "sensitive information" &&
                        ["no", "unsure"].includes(normalize(c.consent))
                    ) {
                        if (privacySensitiveConsentRule.PrivacyActSection) {
                            notes.push(privacySensitiveConsentRule.PrivacyActSection);
                        }
                    }

                    if (
                        (privacyPurposeRule.consent?.violation || []).includes(normalize(c.consent)) ||
                        (privacyPurposeRule.consent?.unsure || []).includes(normalize(c.consent))
                    ) {
                        if (privacyPurposeRule.PrivacyActSection) {
                            notes.push(privacyPurposeRule.PrivacyActSection);
                        }
                    }

                    return {
                        group: c.categoryName,
                        attributes: notes.length > 0 ? notes : [`Consent: ${c.consent}`]
                    };
                }),
                label: "Improvement Recommended",
                links: [
                    {
                        text: mhrConsentRule.MyHealthRecordSection || "My Health Records Act",
                        href: "#"
                    }
                ]
            });
        }

        if (nonEssentialCategories.length > 0) {
            articles.push({
                priority: "priority-high",
                title: "Unnecessary Data Collection Should Cease",
                intro: "These attributes are not essential for operation.",
                items: nonEssentialCategories.map(c => ({
                    group: c.categoryName,
                    attributes: c.attributeCollected
                })),
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: privacyLessDetailedRule.PrivacyActSection || "Privacy Act",
                        href: "#"
                    }
                ]
            });
        }

        if (retentionIssues.length > 0) {
            articles.push({
                priority: "priority-high",
                title: "Review Data Retention Schedule",
                intro: "These categories have unclear or potentially non-compliant retention settings.",
                items: retentionIssues.map(c => {
                    const notes = [];

                    if (normalize(c.retentionPeriod) === "information is kept indefinitely") {
                        if (mhrRetentionRule.MyHealthRecordSection) {
                            notes.push(`MHR: ${mhrRetentionRule.MyHealthRecordSection}`);
                        }
                        if (privacyRetentionRule.PrivacyActSection) {
                            notes.push(`Privacy Act: ${privacyRetentionRule.PrivacyActSection}`);
                        }
                    }

                    if (normalize(c.specialCircumtance) === "unsure" && mhrSpecialRule.MyHealthRecordSection) {
                        notes.push(`MHR: ${mhrSpecialRule.MyHealthRecordSection}`);
                    }

                    return {
                        group: c.categoryName,
                        attributes: notes.length > 0
                            ? notes
                            : [
                                `Retention period: ${c.retentionPeriod || "not set"}`,
                                `MHR retention: ${c.retentionPeriodForMHR || "not set"}`
                            ]
                    };
                }),
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: mhrRetentionRule.MyHealthRecordSection || "My Health Records Act",
                        href: "#"
                    },
                    {
                        text: mhrSpecialRule.MyHealthRecordSection || "My Health Records Act",
                        href: "#"
                    }
                ]
            });
        }

        if (enforcementIssues.length > 0) {
            articles.push({
                priority: "priority-high",
                title: "Enable Automatic Deletion",
                intro: "These categories have no clear enforcement method or rely on manual deletion.",
                items: enforcementIssues.map(c => ({
                    group: c.categoryName,
                    attributes: [`Enforcement measure: ${c.enforcementMeasure}`]
                })),
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: mhrRetentionRule.MyHealthRecordSection || "My Health Records Act",
                        href: "#"
                    }
                ]
            });
        }

        return articles.sort((a, b) => {
            const order = { "priority-high": 0, "priority-medium": 1, "priority-low": 2 };
            return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
        });
    }

    function renderLinks(links) {
        const validLinks = (links || []).filter(link => link.text);
        if (!validLinks.length) return "";

        return `
            <div class="action-links">
                ${validLinks.map(link => `
                    <a href="${escapeHtml(link.href || "#")}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(link.text)}
                    </a>
                `).join("")}
            </div>
        `;
    }

    function renderGroup(group, tagClass, labelClass) {
        const attrs = group.attributes || [];
        const tag = attr => `<span class="action-tag ${tagClass}">${escapeHtml(attr)}</span>`;

        if (attrs.length === 0) {
            return `<li><p class="action-group-label ${labelClass}">${escapeHtml(group.group)}</p></li>`;
        }

        return `
            <li>
                <div class="action-group-header">
                    <p class="action-group-label ${labelClass}">${escapeHtml(group.group)}</p>
                    <button type="button" class="action-show-more" aria-expanded="false">
                        Show more <i class="bi bi-chevron-down"></i>
                    </button>
                </div>
                <div class="action-tags action-hidden-tags" hidden>
                    ${attrs.map(tag).join("")}
                </div>
            </li>
        `;
    }

    function renderActionItems(action) {
        const tagClass = action.priority === "priority-high" ? "tag-danger" : "tag-warn";
        const labelClass = action.priority === "priority-high" ? "label-danger" : "label-warn";

        if (!action.items.length) return "";

        return `
            <ol class="action-group-list">
                ${action.items.map(g => renderGroup(g, tagClass, labelClass)).join("")}
            </ol>
        `;
    }

    function renderRecommendedActions(answerJson) {
        const container = document.getElementById("recommended-actions-list");

        if (!container) {
            console.error('Element with id "recommended-actions-list" was not found.');
            return;
        }

        const actions = buildRecommendedActions(answerJson);

        if (!actions.length) {
            container.innerHTML = `
                <article class="action-card priority-low">
                    <div class="action-card-header">
                        <h3>No Recommended Actions</h3>
                    </div>
                    <p class="action-intro">No issues were triggered by the current dataset.</p>
                </article>
            `;
            return;
        }

        container.innerHTML = actions.map(action => `
            <article class="action-card ${escapeHtml(action.priority)}">
                <div class="action-card-header">
                    <h3>${escapeHtml(action.title)}</h3>
                    <span class="action-priority-badge">${escapeHtml(action.label)}</span>
                </div>
                <p class="action-intro">${escapeHtml(action.intro)}</p>
                ${renderActionItems(action)}
                ${renderLinks(action.links)}
            </article>
        `).join("");

        // Wire up show more / show less toggles
        container.querySelectorAll(".action-show-more").forEach(btn => {
            btn.addEventListener("click", () => {
                const header = btn.closest(".action-group-header");
                const hiddenBlock = header && header.nextElementSibling;
                if (!hiddenBlock || !hiddenBlock.classList.contains("action-hidden-tags")) return;

                const isHidden = hiddenBlock.hasAttribute("hidden");

                if (isHidden) {
                    hiddenBlock.removeAttribute("hidden");
                    btn.innerHTML = 'Show less <i class="bi bi-chevron-up"></i>';
                    btn.setAttribute("aria-expanded", "true");
                } else {
                    hiddenBlock.setAttribute("hidden", "");
                    btn.innerHTML = 'Show more <i class="bi bi-chevron-down"></i>';
                    btn.setAttribute("aria-expanded", "false");
                }
            });
        });
    }

    async function initRecommendedActions() {
        try {
            const [exampleAnswer, myHealthRulesData, privacyRulesData] = await Promise.all([
                loadJson("static/exampleAnswer.JSON"),
                loadJson("static/myHealthRecord.json"),
                loadJson("static/privacyAct.json")
            ]);

            myHealthRecordRules = myHealthRulesData;
            privacyActRules = privacyRulesData;

            renderRecommendedActions(exampleAnswer);
        } catch (error) {
            console.error("Failed to initialise recommended actions:", error);

            const container = document.getElementById("recommended-actions-list");
            if (container) {
                container.innerHTML = `
                    <article class="action-card priority-high">
                        <div class="action-card-header">
                            <h3>Unable to Load Recommended Actions</h3>
                        </div>
                        <p class="action-intro">${escapeHtml(error.message)}</p>
                    </article>
                `;
            }
        }
    }

    document.addEventListener("DOMContentLoaded", initRecommendedActions);
    window.renderRecommendedActions = renderRecommendedActions;
})();