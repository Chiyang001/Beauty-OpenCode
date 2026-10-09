"""Dependency-free ASAR reader/repacker. Preserves unpacked entries and integrity."""
import hashlib, json, struct, copy
from pathlib import Path

def digest(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()

class Archive:
    def __init__(self,path):
        self.path=Path(path)
        with self.path.open('rb') as f:
            prefix=f.read(16)
            if len(prefix)!=16: raise ValueError('Invalid ASAR header')
            a,b,c,n=struct.unpack('<4I',prefix)
            if a!=4 or n>b or b>64*1024*1024: raise ValueError('Unsupported ASAR')
            self.header=json.loads(f.read(n)); self.base=8+b
        self.index=dict(self.entries())
    def entries(self,d=None,prefix=''):
        for name,v in (self.header if d is None else d).get('files',{}).items():
            p=prefix+name
            if 'files' in v: yield from self.entries(v,p+'/')
            else: yield p,v
    def read(self,name):
        v=self.index[name]
        if v.get('unpacked') or 'link' in v: raise ValueError('Not a packed file: '+name)
        with self.path.open('rb') as f:
            f.seek(self.base+int(v['offset'])); data=f.read(v['size'])
        if len(data)!=v['size']: raise ValueError('Truncated ASAR')
        return data
    def repack(self,out,replacements):
        header=copy.deepcopy(self.header); offset=0
        entries=list(self.entries(header))
        for name,v in entries:
            if v.get('unpacked') or 'link' in v: continue
            v['offset']=str(offset)
            if name in replacements:
                data=replacements[name]; v['size']=len(data)
                if 'integrity' in v:
                    bs=v['integrity'].get('blockSize',4194304)
                    v['integrity']={'algorithm':'SHA256','hash':hashlib.sha256(data).hexdigest(),'blockSize':bs,'blocks':[hashlib.sha256(data[i:i+bs]).hexdigest() for i in range(0,max(len(data),1),bs)]}
            offset+=v['size']
        raw=json.dumps(header,separators=(',',':'),ensure_ascii=False).encode()
        pad=(-len(raw))%4; payload=struct.pack('<I',len(raw))+raw+b'\0'*pad
        hp=struct.pack('<I',len(payload))+payload
        with Path(out).open('wb') as dst, self.path.open('rb') as src:
            dst.write(struct.pack('<II',4,len(hp))); dst.write(hp)
            old=dict(self.entries())
            for name,v in entries:
                if v.get('unpacked') or 'link' in v: continue
                if name in replacements: dst.write(replacements[name]); continue
                ov=old[name]; src.seek(self.base+int(ov['offset'])); left=ov['size']
                while left:
                    data=src.read(min(left,1024*1024))
                    if not data: raise ValueError('Truncated archive')
                    dst.write(data); left-=len(data)
