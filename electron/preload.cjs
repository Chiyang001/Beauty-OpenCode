const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('beauty',{openExternal:url=>ipcRenderer.invoke('open-external',url),inspect:folder=>ipcRenderer.invoke('inspect',folder),choose:()=>ipcRenderer.invoke('choose'),apply:(folder,mode)=>ipcRenderer.invoke('apply',folder,mode),launch:folder=>ipcRenderer.invoke('launch',folder)});
