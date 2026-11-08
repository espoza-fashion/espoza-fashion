/* Espoza Fashion — customer side navigation */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const normalizeSlug=value=>String(value||"").trim().replace(/^winter_sets$/,"winter-sets");
 const fallbackCats=[
  {slug:"dresses",name_ar:"الفساتين",name_en:"Dresses"},
  {slug:"sets",name_ar:"الأطقم",name_en:"Sets"},
  {slug:"offers",name_ar:"العروضات",name_en:"Offers"},
  {slug:"winter-sets",name_ar:"الطقوم الشتوية",name_en:"Winter Sets"}
 ];
 let panel,overlay,opened=false;
 const english=()=>document.documentElement.lang==="en";
 const label=(ar,en)=>english()?en:ar;
 function makeButton(cls,icon,ar,en,action){
  const b=document.createElement("button");b.type="button";b.className=cls;
  const i=document.createElement("span");i.className="esp-side-link-icon";i.textContent=icon;
  const t=document.createElement("span");t.textContent=label(ar,en);
  b.append(i,t);b.addEventListener("click",action);return b;
 }
 function categories(){
  const wrap=document.getElementById("categories");
  if(!wrap)return [];
  return Array.from(wrap.querySelectorAll("button[data-cat]"))
   .filter(b=>b.dataset.cat&&b.dataset.cat!=="all")
   .map(b=>({slug:normalizeSlug(b.dataset.cat),label:b.textContent.trim()}));
 }
 function close(){
  if(!panel)return;
  opened=false;panel.classList.remove("is-open");overlay.classList.remove("is-open");
  panel.setAttribute("aria-hidden","true");overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("esp-side-lock");
  const trigger=$("menuBtn");if(trigger)trigger.setAttribute("aria-expanded","false");
 }
 function chooseCategory(slug){
  close();
  if(typeof window.goCategory==="function")window.goCategory(slug);
  else{
   window.currentCategory=slug;
   if(typeof window.renderProducts==="function")window.renderProducts();
  }
 }
 function render(){
  if(!panel)return;
  const body=panel.querySelector(".esp-side-body");body.replaceChildren();
  const account=document.createElement("button");account.type="button";account.className="esp-side-account";
  account.innerHTML='<span class="esp-side-account-icon" aria-hidden="true">♙</span><span class="esp-side-account-copy"><b></b><small></small></span><span class="esp-side-chevron" aria-hidden="true">‹</span>';
  account.querySelector("b").textContent=label("حسابي","My Account");
  account.querySelector("small").textContent=label("تسجيل الدخول أو إنشاء حساب جديد","Sign in or create an account");
  account.addEventListener("click",()=>{close();if(typeof window.openCustomerAccount==="function")window.openCustomerAccount();});
  body.append(account);
  const title=document.createElement("div");title.className="esp-side-section-title";title.textContent=label("تسوّقي حسب القسم","SHOP BY CATEGORY");body.append(title);
  const activeCategory=body.ownerDocument.querySelector("#categories .cat.active")?.dataset.cat||"all";
  body.append(makeButton("esp-side-link"+(activeCategory==="all"?" is-active":""),"✧",label("جميع المنتجات","All Products"),label("جميع المنتجات","All Products"),()=>chooseCategory("all")));
  categories().forEach(cat=>{
   const active=activeCategory===cat.slug;
   const b=makeButton("esp-side-link"+(active?" is-active":""),"◇",cat.label,cat.label,()=>chooseCategory(cat.slug));
   b.dataset.category=cat.slug;body.append(b);
  });
  const more=document.createElement("div");more.className="esp-side-section-title";more.textContent=label("روابط سريعة","QUICK LINKS");body.append(more);
  body.append(makeButton("esp-side-link","♡","المفضلة","Wishlist",()=>{close();if(typeof window.scrollToWishlist==="function")window.scrollToWishlist();}));
  body.append(makeButton("esp-side-link","✦","قائمة الأمنيات","Wish List",()=>{close();if(typeof window.scrollToPublicWishes==="function")window.scrollToPublicWishes();}));
  body.append(makeButton("esp-side-link","▣","سلة التسوق","Shopping Bag",()=>{close();if(typeof window.openCartModal==="function")window.openCartModal();}));
  body.append(makeButton("esp-side-link","i","سياسة المتجر","Store Policies",()=>{close();if(typeof window.openModal==="function")window.openModal("policiesModal");}));
  const contact=document.createElement("a");contact.className="esp-side-link";contact.href=($("whatsappHeader")&&$("whatsappHeader").href)||"#";contact.target="_blank";contact.rel="noopener noreferrer";
  const ci=document.createElement("span");ci.className="esp-side-link-icon";ci.textContent="✆";const ct=document.createElement("span");ct.textContent=label("تواصلي معنا عبر واتساب","Contact us on WhatsApp");contact.append(ci,ct);body.append(contact);
 }
 function open(){
  if(!panel)return;render();opened=true;panel.classList.add("is-open");overlay.classList.add("is-open");
  panel.setAttribute("aria-hidden","false");overlay.setAttribute("aria-hidden","false");document.body.classList.add("esp-side-lock");
  const trigger=$("menuBtn");if(trigger)trigger.setAttribute("aria-expanded","true");
 }
 function init(){
  if($("espozaSidePanel"))return;
  overlay=document.createElement("div");overlay.id="espozaSideOverlay";overlay.setAttribute("aria-hidden","true");overlay.addEventListener("click",close);
  panel=document.createElement("aside");panel.id="espozaSidePanel";panel.setAttribute("aria-label","Espoza Fashion navigation");panel.setAttribute("aria-hidden","true");
  panel.innerHTML='<div class="esp-side-head"><button type="button" class="esp-side-close" aria-label="Close menu">×</button><div class="esp-side-brand">ESPOZA</div><div class="esp-side-sub">FASHION</div><div class="esp-side-since">SINCE 2019</div></div><div class="esp-side-body"></div><div class="esp-side-footer">ESPOZA FASHION · SINCE 2019</div>';
  panel.querySelector(".esp-side-close").addEventListener("click",close);
  document.body.append(overlay,panel);
  window.openCustomerMenu=open;
  const trigger=$("menuBtn");if(trigger){trigger.setAttribute("aria-haspopup","dialog");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-label",label("فتح القائمة الجانبية","Open navigation menu"));}
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&opened)close();});
  const originalRender=window.renderCustomerCategories;
  if(typeof originalRender==="function")window.renderCustomerCategories=function(){const result=originalRender.apply(this,arguments);if(opened)render();return result;};
  const originalLanguage=window.applyLanguage;
  if(typeof originalLanguage==="function")window.applyLanguage=function(){const result=originalLanguage.apply(this,arguments);if(opened)render();return result;};
  window.addEventListener("pageshow",()=>{if(opened)close();});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
