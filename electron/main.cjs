const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron'),path=require('node:path');
const patch=require('./patch.cjs');let window,busy=false;
app.whenReady().then(()=>{
  window=new BrowserWindow({width:1120,height:760,minWidth:840,minHeight:650,backgroundColor:'#151719',title:'Beauty OpenCode',icon:path.join(__dirname,'../assets/icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.loadFile(path.join(__dirname,'index.html'));window.on('close',event=>{if(busy)event.preventDefault();});
  ipcMain.handle('open-external',(_,url)=>{if(!['https://github.com/Chiyang001?tab=repositories','https://space.bilibili.com/404891612'].includes(url))throw Error('无效链接');return shell.openExternal(url);});
  ipcMain.handle('inspect',(_,folder)=>({...patch.inspect(folder||patch.defaultFolder),folder:folder||patch.defaultFolder}));
  ipcMain.handle('choose',async()=>{const result=await dialog.showOpenDialog(window,{title:'选择 OpenCode 安装目录',properties:['openDirectory']});return result.canceled?null:result.filePaths[0];});
  ipcMain.handle('apply',async(_,folder,mode)=>{if(busy)throw Error('正在切换，请稍候');if(!['classic','modern'].includes(mode))throw Error('无效模式');busy=true;try{if(await patch.running(folder))throw Error('请先完全退出 OpenCode，再切换模式');patch.applySync(folder,mode);return patch.inspect(folder);}finally{busy=false;}});
  ipcMain.handle('launch',async(_,folder)=>{if(busy)throw Error('正在切换');const error=await shell.openPath(path.join(folder,'OpenCode.exe'));if(error)throw Error(error);});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
});app.on('window-all-closed',()=>app.quit());
