import React from 'react'

/** FNCU customer wordmark. The product uses the FNCU name itself as the brand identity; no generic banking symbol is used. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="FNCU">
    <span className="fncu-wordmark-copy"><b>FNCU</b></span>
  </div>
}
