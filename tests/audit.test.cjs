const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const shop=fs.readFileSync('index.html','utf8'),admin=fs.readFileSync('espoza-admin-dashboard.html','utf8');
function fn(source,name){
 const start=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));
 assert.ok(start>=0,name);
 const line=source.slice(start,source.indexOf('\n',start));
 try{new vm.Script('('+line+')');return line;}catch{}
 for(let end=source.indexOf('\n}',start);end>=0;end=source.indexOf('\n}',end+2)){
  const text=source.slice(start,end+2);
  try{new vm.Script('('+text+')');return text;}catch{}
 }
 throw Error('Cannot extract '+name);
}
function context(source,names,extras={}){
 const els={};const $=id=>els[id]??=( {value:'',textContent:'',disabled:false,style:{},classList:{add(){},remove(){},toggle(){}},closest(){return this}} );
 const c=vm.createContext({console,$,els,setTimeout,clearTimeout,window:{},...extras});
 for(const name of names)vm.runInContext(fn(source,name),c);
 return c;
}
test('all inline scripts parse',()=>{for(const source of [shop,admin])for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]);});
test('recovery accepts a new password with an empty email and preserves success message',async()=>{
 let updated=false,signedOut=false;
 const c=context(shop,['setCustomerAuthMode','submitCustomerAuth'],{customerAuthMode:'recovery',getCustomerSupabase:()=>({auth:{updateUser:async({password})=>{updated=password==='test-password';return {};},signOut:async()=>{signedOut=true;return {};}}})});
 c.$('customerPassword').value='test-password';await c.submitCustomerAuth();
 assert.ok(updated&&signedOut);assert.equal(c.customerAuthMode,'login');assert.match(c.$('customerAuthMsg').textContent,/تم تغيير/);assert.equal(c.$('customerPassword').value,'');
});
test('signup validates email before contacting auth',async()=>{
 const c=context(shop,['submitCustomerAuth'],{customerAuthMode:'signup',getCustomerSupabase:()=>{throw Error('should not call');}});
 c.$('customerEmail').value='invalid';c.$('customerPassword').value='test-password';await c.submitCustomerAuth();assert.match(c.$('customerAuthMsg').textContent,/تحقّقي/);
});
test('resend uses signup confirmation and configured redirect',async()=>{
 let payload;const c=context(shop,['resendCustomerConfirmation'],{getCustomerSupabase:()=>({auth:{resend:async data=>{payload=data;return {};}}}),customerRedirectUrl:()=> 'https://espoza-fashion.github.io/espoza-fashion/'});
 c.$('customerEmail').value=' TEST@EXAMPLE.COM ';await c.resendCustomerConfirmation();assert.equal(payload.type,'signup');assert.equal(payload.email,'test@example.com');assert.ok(payload.options.emailRedirectTo.endsWith('/espoza-fashion/'));assert.equal(c.$('customerResendConfirmation').disabled,false);
});
test('resend failures are reported, not shown as success',async()=>{
 const c=context(shop,['resendCustomerConfirmation'],{getCustomerSupabase:()=>({auth:{resend:async()=>({error:{message:'rate limited'}})}}),customerRedirectUrl:()=>''});
 c.$('customerEmail').value='test@example.com';await c.resendCustomerConfirmation();assert.match(c.$('customerAuthMsg').textContent,/rate limited/);assert.equal(c.$('customerResendConfirmation').disabled,false);
});
test('stock zero cannot be purchased; unknown stock remains available',()=>{
 const c=context(shop,['dynamicProductToView'],{STATIC_PRODUCTS:[],PLACEHOLDER:'placeholder',normalizeImage:x=>x});
 assert.equal(c.dynamicProductToView({id:'a',stock:0},0).available,false);assert.equal(c.dynamicProductToView({id:'b',stock:null},0).available,true);assert.equal(c.dynamicProductToView({id:'c',stock:2,active:false},0).available,false);
});
test('successful empty catalog removes stale products',async()=>{
 const c=context(shop,['refreshSupabaseProducts'],{loadSupabaseProducts:async()=>[],products:[{id:'old'}],renderProducts(){},updateWishlistUI(){}});await c.refreshSupabaseProducts();assert.equal(c.products.length,0);
});
test('failed catalog refresh preserves the last available catalog',async()=>{
 const c=context(shop,['refreshSupabaseProducts'],{console:{warn(){}},loadSupabaseProducts:async()=>{throw Error('offline');},products:[{id:'old'}]});await c.refreshSupabaseProducts();assert.equal(c.products[0].id,'old');
});
function mockDB(failInsert=false){const calls=[];return {calls,from(table){let action,data;const query={update(v){action='update';data=v;calls.push({table,action,data});return this;},insert(v){action='insert';data=v;calls.push({table,action,data});return this;},delete(){action='delete';calls.push({table,action});return this;},eq(){return this;},select(){return this;},single(){return Promise.resolve({data:{id:'id'}});},then(resolve){resolve(action==='insert'&&failInsert?{error:Error('upload relation failed')}:{data:[]});}};return query;}};}
test('unchanged child rows preserve IDs and metadata without writes',async()=>{
 const sb=mockDB(),c=context(admin,['syncProductChildren'],{sb});await c.syncProductChildren('product_images','p','image_url',['old'],[{id:'original',image_url:'old',sort_order:0,alt_text:'keep'}]);assert.equal(sb.calls.length,0);
});
test('child additions happen before explicit removals',async()=>{
 const sb=mockDB(),c=context(admin,['syncProductChildren'],{sb});await c.syncProductChildren('product_sizes','p','size',['44'],[{id:'old',size:'42',sort_order:0}]);assert.deepEqual(sb.calls.map(x=>x.action),['insert','delete']);
});
test('failed child insertion never deletes original records',async()=>{
 const sb=mockDB(true),c=context(admin,['syncProductChildren'],{sb});await assert.rejects(c.syncProductChildren('product_sizes','p','size',['44'],[{id:'old',size:'42',sort_order:0}]));assert.deepEqual(sb.calls.map(x=>x.action),['insert']);
});
test('AI concurrent submissions are ignored',async()=>{
 const c=context(shop,['sendEspozaAssistant'],{document:{getElementById:id=>c.$(id)}});c.$('espozaAssistantInput').value='hello';c.$('espozaAssistantSend').disabled=true;await c.sendEspozaAssistant({preventDefault(){}});
});
test('AI offline response avoids network access',async()=>{
 let answer='';const c=context(shop,['sendEspozaAssistant'],{navigator:{onLine:false},document:{getElementById:id=>c.$(id)},addEspozaAssistantBubble:(role,text)=>answer=text});c.$('espozaAssistantInput').value='hello';await c.sendEspozaAssistant({preventDefault(){}});assert.match(answer,/مقطوع/);
});
test('AI timeout restores input and releases send button',async()=>{
 let bubble;const c=context(shop,['sendEspozaAssistant'],{navigator:{onLine:true},document:{getElementById:id=>c.$(id)},espozaAssistantHistory:[],CUSTOMER_SUPABASE_KEY:'public-test-key',AbortController,setTimeout:()=>1,clearTimeout(){},setElyraTyping:()=>()=>{},addEspozaAssistantBubble:()=>bubble={textContent:''},fetch:async()=>{const e=Error('timeout');e.name='AbortError';throw e;}});c.$('espozaAssistantInput').value='hello';c.$('espozaAssistantInput').focus=()=>{};await c.sendEspozaAssistant({preventDefault(){}});assert.match(bubble.textContent,/وقتًا طويلًا/);assert.equal(c.$('espozaAssistantInput').value,'hello');assert.equal(c.$('espozaAssistantSend').disabled,false);assert.equal(c.espozaAssistantHistory.length,0);
});
test('FAQ backend mode is disclosed and completed exchanges enter history',async()=>{
 let bubble;const c=context(shop,['sendEspozaAssistant'],{navigator:{onLine:true},document:{getElementById:id=>c.$(id)},espozaAssistantHistory:[],CUSTOMER_SUPABASE_KEY:'public-test-key',AbortController,setElyraTyping:()=>()=>{},addEspozaAssistantBubble:()=>bubble={textContent:''},fetch:async()=>({ok:true,json:async()=>({mode:'faq',answer:'store answer'})})});c.$('espozaAssistantInput').value='hello';c.$('espozaAssistantInput').focus=()=>{};await c.sendEspozaAssistant({preventDefault(){}});assert.match(bubble.textContent,/معلومات المتجر فقط/);assert.equal(c.espozaAssistantHistory.length,2);
});
test('checkout keeps cart on failed database save',()=>{assert.ok(shop.includes('if(!savedToAdmin)return;'));assert.ok(!shop.includes('insert(orderPayload).select'));assert.ok(shop.includes('if(orderSubmissionPending||!cart.length)return;'));});
function checkoutContext(error){
 const c=context(shop,['sendOrder'],{orderSubmissionPending:false,cart:[{dbId:'p',name:'Dress',qty:1,price:100,size:'40'}],cartModelKey:()=> 'p',store:{whatsapp:'0000000000',name:'Espoza'},selectedDelivery:()=>({name:'Test',price:20}),cartSubtotal:()=>100,getAutomaticOffer:()=>null,money:x=>String(x),productDisplayName:x=>x.name,cartItemCategory:()=> 'dresses',lang:'ar',ensureCustomerProfile:async()=>null,getCustomerSupabase:()=>({from:()=>({insert:async()=>({error})})}),window:{open:()=>({location:{}})},t:()=>({saved:'saved',waOnly:'wa-only'}),toast(){},saveCart(){},updateCartBadge(){},closeModal(){},console:{warn(){}},alert(){}});
 for(const id of ['customerName','customerPhone','customerAddress'])c.$(id).value='TEST';return c;
}
test('checkout API failure preserves basket and releases submission lock',async()=>{
 const c=checkoutContext({message:'permission denied'});await c.sendOrder();assert.equal(c.cart.length,1);assert.equal(c.orderSubmissionPending,false);assert.equal(c.$('sendOrderBtn').disabled,false);
});
test('checkout confirmed insert clears basket and releases submission lock',async()=>{
 const c=checkoutContext(null);await c.sendOrder();assert.equal(c.cart.length,0);assert.equal(c.orderSubmissionPending,false);assert.equal(c.$('sendOrderBtn').disabled,false);
});

test('abandoned cart classification excludes empty, recent and invalid dates',()=>{
 const c=context(admin,['cartIsInactive','cartEstimatedValue']);const now=Date.now();
 assert.equal(c.cartIsInactive({items:[{}],updated_at:new Date(now-3600000).toISOString()},1,now),true);
 assert.equal(c.cartIsInactive({items:[{}],updated_at:new Date(now-1000).toISOString()},1,now),false);
 assert.equal(c.cartIsInactive({items:[],updated_at:new Date(0).toISOString()},1,now),false);
 assert.equal(c.cartIsInactive({items:[{}],updated_at:'bad'},0,now),false);
 assert.equal(c.cartEstimatedValue([{price:100,qty:2},{price:'bad',qty:2}]),200);
});
test('cart writes are serialized and checkout empty snapshot wins',async()=>{
 const writes=[];let release;
 const c=context(shop,['syncCustomerCart'],{customerCartWriteQueue:Promise.resolve(),customerProfile:{user_id:'owner'},cart:[{name:'dress'}],getCustomerSupabase:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},from:()=>({upsert:async payload=>{writes.push(payload);if(writes.length===1)await new Promise(r=>release=r);return {};}})})});
 const first=c.syncCustomerCart();await new Promise(r=>setImmediate(r));c.cart=[];const second=c.syncCustomerCart();await new Promise(r=>setImmediate(r));assert.equal(writes.length,1);release();await Promise.all([first,second]);assert.equal(writes.length,2);assert.equal(writes[1].items.length,0);
});
test('queued cart write cannot cross account sign-out',async()=>{
 const c=context(shop,['syncCustomerCart'],{customerCartWriteQueue:Promise.resolve(),customerProfile:{user_id:'old'},cart:[{}],getCustomerSupabase:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'new'}}}})},from:()=>{throw Error('wrong account write');}})});
 await c.syncCustomerCart();
});
test('cart rendering escapes stored customer and item markup',()=>{
 const c=context(admin,['renderCarts','cartIsInactive','cartEstimatedValue','esc','money','fmtDate'],{customerCarts:[{user_id:'u',items:[{name:'<img onerror=alert(1)>',price:20,qty:2}],updated_at:new Date(0).toISOString()}],cartCustomers:[{user_id:'u',name:'<script>bad</script>'}],cartsLoadError:'',cartsLoadedAt:null});
 c.$('cartAgeFilter').value='1';c.renderCarts();assert.ok(!c.$('cartsBody').innerHTML.includes('<script>'));assert.ok(!c.$('cartsBody').innerHTML.includes('<img'));assert.match(c.$('cartsBody').innerHTML,/&lt;img/);
});
