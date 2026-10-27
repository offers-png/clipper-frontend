// Costs come from the reviewed backend matrix. No inferred rates or model fallbacks.
export function selectedPrice(model, duration, resolution, audio) {
  return model?.prices?.find(p => p.duration===Number(duration)&&p.resolution===resolution&&p.audio===audio) || null;
}
export function usdFromCredits(credits) {
  const units=Math.round(Number(credits)*1000);
  return (units/200000).toFixed(5).replace(/0+$/,'').replace(/\.$/,'');
}
export const audioLabel=value=>({off:'No generated audio',on:'Generate audio',model:'Model-managed audio',included:'Audio included',silent:'Silent video'}[value]||value);
