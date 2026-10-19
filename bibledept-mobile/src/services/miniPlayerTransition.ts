/** An old exit callback must never remove a player that has reopened. */
export function createMiniPlayerTransition() {
  let generation=0,visible=false,completed=-1;
  return {
    begin(nextVisible:boolean) { visible=nextVisible;return ++generation; },
    complete(token:number):'shown'|'hidden'|undefined {
      if(token!==generation||completed===token)return;
      completed=token;
      return visible?'shown':'hidden';
    },
    cancel() { generation++; },
  };
}
