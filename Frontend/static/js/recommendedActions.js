(function () {
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
                        skipped: merged.skipped === true,
                        attributeCollected: merged.attributeCollected || [],
                        collectionPurpose: merged.collectionPurpose || "",
                        consent: merged.consent || "",
                        essential: merged.essential || "",
                        lessDetailed: merged.lessDetailed || "",
                        retentionPeriodForMHR: merged.retentionPeriodMHR || "",
                        retentionPeriod: merged.retentionPeriod || "",
                        specialCircumtance: merged.retentionException || "",
                        enforcementMeasure: merged.enforcementMeasure || ""
                    });
                }
            }
        }

        return { categories };
    }

    function getMyHealthRuleByKey(key, myHealthRecordRules) {
        return myHealthRecordRules.find(rule => Object.prototype.hasOwnProperty.call(rule, key)) || {};
    }

    function getPrivacyRuleByKey(key, privacyActRules) {
        return privacyActRules.find(rule => Object.prototype.hasOwnProperty.call(rule, key)) || {};
    }

    function getPrivacySensitiveConsentRule(privacyActRules) {
        return privacyActRules.find(rule => normalize(rule.category) === "sensitive information") || {};
    }

    function buildRecommendedActions(answerJson, myHealthRecordRules, privacyActRules) {
        const { categories } = extractCategories(answerJson);
        const mhrAnswered = normalize(answerJson?.data?.[0]?.collectMyHealthRecord) !== "no";

        const applicableCategories = categories.filter(c => !c.skipped);

        const mhrConsentRule = getMyHealthRuleByKey("consent", myHealthRecordRules);
        const mhrPurposeRule = getMyHealthRuleByKey("purpose", myHealthRecordRules);
        const mhrRetentionRule = getMyHealthRuleByKey("retentionPeriod", myHealthRecordRules);
        const mhrDeletionRule = getMyHealthRuleByKey("deletionMethod", myHealthRecordRules);
        const mhrSpecialRule = myHealthRecordRules.find(rule =>
            Object.prototype.hasOwnProperty.call(rule, "retentionPeriod")
        ) || {};

        const privacyPurposeRule = getPrivacyRuleByKey("purpose", privacyActRules);
        const privacyLessDetailedRule = getPrivacyRuleByKey("lessDetailed", privacyActRules);
        const privacyRetentionRule = getPrivacyRuleByKey("retentionPeriod", privacyActRules);
        const privacySensitiveConsentRule = getPrivacySensitiveConsentRule(privacyActRules);

        // 1st: purpose is unsure
        const purposeUnsure = applicableCategories.filter(
            c => normalize(c.collectionPurpose) === "unsure"
        );

        // 2nd: purpose violates MHR Act
        const purposeViolatesMHR = applicableCategories.filter(c =>
            (mhrPurposeRule.purpose?.violation || []).includes(normalize(c.collectionPurpose))
        );

        // 3rd: consent is no or unsure
        const consentIssues = applicableCategories.filter(c => {
            const consent = normalize(c.consent);
            return consent === "no" || consent === "unsure";
        });

        // 4th: lessDetailed = yes/unsure — separate list from essential
        const lessDetailedCategories = applicableCategories.filter(c =>
            ["yes", "unsure"].includes(normalize(c.lessDetailed))
        );

        // 4th: essential = no/unsure — separate list from lessDetailed
        const nonEssentialCategories = applicableCategories.filter(c =>
            ["no", "unsure"].includes(normalize(c.essential))
        );

        // 5th: retention issues
        const retentionIssues = applicableCategories.filter(c => {
            const retentionPeriod = normalize(c.retentionPeriod);
            const retentionPeriodForMHR = normalize(c.retentionPeriodForMHR);
            const specialCircumtance = normalize(c.specialCircumtance);

            const indefiniteRetention = retentionPeriod === "information is kept indefinitely";
            const unsureRetention = retentionPeriod === "unsure" || retentionPeriodForMHR === "unsure";
            const unsureSpecial = specialCircumtance === "unsure";

            // Check if retentionPeriodMHR violates MHR Act AND no special circumstance
            const mhrRetentionViolations = (mhrRetentionRule.retentionPeriod?.violation || [])
                .map(v => normalize(v));
            const mhrRetentionViolated = mhrRetentionViolations.includes(retentionPeriodForMHR) &&
                normalize(c.specialCircumtance) === "no";

            return mhrAnswered && (indefiniteRetention || unsureRetention || unsureSpecial || mhrRetentionViolated);
        });

        // Trigger and list out: unsure OR contains "manually deleted"
        const enforcementTrigger = applicableCategories.some(c => {
            const enforcement = normalize(c.enforcementMeasure);
            return enforcement === "unsure" || enforcement.includes("manually deleted");
        });

        const enforcementListOut = applicableCategories.filter(c => {
            const enforcement = normalize(c.enforcementMeasure);
            return enforcement === "unsure" || enforcement.includes("manually deleted");
        });
        const articles = [];

        // 1st action
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

        // 2nd action
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
                        href: "https://www.legislation.gov.au/C2012A00063/latest/text"
                    }
                ]
            });
        }

        // 3rd action
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
                        attributes: [
                            `Consent: ${c.consent}`,
                            `${c.attributeCollected.join(", ")}`
                        ]
                    };
                }),
                label: "Improvement Recommended",
                links: [
                    {
                        text: mhrConsentRule.MyHealthRecordSection || "My Health Records Act",
                        href: "https://www.legislation.gov.au/C2012A00063/latest/text"
                    }
                ]
            });
        }

        // 4th action — triggers if either list has entries, shows both lists under one card
        if (lessDetailedCategories.length > 0 || nonEssentialCategories.length > 0) {
            const items = [];

            // First list: attributes that can have less detailed version collected
            lessDetailedCategories.forEach(c => {
                items.push({
                    group: c.categoryName,
                    attributes: [`Less detailed version can be collected`, ...c.attributeCollected]
                });
            });

            // Second list: attributes not essential for operation
            nonEssentialCategories.forEach(c => {
                // Avoid duplicating categories already listed from lessDetailed
                const alreadyListed = lessDetailedCategories.some(l => l.categoryName === c.categoryName);
                if (!alreadyListed) {
                    items.push({
                        group: c.categoryName,
                        attributes: [`Not essential for operation`, ...c.attributeCollected]
                    });
                } else {
                    // Category appears in both — append the essential note to existing item
                    const existing = items.find(i => i.group === c.categoryName);
                    if (existing) {
                        existing.attributes.unshift("Not essential for operation");
                    }
                }
            });

            articles.push({
                priority: "priority-high",
                title: "Unnecessary Data Collection Should Cease",
                intro: "These attributes can have a less detailed version collected or are not essential for operation.",
                items,
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: privacyLessDetailedRule.PrivacyActSection || "Privacy Act",
                        href: "https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles#part-1-consideration-of-personal-information-privacy"
                    }
                ]
            });
        }

        // 5th action
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
                        attributes: [
                            `Retention period: ${c.retentionPeriod || "not set"}`,
                            `MHR retention timeframe: ${c.retentionPeriodForMHR || "not set"}`,
                            `Retention circumstance: ${c.specialCircumtance || "not set"}`
                        ]
                    };
                }),
                label: "Priority Attention Suggested",
                links: [
                    {
                        text: mhrRetentionRule.MyHealthRecordSection || "My Health Records Act",
                        href: "https://www.legislation.gov.au/C2012A00063/latest/text"
                    },
                ]
            });
        }

        // 6th action — trigger on unsure only, list out unsure AND manually deleted
        if (enforcementTrigger) {
            articles.push({
                priority: "priority-high",
                title: "Enable Automatic Deletion",
                intro: "These categories have no clear enforcement method or rely on manual deletion.",
                items: enforcementListOut.map(c => ({
                    group: c.categoryName,
                    attributes: [`Enforcement measure: ${c.enforcementMeasure}`]
                })),
                label: "Priority Attention Suggested",
                links: [
                    {
                        // Use MHR deletion method section from myHealthRecord.json
                        text: mhrDeletionRule.MyHealthRecordSection || "My Health Records Act",
                        href: "https://www.legislation.gov.au/C2012A00063/latest/text"
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

    function renderRecommendedActions(answerJson, myHealthRecordRules, privacyActRules) {
        const container = document.getElementById("recommended-actions-list");

        if (!container) {
            console.error('Element with id "recommended-actions-list" was not found.');
            return;
        }

        const actions = buildRecommendedActions(answerJson, myHealthRecordRules, privacyActRules);
        window._recommendedActionsCount = actions.length; // store count for executiveSummary

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

    // Expose to global scope so main.js can call it
    window.renderRecommendedActions = renderRecommendedActions;

})();