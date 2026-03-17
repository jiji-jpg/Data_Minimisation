


document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("/static/exampleAnswer.json");
    const data = await response.json();

    
    const categories = data[1][0].personalDataAsset;

    categories.forEach(categoryObj => {
        const categoryName = Object.keys(categoryObj)[0];
        const details = categoryObj[categoryName];

        // find the consent object
        const consentObj = details.find(item => item.consent !== undefined);

        if (consentObj && consentObj.consent.toLowerCase() === "no") {
            const title = document.getElementById("main-title");
            title.textContent = `${categoryName} is collected without consent`;
        }
    });
});

function checkConsent(data){
    const categroies = data[1][0].personalDataAsset;
    categories.forEach(categoryObj => {
        
        const categoryName = Object.keys(categoryObj)[0];
        const answers = categoryObj[categoryName]
    })

}

