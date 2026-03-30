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
    const collectMyHealthRecord =
      normalize(answerJson?.[0]?.collectMyHealthRecord) === "yes";

    const assets = answerJson?.[1]?.[0]?.personalDataAsset || [];

    return {
      collectMyHealthRecord,
      categories: assets.map(item => {
        const [categoryName, entries] = Object.entries(item)[0];
        const merged = entries.reduce((acc, obj) => ({ ...acc, ...obj }), {});

        return {
          categoryName,
          attributeCollected: merged.attributeCollected || [],
          collectionPurpose: merged.collectionPurpose || "",
          consent: merged.consent || "",
          essential: merged.essential || "",
          lessDetailed: merged.lessDetailed || "",
          retentionPeriodForMHR: merged.retentionPeriodForMHR || "",
          retentionPeriod: merged.retentionPeriod || "",
          specialCircumtance: merged.specialCircumtance || "",
          enforcementMeasure: merged.enforcementMeasure || ""
        };
      })
    };
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
    const { collectMyHealthRecord, categories } = extractCategories(answerJson);

    const mhrConsentRule = getMyHealthRuleByKey("consent");
    const mhrPurposeRule = getMyHealthRuleByKey("purpose");
    const mhrRetentionRule = getMyHealthRuleByKey("retentionPeriod");
    const mhrSpecialRule = getMyHealthRuleByKey("retentionSpecialCircumstances");

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

    const lessDetailedCategories = categories.filter(c =>
      ["yes", "unsure"].includes(normalize(c.lessDetailed))
    );

    const nonEssentialCategories = categories.filter(c =>
      ["no", "unsure"].includes(normalize(c.essential))
    );

    const lessDetailedAttributes = lessDetailedCategories.flatMap(c =>
      c.attributeCollected.map(attr => `${attr} (${c.categoryName})`)
    );

    const nonEssentialAttributes = nonEssentialCategories.flatMap(c =>
      c.attributeCollected.map(attr => `${attr} (${c.categoryName})`)
    );

    const retentionIssues = categories.filter(c => {
      const retentionPeriod = normalize(c.retentionPeriod);
      const retentionPeriodForMHR = normalize(c.retentionPeriodForMHR);
      const specialCircumtance = normalize(c.specialCircumtance);

      const indefiniteRetention =
        retentionPeriod === "information is kept indefinitely";

      const unsureRetention =
        retentionPeriod === "unsure" || retentionPeriodForMHR === "unsure";

      const unsureSpecial =
        specialCircumtance === "unsure";

      return collectMyHealthRecord && (
        indefiniteRetention ||
        unsureRetention ||
        unsureSpecial
      );
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
        items: purposeUnsure.map(c => c.categoryName),
        label: "Priority Attention Suggested"
      });
    }

    if (purposeViolatesMHR.length > 0) {
      articles.push({
        priority: "priority-high",
        title: "Data Collection for the Following Must Cease",
        intro: "These categories use collection purposes that conflict with the My Health Records rules.",
        items: purposeViolatesMHR.map(c =>
          `${c.categoryName} — purpose: ${c.collectionPurpose}`
        ),
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
      const consentItems = consentIssues.map(c => {
        const notes = [];

        if (
          normalize(c.categoryName) === "sensitive information" &&
          ["no", "unsure"].includes(normalize(c.consent))
        ) {
          if (privacySensitiveConsentRule.PrivacyActSection) {
            notes.push(`Privacy Act: ${privacySensitiveConsentRule.PrivacyActSection}`);
          }
        }

        if (
          (privacyPurposeRule.consent?.violation || []).includes(normalize(c.consent)) ||
          (privacyPurposeRule.consent?.unsure || []).includes(normalize(c.consent))
        ) {
          if (privacyPurposeRule.PrivacyActSection) {
            notes.push(`Privacy Act: ${privacyPurposeRule.PrivacyActSection}`);
          }
        }

        return notes.length > 0
          ? `${c.categoryName} — consent: ${c.consent} (${notes.join("; ")})`
          : `${c.categoryName} — consent: ${c.consent}`;
      });

      articles.push({
        priority: "priority-medium",
        title: "Staff Training on Data Collection Consent Necessary",
        intro: "The following categories have consent marked as no or unsure.",
        items: consentItems,
        label: "Improvement Recommended",
        links: [
          {
            text: mhrConsentRule.MyHealthRecordSection || "My Health Records Act",
            href: "#"
          }
        ]
      });
    }

    if (lessDetailedCategories.length > 0 || nonEssentialCategories.length > 0) {
      const items = [];

      if (lessDetailedAttributes.length > 0) {
        items.push(...lessDetailedAttributes.map(item => `Less detailed collection may be sufficient: ${item}`));
      }

      if (nonEssentialAttributes.length > 0) {
        items.push(...nonEssentialAttributes.map(item => `Not essential to collect: ${item}`));
      }

      articles.push({
        priority: "priority-high",
        title: "Unnecessary Data Collection Should Cease",
        intro: "These attributes may be more detailed than necessary or not essential for operation.",
        items,
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
      const retentionItems = retentionIssues.map(c => {
        const notes = [];

        if (normalize(c.retentionPeriod) === "information is kept indefinitely") {
          if (mhrRetentionRule.MyHealthRecordSection) {
            notes.push(`My Health Records: ${mhrRetentionRule.MyHealthRecordSection}`);
          }
          if (privacyRetentionRule.PrivacyActSection) {
            notes.push(`Privacy Act: ${privacyRetentionRule.PrivacyActSection}`);
          }
        }

        if (normalize(c.specialCircumtance) === "unsure" && mhrSpecialRule.MyHealthRecordSection) {
          notes.push(`My Health Records: ${mhrSpecialRule.MyHealthRecordSection}`);
        }

        return `${c.categoryName} — retentionPeriodForMHR: ${c.retentionPeriodForMHR}, retentionPeriod: ${c.retentionPeriod}${notes.length ? ` (${notes.join("; ")})` : ""}`;
      });

      articles.push({
        priority: "priority-high",
        title: "Review Data Retention Schedule",
        intro: "These categories have unclear or potentially non-compliant retention settings.",
        items: retentionItems,
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
        items: enforcementIssues.map(c =>
          `${c.categoryName} — enforcement measure: ${c.enforcementMeasure}`
        ),
        label: "Priority Attention Suggested",
        links: [
          {
            text: mhrRetentionRule.MyHealthRecordSection || "My Health Records Act",
            href: "#"
          }
        ]
      });
    }

    return articles;
  }

  function renderLinks(links) {
    const validLinks = (links || []).filter(link => link.text);
    if (!validLinks.length) return "";

    return `
      <div class="action-links">
        ${validLinks.map(link => `
          <p>
            <a href="${escapeHtml(link.href || "#")}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.text)}
            </a>
          </p>
        `).join("")}
      </div>
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
        <article class="priority-low">
          <h3>No Recommended Actions</h3>
          <p>No issues were triggered by the current dataset.</p>
        </article>
      `;
      return;
    }

    container.innerHTML = actions.map(action => `
      <article class="${escapeHtml(action.priority)}">
        <h3>${escapeHtml(action.title)}</h3>
        <p>${escapeHtml(action.intro)}</p>
        <ul>
          ${action.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        ${renderLinks(action.links)}
        <p><strong>${escapeHtml(action.label)}</strong></p>
      </article>
    `).join("");
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
          <article class="priority-high">
            <h3>Unable to Load Recommended Actions</h3>
            <p>${escapeHtml(error.message)}</p>
          </article>
        `;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initRecommendedActions);
})();