import React from 'react'

/** FNCU institutional mark: a stylized bank/vault facade with columns and a central keyhole. */
export function FNCUMark({size=40,className='',label='FNCU — First National Credit Union'}:{size?:number;className?:string;label?:string}){
  return <svg className={className} width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="86" height="86" rx="20" fill="#07152F" stroke="#D4AF37" strokeWidth="2.5"/>
    <path d="M18 36 48 19l30 17H18Z" fill="#D4AF37"/>
    <path d="M22 39h52" stroke="#F7E8AD" strokeWidth="3"/>
    <path d="M25 42v27M37 42v27M59 42v27M71 42v27" stroke="#fff" strokeWidth="5" strokeLinecap="square"/>
    <path d="M20 72h56" stroke="#D4AF37" strokeWidth="4" strokeLinecap="square"/>
    <circle cx="48" cy="55" r="7" fill="#D4AF37"/>
    <path d="M48 59v7" stroke="#07152F" strokeWidth="3" strokeLinecap="round"/>
    <path d="M29 76h38" stroke="#fff" strokeOpacity=".22" strokeWidth="2"/>
  </svg>
}

export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()}>
    <FNCUMark size={compact?36:46}/>
    <span className="fncu-wordmark-copy"><b>FNCU</b><i aria-hidden="true"/><small>FIRST NATIONAL CREDIT UNION</small></span>
  </div>
}
