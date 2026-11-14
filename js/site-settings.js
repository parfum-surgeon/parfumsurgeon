/* Loads editable storefront content from Supabase. Public settings are read-only to visitors. */
(async function(){
  const cfg=window.STORE_CONFIG;
  if(!cfg?.backend?.supabaseUrl||!cfg?.backend?.supabaseAnonKey)return;
  try{
    const url=cfg.backend.supabaseUrl+'/rest/v1/site_settings?key=eq.storefront&select=value';
    const res=await fetch(url,{headers:{apikey:cfg.backend.supabaseAnonKey,Authorization:'Bearer '+cfg.backend.supabaseAnonKey}});
    if(!res.ok)throw new Error('Settings request failed: '+res.status);
    const rows=await res.json(),s=rows?.[0]?.value;if(!s)return;
    const set=(id,value)=>{const el=document.getElementById(id);if(el&&value)el.textContent=value};
    set('storeHeroTitle',s.hero_title);set('storeHeroText',s.hero_text);set('storeAboutText',s.about_text);
    const logo=document.getElementById('storeLogo');if(logo&&s.logo_image)logo.src=s.logo_image;
    const root=document.documentElement;
    if(s.logo_width_desktop)root.style.setProperty('--store-logo-width-desktop',Math.max(90,Math.min(360,Number(s.logo_width_desktop)))+'px');
    if(s.logo_width_mobile)root.style.setProperty('--store-logo-width-mobile',Math.max(80,Math.min(260,Number(s.logo_width_mobile)))+'px');
    if(s.logo_mobile_position){const pos=['left','center','right'].includes(s.logo_mobile_position)?s.logo_mobile_position:'center';root.style.setProperty('--store-logo-mobile-position',pos);}
    if(s.logo_image){document.querySelectorAll('link[rel="icon"],meta[property="og:image"]').forEach(el=>el.setAttribute(el.tagName==='META'?'content':'href',s.logo_image))}
    if(s.delivery_fee!==undefined)cfg.deliveryFee=Number(s.delivery_fee)||0;
    if(s.free_delivery_threshold!==undefined)cfg.freeDeliveryThreshold=s.free_delivery_threshold===null?null:Number(s.free_delivery_threshold);
    if(s.support_email){document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.href='mailto:'+s.support_email;a.textContent=s.support_email})}
    if(s.whatsapp_number){const w=document.getElementById('whatsappFloat');if(w){w.href='https://wa.me/'+s.whatsapp_number.replace(/\D/g,'');w.style.display='flex'}}
    if(s.hero_image){const hero=document.querySelector('.hero');if(hero)hero.style.backgroundImage='linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2)),url("'+s.hero_image.replace(/"/g,'%22')+'")'}
    if(s.tagline)document.querySelectorAll('.hero .eyebrow').forEach(el=>el.textContent='Parfum Surgeon — '+s.tagline);
  }catch(e){console.warn('Store settings unavailable; using built-in content.',e)}
})();