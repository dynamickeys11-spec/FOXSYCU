import React from 'react'
import './fncu-logo-overrides.css'
import './fncu-brand-scale.css'

/** Compatibility component retained for existing imports; renders the current FOXSYCU identity. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <span className={`fncu-wordmark foxsycu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="FOXSYCU">
    <strong>FOXSYCU</strong>
    {!compact&&<small>DIGITAL BANKING SYSTEM</small>}
  </span>
}
