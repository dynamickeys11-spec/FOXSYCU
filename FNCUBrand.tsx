import React from 'react'

/** FNCU wordmark used throughout the customer banking experience. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="FNCU">
    <span className="fncu-wordmark-copy"><b>FNCU</b></span>
  </div>
}
