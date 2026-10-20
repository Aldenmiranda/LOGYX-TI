import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const ALLOWED_DOMAINS = ['zoliamerica.com', 'soposa.com']; // Reemplazar con tus dominios reales
const ADMIN_EMAILS = ['sistemas@zoliamerica.com']; // Correos que serán Admin automáticamente

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Consultor');
  const [loading, setLoading] = useState(true);

  // Validar y sincronizar usuario en Firestore
  const syncUserWithFirestore = async (firebaseUser) => {
    const domain = firebaseUser.email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
      await signOut(auth);
      throw new Error(`Acceso denegado. El dominio @${domain} no está autorizado.`);
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Determinar rol inicial
      const initialRole = ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase()) ? 'Admin' : 'Tecnico';

      const newUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        rol: initialRole, // 'Admin', 'Tecnico', 'RRHH', 'Contador', 'Consultor'
        fechaCreacion: new Date()
      };

      await setDoc(userRef, newUser);
      setUserRole(initialRole);
    } else {
      setUserRole(userSnap.data().rol || 'Consultor');
    }
  };

  const loginWithEmail = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await syncUserWithFirestore(res.user);
    return res;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    await syncUserWithFirestore(res.user);
    return res;
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().rol);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, loginWithEmail, loginWithGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}