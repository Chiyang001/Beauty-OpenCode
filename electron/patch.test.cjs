const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Archive,digest,sha}=require('./asar.cjs'),patch=require('./patch.cjs');
test('Node patch preserves archive integrity, upgrades old metadata and restores original bytes',()=>{
  const installed=patch.paths(patch.defaultFolder);const original=fs.existsSync(installed.b)?installed.b:installed.a;if(!fs.existsSync(original))throw Error('Original OpenCode archive required');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'beauty-node-test-'));
  try{fs.mkdirSync(path.join(tmp,'resources'));const {a,b,m}=patch.paths(tmp);fs.copyFileSync(original,a);const before=digest(a),arc=new Archive(a),{replacements}=patch.build(arc);patch.applySync(tmp,'modern');const after=new Archive(a);for(const [name,v] of arc.index){const other=after.index.get(name);if(v.unpacked||v.link){assert.deepEqual(v,other);continue;}assert(after.read(name).equals(replacements[name]||arc.read(name)),name);if(other.integrity){const data=after.read(name);assert.equal(sha(data),other.integrity.hash,name);const bs=other.integrity.blockSize,blocks=[];for(let i=0;i<Math.max(data.length,1);i+=bs)blocks.push(sha(data.subarray(i,i+bs)));assert.deepEqual(blocks,other.integrity.blocks);}}
    assert.equal(patch.inspect(tmp).mode,'modern');const first=digest(a);patch.applySync(tmp,'modern');assert.equal(digest(a),first);
    fs.appendFileSync(a,'tampered');assert.throws(()=>patch.applySync(tmp,'classic'),/资源已被修改/);assert.throws(()=>patch.applySync(tmp,'modern'),/资源已被修改/);fs.truncateSync(a,fs.statSync(a).size-8);
    const state=JSON.parse(fs.readFileSync(m));state.revision='old';fs.writeFileSync(m,JSON.stringify(state));patch.applySync(tmp,'modern');assert.equal(digest(b),before);assert.equal(patch.inspect(tmp).update,false);
    patch.applySync(tmp,'classic');assert.equal(digest(a),before);assert.equal(fs.existsSync(b),false);assert.equal(fs.existsSync(m),false);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('Compatibility follows resource structure regardless of version',()=>{
  const installed=patch.paths(patch.defaultFolder),original=fs.existsSync(installed.b)?installed.b:installed.a;
  const arc=new Archive(original),pkg=JSON.parse(arc.read('package.json'));
  for(const version of ['1.18.34','1.18.35','2.0.26','2.1.0','3.0.0']){
    const result=patch.build({index:arc.index,read(name){return name==='package.json'?Buffer.from(JSON.stringify({...pkg,version})):arc.read(name);}});
    assert.equal(result.pkg.version,version);
    assert(Object.values(result.replacements).some(data=>data.includes(Buffer.from(result.adapter==='native-v2'?'Beauty OpenCode native v2':'beautyAppearanceSection(props)'))));
  }
  assert.throws(()=>patch.build({index:arc.index,read(name){return name==='package.json'?Buffer.from(JSON.stringify({...pkg,name:'other-app'})):arc.read(name);}}),/OpenCode Electron/);
});

test('Native v2 migrates complete assets and follows renamed build symbols',()=>{
  const installed=patch.paths(patch.defaultFolder),arc=new Archive(fs.existsSync(installed.b)?installed.b:installed.a);
  const main=[...arc.index.keys()].find(n=>/^out\/renderer\/assets\/main-.*\.js$/.test(n));
  const source=arc.read(main).toString();
  if(source.includes('function NewLayout(props) {'))return;
  const {tree,discover}=require('./native-v2.cjs'),found=discover(source),renames=new Map([[found.home.id.name,'futureHomeController'],[found.layout.id.name,'futureLayoutController']]);
  const positions=tree(source).nodes.filter(({node})=>node.type==='Identifier'&&renames.has(node.name)).map(({node})=>node).sort((a,b)=>b.start-a.start);
  let changed=source;for(const n of positions)changed=changed.slice(0,n.start)+renames.get(n.name)+changed.slice(n.end);
  const wrapped={index:arc.index,read:n=>n===main?Buffer.from(changed):arc.read(n)};
  const result=patch.build(wrapped);assert.equal(result.adapter,'native-v2');
  const code=result.replacements[main].toString();
  assert(code.includes('beauty-session-more'),'Session rows expose the menu trigger');
  assert(code.includes("add('永久删除','trash',()=>remove.click())"),'Menu retains confirmed permanent deletion');
  assert(code.includes('sessions.session.rename(ServerConnection.key(home.server.focused()),session,value)'),'Menu uses native session rename');
  assert(!code.includes('ctx.sdk.api.session.update({sessionID:session.id,'),'Legacy rename API is removed from native output');
  for(const feature of ['beautyNativeRuntime','beautyNativeDeleteProject','beautyNativeDescendants','beautyNativeDecorateDraft','beautyAppearanceSection','beautyWallpaperInit','beautyReasoningSlider','beautyExisting'])assert(code.includes(feature),feature);
  assert.equal(Object.keys(result.replacements).filter(n=>n.includes('beauty-themes/')).length,8);
  assert(Object.values(result.replacements).some(b=>b.includes(Buffer.from('window.beautyReasoningSlider('))));
  assert(Object.values(result.replacements).some(b=>b.includes(Buffer.from('window.beautyAppearanceSection({controller:'))));
  assert.throws(()=>patch.build({index:arc.index,read:n=>n===main?Buffer.from(source.replace('data-slot=vertical-tabs-sidebar','data-slot=changed-sidebar')):arc.read(n)}),/结构|挂载|控制器/);
});
