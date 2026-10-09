const fs=require('node:fs'),path=require('node:path');
const {Archive,sha}=require('./asar.cjs');
// Detect files changing during packaging: ASAR headers can otherwise point into wrong bytes.
module.exports=async context=>{
 const archive=new Archive(path.join(context.appOutDir,'resources','app.asar'));
 const root=context.packager.projectDir;
 const verify=directory=>{for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true})){const relative=directory+'/'+entry.name;if(entry.isDirectory())verify(relative);else if(entry.isFile()){const expected=fs.readFileSync(path.join(root,relative)),actual=archive.read(relative);if(!actual.equals(expected))throw Error('打包资源字节不一致，请停止修改输入文件后重新打包：'+relative);const meta=archive.index.get(relative);if(meta.integrity&&sha(actual)!==meta.integrity.hash)throw Error('打包资源校验失败：'+relative);}}};
 for(const folder of ['electron','assets','themes','screenshots'])verify(folder);
 console.log('Verified packaged source, assets, themes and screenshots byte for byte');
};
