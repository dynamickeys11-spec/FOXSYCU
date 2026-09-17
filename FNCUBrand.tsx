import React from 'react'
import './fncu-logo-overrides.css'
import './fncu-brand-scale.css'

/** Canonical FNCU brand wordmark used across customer and administration interfaces. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <span className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="FNCU">
    <strong>FNCU</strong>
    {!compact&&<small>DIGITAL BANKING SYSTEM</small>}
  </span>
}
