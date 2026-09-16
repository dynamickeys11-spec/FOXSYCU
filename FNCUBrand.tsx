import React from 'react'

/**
 * Branding placeholder retained for layout compatibility.
 * The active FNCU logo is intentionally not rendered on customer surfaces.
 */
export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  void compact
  return <span className={`fncu-wordmark ${className}`.trim()} aria-hidden="true" />
}
