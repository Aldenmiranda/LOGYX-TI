import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reemplaza con tus credenciales de Firebase Console si es necesario
const firebaseConfig = {
  apiKey:  "AIzaSyBKchogS5aOTUh8FYqRRV4cu3lyyGRGSes",
  authDomain: "inventra-264ca.firebaseapp.com",
  projectId: "inventra-264ca",
  storageBucket: "inventra-264ca.firebasestorage.app",
  messagingSenderId: "551134709213",
  appId: "1:551134709213:web:d61471a83c1baf84b9e234",

};

// 1. Instancia Principal de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// 2. Instancia Secundaria (Permite crear usuarios en Auth sin cerrar la sesión del Admin)
const secondaryApp = getApps().length < 2 
  ? initializeApp(firebaseConfig, "SecondaryApp") 
  : getApp("SecondaryApp");

export const secondaryAuth = getAuth(secondaryApp);