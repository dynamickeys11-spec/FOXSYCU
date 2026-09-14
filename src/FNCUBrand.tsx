import React from 'react'

export function FNCUMark({size=40,className='',label='FNCU'}:{size?:number;className?:string;label?:string}){
  return <svg className={className} width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fncuGold" x1="12" y1="10" x2="68" y2="70" gradientUnits="userSpaceOnUse"><stop stopColor="#F6E3A5"/><stop offset=".45" stopColor="#D4AF37"/><stop offset="1" stopColor="#9C7420"/></linearGradient>
    </defs>
    <path d="M40 5 70 22v36L40 75 10 58V22L40 5Z" fill="#07152F" stroke="url(#fncuGold)" strokeWidth="3"/>
    <path d="M25 23h30v8H34v8h17v8H34v10h-9V23Z" fill="white"/>
    <path d="M55 23v34h-9V31h-8v-8h17Z" fill="url(#fncuGold)" opacity=".96"/>
    <path d="M17 61 40 74l23-13" fill="none" stroke="white" strokeOpacity=".16" strokeWidth="2"/>
  </svg>
}

export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()}>
    <FNCUMark size={compact?34:42}/>
    <span><b>FNCU</b><small>FIRST NATIONAL CREDIT UNION</small></span>
  </div>
}
