import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDrEoCFevX0rSXqVdK5KbSIO_ArcEkXfFs",
    authDomain: "siwatt-database.firebaseapp.com",
    projectId: "siwatt-database",
    storageBucket: "siwatt-database.appspot.com",
    messagingSenderId: "261841563431",
    appId: "1:261841563431:web:06a4dff00ea63ae231c302",
    measurementId: "G-F3P5Z85924"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

