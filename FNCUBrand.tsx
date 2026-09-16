import React from 'react'
import logoUrl from './fncu-logo.svg'
import './fncu-logo-overrides.css'
import './fncu-brand-scale.css'

/** Canonical First Nebraska Credit Union logo used across customer and administration surfaces. */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <span className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()} aria-label="First Nebraska Credit Union">
    <img src={logoUrl} alt="First Nebraska Credit Union" className="fncu-logo-image" draggable={false}/>
  </span>
}
