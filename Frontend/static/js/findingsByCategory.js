function renderFindingsByCategory(data, mhrAct, privacyAct, useMHR) {

    const container = document.getElementById("findingsByCategories");

    let badCategoryCount = 0;
    let NUMBER_OF_CATEGORIES = 0;
    let NUMBER_OF_ATTRIBUTES = 0;

    if (container) {

        const dataAssets = Object.entries(data["data"][1][0]);

        for (const [DATA_ASSET, categories] of dataAssets) {

            // -- Data Asset heading
            const assetHeading = document.createElement("h2");
            assetHeading.textContent = DATA_ASSET;
            assetHeading.style.cssText = "margin-top: 2rem; margin-bottom: 1rem;";
            container.appendChild(assetHeading);

            // -- Sort categories: Priority Attention Suggested first, then Improvement Recommended, then Compliant
            const sortedCategories = [...categories].sort((a, b) => {
                const getViolationCount = (category) => {
                    const details = Object.values(category)[0];
                    if (details[0]["attributeCollected"].map(i => i.toLowerCase()).includes("not applicable")) return -1;
                    const f = [];
                    checkGenericRules(JSON.parse(JSON.stringify(details)), f);
                    checkPrivacyAct(Object.keys(category)[0], privacyAct, JSON.parse(JSON.stringify(details)), f);
                    checkMHRAct(useMHR, JSON.parse(JSON.stringify(details)), mhrAct, f);
                    return f.length;
                };
                return getViolationCount(b) - getViolationCount(a);
            });

            for (const category of sortedCategories) {

                const [categoryName, categoryDetails] = Object.entries(category)[0];

                // -- Skip categories where attributes are not applicable
                if (categoryDetails[0]["attributeCollected"].map(item => item.toLowerCase()).includes("not applicable")) {
                    const article = document.createElement("article");
                    article.className = "category";

                    const header = document.createElement("div");
                    header.className = "category-header";

                    const title = document.createElement("h3");
                    title.textContent = categoryName;
                    header.appendChild(title);
                    article.appendChild(header);

                    const p = document.createElement("p");
                    p.className = "category-intro";
                    p.textContent = "You are not collecting attributes of this category.";
                    article.appendChild(p);

                    container.appendChild(article);
                    continue;
                }

                NUMBER_OF_CATEGORIES++;

                // -- Collect violations for this category into an array
                const findings = [];
                checkGenericRules(categoryDetails, findings);
                checkPrivacyAct(categoryName, privacyAct, categoryDetails, findings);
                checkMHRAct(useMHR, categoryDetails, mhrAct, findings);

                // -- Sort findings: danger first, then warning
                findings.sort((a, b) => {
                    const order = { "danger": 0, "warning": 1 };
                    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
                });

                const violationNumber = findings.length;

                // -- Build category card
                const article = document.createElement("article");
                article.className = "category";

                // -- Card header
                const header = document.createElement("div");
                header.className = "category-header";

                const title = document.createElement("h3");
                title.textContent = categoryName;

                const badge = document.createElement("span");
                badge.className = "badge me-2";
                badge.style.cssText = "font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 999px; white-space: nowrap;";
                if (violationNumber === 0) {
                    badge.textContent = "Compliant";
                    badge.style.backgroundColor = "#2ecc71";
                    badge.style.color = "#fff";
                } else if (violationNumber <= 20 / 3) {
                    badge.textContent = "Improvement Recommended";
                    badge.style.backgroundColor = "#f39c12";
                    badge.style.color = "#fff";
                } else {
                    badge.textContent = "Priority Attention Suggested";
                    badge.style.backgroundColor = "#c0392b";
                    badge.style.color = "#fff";
                }

                header.appendChild(title);
                header.appendChild(badge);
                article.appendChild(header);

                // -- Divider
                const divider1 = document.createElement("hr");
                divider1.style.cssText = "border: none; border-top: 0.5px solid rgba(0,0,0,0.1); margin: 0.75rem 0;";
                article.appendChild(divider1);

                // -- Attributes collected as small cards
                const ATTRIBUTES_COLLECTED = categoryDetails[0]["attributeCollected"];
                const attrLabel = document.createElement("p");
                attrLabel.style.cssText = "font-size: 12px; color: #999; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;";
                attrLabel.textContent = "Attributes collected";
                article.appendChild(attrLabel);

                const attrTags = document.createElement("div");
                attrTags.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.75rem;";
                ATTRIBUTES_COLLECTED.forEach(attr => {
                    const tag = document.createElement("span");
                    tag.textContent = attr;
                    tag.style.cssText = "font-size: 12px; padding: 3px 10px; border-radius: 8px; background: #fdf3f2; border: 0.5px solid #e8b4b0; color: #922b21;";
                    attrTags.appendChild(tag);
                });
                article.appendChild(attrTags);

                // -- Divider before findings
                const divider2 = document.createElement("hr");
                divider2.style.cssText = "border: none; border-top: 0.5px solid rgba(0,0,0,0.1); margin: 0.75rem 0;";

                // -- Render each finding as an assessment-item card
                if (findings.length === 0) {
                    article.appendChild(divider2);
                    const item = document.createElement("div");
                    item.style.cssText = "border-left: 3px solid #2ecc71; background: #f0faf4; border-radius: 0; padding: 0.75rem 1rem;";
                    const h4 = document.createElement("h4");
                    h4.textContent = "No issues found";
                    h4.style.cssText = "font-size: 13px; font-weight: 500; color: #1a7a45; margin: 0 0 4px;";
                    const p = document.createElement("p");
                    p.textContent = "This category appears compliant based on available information.";
                    p.style.cssText = "font-size: 13px; margin: 0; line-height: 1.5;";
                    item.appendChild(h4);
                    item.appendChild(p);
                    article.appendChild(item);
                } else {
                    article.appendChild(divider2);
                    findings.forEach(finding => {
                        const item = document.createElement("div");
                        const isDanger = finding.severity === "danger";
                        item.style.cssText = `
                            border-left: 3px solid ${isDanger ? "#c0392b" : "#e67e22"};
                            background: ${isDanger ? "#fdf3f2" : "#fef9f0"};
                            border-radius: 0;
                            padding: 0.75rem 1rem;
                            margin-bottom: 8px;
                        `;

                        const h4 = document.createElement("h4");
                        h4.textContent = finding.title;
                        h4.style.cssText = `font-size: 13px; font-weight: 600; color: ${isDanger ? "#922b21" : "#935116"}; margin: 0 0 4px;`;

                        const p = document.createElement("p");
                        p.textContent = finding.message;
                        p.style.cssText = "font-size: 13px; margin: 0; line-height: 1.5;";

                        item.appendChild(h4);
                        item.appendChild(p);

                        if (finding.link) {
                            const a = document.createElement("a");
                            a.textContent = finding.link;
                            a.href = "#";
                            a.style.cssText = "font-size: 12px; display: block; margin-top: 4px;";
                            item.appendChild(a);
                        }

                        article.appendChild(item);
                    });
                }

                container.appendChild(article);

                // -- Counters
                if (violationNumber > 0) {
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


// == Refactored check functions — push findings objects instead of creating DOM elements ==

function checkGenericRules(categoryDetails, findings) {

    for (const item of categoryDetails) {

        // Normalise values
        for (const key in item) {
            const value = item[key];
            if (typeof value === "string") {
                item[key] = value.toLowerCase().trim();
            } else if (Array.isArray(value)) {
                item[key] = value.map(p => p.toLowerCase().trim());
            }
        }

        if ("collectionPurpose" in item && item.collectionPurpose === "unsure") {
            findings.push({
                severity: "warning",
                title: "Unknown Collection Purpose",
                message: "These attributes have an unknown collection purpose.",
                link: null
            });
        }

        if ("consent" in item && (item.consent === "no" || item.consent === "unsure")) {
            findings.push({
                severity: "danger",
                title: "Data Collected Without Consent",
                message: "These attributes may be collected without consent. Collecting data after acquiring consent is advised by the My Health Records Act 2012.",
                link: "My Health Records Act 2012 - Part 3 - Registration"
            });
        }

        if ("lessDetailed" in item && (item.lessDetailed === "yes" || item.lessDetailed === "unsure")) {
            findings.push({
                severity: "warning",
                title: "Less Detailed Version Could Be Collected",
                message: "A less detailed version of these attributes could be collected. This may violate the Privacy Act.",
                link: "Privacy Act - APP 3.1 - 3.2"
            });
        }

        if ("essential" in item && (item.essential === "no" || item.essential === "unsure")) {
            findings.push({
                severity: "danger",
                title: "Non-Essential Data Collection",
                message: "These attributes may not be essential to operation.",
                link: null
            });
        }

        if ("retentionPeriod" in item &&
            (item.retentionPeriod === "unsure" || item.retentionPeriod === "information is kept indefinitely")) {
            findings.push({
                severity: "danger",
                title: "Retention Period Issue",
                message: "These attributes have an unknown retention period or are kept indefinitely. This may violate the Privacy Act 1988.",
                link: "Privacy Act - APP 11.2"
            });
        }

        if ("enforcementMeasure" in item &&
            (item.enforcementMeasure === "manually deleted" || item.enforcementMeasure === "unsure")) {
            findings.push({
                severity: "warning",
                title: "Weak Enforcement Measure",
                message: "These attributes are manually deleted after the retention period or have an unknown enforcement measure.",
                link: null
            });
        }
    }
}

function checkPrivacyAct(categoryName, privacyAct, categoryDetails, findings) {

    const BAD_PURPOSE = privacyAct[0]["purpose"]["violation"][0].toLowerCase();
    const BAD_PURPOSE_CONSENT1 = privacyAct[0]["consent"]["violation"][0].toLowerCase();
    const BAD_PURPOSE_CONSENT2 = privacyAct[0]["consent"]["unsure"][0].toLowerCase();

    const COLLECTION_PURPOSE = categoryDetails[1]["collectionPurpose"].toLowerCase();
    const CONSENT = categoryDetails[2]["consent"].toLowerCase();

    if (COLLECTION_PURPOSE === BAD_PURPOSE &&
        (CONSENT === BAD_PURPOSE_CONSENT1 || CONSENT === BAD_PURPOSE_CONSENT2)) {
        findings.push({
            severity: "danger",
            title: "Consent Required for Marketing Purpose",
            message: "Obtaining consent before collecting attributes for marketing purposes is advised by the Privacy Act 1988.",
            link: "Privacy Act - APP 7.1 - 7.4"
        });
    }

    const BAD_CATEGORY = privacyAct[2]["category"].toLowerCase();
    const BAD_SENSITIVE_CONSENT1 = privacyAct[2]["consent"]["violation"][0].toLowerCase();
    const BAD_SENSITIVE_CONSENT2 = privacyAct[2]["consent"]["unsure"][0].toLowerCase();

    if (categoryName.toLowerCase().includes(BAD_CATEGORY) &&
        (CONSENT === BAD_SENSITIVE_CONSENT1 || CONSENT === BAD_SENSITIVE_CONSENT2)) {
        findings.push({
            severity: "danger",
            title: "Sensitive Information Collected Without Consent",
            message: "Obtaining consent before collecting sensitive information is advised by the Privacy Act 1988.",
            link: "Privacy Act - APP 3.3 - 3.4"
        });
    }
}

function checkMHRAct(MHRCollected, categoryDetails, MHRAct, findings) {

    if (!MHRCollected) return;

    const BAD_PURPOSE = MHRAct[1]["purpose"]["violation"];
    BAD_PURPOSE.push(MHRAct[1]["purpose"]["unsure"]);
    const PURPOSE_SECTION = MHRAct[1]["MyHealthRecordSection"];

    const COLLECTION_PURPOSE = categoryDetails[1]["collectionPurpose"].toLowerCase();

    if (BAD_PURPOSE.includes(COLLECTION_PURPOSE)) {
        findings.push({
            severity: "danger",
            title: "Collection Purpose Violates My Health Records Act",
            message: `The My Health Records Act 2012 advises against collecting data for: ${BAD_PURPOSE.join(", ")}.`,
            link: PURPOSE_SECTION
        });
    }

    const BAD_RETENTION_PERIOD = MHRAct[2]["retentionPeriod"]["violation"]
        .map(v => v.toLowerCase().trim().replace(/\.$/, ""));
    const RETENTION_SECTION = MHRAct[2]["MyHealthRecordSection"];
    const SPECIAL_CIRCUMSTANCE = categoryDetails[7]["retentionException"].toLowerCase();

    const RETENTION_PERIOD = categoryDetails[5]["retentionPeriodMHR"]
        .toLowerCase().trim().replace(/\.$/, "");

    if (BAD_RETENTION_PERIOD.includes(RETENTION_PERIOD) &&
        (SPECIAL_CIRCUMSTANCE === "no" || SPECIAL_CIRCUMSTANCE === "unsure")) {
        findings.push({
            severity: "danger",
            title: "Retention Period Violates My Health Records Act",
            message: `The My Health Records Act 2012 advises against: ${BAD_RETENTION_PERIOD.join(", ")}.`,
            link: RETENTION_SECTION
        });
    }
}


// == Utility functions ==

function checkMHR(answer) {
    return answer.toLowerCase() === "yes" || answer.toLowerCase() === "unsure";
}