// document.addEventListener("DOMContentLoaded", async () => {
//     const response = await fetch("/static/exampleAnswer.json");
//     const data = await response.json();

//     const consentPercent = calculateConsentPercentage(data);

    
//     const categories = data[1][0].personalDataAsset;
//     const total = categories.length;

    
//     categories.forEach(categoryObj => {
//         const categoryName = Object.keys(categoryObj)[0];
//         const details = categoryObj[categoryName];

//         // find the consent object
//         const consentObj = details.find(item => item.consent !== undefined);

//         if (consentObj && consentObj.consent.toLowerCase() === "no") {
//             const title = document.getElementById("main-title");
//             title.textContent = `${categoryName} is collected without consent`;
//         }
//     });
// });

// function calculateConsentPercentage(data){
//     const categories = data[1][0].personalDataAsset;

//     let total = categories.length;
//     let consentNoCount = 0;

//     categories.forEach(categoryObj => {
        
//         const categoryName = Object.keys(categoryObj)[0];
//         const details = categoryObj[categoryName];

//         const consentObj = details.find(item => item.consent !== undefined);

//         if (consentObj && consentObj.consent.toLowerCase() === "no") {
//             consentNoCount++;
//         }
//     });

//     const percentage = Math.round((consentNoCount / total) * 100);
//     return percentage;

// }

