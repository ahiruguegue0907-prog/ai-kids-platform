import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
    if (!getApps().length) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
        }
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminApp = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        adminApp = getApps()[0];
    }
    return adminApp;
}

export function getAdminDb(): Firestore {
    if (!adminDb) {
        const app = getAdminApp();
        adminDb = getFirestore(app);
    }
    return adminDb;
}
