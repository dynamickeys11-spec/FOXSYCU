import React from 'react'

/** FOXSYCU wordmark used by the customer banking shell. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="FOXSYCU">
    <span className="fncu-wordmark-copy"><b>FOXSYCU</b></span>
  </div>
}
