import React from 'react'
import './fncu-logo-overrides.css'
import './fncu-brand-scale.css'

/** Canonical First Nebraska Credit Union brand artwork used across customer and administration interfaces. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <span className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="First Nebraska Credit Union">
    <img className="fncu-logo-image" src="/fncu-brand.svg" alt="First Nebraska Credit Union" draggable="false" />
  </span>
}
