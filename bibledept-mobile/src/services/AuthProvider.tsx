import { User, onAuthStateChanged } from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getFirebase } from './firebase';

const Context = createContext<{user:User|null;ready:boolean;error:string}>({user:null,ready:false,error:''});
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null), [ready,setReady]=useState(false), [error,setError]=useState('');
  useEffect(()=>{
    try { return onAuthStateChanged(getFirebase().auth,value=>{setUser(value);setReady(true);},e=>{setError(e.message);setReady(true);}); }
    catch(e){setError(e instanceof Error?e.message:'Firebase could not start.');setReady(true);}
  },[]);
  return <Context.Provider value={{user,ready,error}}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);

export function authError(error:unknown) {
  const code=(error as {code?:string})?.code;
  const messages:Record<string,string>={
    'auth/invalid-email':'Enter a valid email address.',
    'auth/invalid-credential':'The email or password is incorrect.',
    'auth/email-already-in-use':'An account already exists for that email. Try signing in.',
    'auth/weak-password':'Use a stronger password with at least 8 characters.',
    'auth/network-request-failed':'Cannot reach Firebase. Check your connection and make sure the local emulators are running.',
    'auth/too-many-requests':'Too many attempts. Please wait a moment and retry.',
  };
  return messages[code||''] || (error instanceof Error?error.message:'Something went wrong. Please retry.');
}
