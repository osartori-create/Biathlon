// ⚠️ ATTENTION : Utilisez votre propre URL Firebase
const firebaseConfig = { 
    databaseURL: "https://arcathlon-eps-default-rtdb.europe-west1.firebasedatabase.app/" 
};

// Initialisation Firebase (les SDK sont déjà chargés dans index.html)
firebase.initializeApp(firebaseConfig);
export const db = firebase.database();