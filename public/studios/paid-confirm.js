// Quotes are free. Only an explicit confirmation permits the subsequent request.
export async function confirmPaid(api, url, body = {}) {
  const quote = await api(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return new Promise(resolve => {
    const dialog=document.createElement('dialog');dialog.className='cf-spend-dialog';
    dialog.setAttribute('aria-label','Confirm KIE spending');
    const title=document.createElement('h2');title.textContent='Review generation cost';
    const cost=document.createElement('p');cost.textContent=`${quote.count} ${quote.kind==='images'?'images':'video'} | ${quote.cost_credits} KIE credits / $${quote.cost_usd} USD estimated total`;
    const selection=document.createElement('p');
    if(quote.kind==='video')selection.textContent=`Model: ${quote.model_name||quote.model}. Duration: ${quote.duration}s. Resolution: ${quote.resolution}. Audio: ${quote.audio==='model'?quote.audio_capability:quote.audio}. Pricing verified: ${quote.pricing_updated}.`;
    const allowance=document.createElement('p');allowance.textContent=`KIE balance: ${quote.balance_credits} credits. Account allowance remaining: $${quote.remaining_usd} of $${quote.spending_limit_usd}.`;
    if(quote.remaining_after_usd!==undefined)allowance.textContent+=` After this request: $${quote.remaining_after_usd}.`;
    const reason=document.createElement('p');reason.textContent=quote.reason;reason.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='actions';
    const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
    const confirm=document.createElement('button');confirm.textContent='Confirm & generate';confirm.className='primary';confirm.disabled=!quote.can_submit;
    let result=null;
    confirm.onclick=()=>{if(!quote.can_submit)return;result={quote_id:quote.quote_id,confirm_spend:true};dialog.close();};
    dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
    dialog.onclose=()=>{dialog.remove();resolve(result);};
    actions.append(cancel,confirm);dialog.append(title,selection,cost,allowance,reason,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
}
