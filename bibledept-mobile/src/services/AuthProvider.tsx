import { User, onAuthStateChanged } from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getFirebase } from './firebase';
import { messageForUser } from './userMessage';

const Context = createContext<{user:User|null;ready:boolean;error:string}>({user:null,ready:false,error:''});
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null), [ready,setReady]=useState(false), [error,setError]=useState('');
  useEffect(()=>{
    try { return onAuthStateChanged(getFirebase().auth,value=>{setUser(value);setReady(true);},e=>{setError(messageForUser(e,'We couldn’t open your account. Please try again.'));setReady(true);}); }
    catch(e){setError(messageForUser(e,'We couldn’t open your account. Please try again.'));setReady(true);}
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
    'auth/weak-password':'Use a password with at least 8 characters.',
    'auth/network-request-failed':'We couldn’t connect. Check your internet connection and try again.',
    'auth/too-many-requests':'There have been too many attempts. Wait a moment and try again.',
    'auth/invalid-phone-number':'Include the country code and check your phone number.',
    'auth/invalid-verification-code':'That code is incorrect. Check your message and try again.',
    'auth/code-expired':'Your code has expired. Request a new code.',
    'auth/session-expired':'Your code has expired. Request a new code.',
    'auth/captcha-check-failed':'Verification could not finish. Request a new code and complete the security check.',
    'auth/operation-not-allowed':'This sign-in method isn’t available. Try another method.',
    'auth/unauthorized-domain':'Phone sign-in isn’t available here. Use email instead.',
    'auth/quota-exceeded':'Text messages are temporarily unavailable. Try later or use email.',
  };
  return messages[code||''] || messageForUser(error,'We couldn’t sign you in. Please try again.');
}
