import React from 'react'
import './fncu-logo-overrides.css'
import './fncu-brand-scale.css'

/** Canonical supplied First Nebraska Credit Union logo used across customer-facing surfaces. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <span className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="First Nebraska Credit Union">
    <img src="/fncu-brand.jpg" alt="First Nebraska Credit Union" className="fncu-logo-image" draggable={false}/>
  </span>
}
