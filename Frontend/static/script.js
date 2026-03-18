
// ========== LOAD DATA ==========
document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("/static/exampleAnswer.JSON");
    const data = await response.json();

// ========== EXTRACT CATEGORIES ==========
    const categories = data[1][0].personalDataAsset;

// ========== FINDINGS BUCKETS (Ordered by issue number on Mary Anns Diagram) ==========
    const findings = {
        point1: [], // Purpose may violate Privacy Act
        point2: [], // Unknown purpose
        point3: [], // No consent
        point4: [], // Less detailed version
        point5: [], // Not essential
        point6: [], // Retention violation
        point7: [], // Unknown retention
        point8: []  // Manual deletion
    };

// ========== PROCESS EACH CATEGORY ==========
    categories.forEach(categoryObj => {

// ========== Extract category name and details ==========
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

// ========== Extract key values ==========
        const collectionPurpose = (getDetailValue(details, "collectionPurpose") || "")
            .toLowerCase()
            .trim();

        const consent = (getDetailValue(details, "consent") || "")
            .toLowerCase()
            .trim();

        const lessDetailed = (getDetailValue(details, "lessDetailed") || "")
            .toLowerCase()
            .trim();

        const essential = (getDetailValue(details, "essential") || "")
            .toLowerCase()
            .trim();   

        const retentionPeriod = (getDetailValue(details, "retentionPeriod") || "")
            .toLowerCase()
            .trim();

        const specialCircumstances = (getDetailValue(details, "specialCircumstances") || "")
            .toLowerCase()
            .trim();

        const retentionPeriodForMHR = (getDetailValue(details, "retentionPeriodForMHR") || "")
            .toLowerCase()
            .trim();

        const enforcementMeasure = (getDetailValue(details, "enforcementMeasure") || "")
            .toLowerCase()
            .trim();

// ========== PURPOSE MAY VIOLATE PRIVACY ACT ==========
            if (
                categoryName.toLowerCase().includes("sensitive") &&
                collectionPurpose.includes("marketing")
            ) {
                findings.point1.push(`${categoryName} is collected for a purpose that may violate privacy obligations.`);
            }

// ========== UNKNOWN PURPOSE ==========
            if (
                collectionPurpose === "unknown" ||
                collectionPurpose === "unsure" ||
                collectionPurpose === ""
            ){
                findings.point2.push(`${categoryName} is collected with an unknown purpose.`)
            }

// ========== NO CONSENT ==========
            if (consent === "no") {
                findings.point3.push(`${categoryName} is collected without consent.`)
            }

// ========== LESS DETAILED VERSION ==========
            if (lessDetailed === "yes") {
                findings.point4.push(`${categoryName} is collected in a less detailed form than required`)
            }

// ========== NOT ESSENTIAL FOR OPERATION ==========
            if (essential === "no") {
                findings.point5.push(`${categoryName} is collected without confirmed necessity.`);
            }

// ========== RETENTION VIOLATION ==========
            if (
                retentionPeriod.includes ("indefinitely") && (specialCircumstances === "no" || specialCircumstances === "unsure" || specialCircumstances === "") 
            ){
                findings.point6.push(`${categoryName} is retained in a manner that may violate policy without justification.`);
            }

// ========== UNKNOWN RETENTION PERIOD ==========
            if (
                retentionPeriodForMHR === "unknown" ||
                retentionPeriodForMHR === "unsure" ||
                retentionPeriodForMHR === ""
            ) {
                findings.point7.push(`${categoryName} has an unknown retention period.`);
            }

// ========== MANUAL DELETION ENFORCEMENT MEASURE ==========
            if (enforcementMeasure === "manually deleted") {
                findings.point8.push(`${categoryName} relies on manual deletion as an enforcement measure.`);
            }
    });

// ========== RENDER FINDINGS IN ISSUE ORDER ==========    
        const findingsDiv = document.getElementById("findings");
        const orderedFindings = [
        ...findings.point1,
        ...findings.point2,
        ...findings.point3,
        ...findings.point4,
        ...findings.point5,
        ...findings.point6,
        ...findings.point7,
        ...findings.point8
        ];

        orderedFindings.forEach(findingText => {
            const p = document.createElement("p");
            p.textContent = findingText;
            findingsDiv.appendChild(p);
        });
    });

// ========== HELPER FUNTION: Extract value from JSON ==========
        function getDetailValue(details, key) {
        const item = details.find(obj => key in obj);
        return item ? item[key] : null;
        }

  

