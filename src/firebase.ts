import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCtOn8-dTholATCw9lzMjB_cnq5S97T4uc",
  authDomain: "my-pos-app-61e7c.firebaseapp.com",
  projectId: "my-pos-app-61e7c",
  storageBucket: "my-pos-app-61e7c.firebasestorage.app",
  messagingSenderId: "843740382596",
  appId: "1:843740382596:web:93337a8b51f456828289d1",
  measurementId: "G-0Q7LCLM0V2",
}

const app = initializeApp(firebaseConfig)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
