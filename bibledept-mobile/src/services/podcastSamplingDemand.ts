/** Only visible full players need live PCM; the mini-player uses stored peaks. */
export function createPodcastSamplingDemand(changed:(required:boolean)=>void) {
  const consumers=new Set<symbol>();
  return {
    set(consumer:symbol,visible:boolean) {
      const before=consumers.size>0;
      if(visible)consumers.add(consumer);else consumers.delete(consumer);
      const after=consumers.size>0;
      if(before!==after)changed(after);
    },
  };
}
