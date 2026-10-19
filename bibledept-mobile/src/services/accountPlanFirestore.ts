import { doc, Firestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { USER_COLLECTION } from './dataPaths';
import { AccountPlanProgress, decodeAccountPlan, mergeAccountPlans, sameAccountPlan } from './planSync';
const planRef=(db:Firestore,owner:string)=>doc(db,USER_COLLECTION,owner,'settings','planProgress');
export function listenAccountPlan(db:Firestore,owner:string,onValue:(value:AccountPlanProgress|null,confirmed:boolean)=>void,onError:(error:unknown)=>void) {
  return onSnapshot(planRef(db,owner),{includeMetadataChanges:true},snapshot=>{
    const value=snapshot.exists()?decodeAccountPlan(snapshot.data()):null;
    if(snapshot.exists()&&!value){onError(new Error('Invalid saved account plan.'));return;}
    onValue(value,!snapshot.metadata.fromCache);
  },onError);
}
export async function saveAccountPlan(db:Firestore,owner:string,value:AccountPlanProgress) {
  const desired=decodeAccountPlan(value);if(!desired)throw new Error('Invalid plan progress.');
  return runTransaction(db,async transaction=>{
    const ref=planRef(db,owner),snapshot=await transaction.get(ref),previous=snapshot.exists()?decodeAccountPlan(snapshot.data()):null;
    if(snapshot.exists()&&!previous)throw new Error('Invalid saved account plan.');
    const merged=previous?mergeAccountPlans(previous,desired):desired;
    if(!sameAccountPlan(previous,merged))transaction.set(ref,{...merged,updatedAt:serverTimestamp()});
    return merged;
  });
}
