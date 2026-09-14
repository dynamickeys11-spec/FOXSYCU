import React from 'react'

export function FNCUMark({size=40,className='',label='FNCU'}:{size?:number;className?:string;label?:string}){
  return <svg className={className} width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fncuGold" x1="18" y1="12" x2="78" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#F4E2A1"/><stop offset=".46" stopColor="#D4AF37"/><stop offset="1" stopColor="#9B741F"/></linearGradient>
    </defs>
    <path d="M48 5 84 25.5v45L48 91 12 70.5v-45L48 5Z" fill="#06142D" stroke="url(#fncuGold)" strokeWidth="3.2"/>
    <path d="M27 27h24v7H34v8h15v7H34v20h-7V27Z" fill="#fff"/>
    <path d="M52 27h7l14 18.2V27h7v42h-7L59 50.7V69h-7V27Z" fill="url(#fncuGold)"/>
    <path d="M72.5 56.5V69H59" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square" opacity=".82"/>
    <path d="M20 75 48 91l28-16" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2"/>
  </svg>
}

export function FNCUWordmark({compact=false,className=''}:{compact?:boolean;className?:string}){
  return <div className={`fncu-wordmark ${compact?'compact':''} ${className}`.trim()}>
    <FNCUMark size={compact?36:46}/>
    <span className="fncu-wordmark-copy"><b>FNCU</b><i aria-hidden="true"/><small>FIRST NATIONAL CREDIT UNION</small></span>
  </div>
}
