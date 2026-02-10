const apCheckbox = document.getElementById("apCheckbox");
const apDetails = document.getElementById("apDetails");

const honorsCheckbox = document.getElementById("honorsCheckbox");
const honorsDetails = document.getElementById("honorsDetails");

const citizenship = document.getElementById("citizenship");
const residency = document.getElementById("RESIDENCY");

const DECheckbox =document.getElementById("DECheckbox");
const DEDetails = document.getElementById("DEDetails");

apCheckbox.addEventListener("change", () => {
    apDetails.style.display = apCheckbox.checked ? "block" : "none";
});

honorsCheckbox.addEventListener("change", () => {
    honorsDetails.style.display = honorsCheckbox.checked ? "block" : "none";
});

DECheckbox.addEventListener("change",() =>{
    DEDetails.style.display = DECheckbox.checked ? "block" : "none";
});

citizenship.addEventListener("change", () =>{
    if(citizenship.value === "U.S. Citizen" || citizenship.value === "Permanent Resident"){
        residency.style.display = "block";
    }
    else{
        residency.style.display = "none";
    }
});


