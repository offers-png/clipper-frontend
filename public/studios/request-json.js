// Retry only read-only status requests. Never retry submissions or spending.
export async function requestJson(url,options={},fetcher=fetch,delay=()=>new Promise(r=>setTimeout(r,400))) {
 const readOnly=(options.method||'GET').toUpperCase()==='GET';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetcher(url,options);
   if(readOnly&&attempt===0&&[401,502,503,504].includes(response.status)){await delay();continue;}
   const data=await response.json();
   if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The Studio request could not be completed.');
   return data;
  }catch(error){
   if(readOnly&&attempt===0&&(error instanceof TypeError||error instanceof SyntaxError)){await delay();continue;}
   throw error;
  }
 }
}
